interface Props {
  buildAt: string;
  onUpdate: () => void;
  onDismiss: () => void;
}

export default function UpdateBanner({ buildAt, onUpdate, onDismiss }: Props) {
  const time = new Date(buildAt).toLocaleString('ko-KR', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-4 py-2.5 bg-indigo-950 border-b border-indigo-800 shadow-lg">
      <div className="flex items-center gap-3 max-w-2xl w-full">
        {/* 아이콘 + 메시지 */}
        <span className="text-indigo-400 text-lg flex-shrink-0">✦</span>
        <p className="text-sm text-indigo-200 flex-1 min-w-0">
          새 버전이 있습니다
          <span className="text-indigo-500 ml-2 text-xs">{time} 업데이트됨</span>
        </p>

        {/* 버튼들 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onDismiss}
            className="text-xs text-indigo-500 hover:text-indigo-300 transition-colors px-2 py-1"
          >
            나중에
          </button>
          <button
            onClick={onUpdate}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            지금 업데이트
          </button>
        </div>
      </div>
    </div>
  );
}
