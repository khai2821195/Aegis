import { useState } from 'react';
import type { Message, Persona, Settings } from '../types';
import { supabase, getAuthHeaders } from '../lib/supabase';

interface Props {
  messages: Message[];
  attendees: Persona[];
  settings: Settings;
  userId: string;
  onExit: () => void;
  onClose: () => void;
}

type Step = 'confirm' | 'summarizing' | 'review' | 'saved';

interface Summary {
  title: string;
  content: string;
}

export default function MeetingEndModal({ messages, attendees, settings, userId, onExit, onClose }: Props) {
  const [step, setStep] = useState<Step>('confirm');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const userMessages = messages.filter(m => m.personaId === 'user').length;
  const totalMessages = messages.length;

  async function generateSummary() {
    setStep('summarizing');
    setError('');

    // 사용 가능한 첫 번째 모델 선택
    const firstConfig = attendees
      .map(p => ({ cfg: settings.personaModels[p.id] }))
      .find(({ cfg }) => cfg?.modelId);

    if (!firstConfig) {
      setError('사용 가능한 모델이 없습니다.');
      setStep('confirm');
      return;
    }

    const { cfg } = firstConfig;
    const apiKey = settings.apiKeys[cfg.provider as keyof typeof settings.apiKeys];

    // 회의 내용 텍스트 변환
    const transcript = messages
      .filter(m => m.content.trim())
      .map(m => {
        if (m.personaId === 'user') return `[사용자]: ${m.content}`;
        const p = attendees.find(a => a.id === m.personaId);
        return `[${p ? `${p.name}(${p.role})` : '참석자'}]: ${m.content}`;
      })
      .join('\n\n');

    const attendeeList = attendees.map(p => `${p.name}(${p.role})`).join(', ');
    const systemPrompt = `당신은 회의 서기입니다. 회의 내용을 한국어로 구조화하여 요약하세요.

실제 참석자 명단: ${attendeeList}

다음 형식의 마크다운으로 작성하세요:

# [회의 제목]

## 참석자
${attendeeList}

## 주요 논의 내용
(핵심 내용 불릿 포인트)

## 결론 및 합의사항
(결론 불릿 포인트)

## 액션 아이템
(담당자와 할 일 목록, 없으면 "없음")`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
        body: JSON.stringify({
          provider: cfg.provider,
          apiKey,
          model: cfg.modelId,
          systemPrompt,
          messages: [{ role: 'user', content: `다음 회의 내용을 요약해주세요:\n\n${transcript}` }],
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'chunk') full += data.text;
          } catch {}
        }
      }

      // 제목 추출 (# 뒤 첫 줄)
      const titleMatch = full.match(/^#\s+(.+)/m);
      const title = titleMatch ? titleMatch[1].trim() : `회의 요약 ${new Date().toLocaleDateString('ko-KR')}`;

      setSummary({ title, content: full });
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : '요약 생성 실패');
      setStep('confirm');
    }
  }

  async function saveSummary() {
    if (!summary) return;
    setSaving(true);

    const { error: dbError } = await supabase.from('aegis_meetings').insert({
      user_id: userId,
      title: summary.title,
      summary: summary.content,
      attendees: attendees.map(p => ({ name: p.name, role: p.role })),
      message_count: totalMessages,
    });

    setSaving(false);
    if (dbError) {
      setError('저장 실패: ' + dbError.message);
    } else {
      setStep('saved');
      setTimeout(() => onExit(), 1200);
    }
  }

  function downloadMarkdown() {
    if (!summary) return;
    const blob = new Blob([summary.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary.title.replace(/[/\\?%*:|"<>]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* ── 확인 단계 ── */}
        {step === 'confirm' && (
          <>
            <div className="px-6 py-5 border-b border-gray-800">
              <h2 className="text-white font-bold text-lg">회의를 종료하시겠습니까?</h2>
              <p className="text-gray-400 text-sm mt-1">
                총 {totalMessages}개 발언 · 사용자 {userMessages}회 · 참석자 {attendees.length}명
              </p>
            </div>
            <div className="p-6 space-y-3">
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                onClick={generateSummary}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                📋 회의 요약하고 저장
              </button>
              <button
                onClick={onExit}
                className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
              >
                저장 없이 나가기
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-gray-400 hover:text-gray-300 text-sm transition-colors"
              >
                취소 (회의 계속)
              </button>
            </div>
          </>
        )}

        {/* ── 요약 중 ── */}
        {step === 'summarizing' && (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
            <span className="w-10 h-10 border-2 border-indigo-600/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-gray-300 text-sm">회의 내용을 요약하는 중...</p>
          </div>
        )}

        {/* ── 요약 검토 ── */}
        {step === 'review' && summary && (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
              <div>
                <h2 className="text-white font-bold">{summary.title}</h2>
                <p className="text-gray-400 text-xs mt-0.5">저장 전 내용을 확인하세요</p>
              </div>
              <button
                onClick={downloadMarkdown}
                className="text-xs text-gray-400 hover:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1"
                title="마크다운으로 다운로드"
              >
                ⬇ .md
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {summary.content}
              </pre>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-800 flex-shrink-0">
              {error && <p className="text-red-400 text-xs flex-1">{error}</p>}
              <button
                onClick={onExit}
                className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
              >
                저장 안 함
              </button>
              <button
                onClick={saveSummary}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Server에 저장
              </button>
            </div>
          </>
        )}

        {/* ── 저장 완료 ── */}
        {step === 'saved' && (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-3">
            <div className="w-12 h-12 rounded-full bg-green-800/50 flex items-center justify-center text-2xl">✓</div>
            <p className="text-white font-medium">저장 완료!</p>
            <p className="text-gray-400 text-sm">로비로 이동합니다...</p>
          </div>
        )}
      </div>
    </div>
  );
}
