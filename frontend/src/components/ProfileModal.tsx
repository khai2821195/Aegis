import { useState, useEffect, useRef } from 'react';
import type { Profile } from '../hooks/useAuth';
import { getAuthHeaders } from '../lib/supabase';
import type { TierConfig } from '../config/tiers';
import type { Settings, Provider, ModelOption } from '../types';

interface Props {
  profile: Profile;
  permissions: TierConfig;
  settings: Settings;
  onSave: (updates: { display_name?: string; user_context?: string }) => Promise<void>;
  onApiKeyChange: (provider: Provider, key: string) => void;
  onPersonaModelChange: (personaId: string, provider: Provider, modelId: string) => void;
  onImport: (settings: Settings) => void;
  onClose: () => void;
}

const PROVIDERS: { id: Provider; name: string }[] = [
  { id: 'gemini',    name: 'Google Gemini' },
  { id: 'anthropic', name: 'Anthropic Claude' },
  { id: 'openai',    name: 'OpenAI' },
];

export default function ProfileModal({
  profile, permissions, settings,
  onSave, onApiKeyChange, onPersonaModelChange, onImport, onClose,
}: Props) {
  const [tab, setTab] = useState<'profile' | 'apikeys'>('profile');

  // ── 프로필 탭 상태
  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [userContext, setUserContext] = useState(profile.user_context ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── 설정 내보내기/불러오기
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  function handleExport() {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aegis-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as Settings;
        if (!parsed.apiKeys || !parsed.personas || !parsed.personaModels) throw new Error('invalid');
        onImport(parsed);
        setImportMsg({ type: 'ok', text: '설정을 불러왔습니다.' });
      } catch {
        setImportMsg({ type: 'err', text: '올바른 설정 파일이 아닙니다.' });
      }
      setTimeout(() => setImportMsg(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ── API 키 탭 상태
  const [models, setModels] = useState<Record<Provider, ModelOption[]>>({
    gemini: [], anthropic: [], openai: [],
  });
  const [loadingModel, setLoadingModel] = useState<Record<Provider, boolean>>({
    gemini: false, anthropic: false, openai: false,
  });
  const [errors, setErrors] = useState<Record<Provider, string>>({
    gemini: '', anthropic: '', openai: '',
  });

  // API 키 탭 열릴 때 키가 있는 프로바이더 자동 로드
  useEffect(() => {
    if (tab !== 'apikeys') return;
    PROVIDERS.forEach(p => {
      if (settings.apiKeys[p.id] && models[p.id].length === 0) {
        fetchModels(p.id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function fetchModels(provider: Provider) {
    const key = settings.apiKeys[provider];
    if (!key) return;
    setLoadingModel(prev => ({ ...prev, [provider]: true }));
    setErrors(prev => ({ ...prev, [provider]: '' }));
    try {
      const res = await fetch(`/api/models?provider=${provider}&key=${encodeURIComponent(key)}`, { headers: await getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setModels(prev => ({ ...prev, [provider]: data.models }));
    } catch (err: unknown) {
      setErrors(prev => ({ ...prev, [provider]: err instanceof Error ? err.message : 'Error' }));
    } finally {
      setLoadingModel(prev => ({ ...prev, [provider]: false }));
    }
  }

  async function handleSave() {
    setSaving(true);
    await onSave({
      display_name: displayName || null as unknown as string,
      user_context: userContext || null as unknown as string,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-800 flex items-center justify-center text-lg font-bold text-white">
              {(profile.display_name || profile.username)[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-white font-bold">{profile.display_name || profile.username}</h2>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">@{profile.username}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${permissions.badge}`}>
                  {permissions.label}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300 text-xl transition-colors">✕</button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-800 flex-shrink-0">
          {([['profile', '프로필'], ['apikeys', 'API 키 · 모델']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === id
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 탭 내용 */}
        <div className="overflow-y-auto flex-1">

          {/* ── 프로필 탭 */}
          {tab === 'profile' && (
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">표시 이름</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder={profile.username}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-gray-400 text-xs mt-1">로비 화면 상단에 표시되는 이름</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">사용자 입력</label>
                <textarea
                  value={userContext}
                  onChange={e => setUserContext(e.target.value)}
                  placeholder={`[IDENTITY]\nuser_name:사용자 이름\nlocation:사용자 거주지\n\n[BUSINESS_MAIN]\nname: 회사명\ntype: 자영업\nlocation: 회사위치\nnote:\n\n[BUSINESS_Sub]\nname: 회사명\ntype: 자영업\nlocation: 회사위치\nnote:\n\n사용하는 AI를 이용해 자신만의 상황을 프롬프트로 제작하여 붙여 넣으세요.`}
                  rows={10}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono"
                />
                <p className="text-gray-400 text-xs mt-1">입력한 내용이 AI 임원들의 회의 컨텍스트로 활용됩니다</p>
              </div>
            </div>
          )}

          {/* ── API 키 · 모델 탭 */}
          {tab === 'apikeys' && (
            <div className="p-6 space-y-6">

              {/* API 키 */}
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">API 키</h3>
                <div className="space-y-3">
                  {PROVIDERS.map(p => (
                    <div key={p.id}>
                      <label className="block text-xs text-gray-300 mb-1">{p.name}</label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={settings.apiKeys[p.id]}
                          onChange={e => onApiKeyChange(p.id, e.target.value)}
                          placeholder={`${p.name} API Key`}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        <button
                          onClick={() => fetchModels(p.id)}
                          disabled={!settings.apiKeys[p.id] || loadingModel[p.id]}
                          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg text-sm text-white transition-colors whitespace-nowrap"
                        >
                          {loadingModel[p.id] ? '...' : models[p.id].length > 0 ? `${models[p.id].length}개 ✓` : '불러오기'}
                        </button>
                      </div>
                      {errors[p.id] && <p className="text-red-400 text-xs mt-1">{errors[p.id]}</p>}
                    </div>
                  ))}
                </div>
                <p className="text-gray-500 text-xs mt-3">🔒 API 키는 계정에 암호화 저장되며 외부로 전송되지 않습니다.</p>
              </div>

              <div className="border-t border-gray-800" />

              {/* 인물별 모델 */}
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">인물별 AI 모델</h3>
                <div className="space-y-2">
                  {settings.personas.map(persona => {
                    const current = settings.personaModels[persona.id] ?? { provider: 'gemini' as Provider, modelId: '' };
                    const availableModels = models[current.provider] ?? [];
                    return (
                      <div key={persona.id} className="bg-gray-800/60 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                            style={{ backgroundColor: persona.color.bg }}
                          >
                            {persona.emoji}
                          </div>
                          <p className="text-sm font-medium flex-shrink-0" style={{ color: persona.color.text }}>{persona.name}</p>
                          <p className="text-gray-400 text-xs truncate">{persona.role}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={current.provider}
                            onChange={e => {
                              const prov = e.target.value as Provider;
                              const firstModel = models[prov]?.[0]?.id || '';
                              onPersonaModelChange(persona.id, prov, firstModel);
                            }}
                            className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                          >
                            {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <select
                            value={current.modelId}
                            onChange={e => onPersonaModelChange(persona.id, current.provider, e.target.value)}
                            disabled={availableModels.length === 0}
                            className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none disabled:opacity-50"
                          >
                            {availableModels.length === 0 ? (
                              <option value={current.modelId}>{current.modelId || '먼저 키 입력'}</option>
                            ) : (
                              availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                            )}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-gray-800" />

              {/* 설정 내보내기 / 불러오기 */}
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">설정 파일</h3>
                <p className="text-gray-500 text-xs mb-3">페르소나, API 키, 모델 설정을 파일로 저장하거나 다른 기기에서 불러올 수 있습니다.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleExport}
                    className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 transition-colors border border-gray-700"
                  >
                    내보내기
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 transition-colors border border-gray-700"
                  >
                    불러오기
                  </button>
                  <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
                </div>
                {importMsg && (
                  <p className={`text-xs mt-2 ${importMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                    {importMsg.text}
                  </p>
                )}
              </div>

            </div>
          )}
        </div>

        {/* 하단 버튼 — 프로필 탭만 */}
        {tab === 'profile' && (
          <div className="px-6 pb-6 pt-2 flex justify-end gap-3 flex-shrink-0 border-t border-gray-800">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-gray-200 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                saved
                  ? 'bg-green-700 text-green-200'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saved ? '✓ 저장됨' : '저장'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
