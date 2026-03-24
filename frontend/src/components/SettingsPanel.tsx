import { useState, useEffect } from 'react';
import { getAuthHeaders } from '../lib/supabase';
import type { Settings, Provider, ModelOption } from '../types';

interface Props {
  settings: Settings;
  onClose: () => void;
  onApiKeyChange: (provider: Provider, key: string) => void;
  onPersonaModelChange: (personaId: string, provider: Provider, modelId: string) => void;
}

const PROVIDERS: { id: Provider; name: string }[] = [
  { id: 'gemini', name: 'Google Gemini' },
  { id: 'anthropic', name: 'Anthropic Claude' },
  { id: 'openai', name: 'OpenAI' },
];

export default function SettingsPanel({ settings, onClose, onApiKeyChange, onPersonaModelChange }: Props) {
  const [models, setModels] = useState<Record<Provider, ModelOption[]>>({
    gemini: [], anthropic: [], openai: [],
  });
  const [loading, setLoading] = useState<Record<Provider, boolean>>({
    gemini: false, anthropic: false, openai: false,
  });
  const [errors, setErrors] = useState<Record<Provider, string>>({
    gemini: '', anthropic: '', openai: '',
  });

  const fetchModels = async (provider: Provider) => {
    const key = settings.apiKeys[provider];
    if (!key) return;
    setLoading(prev => ({ ...prev, [provider]: true }));
    setErrors(prev => ({ ...prev, [provider]: '' }));
    try {
      const res = await fetch(`/api/models?provider=${provider}&key=${encodeURIComponent(key)}`, { headers: await getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setModels(prev => ({ ...prev, [provider]: data.models }));
    } catch (err: unknown) {
      setErrors(prev => ({ ...prev, [provider]: err instanceof Error ? err.message : 'Error' }));
    } finally {
      setLoading(prev => ({ ...prev, [provider]: false }));
    }
  };

  useEffect(() => {
    if (settings.apiKeys.gemini && models.gemini.length === 0) fetchModels('gemini');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-gray-900 border-l border-gray-700 overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">설정</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-6">
          {/* API Keys */}
          <h3 className="text-gray-300 font-medium mb-3 text-xs uppercase tracking-wider">API 키</h3>
          {PROVIDERS.map(p => (
            <div key={p.id} className="mb-4">
              <label className="block text-xs text-gray-300 mb-1">{p.name}</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={settings.apiKeys[p.id]}
                  onChange={e => onApiKeyChange(p.id, e.target.value)}
                  placeholder={`${p.name} API Key`}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                />
                <button
                  onClick={() => fetchModels(p.id)}
                  disabled={!settings.apiKeys[p.id] || loading[p.id]}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded text-sm text-white transition-colors whitespace-nowrap"
                >
                  {loading[p.id] ? '...' : models[p.id].length > 0 ? `${models[p.id].length}개` : '불러오기'}
                </button>
              </div>
              {errors[p.id] && <p className="text-red-400 text-xs mt-1">{errors[p.id]}</p>}
            </div>
          ))}

          <div className="border-t border-gray-700 my-6" />

          {/* 페르소나별 모델 */}
          <h3 className="text-gray-300 font-medium mb-4 text-xs uppercase tracking-wider">인물별 AI 모델</h3>
          <div className="space-y-3">
            {settings.personas.map(persona => {
              const current = settings.personaModels[persona.id] ?? { provider: 'gemini' as Provider, modelId: '' };
              const availableModels = models[current.provider] ?? [];
              return (
                <div key={persona.id} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                      style={{ backgroundColor: persona.color.bg }}
                    >
                      {persona.emoji}
                    </div>
                    <p className="text-sm font-medium" style={{ color: persona.color.text }}>
                      {persona.name}
                    </p>
                    <p className="text-gray-400 text-xs">{persona.role}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={current.provider}
                      onChange={e => {
                        const prov = e.target.value as Provider;
                        const firstModel = models[prov]?.[0]?.id || '';
                        onPersonaModelChange(persona.id, prov, firstModel);
                      }}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
                    >
                      {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select
                      value={current.modelId}
                      onChange={e => onPersonaModelChange(persona.id, current.provider, e.target.value)}
                      disabled={availableModels.length === 0}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
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
      </div>
    </div>
  );
}
