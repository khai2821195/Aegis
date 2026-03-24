import { useState } from 'react';

interface Props {
  onClose: () => void;
}

const SECTIONS = [
  { id: 'intro',    label: 'AEGIS란?',    icon: '🛡️' },
  { id: 'start',   label: '시작하기',     icon: '🚀' },
  { id: 'meeting', label: '회의 진행',    icon: '💬' },
  { id: 'advanced',label: '고급 기능',    icon: '⚙️' },
  { id: 'plans',   label: '플랜 비교',    icon: '💎' },
];

export default function HelpModal({ onClose }: Props) {
  const [activeSection, setActiveSection] = useState('intro');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="relative w-full max-w-4xl h-[80vh] bg-gray-900 rounded-2xl border border-gray-700 flex overflow-hidden shadow-2xl">

        {/* 사이드 네비게이션 */}
        <nav className="w-48 flex-shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col">
          <div className="px-5 py-5 border-b border-gray-800">
            <p className="text-white font-bold text-base">AEGIS</p>
            <p className="text-gray-500 text-xs mt-0.5">사용 설명서</p>
          </div>
          <div className="flex-1 py-3">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full text-left px-5 py-3 flex items-center gap-2.5 text-sm transition-colors ${
                  activeSection === s.id
                    ? 'bg-indigo-600/20 text-indigo-300 border-r-2 border-indigo-500'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-gray-800">
            <p className="text-gray-600 text-xs">v7 · 2026</p>
          </div>
        </nav>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto">
          {/* 헤더 */}
          <div className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-8 py-4 flex items-center justify-between">
            <h2 className="text-white font-semibold">
              {SECTIONS.find(s => s.id === activeSection)?.icon}{' '}
              {SECTIONS.find(s => s.id === activeSection)?.label}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl transition-colors w-8 h-8 flex items-center justify-center rounded hover:bg-gray-800"
            >
              ✕
            </button>
          </div>

          {/* 섹션 콘텐츠 */}
          <div className="px-8 py-8 space-y-8">
            {activeSection === 'intro' && <SectionIntro />}
            {activeSection === 'start' && <SectionStart />}
            {activeSection === 'meeting' && <SectionMeeting />}
            {activeSection === 'advanced' && <SectionAdvanced />}
            {activeSection === 'plans' && <SectionPlans />}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── 섹션: AEGIS란? ────────────────────────────────────────────────────
function SectionIntro() {
  return (
    <>
      <div>
        <h3 className="text-white text-xl font-bold mb-3">AEGIS는 AI 임원 회의실입니다</h3>
        <p className="text-gray-300 leading-relaxed">
          AEGIS는 여러 AI 페르소나(가상의 C-레벨 임원들)가 당신의 질문과 안건에 대해
          각자의 전문 관점에서 자유롭게 토론하는 AI 회의 시뮬레이션 도구입니다.
          전략, 재무, 법무, 마케팅, 기술 등 다양한 분야의 시각을 한 번에 얻을 수 있습니다.
        </p>
      </div>

      <InfoBox icon="💡" title="이런 때 유용합니다">
        <ul className="space-y-2 text-gray-300 text-sm">
          <li>• 중요한 비즈니스 결정을 내리기 전에 다양한 관점 검토</li>
          <li>• 사업 계획서나 전략 문서의 약점 파악</li>
          <li>• 신규 프로젝트의 리스크와 기회 분석</li>
          <li>• 투자, 채용, 파트너십 등 주요 안건 사전 검토</li>
          <li>• 혼자 생각하기 어려운 복잡한 문제를 다각도로 탐색</li>
        </ul>
      </InfoBox>

      <div>
        <h4 className="text-gray-200 font-semibold mb-3">기본 참석자 소개</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { emoji: '💼', name: '셰릴', role: 'CoS · 수석비서', desc: '회의를 진행하고 발언 순서를 조율하는 사회자' },
            { emoji: '🚀', name: '일론', role: 'CSO · 전략총괄', desc: '대담한 장기 전략과 시장 기회를 탐색' },
            { emoji: '💰', name: '워렌', role: 'CFO · 재무총괄', desc: '수익성·현금흐름·리스크를 냉철하게 검토' },
            { emoji: '⚖️', name: '루스', role: 'CLO · 법무총괄', desc: '법적 리스크와 규제 준수 사항 점검' },
            { emoji: '📣', name: '닐',   role: 'CMO · 마케팅총괄', desc: '고객 관점과 브랜드 전략 제시' },
            { emoji: '🎨', name: '폴라', role: 'CDO · 디자인총괄', desc: '사용자 경험과 제품 디자인 관점 제공' },
            { emoji: '⚙️', name: '빌',   role: 'CTO · 기술총괄', desc: '기술 실현 가능성과 아키텍처 검토' },
            { emoji: '🗂️', name: '팀',   role: 'COO · 운영총괄', desc: '실행 계획·프로세스·운영 효율 분석' },
            { emoji: '🎓', name: '살만', role: 'CEduO · 교육총괄', desc: '학습·성장·조직 역량 개발 관점' },
          ].map(p => (
            <div key={p.name} className="flex gap-3 bg-gray-800/50 rounded-xl p-3">
              <span className="text-2xl flex-shrink-0">{p.emoji}</span>
              <div>
                <p className="text-white text-sm font-medium">{p.name} <span className="text-gray-400 text-xs font-normal">— {p.role}</span></p>
                <p className="text-gray-400 text-xs mt-0.5">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── 섹션: 시작하기 ────────────────────────────────────────────────────
function SectionStart() {
  return (
    <>
      <div>
        <h3 className="text-white text-xl font-bold mb-2">3단계로 시작하세요</h3>
        <p className="text-gray-400 text-sm">처음 사용 시 아래 순서대로 설정하면 바로 회의를 시작할 수 있습니다.</p>
      </div>

      <StepCard step={1} title="API 키 입력">
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          AEGIS는 AI 모델을 직접 호출합니다. 사용할 AI 서비스의 API 키를 준비해주세요.
          회의실 우상단 <Kbd>⚙️ 설정</Kbd> 버튼을 클릭하면 입력란이 나타납니다.
        </p>
        <div className="space-y-2">
          <ApiKeyRow name="Google Gemini" badge="추천" badgeColor="bg-blue-600" desc="무료 티어 제공 · 빠른 응답" link="https://aistudio.google.com/app/apikey" />
          <ApiKeyRow name="Anthropic Claude" desc="높은 품질의 분석" link="https://console.anthropic.com/" />
          <ApiKeyRow name="OpenAI GPT" desc="GPT-4o 등 다양한 모델" link="https://platform.openai.com/api-keys" />
        </div>
        <InfoBox icon="🔒" title="보안 안내" className="mt-3">
          <p className="text-gray-300 text-sm">API 키는 브라우저 localStorage에만 저장됩니다. 서버나 외부로 전송되지 않습니다.</p>
        </InfoBox>
      </StepCard>

      <StepCard step={2} title="모델 선택">
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          설정 패널에서 API 키 입력 후 <Kbd>불러오기</Kbd> 버튼을 누르면 사용 가능한 모델 목록이 로드됩니다.
          각 참석자마다 다른 모델을 할당할 수 있습니다. 처음에는 모두 Gemini 기본 모델로 설정되어 있습니다.
        </p>
        <InfoBox icon="💡" title="권장 설정">
          <p className="text-gray-300 text-sm">빠른 시작을 원한다면 Gemini API 키만 입력하고 기본 모델을 그대로 사용하세요.</p>
        </InfoBox>
      </StepCard>

      <StepCard step={3} title="프로필 설정 (선택 사항이지만 강력 권장)">
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          우상단 아이디 버튼 → <Kbd>프로필</Kbd>에서 AI 임원들이 참고할 회사 및 대표 정보를 입력하세요.
          이 정보를 바탕으로 임원들이 훨씬 더 맥락에 맞는 조언을 제공합니다.
        </p>
        <div className="bg-gray-800 rounded-xl p-4 font-mono text-xs text-gray-300 space-y-1">
          <p className="text-gray-500"># 예시 입력</p>
          <p>[IDENTITY]</p>
          <p className="text-indigo-300">대표 이름: 김철수</p>
          <p className="text-indigo-300">나이/경력: 35세, IT 스타트업 10년</p>
          <p className="mt-2">[BUSINESS_MAIN]</p>
          <p className="text-indigo-300">업종: B2B SaaS (HR 솔루션)</p>
          <p className="text-indigo-300">단계: 시리즈A 준비 중 (ARR 5억)</p>
          <p className="mt-2">[BUSINESS_Sub]</p>
          <p className="text-indigo-300">현재 과제: 영업팀 확장, 엔터프라이즈 전환율 개선</p>
        </div>
      </StepCard>
    </>
  );
}

// ─── 섹션: 회의 진행 ────────────────────────────────────────────────────
function SectionMeeting() {
  return (
    <>
      <div>
        <h3 className="text-white text-xl font-bold mb-2">회의 진행 방법</h3>
      </div>

      <StepCard step={1} title="참석자 선택">
        <p className="text-gray-300 text-sm leading-relaxed">
          로비에서 오늘 회의에 참여할 임원 카드를 클릭하여 선택합니다.
          선택된 카드에는 색상 테두리와 체크 표시가 나타납니다.
          1명 이상 선택하면 하단의 <Kbd>회의 시작 →</Kbd> 버튼이 활성화됩니다.
        </p>
        <InfoBox icon="🎤" title="사회자">
          <p className="text-gray-300 text-sm">
            <strong className="text-white">셰릴(CoS)</strong>이 선택되어 있으면 사회자로 지정되어
            발언 순서를 조율합니다. 셰릴 없이 시작하면 AI가 자동으로 관련 임원 1~2명을 선택해 응답합니다.
          </p>
        </InfoBox>
      </StepCard>

      <StepCard step={2} title="안건 입력 및 대화">
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          회의실 하단 입력창에 질문이나 안건을 입력하고 전송합니다.
          임원들이 각자의 관점에서 순서대로 응답합니다.
        </p>
        <div className="space-y-3">
          <FeatureRow icon="💬" title="일반 발언">
            안건을 자유롭게 입력하면 사회자가 관련 임원들에게 발언권을 부여합니다.
          </FeatureRow>
          <FeatureRow icon="@" title="@멘션">
            <code className="bg-gray-700 px-1.5 py-0.5 rounded text-indigo-300">@빌</code>처럼
            이름 앞에 @를 붙이면 해당 임원이 즉시 단독으로 응답합니다.
            특정 전문가의 의견만 빠르게 받고 싶을 때 사용하세요.
          </FeatureRow>
          <FeatureRow icon="🎤" title="음성 입력">
            마이크 버튼을 누르고 한국어로 말하면 자동으로 텍스트로 변환됩니다.
          </FeatureRow>
        </div>
      </StepCard>

      <StepCard step={3} title="회의 종료 및 저장">
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          우상단 <Kbd>회의 종료</Kbd> 버튼을 클릭하면 AI가 자동으로 회의 요약을 생성하고
          저장 여부를 묻는 창이 나타납니다.
        </p>
        <div className="space-y-2">
          <FeatureRow icon="💾" title="저장 후 종료">저장 시 요약이 계정에 기록되어 나중에 '지난 회의'에서 다시 불러올 수 있습니다.</FeatureRow>
          <FeatureRow icon="⬇️" title=".md 다운로드">요약 내용을 마크다운 파일로 저장할 수 있습니다.</FeatureRow>
          <FeatureRow icon="🚪" title="저장 없이 종료">요약을 저장하지 않고 로비로 돌아갑니다.</FeatureRow>
        </div>
      </StepCard>
    </>
  );
}

// ─── 섹션: 고급 기능 ────────────────────────────────────────────────────
function SectionAdvanced() {
  return (
    <>
      <div>
        <h3 className="text-white text-xl font-bold mb-2">고급 기능</h3>
        <p className="text-gray-400 text-sm">플랜에 따라 일부 기능이 제한될 수 있습니다.</p>
      </div>

      <AdvancedCard icon="📋" title="지난 회의 불러오기" badge="Pro 이상">
        <p className="text-gray-300 text-sm leading-relaxed mb-2">
          로비의 <Kbd>지난 회의</Kbd> 탭에서 이전에 저장된 회의록을 선택하면,
          해당 내용을 AI 임원들이 숙지한 상태로 회의를 시작합니다.
        </p>
        <p className="text-gray-400 text-sm">
          예: 지난 주 전략 회의 내용을 불러와 후속 논의를 이어갈 수 있습니다.
          여러 회의를 동시에 선택하는 것도 가능합니다.
        </p>
      </AdvancedCard>

      <AdvancedCard icon="✏️" title="페르소나 편집" badge="Pro 이상">
        <p className="text-gray-300 text-sm leading-relaxed mb-2">
          각 임원 카드에 마우스를 올리면 ✏️ 버튼이 나타납니다.
          클릭하면 이름, 역할, 성격, 시스템 프롬프트를 직접 수정할 수 있습니다.
          임원의 페르소나를 우리 회사 실제 팀원 스타일로 커스터마이징해보세요.
        </p>
        <p className="text-gray-400 text-sm">
          수정된 설정은 브라우저에 저장되며, 회의에 즉시 반영됩니다.
        </p>
      </AdvancedCard>

      <AdvancedCard icon="➕" title="새 인물 추가 / 삭제" badge="Enterprise">
        <p className="text-gray-300 text-sm leading-relaxed">
          기본 9명 외에 나만의 AI 인물을 추가할 수 있습니다. 로비에서
          <Kbd>+ 새 인물 추가</Kbd> 카드를 클릭하면 이름, 역할, 이모지, 색상, 프롬프트를 설정할 수 있습니다.
          최대 20명까지 등록 가능하며, 필요 없는 인물은 삭제할 수도 있습니다.
        </p>
      </AdvancedCard>

      <AdvancedCard icon="📎" title="파일 첨부" badge="Enterprise">
        <p className="text-gray-300 text-sm leading-relaxed mb-2">
          회의 중 이미지나 문서 파일을 첨부하면 AI 임원들이 해당 내용을 분석합니다.
        </p>
        <ul className="text-gray-400 text-sm space-y-1">
          <li>• <strong className="text-gray-300">이미지:</strong> PNG, JPG, WEBP 등 — 최대 5MB (차트, 디자인 시안 등)</li>
          <li>• <strong className="text-gray-300">텍스트:</strong> TXT, MD, CSV 등 — 최대 1MB (보고서, 데이터 등)</li>
        </ul>
      </AdvancedCard>

      <AdvancedCard icon="🏢" title="회의 중 참석자 변경" badge="전 플랜">
        <p className="text-gray-300 text-sm leading-relaxed">
          회의 진행 중에도 우측 사이드바에서 참석자를 추가하거나 제거할 수 있습니다.
          입장 시에는 자동으로 입장 인사를, 퇴장 시에는 퇴장 멘트를 생성합니다.
        </p>
      </AdvancedCard>
    </>
  );
}

// ─── 섹션: 플랜 비교 ────────────────────────────────────────────────────
function SectionPlans() {
  return (
    <>
      <div>
        <h3 className="text-white text-xl font-bold mb-2">플랜별 기능 비교</h3>
        <p className="text-gray-400 text-sm">우상단 플랜 배지를 클릭하면 업그레이드 화면으로 이동합니다.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left text-gray-400 font-medium py-3 pr-4 w-48">기능</th>
              <th className="text-center py-3 px-4">
                <div className="text-gray-400 font-semibold">Free</div>
              </th>
              <th className="text-center py-3 px-4">
                <div className="text-indigo-300 font-semibold">Pro</div>
              </th>
              <th className="text-center py-3 px-4">
                <div className="text-yellow-300 font-semibold">Enterprise</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {[
              { feature: '최대 참석자 수', free: '2명', pro: '5명', ent: '10명' },
              { feature: '지난 회의 조회', free: '✕', pro: '✓', ent: '✓' },
              { feature: '페르소나 편집', free: '✕', pro: '✓', ent: '✓' },
              { feature: '새 인물 추가/삭제', free: '✕', pro: '✕', ent: '✓' },
              { feature: '파일 첨부', free: '✕', pro: '✕', ent: '✓' },
              { feature: '음성 입력', free: '✓', pro: '✓', ent: '✓' },
              { feature: '회의 저장', free: '✓', pro: '✓', ent: '✓' },
              { feature: '@멘션 기능', free: '✓', pro: '✓', ent: '✓' },
            ].map(row => (
              <tr key={row.feature} className="hover:bg-gray-800/30">
                <td className="py-3 pr-4 text-gray-300">{row.feature}</td>
                <td className="py-3 px-4 text-center text-gray-400">{row.free}</td>
                <td className="py-3 px-4 text-center text-gray-300">{row.pro}</td>
                <td className="py-3 px-4 text-center text-gray-300">{row.ent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InfoBox icon="💡" title="플랜 변경 방법">
        <p className="text-gray-300 text-sm">
          우상단의 플랜 배지(예: <span className="bg-gray-700 text-gray-300 text-xs px-1.5 py-0.5 rounded">Free ↑</span>)를
          클릭하면 업그레이드 옵션을 확인할 수 있습니다.
        </p>
      </InfoBox>

      <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-xl p-5">
        <h4 className="text-indigo-300 font-semibold mb-2">처음 시작하는 분께</h4>
        <p className="text-gray-300 text-sm leading-relaxed">
          Free 플랜으로 시작해 AEGIS의 핵심 기능을 먼저 경험해보세요.
          2명의 임원과도 충분히 의미 있는 회의가 가능합니다.
          기능이 더 필요할 때 언제든 플랜을 업그레이드할 수 있습니다.
        </p>
      </div>
    </>
  );
}

// ─── 공통 UI 컴포넌트 ────────────────────────────────────────────────────
function InfoBox({ icon, title, children, className = '' }: { icon: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-gray-800/60 border border-gray-700 rounded-xl p-4 ${className}`}>
      <p className="text-gray-200 font-medium text-sm mb-1.5">{icon} {title}</p>
      {children}
    </div>
  );
}

function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {step}
        </div>
        <h4 className="text-white font-semibold">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function AdvancedCard({ icon, title, badge, children }: { icon: string; title: string; badge: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <h4 className="text-white font-semibold">{title}</h4>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-800/50 flex-shrink-0">
          {badge}
        </span>
      </div>
      {children}
    </div>
  );
}

function FeatureRow({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-lg bg-gray-700 text-sm flex items-center justify-center flex-shrink-0 font-medium text-gray-300">
        {icon}
      </div>
      <div>
        <p className="text-white text-sm font-medium mb-0.5">{title}</p>
        <p className="text-gray-400 text-sm">{children}</p>
      </div>
    </div>
  );
}

function ApiKeyRow({ name, badge, badgeColor, desc, link }: { name: string; badge?: string; badgeColor?: string; desc: string; link: string }) {
  return (
    <div className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-gray-200 text-sm font-medium">{name}</span>
        {badge && <span className={`text-xs px-1.5 py-0.5 rounded text-white ${badgeColor}`}>{badge}</span>}
        <span className="text-gray-400 text-xs">— {desc}</span>
      </div>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-400 hover:text-indigo-300 text-xs underline transition-colors"
      >
        발급 →
      </a>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-gray-200 font-medium mx-0.5">
      {children}
    </span>
  );
}
