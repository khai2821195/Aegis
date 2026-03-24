import { useState } from 'react';
import type { Persona } from '../types';
import { PRESET_COLORS } from '../config/personas';

const EMOJIS = ['💼','⚙️','🚀','🎨','📣','💰','⚖️','🗂️','🧑‍💻','📊','🎯','🔬','🏛️','🌐','📐','🎭','🧠','💡','🔧','🛡️'];

interface Props {
  initial?: Partial<Persona>;
  onSave: (persona: Persona) => void;
  onClose: () => void;
}

export default function PersonaEditor({ initial, onSave, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '💼');
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]);
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? '');

  const handleSave = () => {
    if (!name.trim() || !role.trim() || !systemPrompt.trim()) return;
    const persona: Persona = {
      id: initial?.id ?? `custom-${Date.now()}`,
      name: name.trim(),
      role: role.trim(),
      emoji,
      color,
      systemPrompt: systemPrompt.trim(),
      isCustom: true,
    };
    onSave(persona);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-white font-semibold text-lg">
            {initial?.id ? '인물 편집' : '새 인물 추가'}
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white">✕</button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          {/* 미리보기 */}
          <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: color.bg }}
            >
              {emoji}
            </div>
            <div>
              <p className="font-semibold" style={{ color: color.text }}>{name || '이름'}</p>
              <p className="text-gray-300 text-sm">{role || '역할'}</p>
            </div>
          </div>

          {/* 이름 / 역할 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-300 mb-1">이름</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="예: 앤드류"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">역할</label>
              <input
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="예: CTO"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
              />
            </div>
          </div>

          {/* 이모지 선택 */}
          <div>
            <label className="block text-xs text-gray-300 mb-2">아이콘</label>
            <div className="flex flex-wrap gap-2">
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
          </div>

          {/* 색상 선택 */}
          <div>
            <label className="block text-xs text-gray-300 mb-2">색상</label>
            <div className="flex flex-wrap gap-2">
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
          </div>

          {/* 시스템 프롬프트 */}
          <div>
            <label className="block text-xs text-gray-300 mb-1">
              페르소나 설정 <span className="text-gray-400">(AI에게 주는 역할 지시)</span>
            </label>
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              placeholder={`예) 당신은 앤드류입니다. 경험 많은 데이터 과학자로서...\n성격, 말투, 전문 분야, 역할을 구체적으로 작성해주세요.`}
              rows={6}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-700">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition-colors">
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !role.trim() || !systemPrompt.trim()}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm text-white font-medium transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
