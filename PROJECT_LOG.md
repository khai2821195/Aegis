# AI 총회실 — 프로젝트 개발 기록

> 마지막 업데이트: 2026-03-19

---

## 프로젝트 개요

Google Gemini Gem 대화("AI Team 총회")에서 영감을 받아 만든 웹 기반 AI 회의실 앱.
여러 AI 페르소나(C-레벨 임원들)가 사용자의 질문/안건에 대해 각자의 전문 분야 관점에서 자연스럽게 대화하는 환경을 제공한다.

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React + Vite + TypeScript (포트 5174) |
| Backend | Express.js (포트 3002) |
| 스타일 | Tailwind CSS (다크 모드) |
| LLM | Google Gemini / Anthropic Claude / OpenAI GPT |
| 스트리밍 | SSE (Server-Sent Events) |
| 음성 입력 | Web Speech API (한국어 STT) |
| 인증/DB | Supabase (이메일+비밀번호, @aimr.app 가짜 도메인) |
| 파일 업로드 | 이미지(base64) + 텍스트, 멀티모달 지원 |

---

## 프로젝트 구조

```
ai-meeting-room/
├── start.bat
├── PROJECT_LOG.md
│
├── backend/
│   ├── index.js                 # Express 서버 (포트 3002)
│   ├── .env
│   └── providers/
│       ├── gemini.js            # Gemini 스트리밍 + 멀티모달
│       ├── anthropic.js         # Claude 스트리밍 + 멀티모달
│       └── openai.js            # OpenAI 스트리밍 + 멀티모달
│
└── frontend/
    ├── public/version.json      # 버전 체크용
    └── src/
        ├── App.tsx              # 메인 컴포넌트, 회의 흐름 제어
        ├── types/index.ts       # TypeScript 타입 정의
        ├── config/
        │   ├── personas.ts      # 기본 페르소나 8명
        │   └── tiers.ts         # 등급별 권한 (Free/Pro/Enterprise)
        ├── hooks/
        │   ├── useSettings.ts   # localStorage 설정 관리
        │   ├── useVoice.ts      # Web Speech API
        │   ├── useAuth.ts       # Supabase 인증 + 프로필
        │   └── useUpdateCheck.ts # 앱 시작 시 버전 확인
        └── components/
            ├── AuthScreen.tsx       # 로그인/회원가입
            ├── LobbyScreen.tsx      # 참석자 선택 로비
            ├── AttendeeSidebar.tsx  # 회의실 사이드바
            ├── MessageBubble.tsx    # 채팅 메시지
            ├── PersonaEditPanel.tsx # 페르소나 편집 슬라이드 패널
            ├── SettingsPanel.tsx    # 설정 패널
            ├── FileAttachmentBar.tsx # 파일 첨부 (Enterprise)
            ├── MeetingEndModal.tsx  # 회의 종료 + 요약 저장
            ├── UpdateBanner.tsx     # 업데이트 알림 배너
            ├── UpgradeModal.tsx     # 플랜 업그레이드 모달
            └── ProfileModal.tsx     # 프로필 편집 모달
```

---

## Supabase 구성

**프로젝트 ID:** `rgsucvzwsaynyzrsrlad`
**리전:** ap-northeast-2 (서울)

### 테이블

#### `profiles`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK, FK → auth.users) | |
| username | text | 로그인 아이디 |
| tier | text | free / pro / enterprise |
| display_name | text | 표시 이름 |
| user_context | text | 나에 대한 AI 컨텍스트 |
| created_at | timestamptz | |

- 사용자 가입 시 트리거로 자동 생성
- 로그인 내부 이메일: `{username}@aimr.app`

#### `meetings`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| user_id | uuid (FK → auth.users) | |
| title | text | LLM이 생성한 회의 제목 |
| summary | text | 마크다운 형식 회의 요약 |
| attendees | jsonb | [{name, role}] 배열 |
| message_count | integer | 총 발언 수 |
| created_at | timestamptz | |

- RLS 적용: 본인 데이터만 접근 가능
- **현재 저장된 회의: 1건** (2026-03-18 "회의실 작명 및 브랜드 정체성 확립 회의")

---

## 등급 시스템 (Tier)

| 등급 | 최대 참석자 | 페르소나 편집 | 추가/삭제 | 파일 업로드 |
|------|-----------|-------------|---------|-----------|
| Free | 2명 | X | X | X |
| Pro | 5명 | O | X | X |
| Enterprise | 10명 | O | O | O |

- 등급 변경: Supabase `profiles.tier` 컬럼 직접 수정
- 결제 UI는 구현되어 있으나 실제 결제 연동 미구현 (UI only)

---

## 회의 흐름 (sendMessage)

```
사용자 메시지 입력
    ↓
@멘션 있음? → 해당 인물 즉시 응답 → 종료
    ↓ (없음)
사회자(CoS/비서/사회 역할) 있음?
    ├── 있음: 사회자 1회 발언 → [발언권: 이름] 파싱 → 지정 인원 순서대로 발언
    └── 없음: autoRouteSpeakers() → LLM이 관련 참석자 1~2명 선택 → 발언
```

### 핵심 함수

- `getFacilitator(attendees)` — 사회자 탐지, 없으면 null 반환
- `autoRouteSpeakers(userMsg, attendees, settings)` — 사회자 없을 때 LLM 라우팅
- `buildSystemPrompt(persona, isFacilitator, attendees, facilitatorName)` — 시스템 프롬프트 생성
- `buildApiMessages(messages, personaId, personas)` — API용 메시지 배열 변환
- `parseSpeakers(text, candidates)` — `[발언권: 이름]` 태그 파싱
- `streamCall(...)` — SSE 스트리밍 실행, 에러 이벤트도 화면에 표시

---

## 백엔드 API

### `GET /api/models?provider=X&key=Y`
사용 가능한 모델 목록 동적 조회.

### `POST /api/chat`
SSE 스트리밍 LLM 응답.
- 요청: `{ provider, apiKey, model, systemPrompt, messages, attachments }`
- 응답 이벤트: `chunk` / `done` / `error`
- **파일 첨부**: 이미지(base64 inlineData), 텍스트(텍스트 블록)
- **3개 프로바이더 모두 멀티모달 지원**

---

## 기본 페르소나 (9명)

| 이름 | 역할 | 이모지 | 색상 |
|------|------|--------|------|
| 셰릴 | CoS · 수석비서 (기본 사회자) | 💼 | 로즈 |
| 일론 | CSO · 전략총괄 | 🚀 | 오렌지 |
| 워렌 | CFO · 재무총괄 | 💰 | 골드 |
| 루스 | CLO · 법무총괄 | ⚖️ | 레드 |
| 닐   | CMO · 마케팅총괄 | 📣 | 그린 |
| 폴라 | CDO · 디자인총괄 | 🎨 | 퍼플 |
| 빌   | CTO · 기술총괄 | ⚙️ | 블루 |
| 살만 | CEduO · 교육총괄 | 🎓 | 사이언 |
| 팀   | COO · 운영총괄 | 🗂️ | 틸 |

- 모든 시스템 프롬프트: Obsidian 프로필 파일 기반으로 재작성
- `{company}` / `{ceo_name}` 플레이스홀더 제거 → `우리 회사` / `대표님` 하드코딩
- user_context(사용자 입력)로 회사/대표 정보를 자유롭게 주입하는 방식으로 전환

---

## 개발 히스토리

### v1 ~ v5 (이전 세션)
- React + Express 기초 구현
- 8명 페르소나, 멀티 프로바이더(Gemini/Claude/OpenAI)
- 사회자 시스템, @멘션, 발언권 라우팅

### v6 — 인증 + 로비 + 등급 시스템 (2026-03-18 세션 1)

**추가된 기능:**
- Supabase 인증 (username → `@aimr.app` 이메일 변환, 이메일 인증 없음)
- `profiles` 테이블 + 등급 시스템 (Free/Pro/Enterprise)
- 로비 화면 (페르소나 카드 그리드, 선택 후 회의 시작)
- 업그레이드 모달 (플랜 비교, 영구소유 290,000원)
- 프로필 모달 (display_name, user_context)
- 페르소나 편집 슬라이드 패널 (권한별 접근 제어)
- 파일 첨부 기능 (Enterprise, 이미지 5MB / 텍스트 1MB)
- 회의 종료 모달 + LLM 요약 생성 + Supabase 저장
- 앱 시작 시 버전 체크 (버전 알림 배너)
- 사회자 없을 때 LLM 자동 라우팅 (`autoRouteSpeakers`)

**Supabase 마이그레이션:**
- `create_profiles_with_tiers`
- `add_username_to_profiles`
- `update_username_trigger_domain`
- `add_profile_context`
- `create_meetings_table`

### v6 버그픽스 (2026-03-18 세션 2)

**수정된 버그:**
1. 로비에서 참석자 클릭 시 빈 화면 → `getFacilitator()` null 반환 시 `.id` TypeError 수정
2. `facilitator` 변수가 항상 `attendees[0]` fallback → `facilitatorId` 기반으로만 결정
3. 백엔드 `{ type: 'error' }` SSE 이벤트를 무시하여 빈 말풍선 표시 → 에러 메시지 화면 표시로 수정

---

### v7 — 기능 확장 + UX 개선 (2026-03-19)

**앱 이름 확정**
- `AI 총회실` → **AEGIS** (로비: **AEGIS:ORBIT**)
- 모든 화면 AEGIS 대문자 통일 (App.tsx, index.html, AuthScreen, LobbyScreen, AttendeeSidebar)

**기능 추가**
- 지난 회의 목록 탭 (Pro 이상) — MeetingHistoryTab 컴포넌트 신규
  - Supabase meetings 테이블에서 조회, 다중 선택 후 회의 컨텍스트로 활용
  - .md 다운로드, 삭제 기능
- 회의중 참석자 추가 시 입장 멘트, 제거 시 퇴장 멘트 자동 생성
- 로비에서 새 페르소나 추가 (Enterprise, 최대 20명)
- 회의 종료 없이 로비 이동 시 확인 모달 (요약 후 나가기 / 저장 없이 / 취소)
- Free 사용자 회의 시작 시 tier 초과 참석자 자동 트림
- 메시지 버블 폰트 크기 text-sm → text-base

**페르소나 오버홀**
- 살만(CEduO · 교육총괄, 🎓, cyan) 신규 추가 → 총 9명
- 모든 프롬프트 Obsidian 파일 기반 재작성
- `{company}` / `{ceo_name}` 플레이스홀더 제거
- user_context를 `--- 대표 컨텍스트 ---` 블록으로 시스템 프롬프트에 주입
- useSettings load()에서 새 DEFAULT_PERSONAS 자동 추가 로직 추가

**ProfileModal 개선**
- 회사명 / CEO명 별도 필드 제거
- "사용자 입력" 필드 하나로 통합
- placeholder: [IDENTITY] / [BUSINESS_MAIN] / [BUSINESS_Sub] 구조화 템플릿
- font-mono, rows=10 적용

**Supabase**
- profiles 테이블에 company_name, ceo_name 컬럼 추가 (현재 UI 미사용)
- khai02 계정 Pro 등급으로 설정

**UI 개선**
- 참석자 카드 회색 텍스트 밝기 개선 (전체 화면)
- 로비/회의 종료 버튼 가시성 강화 (회색 테두리 / 빨간 배경)
- UpgradeModal 월/연 결제 토글 추가

**Tier 표 업데이트**

| 등급 | 최대 참석자 | 지난 회의 조회 | 페르소나 편집 | 추가/삭제 | 파일 업로드 |
|------|-----------|------------|-------------|---------|-----------|
| Free | 2명 | X | X | X | X |
| Pro | 5명 | O | O | X | X |
| Enterprise | 10명 | O | O | O | O |

---

## 알려진 제한 사항

- [ ] 참가자가 말 안 하는 문제 근본 원인 확인 (API 키/모델 설정 확인 필요)
- [ ] 실제 결제 연동 미구현
- [ ] 스트리밍 중 취소 버튼 없음
- [ ] 모바일 레이아웃 미최적화
- [ ] Gemini 무료 티어 분당 요청 제한 (여러 페르소나 동시 사용 시)

---

## 환경변수 (backend/.env)

```
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
PORT=3002
```

## 실행 방법

```batch
# V:\Code\ai-meeting-room\start.bat 실행
# 접속: http://localhost:5174
```
