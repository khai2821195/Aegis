import { useState, useEffect } from 'react';

interface Props {
  onStart: () => void;
}

export default function LandingPage({ onStart }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [riskValue, setRiskValue] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    
    // Animate the risk counter
    const timer = setInterval(() => {
      setRiskValue(prev => (prev < 85 ? prev + 1 : 85));
    }, 20);
    return () => clearInterval(timer);
  }, []);

  const features = [
    { emoji: '⚡', title: '의사결정 속도 극대화', desc: '직관의 공백을 데이터와 다각도 논리로 채워 결정을 가속합니다.' },
    { emoji: '🛡️', title: '비즈니스 리스크 사전 제거', desc: '법무, 재무, 전략 등 각 분야 전문가 AI가 당신의 기획을 검증합니다.' },
    { emoji: '🧠', title: '최적의 추론 엔진', desc: '가장 뛰어난 지능 모델(GPT, Claude, Gemini)을 교차 검증하여 결론을 도출합니다.' },
    { emoji: '📊', title: '기회비용 시각화', desc: '결정이 지연되거나 잘못되었을 때 발생하는 리스크를 객관적인 수치로 환산합니다.' },
  ];

  const personas = [
    { emoji: '💼', role: '수석비서', color: 'bg-rose-900/40 text-rose-400 border-rose-800' },
    { emoji: '🚀', role: '전략총괄', color: 'bg-orange-900/40 text-orange-400 border-orange-800' },
    { emoji: '💰', role: '재무총괄', color: 'bg-yellow-900/40 text-yellow-400 border-yellow-800' },
    { emoji: '⚖️', role: '법무총괄', color: 'bg-red-900/40 text-red-400 border-red-800' },
    { emoji: '📣', role: '마케팅총괄', color: 'bg-green-900/40 text-green-400 border-green-800' },
    { emoji: '🎨', role: '디자인총괄', color: 'bg-purple-900/40 text-purple-400 border-purple-800' },
    { emoji: '⚙️', role: '기술총괄', color: 'bg-blue-900/40 text-blue-400 border-blue-800' },
    { emoji: '🎓', role: '교육총괄', color: 'bg-cyan-900/40 text-cyan-400 border-cyan-800' },
    { emoji: '🗂️', role: '운영총괄', color: 'bg-teal-900/40 text-teal-400 border-teal-800' },
  ];

  const faqs = [
    { q: "왜 단순 자동화 툴이 아닌 의사결정 엔진이 필요한가요?", a: "업무 효율화만으로는 비즈니스의 치명적인 리스크를 막을 수 없기 때문입니다. Aegis는 단 한 번의 잘못된 경영 판단으로 인한 막대한 비용 손실을 사전에 차단하는 '지적 보완 장치'입니다." },
    { q: "경영 및 기업 데이터 유출 위험은 없나요?", a: "기본적으로 모든 대화와 데이터는 철저히 암호화되어 관리됩니다. 최고 보안이 필요한 경우 Enterprise 티어의 전용망 구성(VPC) 및 On-Premise 연동 옵션을 통해 완벽한 폐쇄성을 보장합니다." },
    { q: "어떤 리더에게 가장 유용한가요?", a: "신사업, 대규모 투자 등 중대한 판단을 앞둔 C레벨 및 대표이사는 물론, 조언을 구할 곳 없이 모든 의사결정을 홀로 감당해야 하는 자영업자 및 소상공인 분들에게도 리스크를 사전에 방어해 주는 든든한 필수 파트너가 됩니다." },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-indigo-500/30 font-sans overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[50%] h-[50%] bg-purple-900/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 py-4 lg:px-12 backdrop-blur-md bg-gray-950/50 border-b border-white/5 sticky top-0 z-50">
          <div className="flex items-center gap-2 group cursor-default">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              A
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              AEGIS
            </span>
          </div>
          <button
            onClick={onStart}
            className="px-5 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            로그인
          </button>
        </nav>

        {/* Hero Section */}
        <section className={`pt-32 pb-20 px-6 lg:px-12 max-w-7xl mx-auto flex flex-col items-center text-center transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide mb-8">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            DATA-DRIVEN DECISION ENGINE
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            리더의 직관을 <br className="hidden md:block"/>
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">데이터로 증명하다</span>
          </h1>
          <p className="text-lg lg:text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed">
            Aegis는 단순한 업무 효율화 도구가 아닙니다. 당신의 비즈니스 리스크를 낮추고 의사결정의 질과 속도를 극대화하는 <strong className="text-gray-200">단 하나의 지적 인프라</strong>입니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onStart}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2"
            >
              내 경영 리스크 진단하기
            </button>
            <button
              onClick={() => {
                document.getElementById('insight')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl font-semibold border border-gray-700 transition-all hover:-translate-y-1 active:translate-y-0"
            >
              인사이트 뷰
            </button>
          </div>
        </section>

        {/* Decision Insight Section (Risk Calculator Mockup) */}
        <section id="insight" className="py-24 px-6 lg:px-12">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4 leading-tight">의사결정이 늦어질수록<br/>기회비용은 기하급수적으로 증가합니다</h2>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  직관에만 의존하는 결정은 불확실성을 키울 뿐입니다. Aegis는 9명의 AI 의사결정 위원회를 통해 사각지대를 찾아내고, 데이터 기반의 근거를 즉각적으로 제시합니다.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-green-900/50 text-green-400 flex items-center justify-center border border-green-800">✓</div>
                    직관에 대한 논리적 타당성 검증
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-green-900/50 text-green-400 flex items-center justify-center border border-green-800">✓</div>
                    결정 지연으로 인한 매몰 비용 방어
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-green-900/50 text-green-400 flex items-center justify-center border border-green-800">✓</div>
                    법무/재무/전략적 엣지 케이스 조기 발견
                  </li>
                </ul>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
                <div className="relative z-10">
                  <div className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">Decision Risk Assessment</div>
                  <div className="text-4xl font-bold flex items-baseline gap-2 mb-2">
                    {riskValue}%
                    <span className="text-sm font-normal text-red-400">잠재적 리스크 잔존</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 mb-6">
                    <div className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-2 rounded-full transition-all duration-300" style={{ width: `${riskValue}%` }} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                      <span className="text-gray-300">전략 타당성</span>
                      <span className="text-green-400 font-mono">PASS (92%)</span>
                    </div>
                    <div className="flex justify-between text-sm p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                      <span className="text-gray-300">재무적 기회비용</span>
                      <span className="text-yellow-400 font-mono">REVIEW REQ</span>
                    </div>
                    <div className="flex justify-between text-sm p-3 bg-red-900/20 rounded-lg border border-red-800/50">
                      <span className="text-red-300 font-medium">법적 컴플라이언스 리스크</span>
                      <span className="text-red-400 font-mono">HIGH RISK</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Preview */}
        <section className="py-24 px-6 lg:px-12 bg-gray-900/50 border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">완벽한 결정을 위한 인프라</h2>
              <p className="text-gray-400">인간의 직관과 결합하여 최고의 시너지를 내는 분석 엔진 구조.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f, i) => (
                <div key={i} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 rounded-3xl hover:bg-gray-800 hover:border-indigo-500/50 transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-gray-900 border border-gray-700 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                    {f.emoji}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Personas Section */}
        <section className="py-24 px-6 lg:px-12 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4 border border-gray-800 rounded-full">
            Intellectual Committees
          </div>
          <h2 className="text-3xl font-bold mb-4">가상 의사결정 위원회</h2>
          <p className="text-gray-400 mb-16 max-w-2xl mx-auto">전략, 재무, 법률을 아우르는 9개의 관점을 확보하세요. 당신의 판단을 즉각적으로 다각도 검증합니다.</p>
          
          <div className="flex flex-wrap justify-center gap-4">
            {personas.map((p, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl border bg-gray-900/50 transition-all hover:-translate-y-1 cursor-default hover:shadow-lg hover:border-gray-500`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.color} border text-sm`}>
                  {p.emoji}
                </div>
                <span className="font-semibold text-sm text-gray-200">{p.role}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 px-6 lg:px-12 bg-gray-900/50 border-y border-white/5">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">자주 묻는 질문</h2>
            <div className="space-y-6">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6 hover:bg-gray-800/50 transition-colors">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-start gap-4">
                    <span className="text-indigo-400 font-black">Q.</span>
                    {faq.q}
                  </h3>
                  <p className="text-gray-400 leading-relaxed pl-8">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing CTA Section */}
        <section className="py-32 px-6 lg:px-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950 to-indigo-950/20 z-0" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">의사결정의 리스크를 없앨 준비가 되셨습니까?</h2>
            <p className="text-lg text-gray-400 mb-10">지금 바로 Aegis에 합류하여 데이터에 기반한 초격차 경영을 শুরু하세요.</p>
            <button
              onClick={onStart}
              className="px-10 py-5 bg-white text-gray-950 rounded-2xl font-bold text-lg shadow-2xl shadow-white/10 transition-transform hover:scale-105 active:scale-95"
            >
              내 경영 리스크 진단 시작하기
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 text-center text-sm text-gray-600 border-t border-white/5 bg-gray-950">
          © 2026 AEGIS. Engineered for Executive Decisions.
        </footer>
      </div>
    </div>
  );
}
