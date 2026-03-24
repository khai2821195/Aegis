export type Tier = 'free' | 'pro' | 'enterprise';

export interface TierConfig {
  label: string;
  badge: string;       // 배지 색상 클래스
  maxAttendees: number;
  canEditPersona: boolean;      // 이름·역할·프롬프트 수정
  canAddDeletePersona: boolean; // 새 인물 추가·삭제
  canChangeModel: boolean;      // 모델·API키 변경
  canUploadFiles: boolean;      // 파일 업로드
  canViewHistory: boolean;      // 지난 회의 기록 조회
}

export const TIER_CONFIG: Record<Tier, TierConfig> = {
  free: {
    label: 'Free',
    badge: 'bg-gray-700 text-gray-300',
    maxAttendees: 2,
    canEditPersona: false,
    canAddDeletePersona: false,
    canChangeModel: true,
    canUploadFiles: false,
    canViewHistory: false,
  },
  pro: {
    label: 'Pro',
    badge: 'bg-indigo-700 text-indigo-200',
    maxAttendees: 5,
    canEditPersona: true,
    canAddDeletePersona: false,
    canChangeModel: true,
    canUploadFiles: false,
    canViewHistory: true,
  },
  enterprise: {
    label: 'Enterprise',
    badge: 'bg-amber-700 text-amber-200',
    maxAttendees: 10,
    canEditPersona: true,
    canAddDeletePersona: true,
    canChangeModel: true,
    canUploadFiles: true,
    canViewHistory: true,
  },
};
