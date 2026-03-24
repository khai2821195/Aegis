import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Meeting {
  id: string;
  title: string;
  summary: string;
  attendees: { name: string; role: string }[];
  message_count: number;
  created_at: string;
}

interface Props {
  userId: string;
  selectedIds: string[];
  onSelect: (meeting: Meeting) => void;
}

export default function MeetingHistoryTab({ userId, selectedIds, onSelect }: Props) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchMeetings();
  }, [userId]);

  async function fetchMeetings() {
    setLoading(true);
    const { data } = await supabase
      .from('meetings')
      .select('id, title, summary, attendees, message_count, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setMeetings(data ?? []);
    setLoading(false);
  }

  async function deleteMeeting(id: string) {
    setDeleting(id);
    await supabase.from('meetings').delete().eq('id', id);
    const meeting = meetings.find(m => m.id === id);
    if (meeting && selectedIds.includes(id)) onSelect(meeting); // 토글로 제거
    setMeetings(prev => prev.filter(m => m.id !== id));
    if (detailId === id) setDetailId(null);
    setDeleting(null);
  }

  function downloadMarkdown(meeting: Meeting) {
    const blob = new Blob([meeting.summary], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meeting.title.replace(/[/\\?%*:|"<>]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="w-6 h-6 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-4xl mb-4">📋</div>
        <p className="text-gray-300 font-medium">저장된 회의가 없습니다</p>
        <p className="text-gray-400 text-sm mt-1">회의 종료 시 요약을 저장하면 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* 회의 목록 */}
      <div className="flex-1 min-w-0 space-y-3">
        {meetings.map(meeting => {
          const isSelected = selectedIds.includes(meeting.id);
          const isDetail = meeting.id === detailId;
          return (
            <div
              key={meeting.id}
              className={`rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-950/30'
                  : 'border-gray-800 bg-gray-900/60 hover:border-gray-700'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{meeting.title}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{formatDate(meeting.created_at)}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-gray-400 text-xs">
                        👥 {meeting.attendees.map(a => a.name).join(', ')}
                      </span>
                      <span className="text-gray-400 text-xs">💬 {meeting.message_count}개 발언</span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="flex-shrink-0 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">선택됨</span>
                  )}
                </div>

                {/* 버튼 행 */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => setDetailId(isDetail ? null : meeting.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                  >
                    {isDetail ? '닫기' : '요약 보기'}
                  </button>
                  <button
                    onClick={() => downloadMarkdown(meeting)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                  >
                    ⬇ .md
                  </button>
                  <button
                    onClick={() => onSelect(meeting)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      isSelected
                        ? 'bg-indigo-700 hover:bg-indigo-600 text-white'
                        : 'bg-gray-800 hover:bg-indigo-700 text-gray-300 hover:text-white'
                    }`}
                  >
                    {isSelected ? '✓ 선택됨' : '컨텍스트로 추가'}
                  </button>
                  <button
                    onClick={() => deleteMeeting(meeting.id)}
                    disabled={deleting === meeting.id}
                    className="ml-auto text-xs px-2 py-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-40"
                  >
                    {deleting === meeting.id ? '...' : '삭제'}
                  </button>
                </div>
              </div>

              {/* 요약 펼치기 */}
              {isDetail && (
                <div className="border-t border-gray-800 px-4 py-4 max-h-72 overflow-y-auto">
                  <pre className="text-gray-300 text-xs whitespace-pre-wrap font-sans leading-relaxed">
                    {meeting.summary}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
