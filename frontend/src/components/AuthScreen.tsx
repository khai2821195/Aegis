import { useState } from 'react';
import { TIER_CONFIG } from '../config/tiers';

interface Props {
  onSignIn: (email: string, password: string) => Promise<Error | null>;
  onSignUp: (email: string, password: string) => Promise<Error | null>;
  onGoogleSignIn: () => Promise<Error | null>;
  onBack?: () => void;
}

export default function AuthScreen({ onSignIn, onSignUp, onGoogleSignIn, onBack }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    const err = mode === 'login'
      ? await onSignIn(username, password)
      : await onSignUp(username, password);

    setLoading(false);

    if (err) {
      setError(err.message);
    } else if (mode === 'signup') {
      setInfo('가입 완료! 바로 로그인하실 수 있습니다.');
      setMode('login');
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="text-center mb-8 relative">
          {onBack && (
            <button
              onClick={onBack}
              type="button"
              className="absolute left-0 top-0 text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors bg-gray-800/50 hover:bg-gray-700 px-2 py-1 rounded-md"
            >
              ← 홈
            </button>
          )}
          <div className="flex justify-center gap-1 mb-4 mt-2">
            {['💼','⚙️','🚀','🎨','📣'].map((e, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg border-2 border-gray-950"
                style={{ marginLeft: i > 0 ? '-8px' : '0' }}
              >
                {e}
              </div>
            ))}
          </div>
          <h1 className="text-2xl font-bold text-white">AEGIS</h1>
          <p className="text-gray-400 text-sm mt-1">C-레벨 AI 임원진과 회의를 시작하세요</p>
        </div>

        {/* 카드 */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">

          {/* 탭 */}
          <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setInfo(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-gray-700 text-white shadow'
                    : 'text-gray-300 hover:text-gray-200'
                }`}
              >
                {m === 'login' ? '로그인' : '회원가입'}
              </button>
            ))}
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-300 mb-1.5">아이디</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="사용할 아이디 입력"
                required
                autoComplete="username"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="최소 6자리"
                required
                minLength={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
            )}
            {info && (
              <p className="text-green-400 text-xs bg-green-400/10 rounded-lg px-3 py-2">{info}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {mode === 'login' ? '로그인' : '회원가입'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600">또는</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <button
            type="button"
            onClick={onGoogleSignIn}
            className="w-full py-2.5 bg-white hover:bg-gray-100 text-gray-900 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2.5"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M47.5 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h13.2c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.3-10.6 7.3-17.3z"/>
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.8 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.7H2.7v6.2C6.6 42.6 14.8 48 24 48z"/>
              <path fill="#FBBC04" d="M10.8 28.8c-.5-1.4-.7-2.8-.7-4.3s.3-3 .7-4.3v-6.2H2.7C1 17.4 0 20.6 0 24s1 6.6 2.7 9.1l8.1-4.3z"/>
              <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.9 2.5 30.4 0 24 0 14.8 0 6.6 5.4 2.7 13.2l8.1 4.3C12.7 13.6 17.9 9.5 24 9.5z"/>
            </svg>
            Google로 계속하기
          </button>
        </div>

        {/* 등급 안내 */}
        <div className="mt-6">
          <p className="text-center text-xs text-gray-400 mb-3">등급별 이용 범위</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(TIER_CONFIG) as [string, typeof TIER_CONFIG[keyof typeof TIER_CONFIG]][]).map(([key, cfg]) => (
              <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${cfg.badge}`}>
                  {cfg.label}
                </div>
                <ul className="space-y-1">
                  <li className="text-xs text-gray-300">참석자 최대 {cfg.maxAttendees}명</li>
                  <li className={`text-xs ${cfg.canEditPersona ? 'text-gray-300' : 'text-gray-700 line-through'}`}>
                    페르소나 수정
                  </li>
                  <li className={`text-xs ${cfg.canAddDeletePersona ? 'text-gray-300' : 'text-gray-700 line-through'}`}>
                    인물 추가·삭제
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
