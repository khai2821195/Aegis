import { useState } from 'react';
import type { Persona, Settings, Provider } from '../types';
import type { TierConfig, Tier } from '../config/tiers';
import type { Profile } from '../hooks/useAuth';
import UpgradeModal from './UpgradeModal';
import ProfileModal from './ProfileModal';
import PersonaEditPanel from './PersonaEditPanel';
import PersonaEditor from './PersonaEditor';
import MeetingHistoryTab, { type Meeting } from './MeetingHistoryTab';
import HelpModal from './HelpModal';

interface Props {
  settings: Settings;
  facilitatorId: string;
  permissions: TierConfig;
  tier: Tier;
  profile: Profile;
  selectedMeetings: Meeting[];
  onSelectMeeting: (meeting: Meeting) => void;
  onToggleAttendee: (id: string) => void;
  onSavePersona: (p: Persona) => void;
  onModelChange: (personaId: string, provider: Provider, modelId: string) => void;
  onApiKeyChange: (provider: Provider, key: string) => void;
  onImport: (settings: Settings) => void;
  onStart: () => void;
  onSignOut: () => void;
  onUpdateProfile: (updates: { display_name?: string; user_context?: string }) => Promise<void>;
  getAuthHeader: () => Promise<string | null>;
  onUpgradeSuccess: (tier: Tier, planExpiresAt: string) => void;
}

// systemPrompt에서 "역할:" 줄 추출
function extractRole(prompt: string): string {
  const match = prompt.match(/역할:\s*(.+)/);
  if (!match) return '';
  return match[1].trim().replace(/,$/, '');
}

export default function LobbyScreen({
  settings,
  facilitatorId,
  permissions,
  tier,
  profile,
  selectedMeetings,
  onSelectMeeting,
  onToggleAttendee,
  onSavePersona,
  onModelChange,
  onApiKeyChange,
  onImport,
  onStart,
  onSignOut,
  onUpdateProfile,
  getAuthHeader,
  onUpgradeSuccess,
}: Props) {
  const { personas, attendeeIds } = settings;
  const { maxAttendees, label: tierLabel, badge: tierBadge } = permissions;
  const count = attendeeIds.length;
  const canStart = count >= 1;
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [showNewPersona, setShowNewPersona] = useState(false);
  const [activeTab, setActiveTab] = useState<'attendees' | 'history'>('attendees');
  const displayName = profile.display_name || profile.username;

  return (
    <>
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* 상단 헤더 */}
      <header className="border-b border-gray-800 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {['💼','⚙️','🚀','🎨','📣'].map((e, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-sm border-2 border-gray-950"
              >{e}</div>
            ))}
          </div>
          <h1 className="text-white font-bold text-lg">AEGIS<span className="text-indigo-400">:Orbit</span></h1>
        </div>
        <div className="flex items-center gap-3">
          {/* 등급 배지 → 업그레이드 모달 */}
          <button
            onClick={() => setShowUpgrade(true)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-opacity hover:opacity-80 ${tierBadge}`}
            title="플랜 업그레이드"
          >
            {tierLabel} ↑
          </button>
          {/* 아이디 → 프로필 모달 */}
          <button
            onClick={() => setShowProfile(true)}
            className="text-gray-300 hover:text-white text-sm transition-colors px-2 py-1 rounded hover:bg-gray-800 flex items-center gap-1.5"
            title="내 프로필"
          >
            <span className="w-5 h-5 rounded-full bg-indigo-800 flex items-center justify-center text-xs font-bold text-white">
              {displayName[0].toUpperCase()}
            </span>
            {displayName}
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="text-gray-400 hover:text-gray-200 transition-colors w-8 h-8 rounded-full border border-gray-700 hover:border-gray-500 flex items-center justify-center text-sm font-bold"
            title="사용 설명서"
          >
            ?
          </button>
          <button
            onClick={onSignOut}
            className="text-gray-400 hover:text-gray-300 text-sm transition-colors px-2 py-1 rounded hover:bg-gray-800"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 본문 */}
      <main className="flex-1 overflow-y-auto px-8 py-10 max-w-5xl mx-auto w-full">

        {/* 탭 */}
        <div className="flex gap-1 mb-8 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('attendees')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'attendees'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            참석자 선택
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            지난 회의
            {selectedMeetings.length > 0 && <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">{selectedMeetings.length}</span>}
            {!permissions.canViewHistory && <span className="text-xs text-gray-500">🔒</span>}
          </button>
        </div>

        {/* 참석자 선택 탭 */}
        {activeTab === 'attendees' && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">오늘 회의 멤버를 선택하세요</h2>
              <p className="text-gray-400 text-sm">
                참석할 임원을 선택한 뒤 회의를 시작합니다.
                <span className="text-gray-400 ml-2">최대 {maxAttendees}명 ({tierLabel})</span>
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-32">
              {personas.map(persona => {
                const isSelected = attendeeIds.includes(persona.id);
                const isFacilitator = persona.id === facilitatorId;
                const isDisabled = !isSelected && count >= maxAttendees;
                const roleDesc = persona.description || extractRole(persona.systemPrompt);
                return (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    isSelected={isSelected}
                    isFacilitator={isFacilitator}
                    isDisabled={isDisabled}
                    roleDesc={roleDesc}
                    maxAttendees={maxAttendees}
                    canEdit={permissions.canEditPersona}
                    onToggle={() => onToggleAttendee(persona.id)}
                    onEdit={() => setEditingPersona(persona)}
                  />
                );
              })}

              {/* 새 인물 추가 카드 (Enterprise+) */}
              {permissions.canAddDeletePersona && (
                personas.length >= 20 ? (
                  <div className="rounded-2xl border-2 border-gray-800 border-dashed flex items-center justify-center p-4 text-center">
                    <p className="text-gray-400 text-xs">최대 20명<br />등록됨</p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewPersona(true)}
                    className="rounded-2xl border-2 border-dashed border-gray-700 hover:border-gray-500 bg-gray-900/30 hover:bg-gray-900/60 transition-all flex flex-col items-center justify-center gap-2 p-4 text-gray-400 hover:text-gray-300 min-h-[160px]"
                  >
                    <span className="text-3xl">+</span>
                    <span className="text-xs">새 인물 추가<br /><span className="text-gray-500">({personas.length}/20)</span></span>
                  </button>
                )
              )}
            </div>
          </>
        )}

        {/* 지난 회의 탭 */}
        {activeTab === 'history' && (
          permissions.canViewHistory ? (
            <div className="mb-32">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-1">지난 회의</h2>
                <p className="text-gray-400 text-sm">회의를 선택하면 참석자들이 해당 내용을 숙지하고 회의에 참여합니다.</p>
              </div>
              <MeetingHistoryTab
                userId={profile.id}
                selectedIds={selectedMeetings.map(m => m.id)}
                onSelect={onSelectMeeting}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center mb-32">
              <div className="text-4xl mb-4">🔒</div>
              <p className="text-gray-300 font-medium">Pro 이상 전용 기능입니다</p>
              <p className="text-gray-400 text-sm mt-1 mb-6">지난 회의 기록 조회 및 컨텍스트 활용은 Pro/Enterprise에서 사용 가능합니다.</p>
              <button
                onClick={() => setShowUpgrade(true)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
              >
                업그레이드 하기 ↑
              </button>
            </div>
          )
        )}
      </main>

      {/* 하단 고정 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur border-t border-gray-800 px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">

          {/* 선택 현황 */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {count === 0 ? (
              <p className="text-gray-400 text-sm">참석자를 선택해주세요</p>
            ) : (
              <>
                {/* 선택된 아바타들 */}
                <div className="flex -space-x-2 flex-shrink-0">
                  {attendeeIds.slice(0, 6).map(id => {
                    const p = personas.find(x => x.id === id);
                    if (!p) return null;
                    return (
                      <div
                        key={id}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-base border-2 border-gray-950"
                        style={{ backgroundColor: p.color.bg }}
                        title={`${p.name}${id === facilitatorId ? ' (사회자)' : ''}`}
                      >
                        {id === facilitatorId ? '🎤' : p.emoji}
                      </div>
                    );
                  })}
                  {count > 6 && (
                    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-xs border-2 border-gray-950 text-gray-300">
                      +{count - 6}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium">
                    {count}/{maxAttendees}명 선택됨
                  </p>
                  {facilitatorId && (
                    <p className="text-gray-400 text-xs truncate">
                      🎤 사회자: {personas.find(p => p.id === facilitatorId)?.name}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 선택된 이전 회의들 */}
          {selectedMeetings.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-w-sm">
              {selectedMeetings.map(m => (
                <div key={m.id} className="flex items-center gap-1.5 text-xs bg-indigo-950/50 border border-indigo-800/50 rounded-lg px-2.5 py-1.5">
                  <span className="text-indigo-300 truncate max-w-[120px]">📋 {m.title}</span>
                  <button
                    onClick={() => onSelectMeeting(m)}
                    className="text-indigo-400 hover:text-white flex-shrink-0 transition-colors"
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          {/* 시작 버튼 */}
          <button
            onClick={onStart}
            disabled={!canStart}
            className={`flex-shrink-0 px-8 py-3 rounded-xl font-semibold text-sm transition-all ${
              canStart
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50 hover:scale-105'
                : 'bg-gray-800 text-gray-400 cursor-not-allowed'
            }`}
          >
            회의 시작 →
          </button>
        </div>
      </div>

    </div>

    {showHelp && (
      <HelpModal onClose={() => setShowHelp(false)} />
    )}
    {showUpgrade && (
      <UpgradeModal
        currentTier={tier}
        onClose={() => setShowUpgrade(false)}
        getAuthHeader={getAuthHeader}
        onUpgradeSuccess={(newTier, expiresAt) => {
          setShowUpgrade(false);
          onUpgradeSuccess(newTier, expiresAt);
        }}
      />
    )}
    {showProfile && (
      <ProfileModal
        profile={profile}
        permissions={permissions}
        settings={settings}
        onSave={onUpdateProfile}
        onApiKeyChange={onApiKeyChange}
        onPersonaModelChange={onModelChange}
        onImport={onImport}
        onClose={() => setShowProfile(false)}
      />
    )}
    {showNewPersona && (
      <PersonaEditor
        initial={{}}
        onSave={(p) => { onSavePersona(p); setShowNewPersona(false); }}
        onClose={() => setShowNewPersona(false)}
      />
    )}
    {editingPersona && (
      <PersonaEditPanel
        persona={editingPersona}
        settings={settings}
        permissions={permissions}
        onSave={onSavePersona}
        onModelChange={onModelChange}
        onClose={() => setEditingPersona(null)}
      />
    )}
    </>
  );
}

// ─── 페르소나 카드 ─────────────────────────────────────────────
interface CardProps {
  persona: Persona;
  isSelected: boolean;
  isFacilitator: boolean;
  isDisabled: boolean;
  roleDesc: string;
  maxAttendees: number;
  canEdit: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

function PersonaCard({
  persona,
  isSelected,
  isFacilitator,
  isDisabled,
  roleDesc,
  canEdit,
  onToggle,
  onEdit,
}: CardProps) {
  return (
    <div
      className={`relative rounded-2xl border-2 transition-all duration-200 overflow-hidden cursor-pointer group ${
        isSelected
          ? 'bg-gray-900 border-opacity-80 shadow-lg scale-[1.02]'
          : isDisabled
            ? 'bg-gray-900/60 border-gray-800 opacity-40 cursor-not-allowed'
            : 'bg-gray-900/60 border-gray-800 hover:border-gray-600 hover:scale-[1.01]'
      }`}
      style={isSelected ? { borderColor: persona.color.bg + 'cc' } : undefined}
      onClick={!isDisabled ? onToggle : undefined}
    >
      {/* 상단 색상 띠 */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: isSelected ? persona.color.bg : '#374151' }}
      />

      <div className="p-4">

        {/* 아바타 + 우상단 버튼들 */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
            style={{ backgroundColor: persona.color.bg }}
          >
            {isFacilitator ? '🎤' : persona.emoji}
          </div>
          <div className="flex flex-col items-end gap-1">
            {isSelected && (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: persona.color.bg }}
              >
                ✓
              </div>
            )}
            {isFacilitator && (
              <span className="text-xs text-indigo-400 font-medium">사회</span>
            )}
            {/* ✏️ 편집 버튼 — 호버 시 표시 */}
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className={`text-xs px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-all ${
                canEdit
                  ? 'opacity-0 group-hover:opacity-100'
                  : 'opacity-0 group-hover:opacity-60 cursor-default'
              }`}
              title={canEdit ? '편집' : '편집 (읽기 전용)'}
            >
              ✏️
            </button>
          </div>
        </div>

        {/* 이름 + 역할 */}
        <p className="font-semibold text-sm mb-0.5" style={{ color: isSelected ? persona.color.text : '#e5e7eb' }}>
          {persona.name}
        </p>
        <p className="text-gray-300 text-xs mb-2">{persona.role}</p>

        {/* 역할 설명 */}
        {roleDesc && (
          <p className="text-gray-300 text-xs leading-relaxed line-clamp-2">{roleDesc}</p>
        )}

      </div>
    </div>
  );
}
