import { useState, useEffect } from 'react';

interface VersionInfo {
  version: string;
  buildAt: string;
}

// 앱 번들에 포함된 버전 (빌드 시점 기준)
const BUILT_VERSION = __APP_VERSION__;

export function useUpdateCheck() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestInfo, setLatestInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    // 앱 시작 시 1회만 확인
    fetch(`/version.json?t=${Date.now()}`)
      .then(res => res.ok ? res.json() : null)
      .then((info: VersionInfo | null) => {
        if (!info) return;
        if (info.version !== BUILT_VERSION) {
          setHasUpdate(true);
          setLatestInfo(info);
        }
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    setHasUpdate(false);
  }

  function applyUpdate() {
    window.location.reload();
  }

  return { hasUpdate, latestInfo, dismiss, applyUpdate };
}
