/**
 * Electron 빌드 스크립트 (Windows/Mac 모두 동작)
 * 1. 백엔드 프로덕션 패키지 설치
 * 2. 프론트엔드 빌드 (.env.electron 적용)
 * 3. electron-builder 실행
 */

import { copyFileSync, rmSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, '../..');
const FRONTEND   = join(ROOT, 'frontend');
const BACKEND    = join(ROOT, 'backend');
const ELECTRON   = join(ROOT, 'electron');

const platform = process.argv[2] || ''; // '--win' | '--mac' | ''

function run(cmd, cwd = ROOT) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

// ── 1. 백엔드 프로덕션 의존성 설치 ──────────────────────────────
console.log('\n[1/3] 백엔드 의존성 설치 중...');
run('npm install --production --legacy-peer-deps', BACKEND);

// ── 2. 프론트엔드 빌드 ──────────────────────────────────────────
console.log('\n[2/3] 프론트엔드 빌드 중...');
const envSrc  = join(FRONTEND, '.env.electron');
const envDest = join(FRONTEND, '.env.production.local');

if (!existsSync(envSrc)) {
  console.error('❌ frontend/.env.electron 파일이 없습니다.');
  process.exit(1);
}

copyFileSync(envSrc, envDest);
try {
  run('npm run build', FRONTEND);
} finally {
  rmSync(envDest, { force: true });
}

// ── 3. Electron 패키지 빌드 ────────────────────────────────────
console.log('\n[3/3] Electron 패키지 빌드 중...');

// 코드 서명 인증서 없을 때 서명 건너뛰기 (인증서 준비 후 제거)
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
delete process.env.CSC_LINK;
delete process.env.WIN_CSC_LINK;
delete process.env.CSC_KEY_PASSWORD;

const builderCmd = platform
  ? `npx electron-builder ${platform}`
  : 'npx electron-builder';
run(builderCmd, ELECTRON);

console.log('\n✅ 빌드 완료! electron/dist 폴더를 확인하세요.');
