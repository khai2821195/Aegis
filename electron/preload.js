// contextBridge로 필요한 Electron API만 노출
// 현재는 IPC 통신이 필요 없으므로 최소한으로 유지
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 자동 업데이트 이벤트 수신
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', cb),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', cb),
  // 업데이트 설치 요청
  installUpdate: () => ipcRenderer.send('install-update'),
});
