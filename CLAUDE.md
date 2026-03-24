# Aegis - AI Meeting Room

## Claude 지시사항
- 이 파일(CLAUDE.md)을 수정할 때마다 반드시 `V:\Code\Claude\Aegis_ai-meeting-room_CLAUDE.md` 에도 동일하게 저장할 것.

## 프로젝트 개요
AI 회의실 앱. 사용자가 자신의 AI API 키를 등록하고 AI 페르소나들과 회의를 진행하는 서비스.
상용 배포 예정 (결제 필수).

## 경로
`V:\Code\Aegis\ai-meeting-room`

## 기술 스택

### Frontend (`/frontend`)
- React 18 + TypeScript + Vite
- Tailwind CSS
- Supabase JS Client (인증)

### Backend (`/backend`)
- Node.js + Express
- Supabase (DB/인증)
- AI 프로바이더: Anthropic, OpenAI, Google Gemini
- API 키 암호화 저장 (`crypto.js`)

### 인프라
- Docker Compose
- Nginx

## 현재 구조 특징
- **사용자별 API 키** 방식: 각 사용자가 자신의 AI API 키를 등록해서 사용
- API 키는 암호화되어 Supabase DB에 저장
- Supabase JWT로 사용자 인증

## 진행 중인 계획: Electron 데스크탑 앱 전환

### 배경
- 서버 부하 분산 목적
- 사용자별 API 키 방식이므로 데스크탑 전환에 적합
- 상용 배포 예정

### 목표 아키텍처 (하이브리드)
```
[사용자 PC - Electron 앱]
  ├── React UI
  ├── AI API 직접 호출 (사용자 자신의 API 키)
  └── 로컬 Express (가벼운 중간 처리)
          │ HTTPS
          ▼
[Aegis 서버 - 핵심 보안]
  ├── 로그인 / 인증 (JWT 발급)
  ├── 결제 확인 (NicePay)
  ├── 플랜/등급 관리
  └── 라이선스 검증 API (앱에서 주기적 호출)
```

### 개발 로드맵

#### 1단계 - 서버 (인증/결제)
- [x] DB 마이그레이션 - `payments` 테이블 생성, `profiles`에 `plan_expires_at`, `license_checked_at` 추가
- [x] NicePay 연동 모듈 (`backend/providers/nicepay.js`)
- [x] 결제/라이선스 라우터 (`backend/routes/payment.js`)
  - `GET  /api/license` - 라이선스 검증 (만료 시 자동 free 다운그레이드)
  - `POST /api/payment/prepare` - 결제 준비 (orderId 발급)
  - `POST /api/payment/confirm` - NicePay 최종 승인 + 플랜 활성화
  - `POST /api/payment/cancel` - 결제 취소/환불
  - `GET  /api/payment/history` - 결제 내역 조회
- [ ] 회원가입 / 로그인은 Supabase Auth 사용 (이미 구현됨)
- [ ] 프론트엔드에서 라이선스 검증 연동 (앱 시작 시 호출)
- [ ] NicePay 결제 UI 연동 (UpgradeModal.tsx)

#### 2단계 - Electron 앱 전환
- [x] 라이선스 검증 연동 (`useAuth.ts` - 로그인 시 + 24시간 주기 체크인)
- [x] NicePay 결제 UI (`UpgradeModal.tsx` - prepare → NicePay SDK → confirm 흐름)
- [x] Electron 패키지 구조 생성 (`electron/` 디렉토리)
  - `electron/main.js` - Express 백엔드 실행 + BrowserWindow
  - `electron/preload.js` - contextBridge (자동업데이트 IPC)
  - `electron/package.json` - electron-builder 설정
- [x] Express 백엔드에 frontend 정적 파일 서빙 추가 (Electron용)
- [x] API 라우팅 분리 (`frontend/src/lib/api.ts` - `aegisUrl()` 함수)
  - 라이선스/결제 → Aegis 서버 (`VITE_AEGIS_SERVER_URL`)
  - AI/키 관련 → 로컬 백엔드 (상대경로)
- [x] `frontend/.env.electron` - Electron 빌드 전용 환경변수 파일
- [x] Electron 빌드 시 `.env.electron` 자동 적용 (`build:frontend` 스크립트)
- [ ] 아이콘 파일 준비 (`icon.ico`, `icon.icns`)
- [ ] 자동 업데이트 서버 설정 (GitHub Releases 또는 자체 서버)
- [ ] 코드 서명 인증서 적용

#### 3단계 - 배포
- [x] `cd electron && npm run build:win` → `electron/dist/AEGIS Setup 1.0.0.exe` (84MB) 생성 완료
- [ ] Mac 패키지 (`.dmg`) - 필요시
- [ ] GitHub Releases에 배포 (자동 업데이트 연동)

#### 빌드 관련 메모
- electron-builder v25 → v24.13.3 다운그레이드 (winCodeSign 심볼릭링크 오류 회피)
- Windows에서 winCodeSign 캐시 오류 우회법: 부분 추출된 폴더를 `winCodeSign-2.6.0`으로 복사
  - 캐시 위치: `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0\`
  - 다른 PC에서 빌드 시 동일 오류 발생하면 위 방법 또는 Windows 개발자 모드 활성화 필요

### 보안 정책
- 앱 시작 시 서버에서 라이선스 검증
- 주기적 체크인 (24시간마다)
- 검증 실패 시 핵심 기능 비활성화
- JWT 만료시간으로 로컬 캐시 범위 제한
- 바이너리 난독화 (`electron-builder` + `bytenode`)

## 결제
- **PG사**: NicePay (나이스페이) - **구버전 MID + 암호화Key 방식**
- 상태: 서버/클라이언트 연동 완료
- 필요 환경변수: `NICEPAY_MID`, `NICEPAY_MERCHANT_KEY`, `NICEPAY_RETURN_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- 결제 흐름:
  1. 앱 → `POST /api/payment/prepare` → MID, orderId, ediDate, signData 수신
  2. 앱에서 NicePay JS SDK 팝업 호출 (`https://web.nicepay.co.kr/v3/js/nicepay-2.0.js`)
  3. NicePay → `POST NICEPAY_RETURN_URL` (서버에서 승인 처리 + DB 저장)
  4. 팝업 닫힘 + postMessage 전송
  5. 앱이 `GET /api/payment/status/:orderId` 폴링 → 완료 시 tier 갱신
- **주의**: `NICEPAY_RETURN_URL`은 반드시 외부에서 접근 가능한 URL이어야 함 (localhost 불가)

## DB 구조 (Supabase - project: rgsucvzwsaynyzrsrlad)
### profiles (기존 + 추가)
- tier: 'free' | 'pro' | 'enterprise'
- plan_expires_at: 구독 만료일 (추가됨)
- license_checked_at: 마지막 라이선스 검증 시각 (추가됨)
- api_keys_encrypted: 암호화된 AI API 키

### payments (신규)
- order_id: NicePay 주문번호 (unique)
- nicepay_tid: NicePay 거래 ID
- amount: 결제금액 (원)
- plan: 'pro' | 'enterprise'
- status: 'pending' | 'paid' | 'cancelled' | 'refunded'
- expires_at: 해당 결제의 구독 만료일

## API 라우팅 전략
- `frontend/src/lib/api.ts`의 `aegisUrl(path)` 사용
- **웹 배포**: `VITE_AEGIS_SERVER_URL` 미설정 → 모든 API가 같은 서버로
- **Electron**: `VITE_AEGIS_SERVER_URL=https://your-server.com` → 민감한 API는 Aegis 서버로

| API | 웹 배포 | Electron |
|-----|--------|---------|
| `/api/chat`, `/api/keys`, `/api/models` | 같은 서버 | 로컬 백엔드 |
| `/api/license`, `/api/payment/*` | 같은 서버 | **Aegis 서버** |

## Electron 구조
```
electron/
├── main.js       - 메인 프로세스 (백엔드 spawn + BrowserWindow)
├── preload.js    - contextBridge (자동업데이트 IPC)
└── package.json  - electron-builder 설정 (win/mac 빌드)
```
- 실행 흐름: Electron → Express 백엔드(localhost:3001) 시작 → 준비 확인 → BrowserWindow 오픈
- Express가 `frontend/dist` 정적 파일도 함께 서빙
- 빌드: `cd electron && npm run build:win`

## 주요 컴포넌트 목록 (`/frontend/src/components`)
- `AuthScreen.tsx` - 인증 화면
- `LandingPage.tsx` - 랜딩 페이지
- `LobbyScreen.tsx` - 로비
- `AttendeeSidebar.tsx` - 참석자 사이드바
- `PersonaEditor.tsx` / `PersonaEditPanel.tsx` - AI 페르소나 편집
- `SettingsPanel.tsx` - 설정 (API 키 등록 포함)
- `MeetingHistoryTab.tsx` - 회의 기록
- `UpgradeModal.tsx` - 업그레이드/결제 모달
- `ProfileModal.tsx` - 프로필
