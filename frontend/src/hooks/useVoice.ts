import { useState, useRef, useCallback } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognition = any;

export function useVoice(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<AnyRecognition>(null);

  const start = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해주세요.');
      return;
    }

    const recognition = new SR();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: AnyRecognition) => {
      const text = event.results[0]?.[0]?.transcript || '';
      if (text) onResult(text);
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [onResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, start, stop };
}
