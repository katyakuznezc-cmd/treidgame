import React, { useState, useEffect, useRef } from 'react';

// Константы данных
const COINS = [
  { id: 'TON', base: 5.4 }, { id: 'DOGE', base: 0.15 },
  { id: 'SOL', base: 145 }, { id: 'BTC', base: 95000 }
];

const DEX = [
  { id: '1in', name: '1INCH', color: '#00ccff' },
  { id: 'uni', name: 'UNISWAP', color: '#ff007a' },
  { id: 'pancake', name: 'PANCAKE', color: '#d1884f' }
];

const TEXTS = {
  RU: {
    mining: 'МАЙНИНГ', trade: 'БИРЖА', opts: 'ОПЦИИ', analysis: 'АНАЛИЗ РЫНКА...', 
    buy: 'КУПИТЬ', sell: 'ПРОДАТЬ', back: '← НАЗАД', reset: 'ОБУЧЕНИЕ',
    sound: 'ЗВУК', lang: 'ЯЗЫК', wait: 'ЖДИТЕ...', profit: 'ПРИБЫЛЬ',
    tut1: 'Это твой баланс. Начни торговать!',
    tut2: 'Тут появятся сигналы после 5 сек анализа.',
    tut3: 'Выбери биржу для начала сделки.'
  },
  EN: {
    mining: 'MINING', trade: 'EXCHANGE', opts: 'SETTINGS', analysis: 'ANALYZING...', 
    buy: 'BUY', sell: 'SELL', back: '← BACK', reset: 'TUTORIAL',
    sound: 'SOUND', lang: 'LANG', wait: 'WAIT...', profit: 'PROFIT',
    tut1: 'This is your balance. Start trading!',
    tut2: 'Signals appear here after 5s analysis.',
    tut3: 'Pick any DEX to start a trade.'
  }
};

export default function App() {
  const [balance, setBalance] = useState(1000.00);
  const [lang, setLang] = useState('RU');
  const [tab, setTab] = useState('trade');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedDex, setSelectedDex] = useState(null);
  
  // Состояния сигнала
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [signal, setSignal] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const [activePos, setActivePos] = useState({});
  const [tutStep, setTutStep] = useState(0); 
  const [toast, setToast] = useState(null);

  const sndWin = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));
  const t = TEXTS[lang];

  // Логика Сигнала
  useEffect(() => {
    let timer;
    if (tab === 'trade' && !signal && !selectedDex) {
      setIsAnalyzing(true);
      timer = setTimeout(() => {
        const coin = COINS[Math.floor(Math.random() * COINS.length)];
        const d1 = DEX[Math.floor(Math.random() * DEX.length)];
        setSignal({
          coin: coin.id,
          from: d1.name,
          to: DEX.find(x => x.id !== d1.id).name,
          perc: (Math.random() * 3 + 1).toFixed(2)
        });
        setTimeLeft(60);
        setIsAnalyzing(false);
        if(soundEnabled) sndWin.current.play().catch(() => {});
      }, 5000); 
    }
    return () => clearTimeout(timer);
  }, [tab, signal, selectedDex, soundEnabled]);

  useEffect(() => {
    if (timeLeft > 0) {
      const itv = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(itv);
    } else if (signal) {
      setSignal(null);
    }
  }, [timeLeft, signal]);

  const runTrade = (id) => {
    if(balance < 100 || activePos[id]) return;
    setBalance(b => b - 100);
    setActivePos(prev => ({...prev, [id]: true}));
    
    setTimeout(() => {
      const win = Math.random() > 0.3;
      const gain = win ? 120 : 0;
      setBalance(b => b + gain);
      setActivePos(prev => ({...prev, [id]: false}));
      setToast(win ? '+$20.00' : '-$100.00');
      setTimeout(() => setToast(null), 2000);
    }, 4000);
  };

  return (
    <div className="viewport">
      <style>{`
        :root { --neon: #00d9ff; --win: #00ff88; --loss: #ff3366; --bg: #000; }
        * { box-sizing: border-box; font-family: -apple-system, sans-serif; margin: 0; padding: 0; }
        
        .viewport {
          width: 100vw; height: 100vh; height: 100dvh;
          background: #080808; display: flex; justify-content: center; overflow: hidden;
        }

        .container {
          width: 100%; max-width: 500px; height: 100%;
          background: var(--bg); display: flex; flex-direction: column;
          position: relative; border-left: 1px solid #1a1a1a; border-right: 1px solid #1a1a1a;
        }

        .header { padding: 25px 20px; border-bottom: 1px solid #1a1a1a; flex-shrink: 0; }
        .bal-text { font-size: 34px; font-weight: 900; color: var(--win); letter-spacing: -1px; }

        .content { flex: 1; overflow-y: auto; padding: 15px; padding-bottom: 100px; }

        .sig-card {
          background: linear-gradient(145deg, #001a1f, #000);
          border: 1px solid var(--neon); border-radius: 20px; padding: 25px;
          margin-bottom: 20px; text-align: center; box-shadow: 0 10px 30px rgba(0,217,255,0.1);
        }

        .item-btn {
          background: #121212; border: 1px solid #222; padding: 20px;
          border-radius: 18px; margin-bottom: 12px; display: flex;
          justify-content: space-between; align-items: center; cursor: pointer;
        }

        .nav {
          position: absolute; bottom: 0; width: 100%; height: 85px;
          display: flex; background: rgba(10,10,10,0.95);
          backdrop-filter: blur(10px); border-top: 1px solid #1a1a1a;
        }
        .nav-tab { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #444; flex-direction: column; }
        .nav-tab.active { color: var(--neon); }

        .tut-box {
          position: absolute; inset: 0; background: rgba(0,0,0,0.85);
          z-index: 999; display: flex; align-items: center; justify-content: center; padding: 30px;
        }
        .tut-content { background: #151515; border: 2px solid var(--neon); padding: 30px; border-radius: 25px; text-align: center; width: 100%; }

        .toast {
          position: fixed; top: 20%; left: 50%; transform: translate(-50%, -50%);
          padding: 15px 35px; border-radius: 50px; font-weight: 900; z-index: 1000;
          font-size: 24px; box-shadow: 0 0 40px rgba(0,0,0,0.5);
        }

        @keyframes pulse { 50% { opacity: 0.3; } }
      `}</style>

      <div className="container">
        {/* ОБУЧЕНИЕ */}
        {tutStep !== -1 && (
          <div className="tut-box">
            <div className="tut-content">
              <h2 style={{color: 'var(--neon)', marginBottom: 15}}>{lang === 'RU' ? 'ПРИВЕТ!' : 'WELCOME!'}</h2>
              <p style={{color: '#aaa', marginBottom: 25, lineHeight: 1.5}}>
                {tutStep === 0 ? t.tut1 : (tutStep === 1 ? t.tut2 : t.tut3)}
              </p>
              <button onClick={() => tutStep < 2 ? setTutStep(tutStep+1) : setTutStep(-1)} style={{width: '100%', padding: 18, background: 'var(--neon)', border: 'none', borderRadius: 15, fontWeight: '900', color: '#000'}}>OK</button>
            </div>
          </div>
        )}

        {/* УВЕДОМЛЕНИЕ */}
        {toast && (
          <div className="toast" style={{background: toast.includes('+') ? 'var(--win)' : 'var(--loss)', color: '#000'}}>
            {toast}
          </div>
        )}

        <header className="header">
          <div style={{fontSize: 12, color: '#444', marginBottom: 5, fontWeight: 'bold'}}>TOTAL BALANCE</div>
          <div className="bal-text">${balance.toFixed(2)}</div>
        </header>

        <main className="content">
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="sig-card">
                    {isAnalyzing ? (
                      <div style={{color: 'var(--neon)', animation: 'pulse 1s infinite', fontWeight: '900', letterSpacing: 1}}>{t.analysis}</div>
                    ) : signal ? (
                      <div>
                        <div style={{fontSize: 22, fontWeight: 900, marginBottom: 5}}>{signal.coin} / USDT</div>
                        <div style={{fontSize: 14, color: '#aaa', marginBottom: 10}}>{signal.from} → {signal.to}</div>
                        <div style={{color: 'var(--win)', fontWeight: '900', fontSize: 18}}>+{signal.perc}% <span style={{color: '#444', marginLeft: 10}}>{timeLeft}s</span></div>
                      </div>
                    ) : <div style={{color: '#222'}}>{t.wait}</div>}
                  </div>

                  {DEX.map(d => (
                    <div key={d.id} className="item-btn" onClick={() => setSelectedDex(d.id)}>
                      <b style={{fontSize: 18}}>{d.name}</b>
                      <span style={{color: d.color, fontSize: 12, fontWeight: 'bold'}}>● ACTIVE</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} style={{background: '#1a1a1a', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 12, marginBottom: 20, fontWeight: 'bold'}}>{t.back}</button>
                  {COINS.map(c => (
                    <div key={c.id} className="item-btn">
                      <b>{c.id} / USDT</b>
                      <button onClick={() => runTrade(c.id)} style={{background: activePos[c.id] ? '#222' : 'var(--win)', color: '#000', border: 'none', padding: '12px 25px', borderRadius: 12, fontWeight: '900', minWidth: 100}}>
                        {activePos[c.id] ? '...' : t.buy}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'mining' && (
            <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <div onClick={() => setBalance(b => b + 0.1)} style={{width: 220, height: 220, border: '8px solid var(--neon)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 90, color: 'var(--neon)', cursor: 'pointer', boxShadow: '0 0 40px rgba(0,217,255,0.1)'}}>$</div>
            </div>
          )}

          {tab === 'opts' && (
            <div>
              <button onClick={() => { setTutStep(0); setTab('trade'); setSelectedDex(null); }} className="item-btn" style={{width: '100%', color: 'var(--neon)', fontWeight: '900'}}>{t.reset}</button>
              <button onClick={() => setSoundEnabled(!soundEnabled)} className="item-btn" style={{width: '100%', color: '#fff'}}>{t.sound}: {soundEnabled ? 'ON' : 'OFF'}</button>
              <button onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')} className="item-btn" style={{width: '100%', color: '#fff'}}>{t.lang}: {lang}</button>
              <div style={{textAlign: 'center', marginTop: 40}}>
                <a href="https://t.me/kriptoalians" style={{color: '#444', textDecoration: 'none', fontWeight: 'bold', fontSize: 14}}>TELEGRAM: @KRIPTOALIANS</a>
              </div>
            </div>
          )}
        </main>

        <nav className="nav">
          <div onClick={() => setTab('mining')} className={`nav-tab ${tab === 'mining' ? 'active' : ''}`}>{t.mining}</div>
          <div onClick={() => setTab('trade')} className={`nav-tab ${tab === 'trade' ? 'active' : ''}`}>{t.trade}</div>
          <div onClick={() => setTab('opts')} className={`nav-tab ${tab === 'opts' ? 'active' : ''}`}>{t.opts}</div>
        </nav>
      </div>
    </div>
  );
}
