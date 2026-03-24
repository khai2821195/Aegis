import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { aegisUrl } from '../lib/api';
import type { Tier } from '../config/tiers';
import type { Persona } from '../types';

const SELECT_PROFILE = 'id, username, tier, plan_expires_at, display_name, user_context, company_name, ceo_name, personas';

const FAKE_DOMAIN = '@aimr.app';

function toEmail(username: string) {
  return `${username.trim().toLowerCase()}${FAKE_DOMAIN}`;
}

export interface Profile {
  id: string;
  username: string;
  tier: Tier;
  plan_expires_at: string | null;
  display_name: string | null;
  user_context: string | null;
  company_name: string | null;
  ceo_name: string | null;
  personas: Persona[] | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(user: User) {
    const { data } = await supabase
      .from('profiles')
      .select(SELECT_PROFILE)
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data as Profile);
      // 로그인 후 서버 라이선스 검증
      await verifyLicense(user);
      return;
    }

    // 소셜 로그인 최초 사용자 — Free 프로필 자동 생성
    const meta = user.user_metadata;
    const username = meta?.name || user.email?.split('@')[0] || user.id.slice(0, 8);
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({ id: user.id, username, tier: 'free', display_name: meta?.full_name ?? meta?.name ?? null })
      .select(SELECT_PROFILE)
      .single();
    if (newProfile) setProfile(newProfile as Profile);
  }

  // 서버 라이선스 검증 — tier 동기화 및 만료 처리
  async function verifyLicense(_user: User) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(aegisUrl('/api/license'), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;

      const { tier, plan_expires_at } = await res.json();

      // 서버 응답 기준으로 tier 동기화
      setProfile(prev => prev ? { ...prev, tier, plan_expires_at } : prev);
    } catch {
      // 네트워크 오류 시 기존 로컬 값 유지 (grace period)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 24시간마다 라이선스 재검증 (탭이 활성화될 때)
  useEffect(() => {
    const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24시간

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const lastCheck = localStorage.getItem('license_checked_at');
      if (lastCheck && Date.now() - Number(lastCheck) < CHECK_INTERVAL) return;

      await verifyLicense(session.user);
      localStorage.setItem('license_checked_at', String(Date.now()));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  async function getAuthHeader(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? `Bearer ${session.access_token}` : null;
  }

  async function signUp(username: string, password: string) {
    const { error } = await supabase.auth.signUp({ email: toEmail(username), password });
    return error;
  }

  async function signIn(username: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: toEmail(username), password });
    return error;
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // API 키를 백엔드 경유로 암호화 저장
  async function updateApiKeys(apiKeys: Record<string, string>) {
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    await fetch('/api/keys', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ apiKeys }),
    });
  }

  // API 키를 백엔드 경유로 복호화 로드
  async function loadApiKeys(): Promise<Record<string, string> | null> {
    const authHeader = await getAuthHeader();
    if (!authHeader) return null;
    try {
      const res = await fetch('/api/keys', { headers: { Authorization: authHeader } });
      if (!res.ok) return null;
      const data = await res.json();
      return data.apiKeys ?? null;
    } catch {
      return null;
    }
  }

  async function updateProfile(updates: { display_name?: string; user_context?: string; company_name?: string; ceo_name?: string }) {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select('id, username, tier, display_name, user_context, company_name, ceo_name, personas')
      .single();
    if (data) setProfile(data as Profile);
  }

  async function savePersonas(personas: Persona[]) {
    if (!user) return;
    await supabase.from('profiles').update({ personas }).eq('id', user.id);
  }

  return { user, profile, tier: (profile?.tier ?? 'free') as Tier, loading, signUp, signIn, signInWithGoogle, signOut, updateProfile, updateApiKeys, loadApiKeys, savePersonas, verifyLicense, getAuthHeader };
}
