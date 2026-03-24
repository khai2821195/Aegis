# AEGIS — AI 임원진 회의실

AI 페르소나들과 함께하는 데스크탑 회의 앱.
사용자가 자신의 AI API 키를 등록하고 AI 임원진(전략/재무/마케팅 등)과 회의를 진행합니다.

## 기술 스택

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Auth / DB**: Supabase
- **Desktop**: Electron 34 + electron-builder
- **AI**: Gemini / Claude / OpenAI (사용자 API 키)
- **결제**: NicePay (MID + 암호화Key 방식)

## 프로젝트 구조

```
ai-meeting-room/
├── frontend/          # React 앱
├── backend/           # Express API 서버
├── electron/          # Electron 데스크탑 패키지
└── nginx/             # 서버 Nginx 설정
```

## 아키텍처

```
[사용자 PC — Electron 앱]
  ├── React UI
  ├── 로컬 Express (AI API 호출, API 키 암호화 저장)
          │
          ▼
[Aegis 서버 — aegis.dctcompany.kr]
  ├── 라이선스 검증 (/api/license)
  └── 결제 처리 (/api/payment/*)
```

## 개발 환경 설정

### 필수 환경변수

**`backend/.env`**
```
PORT=3002
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_SECRET=
NICEPAY_MID=
NICEPAY_MERCHANT_KEY=
NICEPAY_RETURN_URL=
```

**`frontend/.env`**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### 개발 서버 실행

```bash
# 백엔드
cd backend && npm install && npm run dev

# 프론트엔드
cd frontend && npm install && npm run dev
```

### 데스크탑 앱 빌드

```bash
cd electron
npm install
npm run build:win    # Windows .exe
npm run build:mac    # macOS .dmg
```

빌드 결과물: `electron/dist/AEGIS Setup x.x.x.exe`

## 플랜

| 플랜 | 참석자 수 | 페르소나 편집 |
|------|-----------|---------------|
| Free | 최대 3명 | 읽기 전용 |
| Pro | 최대 6명 | 편집 가능 |
| Enterprise | 최대 10명 | 편집 + 추가/삭제 |
