/**
 * API 엔드포인트 라우팅
 *
 * 웹 배포:  VITE_AEGIS_SERVER_URL 미설정 → 모든 호출이 같은 서버로 (상대경로)
 * Electron: VITE_AEGIS_SERVER_URL 설정  → 민감한 API만 Aegis 서버로, 나머지는 로컬
 */

const AEGIS_BASE = import.meta.env.VITE_AEGIS_SERVER_URL ?? '';

/**
 * 민감한 서버 전용 API (라이선스, 결제)
 * Electron: Aegis 서버 / 웹: 같은 서버
 */
export function aegisUrl(path: string): string {
  return `${AEGIS_BASE}${path}`;
}
