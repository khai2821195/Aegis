import { useState } from 'react';
import type { Persona, Provider, Settings, ModelOption } from '../types';
import type { TierConfig } from '../config/tiers';
import { PRESET_COLORS } from '../config/personas';
import { getAuthHeaders } from '../lib/supabase';

const EMOJIS = ['💼','⚙️','🚀','🎨','📣','💰','⚖️','🗂️','🧑‍💻','📊','🎯','🔬','🏛️','🌐','📐','🎭','🧠','💡','🔧','🛡️'];
const PROVIDERS: { id: Provider; name: string }[] = [
  { id: 'gemini',    name: 'Gemini' },
  { id: 'anthropic', name: 'Claude' },
  { id: 'openai',    name: 'OpenAI' },
];

interface Props {
  persona: Persona;
  settings: Settings;
  permissions: TierConfig;
  onSave: (persona: Persona) => void;
  onModelChange: (personaId: string, provider: Provider, modelId: string) => void;
  onClose: () => void;
}

export default function PersonaEditPanel({
  persona,
  settings,
  permissions,
  onSave,
  onModelChange,
  onClose,
}: Props) {
  const { canEditPersona } = permissions;

  // 페르소나 필드
  const [name, setName]               = useState(persona.name);
  const [role, setRole]               = useState(persona.role);
  const [emoji, setEmoji]             = useState(persona.emoji);
  const [color, setColor]             = useState(persona.color);
  const [systemPrompt, setSystemPrompt] = useState(persona.systemPrompt);

  // 모델 설정
  const currentModel = settings.personaModels[persona.id] ?? { provider: 'gemini' as Provider, modelId: '' };
  const [provider, setProvider] = useState<Provider>(currentModel.provider);
  const [modelId, setModelId]   = useState(currentModel.modelId);
  const [models, setModels]     = useState<ModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError]       = useState('');

  const [saved, setSaved] = useState(false);

  async function fetchModels() {
    const key = settings.apiKeys[provider];
    if (!key) { setModelError('API 키가 없습니다. 설정에서 먼저 입력해주세요.'); return; }
    setLoadingModels(true);
    setModelError('');
    try {
      const res = await fetch(`/api/models?provider=${provider}&key=${encodeURIComponent(key)}`, { headers: await getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setModels(data.models);
    } catch (err) {
      setModelError(err instanceof Error ? err.message : '불러오기 실패');
    } finally {
      setLoadingModels(false);
    }
  }

  function handleSave() {
    if (!name.trim() || !role.trim()) return;
    onSave({ ...persona, name: name.trim(), role: role.trim(), emoji, color, systemPrompt });
    onModelChange(persona.id, provider, modelId);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  }

  const readOnly = !canEditPersona;

  return (
    <>
      {/* 오버레이 */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* 슬라이드 패널 */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-gray-900 border-l border-gray-800 flex flex-col shadow-2xl animate-slide-in">

        {/* 헤더 */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: color.bg }}
          >
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: color.text }}>{name || '이름 없음'}</p>
            <p className="text-gray-400 text-xs truncate">{role || '역할 없음'}</p>
          </div>
          {readOnly && (
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-full flex-shrink-0">읽기 전용</span>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300 text-lg transition-colors flex-shrink-0">✕</button>
        </div>

        {/* 본문 스크롤 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* ── 기본 정보 ── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">기본 정보</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">이름</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={readOnly}
                  placeholder="예: 앤드류"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">역할</label>
                <input
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  disabled={readOnly}
                  placeholder="예: CTO"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                />
              </div>
            </div>
          </section>

          {/* ── 아이콘 ── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">아이콘</h3>
            <div className={`flex flex-wrap gap-2 ${readOnly ? 'opacity-40 pointer-events-none' : ''}`}>
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                    emoji === e ? 'bg-gray-600 ring-2 ring-white' : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </section>

          {/* ── 색상 ── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">색상</h3>
            <div className={`flex flex-wrap gap-2 ${readOnly ? 'opacity-40 pointer-events-none' : ''}`}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c.name}
                  onClick={() => setColor(c)}
                  title={c.name}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color.bg === c.bg ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.bg }}
                />
              ))}
            </div>
          </section>

          {/* ── 페르소나 설정 ── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              페르소나 설정
              {readOnly && <span className="ml-2 text-gray-700 normal-case font-normal">Pro 이상에서 편집 가능</span>}
            </h3>
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              disabled={readOnly}
              rows={7}
              placeholder="AI에게 주는 역할 지시. 성격, 말투, 전문 분야를 구체적으로 작성하세요."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed resize-none transition-colors"
            />
          </section>

          {/* ── AI 모델 설정 ── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">AI 모델</h3>
            <div className="space-y-2">
              {/* Provider 선택 */}
              <div className="flex gap-2">
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setProvider(p.id); setModels([]); setModelId(''); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      provider === p.id
                        ? 'bg-indigo-700 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              {/* 모델 선택 + 불러오기 */}
              <div className="flex gap-2">
                <select
                  value={modelId}
                  onChange={e => setModelId(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {models.length === 0 ? (
                    <option value={modelId}>{modelId || '모델을 불러오세요'}</option>
                  ) : (
                    models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                  )}
                </select>
                <button
                  onClick={fetchModels}
                  disabled={loadingModels}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg text-xs text-white transition-colors whitespace-nowrap"
                >
                  {loadingModels ? '...' : models.length > 0 ? `${models.length}개` : '불러오기'}
                </button>
              </div>
              {modelError && <p className="text-red-400 text-xs">{modelError}</p>}
            </div>
          </section>
        </div>

        {/* 푸터 */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !role.trim()}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              saved
                ? 'bg-green-700 text-green-200'
                : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white'
            }`}
          >
            {saved ? '✓ 저장됨' : '저장'}
          </button>
        </div>
      </div>
    </>
  );
}
