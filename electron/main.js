import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { autoUpdater } = require('electron-updater');

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const isDev   = process.env.NODE_ENV === 'development';
const PORT    = 3001;
const APP_URL = `http://localhost:${PORT}`;

let mainWindow     = null;
let backendProcess = null;

// ─── 경로 헬퍼 ────────────────────────────────────────────────
function getBackendDir() {
  return isDev
    ? path.join(__dirname, '../backend')
    : path.join(process.resourcesPath, 'backend');
}

function getFrontendDist() {
  return isDev
    ? path.join(__dirname, '../frontend/dist')
    : path.join(process.resourcesPath, 'frontend/dist');
}

// ─── 백엔드 Express 서버 시작 ─────────────────────────────────
function startBackend() {
  const backendDir  = getBackendDir();
  const backendMain = path.join(backendDir, 'index.js');

  backendProcess = spawn(process.execPath, [backendMain], {
    cwd: backendDir, // dotenv가 .env를 찾을 수 있도록 백엔드 디렉토리 설정
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1', // Electron을 순수 Node.js로 실행
      NODE_ENV:      'production',
      PORT:          String(PORT),
      FRONTEND_DIST: getFrontendDist(), // 정적 파일 경로
    },
    stdio: isDev ? 'inherit' : 'pipe',
  });

  backendProcess.on('error', (err) => {
    console.error('[backend] 시작 실패:', err.message);
  });

  if (!isDev && backendProcess.stderr) {
    backendProcess.stderr.on('data', (d) => console.error('[backend]', d.toString().trim()));
  }
  if (!isDev && backendProcess.stdout) {
    backendProcess.stdout.on('data', (d) => console.log('[backend]', d.toString().trim()));
  }
}

// ─── 백엔드 준비 대기 (폴링) ──────────────────────────────────
function waitForBackend(retries = 30, delay = 500) {
  return new Promise((resolve, reject) => {
    let count = 0;
    const check = () => {
      fetch(APP_URL)
        .then(() => resolve())
        .catch(() => {
          if (++count >= retries) return reject(new Error('백엔드 시작 시간 초과'));
          setTimeout(check, delay);
        });
    };
    check();
  });
}

// ─── 메인 윈도우 생성 ─────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'AEGIS',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── 자동 업데이트 ────────────────────────────────────────────
function setupAutoUpdater() {
  if (isDev) return;

  autoUpdater.checkForUpdatesAndNotify();
  autoUpdater.on('update-available',  () => mainWindow?.webContents.send('update-available'));
  autoUpdater.on('update-downloaded', () => mainWindow?.webContents.send('update-downloaded'));
  ipcMain.on('install-update', () => autoUpdater.quitAndInstall());
}

// ─── 앱 초기화 ────────────────────────────────────────────────
app.whenReady().then(async () => {
  startBackend();

  try {
    await waitForBackend();
  } catch (err) {
    console.error(err.message);
    app.quit();
    return;
  }

  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (backendProcess) { backendProcess.kill(); backendProcess = null; }
});
