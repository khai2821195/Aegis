import { useState } from 'react';
import type { Persona, Settings } from '../types';
import type { TierConfig } from '../config/tiers';
import PersonaEditor from './PersonaEditor';

interface Props {
  settings: Settings;
  facilitatorId: string;
  onSetFacilitator: (id: string) => void;
  onToggleAttendee: (id: string) => void;
  onSavePersona: (p: Persona) => void;
  onDeletePersona: (id: string) => void;
  permissions: TierConfig;
  onSignOut: () => void;
}

export default function AttendeeSidebar({
  settings,
  facilitatorId,
  onSetFacilitator,
  onToggleAttendee,
  onSavePersona,
  onDeletePersona,
  permissions,
  onSignOut,
}: Props) {
  const [editingPersona, setEditingPersona] = useState<Partial<Persona> | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const { personas, attendeeIds } = settings;
  const count = attendeeIds.length;
  const { maxAttendees, canEditPersona, canAddDeletePersona, badge, label } = permissions;

  return (
    <>
      <aside className="w-64 flex flex-col bg-gray-950 border-r border-gray-800 h-full">
        {/* 헤더 */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-semibold text-sm">AEGIS</h2>
            <div className="flex items-center gap-1.5">
<button
                onClick={onSignOut}
                className="text-gray-400 hover:text-gray-300 transition-colors text-xs"
                title="로그아웃"
              >↩</button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-xs">
              참석자 <span className={count > 0 ? 'text-indigo-400 font-medium' : ''}>{count}</span>/{maxAttendees}명
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge}`}>
              {label}
            </span>
          </div>
        </div>

        {/* 사회자 안내 */}
        {count > 0 && (
          <div className="px-4 py-2 border-b border-gray-800 bg-gray-900/50">
            <p className="text-xs text-gray-400 mb-1">🎤 사회자 <span className="text-gray-400">(클릭으로 변경)</span></p>
            <div className="flex flex-wrap gap-1">
              {attendeeIds.map(id => {
                const p = personas.find(x => x.id === id);
                if (!p) return null;
                const isF = id === facilitatorId;
                return (
                  <button
                    key={id}
                    onClick={() => onSetFacilitator(id)}
                    className={`px-2 py-0.5 rounded-full text-xs transition-all ${
                      isF
                        ? 'text-white font-medium ring-1 ring-indigo-400'
                        : 'text-gray-300 hover:text-gray-200'
                    }`}
                    style={{ backgroundColor: isF ? p.color.bg + 'cc' : 'transparent' }}
                  >
                    {isF ? '🎤 ' : ''}{p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 페르소나 목록 */}
        <div className="flex-1 overflow-y-auto py-2">
          {personas.map(persona => {
            const isAttendee = attendeeIds.includes(persona.id);
            const isFacilitator = persona.id === facilitatorId;
            const canAdd = !isAttendee && count < maxAttendees;

            return (
              <div
                key={persona.id}
                className={`flex items-center gap-2 px-3 py-2 mx-2 rounded-lg transition-colors group ${
                  isAttendee ? 'bg-gray-800' : 'hover:bg-gray-900'
                }`}
              >
                {/* 아바타 */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 relative"
                  style={{ backgroundColor: persona.color.bg }}
                >
                  {isFacilitator ? '🎤' : persona.emoji}
                </div>

                {/* 이름/역할 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: persona.color.text }}>
                    {persona.name}
                    {isFacilitator && <span className="text-xs text-indigo-400 ml-1">사회</span>}
                  </p>
                  <p className="text-gray-400 text-xs truncate">{persona.role}</p>
                </div>

                {/* 편집 (Pro+) */}
                {canEditPersona && (
                  <button
                    onClick={() => { setEditingPersona(persona); setShowEditor(true); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-300 text-xs transition-all flex-shrink-0"
                    title="편집"
                  >✏️</button>
                )}

                {/* 삭제 (Enterprise+, 커스텀만) */}
                {canAddDeletePersona && persona.isCustom && (
                  <button
                    onClick={() => {
                      if (confirm(`"${persona.name}"을(를) 삭제하시겠습니까?`)) {
                        onDeletePersona(persona.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 text-xs transition-all flex-shrink-0"
                    title="삭제"
                  >🗑️</button>
                )}

                {/* 참석 토글 */}
                <button
                  onClick={() => onToggleAttendee(persona.id)}
                  disabled={!isAttendee && !canAdd}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 transition-all ${
                    isAttendee
                      ? 'bg-indigo-600 text-white hover:bg-red-500'
                      : canAdd
                        ? 'bg-gray-700 text-gray-300 hover:bg-indigo-600 hover:text-white'
                        : 'bg-gray-800 text-gray-700 cursor-not-allowed'
                  }`}
                  title={isAttendee ? '참석 취소' : canAdd ? '참석 추가' : `최대 ${maxAttendees}명 (${label})`}
                >
                  {isAttendee ? '✓' : '+'}
                </button>
              </div>
            );
          })}
        </div>

        {/* 새 인물 추가 (Enterprise+) */}
        {canAddDeletePersona && (
          <div className="p-3 border-t border-gray-800">
            {settings.personas.length >= 20 ? (
              <p className="text-center text-gray-400 text-xs py-2">최대 20명까지 등록 가능합니다</p>
            ) : (
              <button
                onClick={() => { setEditingPersona({}); setShowEditor(true); }}
                className="w-full py-2 rounded-lg border border-dashed border-gray-700 hover:border-gray-500 text-gray-400 hover:text-gray-300 text-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>+</span> 새 인물 추가 ({settings.personas.length}/20)
              </button>
            )}
          </div>
        )}
      </aside>

      {showEditor && (
        <PersonaEditor
          initial={editingPersona ?? {}}
          onSave={onSavePersona}
          onClose={() => setShowEditor(false)}
        />
      )}
    </>
  );
}
