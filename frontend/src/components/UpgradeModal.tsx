import { useState } from 'react';
import { TIER_CONFIG } from '../config/tiers';
import type { Tier } from '../config/tiers';
import { aegisUrl } from '../lib/api';

interface Props {
  currentTier: Tier;
  onClose: () => void;
  getAuthHeader: () => Promise<string | null>;
  onUpgradeSuccess: (tier: Tier, planExpiresAt: string) => void;
}

type Billing = 'monthly' | 'annual';

const PRICES: Record<Tier, {
  monthly: string; annual: string;
  annualTotal: string; monthlyEquiv: string; desc: string;
  monthlyAmount: number; annualAmount: number;
}> = {
  free:       { monthly: '무료',       annual: '무료',       annualTotal: '',          monthlyEquiv: '',       desc: '개인 체험용',       monthlyAmount: 0,      annualAmount: 0      },
  pro:        { monthly: '₩9,900/월',  annual: '₩8,250/월',  annualTotal: '연 ₩99,000',  monthlyEquiv: '2개월 무료', desc: '개인 및 소규모 팀', monthlyAmount: 9900,  annualAmount: 99000  },
  enterprise: { monthly: '₩29,900/월', annual: '₩24,900/월', annualTotal: '연 ₩299,000', monthlyEquiv: '2개월 무료', desc: '팀·기업 전용',    monthlyAmount: 29900, annualAmount: 299000 },
};

const GOODS_NAME: Record<Tier, string> = {
  free: '', pro: 'AEGIS Pro', enterprise: 'AEGIS Enterprise',
};

// NicePay 구버전 JS SDK 동적 로드
function loadNicePaySdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[data-nicepay]')) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://web.nicepay.co.kr/v3/js/nicepay-2.0.js';
    script.setAttribute('data-nicepay', '1');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('NicePay SDK 로드 실패'));
    document.head.appendChild(script);
  });
}

// NicePay 팝업 열기 (폼 제출 방식)
function openNicePayPopup(params: {
  mid: string; orderId: string; ediDate: string;
  signData: string; amount: number; plan: Tier; returnUrl: string;
}) {
  const NICEPAY_URL = 'https://web.nicepay.co.kr/v3/reqPay.jsp';
  const popup = window.open('', 'nicepay_popup', 'width=500,height=700,scrollbars=yes');
  if (!popup) throw new Error('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.');

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = NICEPAY_URL;
  form.target = 'nicepay_popup';

  const fields: Record<string, string> = {
    PayMethod:  'CARD',
    GoodsName:  GOODS_NAME[params.plan],
    Amt:        String(params.amount),
    MID:        params.mid,
    Moid:       params.orderId,
    EdiDate:    params.ediDate,
    SignData:   params.signData,
    ReturnURL:  params.returnUrl,
    CharSet:    'utf-8',
    NicepayReserved: '',
  };

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);

  return popup;
}

// 결제 상태 폴링 (1.5초 간격, 최대 5분)
function pollPaymentStatus(
  orderId: string,
  authHeader: string,
  onSuccess: (tier: Tier, expiresAt: string) => void,
  onFail: (msg: string) => void
): () => void {
  const MAX_TRIES = 200; // 5분
  let tries = 0;
  let stopped = false;

  const poll = async () => {
    if (stopped) return;
    tries++;
    if (tries > MAX_TRIES) { onFail('결제 확인 시간이 초과되었습니다.'); return; }

    try {
      const res = await fetch(aegisUrl(`/api/payment/status/${orderId}`), {
        headers: { Authorization: authHeader },
      });
      if (!res.ok) { setTimeout(poll, 1500); return; }

      const data = await res.json();
      if (data.status === 'paid') {
        onSuccess(data.tier, data.plan_expires_at);
      } else if (data.status === 'cancelled') {
        onFail('결제가 취소되었습니다.');
      } else {
        setTimeout(poll, 1500);
      }
    } catch {
      setTimeout(poll, 1500);
    }
  };

  setTimeout(poll, 1500);
  return () => { stopped = true; };
}

export default function UpgradeModal({ currentTier, onClose, getAuthHeader, onUpgradeSuccess }: Props) {
  const [billing, setBilling] = useState<Billing>('monthly');
  const [paying, setPaying] = useState<Tier | null>(null);
  const [error, setError] = useState('');

  async function handleUpgrade(plan: Tier) {
    if (plan === 'free' || paying) return;
    setError('');
    setPaying(plan);

    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error('로그인이 필요합니다.');

      const price = PRICES[plan];
      const amount = billing === 'annual' ? price.annualAmount : price.monthlyAmount;

      // 1. 결제 준비
      const prepareRes = await fetch(aegisUrl('/api/payment/prepare'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ plan, amount }),
      });
      if (!prepareRes.ok) {
        const { error: msg } = await prepareRes.json();
        throw new Error(msg || '결제 준비 실패');
      }
      const prepareData = await prepareRes.json();

      // 2. NicePay SDK 로드
      await loadNicePaySdk();

      // 3. NicePay 팝업 열기
      openNicePayPopup({ ...prepareData, plan });

      // 4. 팝업 결과 + 폴링으로 완료 감지
      await new Promise<void>((resolve, reject) => {
        // postMessage로 팝업 결과 수신
        const onMessage = (e: MessageEvent) => {
          if (e.data?.type === 'NICEPAY_SUCCESS') {
            window.removeEventListener('message', onMessage);
            stopPoll();
            resolve();
          } else if (e.data?.type === 'NICEPAY_FAIL') {
            window.removeEventListener('message', onMessage);
            stopPoll();
            reject(new Error(e.data.message || '결제 실패'));
          }
        };
        window.addEventListener('message', onMessage);

        // 폴링 병행 (팝업 메시지 수신 실패 대비)
        const stopPoll = pollPaymentStatus(
          prepareData.orderId,
          authHeader,
          (tier, expiresAt) => {
            window.removeEventListener('message', onMessage);
            onUpgradeSuccess(tier, expiresAt);
            resolve();
          },
          (msg) => {
            window.removeEventListener('message', onMessage);
            reject(new Error(msg));
          }
        );
      });

    } catch (e) {
      setError(e instanceof Error ? e.message : '결제 중 오류가 발생했습니다.');
    } finally {
      setPaying(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
          <div>
            <h2 className="text-white font-bold text-lg">플랜 업그레이드</h2>
            <p className="text-gray-400 text-sm mt-0.5">더 많은 임원과 함께 회의하세요</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300 text-xl transition-colors">✕</button>
        </div>

        {/* 결제 주기 탭 */}
        <div className="flex justify-center pt-5 pb-1">
          <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
            {(['monthly', 'annual'] as Billing[]).map(b => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  billing === b ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {b === 'monthly' ? '월 결제' : '연 결제'}
                {b === 'annual' && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-700/60 text-green-300 font-medium">2개월 무료</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 플랜 카드 */}
        <div className="grid grid-cols-3 gap-4 p-6 pb-4">
          {(Object.entries(TIER_CONFIG) as [Tier, typeof TIER_CONFIG[Tier]][]).map(([key, cfg]) => {
            const isCurrent = key === currentTier;
            const price = PRICES[key];
            const isPaid = key !== 'free';
            const isLoading = paying === key;

            return (
              <div
                key={key}
                className={`rounded-xl border-2 p-5 flex flex-col gap-4 transition-all ${
                  isCurrent ? 'border-indigo-600 bg-indigo-950/30' : 'border-gray-800 bg-gray-800/30 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.badge}`}>{cfg.label}</span>
                  {isCurrent && <span className="text-xs text-indigo-400">현재 플랜</span>}
                </div>

                <div className="min-h-[56px]">
                  <p className="text-white font-bold text-xl">
                    {billing === 'annual' && isPaid ? price.annual : price.monthly}
                  </p>
                  {billing === 'annual' && isPaid ? (
                    <>
                      <p className="text-gray-400 text-xs mt-0.5">{price.annualTotal} 일시불</p>
                      <p className="text-green-400 text-xs">{price.monthlyEquiv}</p>
                    </>
                  ) : (
                    <p className="text-gray-400 text-xs mt-0.5">{price.desc}</p>
                  )}
                </div>

                <ul className="space-y-2 flex-1">
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-green-400">✓</span> 참석자 최대 {cfg.maxAttendees}명
                  </li>
                  <li className={`flex items-center gap-2 text-sm ${cfg.canEditPersona ? 'text-gray-300' : 'text-gray-400'}`}>
                    <span>{cfg.canEditPersona ? '✓' : '✕'}</span> 페르소나 수정
                  </li>
                  <li className={`flex items-center gap-2 text-sm ${cfg.canAddDeletePersona ? 'text-gray-300' : 'text-gray-400'}`}>
                    <span>{cfg.canAddDeletePersona ? '✓' : '✕'}</span> 인물 추가·삭제
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-green-400">✓</span> 모델·API키 변경
                  </li>
                  <li className={`flex items-center gap-2 text-sm ${cfg.canViewHistory ? 'text-gray-300' : 'text-gray-400'}`}>
                    <span>{cfg.canViewHistory ? '✓' : '✕'}</span> 지난 회의 조회
                  </li>
                </ul>

                {isCurrent ? (
                  <div className="w-full py-2 rounded-lg bg-indigo-900/40 text-indigo-400 text-sm text-center font-medium">사용 중</div>
                ) : key === 'free' ? (
                  <div className="w-full py-2 rounded-lg bg-gray-800 text-gray-400 text-sm text-center">다운그레이드</div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(key)}
                    disabled={!!paying}
                    className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {isLoading ? '결제 확인 중...' : '업그레이드 →'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <p className="mx-6 mb-2 text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
        )}
        <p className="text-center text-gray-600 text-xs pb-5">결제는 NicePay를 통해 안전하게 처리됩니다.</p>
      </div>
    </div>
  );
}
