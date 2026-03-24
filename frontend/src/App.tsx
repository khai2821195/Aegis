import { useState, useRef, useEffect, useCallback } from 'react';
import type { Message, Persona, Provider, Settings, Attachment } from './types';
import { useSettings } from './hooks/useSettings';
import { useVoice } from './hooks/useVoice';
import { useAuth } from './hooks/useAuth';
import { getAuthHeaders } from './lib/supabase';
import { TIER_CONFIG } from './config/tiers';
import MessageBubble from './components/MessageBubble';
import AttendeeSidebar from './components/AttendeeSidebar';
import AuthScreen from './components/AuthScreen';
import LobbyScreen from './components/LobbyScreen';
import UpdateBanner from './components/UpdateBanner';
import FileAttachmentBar from './components/FileAttachmentBar';
import MeetingEndModal from './components/MeetingEndModal';
import { useUpdateCheck } from './hooks/useUpdateCheck';
import type { Meeting } from './components/MeetingHistoryTab';
import LandingPage from './components/LandingPage';

let msgId = 0;
const newId = () => String(++msgId);

// ─── 사회자 감지 ───────────────────────────────────────────────
function getFacilitator(attendees: Persona[]): Persona | null {
  return (
    attendees.find(p =>
      p.role.includes('비서') || p.role.includes('CoS') || p.role.includes('사회')
    ) ?? null
  );
}

// ─── 발언자 목록 파싱 (1~3명) ─────────────────────────────────
function parseSpeakers(text: string, candidates: Persona[]): Persona[] {
  const match = text.match(/\[발언권:\s*([^\]]+)\]/);
  if (!match) return [];
  const parts = match[1].split(/[,、]\s*/);
  const seen = new Set<string>();
  return parts
    .map(part => {
      const name = part.trim();
      return candidates.find(p => p.name.includes(name) || name.includes(p.name));
    })
    .filter((p): p is Persona => {
      if (!p || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    })
    .slice(0, 3);
}

// ─── 직접 호출 파싱: @멘션 또는 "이름," / "이름!" 으로 시작 ───
function parseMention(text: string, candidates: Persona[]): Persona | null {
  // @멘션
  const atMatch = text.match(/@([^\s,!?]+)/);
  if (atMatch) {
    const hint = atMatch[1].trim();
    return candidates.find(p => p.name.includes(hint) || hint.includes(p.name)) ?? null;
  }
  // 이름으로 직접 호출: 이름 뒤에 구두점, 공백, 또는 한국어 조사가 오는 경우
  const trimmed = text.trim();
  for (const p of candidates) {
    if (trimmed.startsWith(p.name)) {
      const next = trimmed[p.name.length];
      // 문장 끝이거나 구두점/공백이거나 한국어 조사(은/는/이/가/을/를/의/에/아/야/씨 등)
      if (next === undefined || /[,!? 　、。]/.test(next) || /[은는이가을를의에아야씨]/.test(next)) return p;
    }
  }
  return null;
}

function stripTags(text: string): string {
  return text
    .replace(/\[발언권:\s*[^\]]+\]/g, '')
    .replace(/\[마무리\]/g, '')
    .replace(/\[회의종료\]/g, '')
    .trim();
}

// ─── 회의용 시스템 프롬프트 ────────────────────────────────────
function buildSystemPrompt(
  persona: Persona,
  isFacilitator: boolean,
  attendees: Persona[],
  facilitatorName: string,
  previousMeetings?: { title: string; summary: string }[] | null,
  userContext?: string | null,
  isOpening?: boolean
): string {
  const attendeeList = attendees.map(p => `${p.name}(${p.role})`).join(', ');

  const contextBlock = userContext
    ? `\n\n--- 대표 컨텍스트 ---\n${userContext}`
    : '';

  const prevContext = previousMeetings && previousMeetings.length > 0
    ? `\n\n--- 이전 회의 참고 자료 ---\n` +
      previousMeetings.map((m, i) => `[${i + 1}] ${m.title}\n${m.summary}`).join('\n\n') +
      `\n\n위 내용을 숙지하고 오늘 회의에 임해주세요.`
    : '';

  if (isFacilitator) {
    return `${persona.systemPrompt}${contextBlock}${prevContext}

--- 회의 사회 지침 ---
참석자: ${attendeeList}

당신은 이 회의의 사회자입니다. 아래 지침을 반드시 따르세요:

【중요】 사용자가 명확한 주제나 질문을 제시하지 않았다면:
→ 간단히 환영 인사를 한 뒤, 참석자 중 1명에게 [발언권:]을 넘겨 자유롭게 시작하게 하세요.
→ 절대 주제를 임의로 만들거나 가정하지 마세요. 발언자가 자유롭게 시작하도록 하세요.

사용자가 주제/질문을 제시했다면:
→ 2~3문장으로 간결하게 소개한 뒤, 가장 관련 있는 전문가 1~2명을 지정하세요.
→ 형식: [발언권: 이름1] 또는 [발언권: 이름1, 이름2]
→ 자신의 분석이나 의견을 길게 말하지 마세요 — 발언권 넘기는 역할만 하세요.
→ 사용자가 특정 인물(@이름 또는 이름으로 호출)을 언급했다면 반드시 그 인물을 지정하세요.${isOpening ? `

【오프닝】 사용자가 회의 시작을 요청했습니다:
→ 참석자 전원(${attendeeList})을 환영하며 소개하세요.
→ 오늘 회의 의제를 선언하세요.
→ [발언권:] 없이 오프닝 멘트로만 마무리해도 됩니다.` : ''}`;
  }

  return `${persona.systemPrompt}${contextBlock}${prevContext}

--- 회의 컨텍스트 ---
참석자: ${attendeeList}
사회자(${facilitatorName})가 발언권을 주었습니다.

자신의 전문 분야와 철학에 충실하게 핵심 의견을 말씀해 주세요.
다른 참석자의 발언에 동의하지 않으면 반박해도 됩니다.
다른 참석자의 발언을 인용하거나 반응해도 좋습니다. 자연스럽게 대화하세요.`;
}

// ─── API 메시지 변환 (alternating roles) ──────────────────────
function buildApiMessages(
  messages: Message[],
  personaId: string,
  personas: Persona[]
): { role: string; content: string }[] {
  const raw: { role: string; content: string }[] = [];

  for (const msg of messages) {
    if (!msg.content) continue;
    if (msg.personaId === personaId) {
      raw.push({ role: 'assistant', content: msg.content });
    } else if (msg.personaId === 'user') {
      raw.push({ role: 'user', content: msg.content });
    } else {
      const p = personas.find(x => x.id === msg.personaId);
      const label = p ? `[${p.name}(${p.role})]` : '[참석자]';
      raw.push({ role: 'user', content: `${label}: ${msg.content}` });
    }
  }

  // 연속된 동일 role 합치기
  const merged: { role: string; content: string }[] = [];
  for (const msg of raw) {
    const last = merged[merged.length - 1];
    if (last && last.role === msg.role) {
      last.content += '\n\n' + msg.content;
    } else {
      merged.push({ ...msg });
    }
  }

  // 반드시 user로 시작
  if (merged.length > 0 && merged[0].role === 'assistant') {
    merged.unshift({ role: 'user', content: '(회의 시작)' });
  }

  return merged;
}

// ─── 사회자 없을 때 관련 발언자 자동 선택 ─────────────────────
async function autoRouteSpeakers(
  userMessage: string,
  attendees: Persona[],
  settings: Settings,
): Promise<Persona[]> {
  // 설정된 모델이 있는 첫 번째 참석자의 provider/model/key 사용
  const firstConfig = attendees
    .map(p => ({ p, cfg: settings.personaModels[p.id] }))
    .find(({ cfg }) => cfg?.modelId);

  if (!firstConfig) return [attendees[0]];

  const { p: anchor, cfg } = firstConfig;
  const apiKey = settings.apiKeys[cfg.provider as Provider];
  const attendeeList = attendees.map(p => `- ${p.name}: ${p.role}`).join('\n');

  const systemPrompt = `당신은 회의 라우터입니다. 사용자 메시지를 분석해 아래 참석자 중 가장 적합한 1~2명을 선택하세요.

참석자 목록:
${attendeeList}

반드시 이 형식으로만 응답하세요: [발언권: 이름] 또는 [발언권: 이름1, 이름2]
다른 텍스트는 절대 포함하지 마세요.`;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
      body: JSON.stringify({
        provider: cfg.provider,
        apiKey,
        model: cfg.modelId,
        systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'chunk') fullText += data.text;
        } catch {}
      }
    }

    const speakers = parseSpeakers(fullText, attendees);
    return speakers.length > 0 ? speakers : [anchor];
  } catch {
    return [anchor];
  }
}

// ─── 스트리밍 API 호출 ─────────────────────────────────────────
async function streamCall({
  persona,
  settings,
  systemPrompt,
  apiMessages,
  attachments,
  onStart,
  onChunk,
  onDone,
}: {
  persona: Persona;
  settings: Settings;
  systemPrompt: string;
  apiMessages: { role: string; content: string }[];
  attachments?: Attachment[];
  onStart: (id: string) => void;
  onChunk: (id: string, text: string) => void;
  onDone: (id: string, fullText: string) => void;
}): Promise<{ id: string; text: string }> {
  const config = settings.personaModels[persona.id];
  const id = newId();

  if (!config?.modelId) {
    onStart(id);
    onDone(id, `(모델이 설정되지 않았습니다)`);
    return { id, text: '' };
  }

  const apiKey = settings.apiKeys[config.provider as Provider];
  onStart(id);

  let fullText = '';
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
      body: JSON.stringify({
        provider: config.provider,
        apiKey,
        model: config.modelId,
        systemPrompt,
        messages: apiMessages,
        attachments: attachments ?? [],
      }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'chunk') {
            fullText += data.text;
            onChunk(id, data.text);
          } else if (data.type === 'error') {
            fullText += `⚠️ API 오류: ${data.message}`;
          }
        } catch {}
      }
    }
  } catch (err) {
    fullText = `(오류: ${err instanceof Error ? err.message : '알 수 없는 오류'})`;
  }

  onDone(id, fullText);
  return { id, text: fullText };
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────
export default function App() {
  const { user, profile, tier, loading, signIn, signUp, signInWithGoogle, signOut, updateProfile, updateApiKeys, loadApiKeys, verifyLicense, getAuthHeader } = useAuth();
  const permissions = TIER_CONFIG[tier];
  const { hasUpdate, latestInfo, dismiss, applyUpdate } = useUpdateCheck();

  const [showAuth, setShowAuth] = useState(false);
  const [started, setStarted] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [selectedMeetings, setSelectedMeetings] = useState<Meeting[]>([]);

  const handleSelectMeeting = useCallback((meeting: Meeting) => {
    setSelectedMeetings(prev =>
      prev.find(m => m.id === meeting.id)
        ? prev.filter(m => m.id !== meeting.id)
        : [...prev, meeting]
    );
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [facilitatorId, setFacilitatorId] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const conversationRef = useRef<Message[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { settings, setApiKey: setApiKeyLocal, persist, setPersonaModel, toggleAttendee, savePersona, deletePersona } = useSettings();

  // 로그인 후 DB에서 복호화된 API 키를 로컬 settings에 동기화
  useEffect(() => {
    if (!profile?.id) return;
    loadApiKeys().then(dbKeys => {
      if (!dbKeys) return;
      const hasAny = Object.values(dbKeys).some(v => v);
      if (!hasAny) return;
      persist({ ...settings, apiKeys: { gemini: '', anthropic: '', openai: '', ...dbKeys } });
    });
  // profile.id가 바뀔 때(로그인/계정 전환)만 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // API 키 변경 시 로컬 + DB 동시 저장
  const setApiKey = useCallback((provider: Provider, key: string) => {
    setApiKeyLocal(provider, key);
    const next = { ...settings.apiKeys, [provider]: key };
    updateApiKeys(next);
  }, [settings.apiKeys, setApiKeyLocal, updateApiKeys]);

  const handleSavePersona = useCallback((persona: Persona) => {
    savePersona(persona);
  }, [savePersona]);

  const handleDeletePersona = useCallback((personaId: string) => {
    deletePersona(personaId);
  }, [deletePersona]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const attendees = settings.attendeeIds
    .map(id => settings.personas.find(p => p.id === id))
    .filter((p): p is Persona => !!p);

  // tier에 맞게 attendeeIds 초과분 자동 제거
  useEffect(() => {
    if (settings.attendeeIds.length > permissions.maxAttendees) {
      const trimmed = settings.attendeeIds.slice(0, permissions.maxAttendees);
      settings.attendeeIds.forEach((id, i) => {
        if (i >= permissions.maxAttendees) toggleAttendee(id);
      });
      console.log('[tier] attendeeIds trimmed to', trimmed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  useEffect(() => {
    const f = getFacilitator(attendees);
    setFacilitatorId(f?.id ?? '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.attendeeIds.join(',')]);

  const facilitator = facilitatorId ? (attendees.find(p => p.id === facilitatorId) ?? null) : null;

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    if (attendees.length === 0) {
      alert('참석자를 최소 1명 이상 선택해주세요.');
      return;
    }

    console.log('[sendMessage] start', { text, attendees: attendees.map(a => a.name), facilitator: facilitator?.name });

    const currentAttachments = [...attachments];
    const userMsg: Message = {
      id: newId(),
      personaId: 'user',
      content: text.trim(),
      timestamp: Date.now(),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setStreaming(true);

    // conversation은 ref로 관리 (루프 내에서 최신 상태 유지)
    conversationRef.current = [...messagesRef.current, userMsg];

    const isOpening = /회의\s*시작/.test(text);

    // 특정 페르소나를 스트리밍하는 헬퍼
    // 첫 번째 응답자에게만 첨부파일 전달 (이후 발언자는 텍스트 컨텍스트로 충분)
    let attachmentsSent = false;
    const streamPersona = async (persona: Persona, isFacilitatorRole: boolean, opening = false): Promise<string> => {
      const sysPrompt = buildSystemPrompt(persona, isFacilitatorRole, attendees, facilitator?.name ?? '', selectedMeetings, profile?.user_context, opening);
      const apiMsgs = buildApiMessages(conversationRef.current, persona.id, settings.personas);
      const toSend = !attachmentsSent ? currentAttachments : [];
      if (!attachmentsSent && currentAttachments.length > 0) attachmentsSent = true;

      const result = await streamCall({
        persona,
        settings,
        systemPrompt: sysPrompt,
        apiMessages: apiMsgs,
        attachments: toSend,
        onStart: (id) => {
          setMessages(prev => [...prev, {
            id, personaId: persona.id, content: '', timestamp: Date.now(), streaming: true,
          }]);
        },
        onChunk: (id, chunk) => {
          setMessages(prev => prev.map(m =>
            m.id === id ? { ...m, content: m.content + chunk } : m
          ));
        },
        onDone: (id, full) => {
          // 사회자 발언에서 태그 제거 후 표시
          const display = isFacilitatorRole ? stripTags(full) : full;
          setMessages(prev => prev.map(m =>
            m.id === id ? { ...m, content: display, streaming: false } : m
          ));
        },
      });

      // conversation에는 원문(태그 포함) 저장
      conversationRef.current = [...conversationRef.current, {
        id: result.id,
        personaId: persona.id,
        content: result.text,
        timestamp: Date.now(),
      }];

      return result.text;
    };

    const nonFacilitators = attendees.filter(p => p.id !== facilitator?.id);

    try {
      // ── 직접 호출: @멘션 또는 이름으로 시작 ──────────────────
      const mentionedPerson = parseMention(text, attendees);
      if (mentionedPerson) {
        console.log('[sendMessage] direct call →', mentionedPerson.name);
        const isFacRole = mentionedPerson.id === facilitator?.id;
        await streamPersona(mentionedPerson, isFacRole, isFacRole && isOpening);
        return;
      }

      // ── 사회자 없으면 대화 내용 분석 후 관련 참석자만 응답 ──────
      if (!facilitator) {
        console.log('[sendMessage] no facilitator → autoRoute');
        const speakers = await autoRouteSpeakers(text, attendees, settings);
        console.log('[sendMessage] autoRoute speakers:', speakers.map(s => s.name));
        for (const p of speakers) {
          await streamPersona(p, false);
        }
        return;
      }

      // ── 참석자 1명이면 직접 발언 ───────────────────────────────
      if (attendees.length === 1) {
        console.log('[sendMessage] single attendee →', attendees[0].name);
        await streamPersona(attendees[0], false);
        return;
      }

      // ── 사회자 발언 (1회만) ───────────────────────────────────
      console.log('[sendMessage] facilitator speaks →', facilitator.name);
      const facilitatorText = await streamPersona(facilitator, true, isOpening);
      let speakers = parseSpeakers(facilitatorText, nonFacilitators);
      console.log('[sendMessage] facilitator delegated to:', speakers.map(s => s.name));

      // [발언권:] 태그가 없을 때 — 사회자 발언에서 이름 직접 언급 찾기
      if (speakers.length === 0 && !isOpening) {
        const mentioned = nonFacilitators.filter(p =>
          facilitatorText.includes(p.name)
        );
        if (mentioned.length > 0) speakers = mentioned.slice(0, 2);
      }

      for (const speaker of speakers) {
        await streamPersona(speaker, false);
      }
    } catch (err) {
      console.error('[sendMessage] error:', err);
      setMessages(prev => [...prev, {
        id: newId(),
        personaId: 'user',
        content: `⚠️ 오류: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setStreaming(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming, settings, attendees, facilitator]);

  // 회의 중 참석자 토글 — 늦참/조퇴 발언 후 처리
  const handleToggleAttendee = useCallback(async (personaId: string) => {
    if (!started) {
      toggleAttendee(personaId);
      return;
    }

    const persona = settings.personas.find(p => p.id === personaId);
    if (!persona) return;

    const isCurrentlyAttendee = settings.attendeeIds.includes(personaId);
    const currentAttendees = attendees;
    const attendeeList = currentAttendees.map(p => `${p.name}(${p.role})`).join(', ');

    // 최근 대화 컨텍스트 (마지막 6개)
    const recentContext = messagesRef.current.slice(-6)
      .filter(m => m.content.trim())
      .map(m => {
        if (m.personaId === 'user') return `[대표님]: ${m.content}`;
        const p = settings.personas.find(x => x.id === m.personaId);
        return `[${p?.name ?? '참석자'}]: ${m.content}`;
      }).join('\n');

    if (!isCurrentlyAttendee) {
      // ── 늦게 참석 ──
      toggleAttendee(personaId);
      const sysPrompt = `${persona.systemPrompt}

당신은 지금 진행 중인 회의에 방금 늦게 도착했습니다.
현재 참석자: ${attendeeList}
${recentContext ? `\n현재 논의 중인 내용:\n${recentContext}` : ''}

자신의 성격과 직책에 맞게 자연스럽게 늦은 것을 사과하고 자리에 앉는 한마디를 하세요. 2~3문장 이내로.`;

      await streamCall({
        persona,
        settings,
        systemPrompt: sysPrompt,
        apiMessages: [{ role: 'user', content: '(회의 중 늦게 도착)' }],
        onStart: (id) => setMessages(prev => [...prev, { id, personaId: persona.id, content: '', timestamp: Date.now(), streaming: true }]),
        onChunk: (id, chunk) => setMessages(prev => prev.map(m => m.id === id ? { ...m, content: m.content + chunk } : m)),
        onDone: (id, full) => setMessages(prev => prev.map(m => m.id === id ? { ...m, content: full, streaming: false } : m)),
      });
    } else {
      // ── 조기 퇴장 ──
      const sysPrompt = `${persona.systemPrompt}

당신은 지금 진행 중인 회의에서 급한 사정으로 먼저 자리를 떠야 합니다.
현재 참석자: ${attendeeList}
${recentContext ? `\n현재 논의 중인 내용:\n${recentContext}` : ''}

자신의 성격과 직책에 맞게 자연스럽게 양해를 구하고 퇴장하는 한마디를 하세요. 2~3문장 이내로.`;

      await streamCall({
        persona,
        settings,
        systemPrompt: sysPrompt,
        apiMessages: [{ role: 'user', content: '(회의 중 먼저 퇴장)' }],
        onStart: (id) => setMessages(prev => [...prev, { id, personaId: persona.id, content: '', timestamp: Date.now(), streaming: true }]),
        onChunk: (id, chunk) => setMessages(prev => prev.map(m => m.id === id ? { ...m, content: m.content + chunk } : m)),
        onDone: (id, full) => {
          setMessages(prev => prev.map(m => m.id === id ? { ...m, content: full, streaming: false } : m));
          toggleAttendee(personaId);
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, settings, attendees, toggleAttendee]);

  const { listening, start: startVoice, stop: stopVoice } = useVoice((text) => {
    setInput(prev => prev + (prev ? ' ' : '') + text);
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const updateBanner = hasUpdate && latestInfo ? (
    <UpdateBanner
      buildAt={latestInfo.buildAt}
      onUpdate={applyUpdate}
      onDismiss={dismiss}
    />
  ) : null;

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  // 로그인 전
  if (!user) {
    if (showAuth) {
      return <>{updateBanner}<AuthScreen onSignIn={signIn} onSignUp={signUp} onGoogleSignIn={signInWithGoogle} onBack={() => setShowAuth(false)} /></>;
    }
    return <>{updateBanner}<LandingPage onStart={() => setShowAuth(true)} /></>;
  }

  // 로비 (회의 시작 전, 프로필 로딩 완료 후)
  if (!started && profile) {
    return (
      <>{updateBanner}<LobbyScreen
        settings={settings}
        facilitatorId={facilitatorId}
        permissions={permissions}
        tier={tier}
        profile={profile!}
        selectedMeetings={selectedMeetings}
        onSelectMeeting={handleSelectMeeting}
        onToggleAttendee={toggleAttendee}
        onSavePersona={handleSavePersona}
        onModelChange={(personaId, provider, modelId) => setPersonaModel(personaId, { provider: provider as Provider, modelId })}
        onApiKeyChange={setApiKey}
        onImport={persist}
        onStart={() => setStarted(true)}
        onSignOut={signOut}
        onUpdateProfile={updateProfile as (updates: { display_name?: string; user_context?: string }) => Promise<void>}
        getAuthHeader={getAuthHeader}
        onUpgradeSuccess={(_newTier, _expiresAt) => {
          if (user) verifyLicense(user);
        }}
      /></>
    );
  }

  return (
    <>
    {updateBanner}
    <div className={`flex h-screen bg-gray-950 text-white overflow-hidden ${hasUpdate ? 'pt-10' : ''}`}>
      {/* 사이드바 */}
      <AttendeeSidebar
        settings={settings}
        facilitatorId={facilitatorId}
        onSetFacilitator={setFacilitatorId}
        onToggleAttendee={handleToggleAttendee}
        onSavePersona={handleSavePersona}
        onDeletePersona={handleDeletePersona}

        permissions={permissions}
        onSignOut={signOut}
      />

      {/* 채팅 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 헤더 */}
        <header className="flex items-center gap-3 px-6 py-3 border-b border-gray-800 bg-gray-950">
          <button
            onClick={() => {
              if (messages.length > 0) {
                setShowExitConfirm(true);
              } else {
                setStarted(false);
              }
            }}
            className="text-gray-300 hover:text-white text-xs font-medium transition-colors flex-shrink-0 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 border border-gray-600"
            title="멤버 변경 / 새 회의"
          >← 로비</button>
          {messages.length > 0 && (
            <button
              onClick={() => setShowEndModal(true)}
              disabled={streaming}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-900/70 hover:bg-red-800 text-red-300 hover:text-red-200 font-medium border border-red-800 transition-colors flex-shrink-0 disabled:opacity-40"
            >
              회의 종료
            </button>
          )}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {attendees.length === 0 ? (
              <p className="text-gray-400 text-sm">참석자를 선택해주세요</p>
            ) : (
              <>
                <div className="flex -space-x-1.5">
                  {attendees.slice(0, 7).map(p => (
                    <div
                      key={p.id}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 border-gray-950"
                      style={{ backgroundColor: p.color.bg }}
                      title={`${p.name}(${p.role})${p.id === facilitatorId ? ' · 사회자' : ''}`}
                    >
                      {p.id === facilitatorId ? '🎤' : p.emoji}
                    </div>
                  ))}
                  {attendees.length > 7 && (
                    <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs border-2 border-gray-950">
                      +{attendees.length - 7}
                    </div>
                  )}
                </div>
                <span className="text-gray-300 text-sm ml-1.5 truncate">
                  {facilitator && <span className="text-indigo-400">🎤 {facilitator.name}</span>}
                  {attendees.filter(p => p.id !== facilitatorId).length > 0 && (
                    <span className="text-gray-400">
                      {' '}· {attendees.filter(p => p.id !== facilitatorId).map(p => p.name).join(', ')}
                    </span>
                  )}
                </span>
              </>
            )}
          </div>
        </header>

        {/* 메시지 */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="flex -space-x-3 mb-6">
                {attendees.slice(0, 5).map(p => (
                  <div
                    key={p.id}
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl border-4 border-gray-950"
                    style={{ backgroundColor: p.color.bg }}
                  >
                    {p.id === facilitatorId ? '🎤' : p.emoji}
                  </div>
                ))}
              </div>
              {attendees.length > 0 ? (
                <>
                  <h2 className="text-xl font-semibold text-white mb-2">회의를 시작하세요</h2>
                  <p className="text-gray-400 text-sm">
                    <span className="text-indigo-400">{facilitator?.name}</span>이(가) 사회를 맡아 진행합니다.<br />
                    논의할 주제나 질문을 입력하세요. <span className="text-gray-400">@이름</span>으로 특정 인물에게 직접 질문할 수 있습니다.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-white mb-2">AEGIS</h2>
                  <p className="text-gray-400 text-sm">왼쪽에서 참석자를 선택하여 회의를 시작하세요.</p>
                </>
              )}
            </div>
          )}
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              personas={settings.personas}
              facilitatorId={facilitatorId}
            />
          ))}
          <div ref={bottomRef} />
        </main>

        {/* 입력창 */}
        <footer className="border-t border-gray-800 bg-gray-950">
          <FileAttachmentBar
            attachments={attachments}
            onAdd={files => setAttachments(prev => [...prev, ...files])}
            onRemove={i => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
            inputRef={fileInputRef}
          />
          <div className="flex gap-3 items-end px-6 py-4 max-w-4xl mx-auto">
            {/* 📎 파일 업로드 (Enterprise) */}
            {permissions.canUploadFiles && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={streaming}
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-800 hover:bg-gray-700 transition-all disabled:opacity-40"
                title="파일 첨부"
              >
                📎
              </button>
            )}
            <button
              onMouseDown={startVoice}
              onMouseUp={stopVoice}
              onTouchStart={startVoice}
              onTouchEnd={stopVoice}
              className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                listening ? 'bg-red-500 animate-pulse scale-110' : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title="꾹 눌러서 음성 입력"
            >
              🎤
            </button>

            <div className="flex-1 bg-gray-800 rounded-2xl border border-gray-700 focus-within:border-gray-500 transition-colors">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="회의 안건이나 질문을 입력하세요... (@이름으로 특정 인물 지목 가능)"
                rows={1}
                disabled={streaming}
                className="w-full bg-transparent text-white placeholder-gray-500 px-4 py-3 text-sm resize-none focus:outline-none max-h-32"
                style={{ minHeight: '44px' }}
                onInput={e => {
                  const t = e.currentTarget;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 128) + 'px';
                }}
              />
            </div>

            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                !input.trim() || streaming
                  ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {streaming ? (
                <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              ) : '↑'}
            </button>
          </div>
        </footer>
      </div>


      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-white font-bold text-lg mb-2">로비로 나가시겠습니까?</h3>
            <p className="text-gray-400 text-sm mb-6">저장하지 않은 회의 내용이 모두 사라집니다.</p>
            <div className="space-y-2">
              <button
                onClick={() => { setShowEndModal(true); setShowExitConfirm(false); }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
              >
                📋 회의 요약 후 나가기
              </button>
              <button
                onClick={() => { setShowExitConfirm(false); setStarted(false); setMessages([]); }}
                className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
              >
                저장 없이 나가기
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-2 text-gray-400 hover:text-gray-300 text-sm transition-colors"
              >
                취소 (회의 계속)
              </button>
            </div>
          </div>
        </div>
      )}
      {showEndModal && (
        <MeetingEndModal
          messages={messages}
          attendees={attendees}
          settings={settings}
          userId={user.id}
          onExit={() => { setShowEndModal(false); setStarted(false); setMessages([]); }}
          onClose={() => setShowEndModal(false)}
        />
      )}
    </div>
    </>
  );
}
