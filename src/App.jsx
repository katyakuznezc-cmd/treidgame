import React, { useState, useEffect, useRef } from 'react';

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
    sound: 'ЗВУК', lang: 'ЯЗЫК', wait: 'ЖДИТЕ...', profit: 'ПРИБЫЛЬ'
  },
  EN: {
    mining: 'MINING', trade: 'EXCHANGE', opts: 'SETTINGS', analysis: 'ANALYZING...', 
    buy: 'BUY', sell: 'SELL', back: '← BACK', reset: 'TUTORIAL',
    sound: 'SOUND', lang: 'LANG', wait: 'WAIT...', profit: 'PROFIT'
  }
};

export default function App() {
  const [userId] = useState('ID' + Math.floor(Math.random() * 9999));
  const [balance, setBalance] = useState(1000.00);
  const [lang, setLang] = useState('RU');
  const [tab, setTab] = useState('trade');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedDex, setSelectedDex] = useState(null);
  
  // Состояния для сигнала
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [signal, setSignal] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const [activePos, setActivePos] = useState({});
  const [tutStep, setTutStep] = useState(0); // 0-баланс, 1-сигнал, 2-биржи, -1-выключено
  const [toast, setToast] = useState(null);

  const sndClick = useRef(new Audio('https://www.fesliyanstudios.com/play-mp3/6510'));
  const sndWin = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  const t = TEXTS[lang];

  // Логика появления сигнала
  useEffect(() => {
    let timer;
    if (tab === 'trade' && !signal) {
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
  }, [tab, signal, soundEnabled]);

  // Таймер обратного отсчета сигнала
  useEffect(() => {
    if (timeLeft > 0) {
      const itv = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(itv);
    } else if (signal) {
      setSignal(null);
    }
  }, [timeLeft, signal]);

  const clickMine = (e) => {
    setBalance(prev => prev + 0.1);
    if(soundEnabled) { sndClick.current.currentTime = 0; sndClick.current.play().catch(()=>{}); }
    const dol = document.createElement('div');
    dol.innerText = '$';
    dol.style.cssText = `position:fixed; left:${e.clientX}px; top:${e.clientY}px; color:#00ff88; font-weight:bold; animation:fly 0.5s forwards; pointer-events:none; z-index:9999;`;
    document.body.appendChild(dol);
    setTimeout(() => dol.remove(), 500);
  };

  return (
    <div className="main-viewport">
      <style>{`
        :root { --neon: #00d9ff; --win: #00ff88; --loss: #ff3366; }
        * { box-sizing: border-box; font-family: sans-serif; }
        
        .main-viewport {
          width: 100vw; height: 100dvh;
          background: #000; color: #fff;
          display: flex; flex-direction: column;
          overflow: hidden; position: relative;
        }

        .app-shell {
          width: 100%; max-width: 500px; margin: 0 auto;
          height: 100%; display: flex; flex-direction: column;
          border-left: 1px solid #222; border-right: 1px solid #222;
        }

        .header { padding: 20px; border-bottom: 1px solid #222; }
        .balance { font-size: 32px; font-weight: 800; color: var(--win); }

        .scroll-area { flex: 1; overflow-y: auto; padding: 15px; }

        .signal-card {
          background: #00151a; border: 2px solid var(--neon);
          border-radius: 15px; padding: 20px; margin-bottom: 15px;
          text-align: center; min-height: 100px;
        }

        .dex-button {
          background: #111; border: 1px solid #333; padding: 20px;
          border-radius: 15px; margin-bottom: 10px; font-weight: bold;
          display: flex; justify-content: space-between; cursor: pointer;
        }

        .nav { height: 80px; display: flex; background: #0a0a0a; border-top: 1px solid #222; }
        .nav-item { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: #555; }
        .nav-item.active { color: var(--neon); }

        .tut-overlay {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.8); z-index: 1000;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .tut-box { background: #1a1a1a; border: 2px solid var(--neon); padding: 25px; border-radius: 20px; text-align: center; }
        
        .highlight { border: 2px solid #fff !important; box-shadow: 0 0 20px #fff; position: relative; z-index: 1001; background: #000; }

        .btn-action { padding: 10px 20px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; }
        
        @keyframes fly { to { transform: translateY(-100px); opacity: 0; } }
        @keyframes pulse { 50% { opacity: 0.5; } }
      `}</style>

      <div className="app-shell">
        {/* ОБУЧЕНИЕ */}
        {tutStep !== -1 && (
          <div className="tut-overlay">
            <div className="tut-box">
              <h2 style={{color:'var(--neon)'}}>TUTORIAL</h2>
              <p>{tutStep === 0 ? "Это твой баланс. Начни торговать!" : (tutStep === 1 ? "Здесь появятся сигналы после анализа." : "Выбери любую биржу для сделок.")}</p>
              <button onClick={() => tutStep < 2 ? setTutStep(tutStep+1) : setTutStep(-1)} style={{width:'100%', padding: 15, background: 'var(--neon)', border:'none', borderRadius:10, fontWeight:'bold'}}>OK</button>
            </div>
          </div>
        )}

        {/* ШАПКА */}
        <div className={`header ${tutStep === 0 ? 'highlight' : ''}`}>
          <div style={{fontSize: 10, color: '#444'}}>USER: {userId}</div>
          <div className="balance">${balance.toFixed(2)}</div>
        </div>

        {/* КОНТЕНТ */}
        <div className="scroll-area">
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div id="dex-list">
                  <div className={`signal-card ${tutStep === 1 ? 'highlight' : ''}`}>
                    {isAnalyzing ? (
                      <div style={{color: 'var(--neon)', animation: 'pulse 1s infinite', fontWeight:'bold'}}>{t.analysis}</div>
                    ) : signal ? (
                      <div>
                        <div style={{fontSize: 20, fontWeight: 900}}>{signal.coin}: {signal.from} → {signal.to}</div>
                        <div style={{color: 'var(--win)', fontWeight: 'bold'}}>+{signal.perc}% | {timeLeft}s</div>
                      </div>
                    ) : <div style={{color: '#333'}}>{t.wait}</div>}
                  </div>

                  <div className={tutStep === 2 ? 'highlight' : ''} style={{borderRadius: 15}}>
                    {DEX.map(d => (
                      <div key={d.id} className="dex-button" onClick={() => setSelectedDex(d.id)}>
                        <span>{d.name}</span>
                        <span style={{color: d.color}}>● ACTIVE</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} style={{background: '#222', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 10, marginBottom: 15}}>{t.back}</button>
                  {COINS.map(c => (
                    <div key={c.id} className="dex-button" style={{alignItems: 'center'}}>
                      <span>{c.id} / USDT</span>
                      <button onClick={() => {
                        if(balance < 100) return;
                        setBalance(b => b - 100);
                        setActivePos(prev => ({...prev, [c.id]: true}));
                        setTimeout(() => {
                           const win = Math.random() > 0.2;
                           const gain = win ? 115 : 0;
                           setBalance(b => b + gain);
                           setActivePos(prev => ({...prev, [c.id]: false}));
                           setToast(win ? 'WIN +$15' : 'LOSS -$100');
                           setTimeout(() => setToast(null), 2000);
                        }, 5000);
                      }} className="btn-action" style={{background: activePos[c.id] ? '#333' : 'var(--win)'}}>
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
              <div onClick={clickMine} style={{width: 200, height: 200, border: '6px solid var(--neon)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, color: 'var(--neon)', boxShadow: '0 0 30px rgba(0,217,255,0.2)'}}>$</div>
            </div>
          )}

          {tab === 'opts' && (
            <div>
              <button onClick={() => { setTutStep(0); setTab('trade'); setSelectedDex(null); }} className="dex-button" style={{width:'100%', color: 'var(--neon)'}}>{t.reset}</button>
              <button onClick={() => setSoundEnabled(!soundEnabled)} className="dex-button" style={{width:'100%'}}>{t.sound}: {soundEnabled ? 'ON' : 'OFF'}</button>
              <button onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')} className="dex-button" style={{width:'100%'}}>{t.lang}: {lang}</button>
              <div style={{textAlign: 'center', marginTop: 30}}>
                <a href="https://t.me/kriptoalians" style={{color: 'var(--neon)', textDecoration: 'none', fontWeight: 'bold'}}>@kriptoalians</a>
              </div>
            </div>
          )}
        </div>

        {/* УВЕДОМЛЕНИЕ */}
        {toast && (
          <div style={{position:'fixed', top:'20%', left:'50%', transform:'translateX(-50%)', background: toast.includes('WIN') ? 'var(--win)' : 'var(--loss)', color:'#000', padding:'15px 30px', borderRadius:50, fontWeight:'bold', z-index:9999}}>
            {toast}
          </div>
        )}

        {/* НАВИГАЦИЯ */}
        <nav className="nav">
          <div onClick={() => setTab('mining')} className={`nav-item ${tab === 'mining' ? 'active' : ''}`}><span>{t.mining}</span></div>
          <div onClick={() => setTab('trade')} className={`nav-item ${tab === 'trade' ? 'active' : ''}`}><span>{t.trade}</span></div>
          <div onClick={() => setTab('opts')} className={`nav-item ${tab === 'opts' ? 'active' : ''}`}><span>{t.opts}</span></div>
        </nav>
      </div>
    </div>
  );
}
