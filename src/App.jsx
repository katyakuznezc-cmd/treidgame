import React, { useState, useEffect, useRef } from 'react';

const COINS_DATA = [
  { id: 'TON', lvl: 1, base: 5.42 },
  { id: 'DOGE', lvl: 1, base: 0.15 },
  { id: 'SOL', lvl: 2, base: 145.3 },
  { id: 'BTC', lvl: 5, base: 95000 },
];

const EXCHANGES = [
  { id: '1inch', name: '1INCH', color: '#00ccff' },
  { id: 'uniswap', name: 'UNISWAP', color: '#ff007a' },
  { id: 'pancakeswap', name: 'PANCAKE', color: '#d1884f' }
];

const STRINGS = {
  RU: {
    mining: 'МАЙНИНГ', trade: 'БИРЖА', opts: 'ОПЦИИ', analysis: 'АНАЛИЗ РЫНКА...', 
    profit_pred: 'ПРОГНОЗ ДОХОДА:', buy: 'КУПИТЬ', sell: 'ПРОДАТЬ', back: '← НАЗАД',
    reset: 'ОБУЧЕНИЕ', sound: 'ЗВУК', lang: 'ЯЗЫК', wait: 'ОЖИДАНИЕ...', balance: 'БАЛАНС'
  },
  EN: {
    mining: 'MINING', trade: 'EXCHANGE', opts: 'SETTINGS', analysis: 'MARKET ANALYSIS...', 
    profit_pred: 'PROFIT PREDICTION:', buy: 'BUY', sell: 'SELL', back: '← BACK',
    reset: 'TUTORIAL', sound: 'SOUND', lang: 'LANG', wait: 'WAITING...', balance: 'BALANCE'
  }
};

export default function App() {
  const [userId] = useState(() => localStorage.getItem('k_uid') || 'ID' + Math.floor(Math.random() * 999999));
  const [balance, setBalance] = useState(() => Number(localStorage.getItem(`k_bal_${userId}`)) || 1000.00);
  const [xp, setXp] = useState(() => Number(localStorage.getItem(`k_xp_${userId}`)) || 0);
  const [lang, setLang] = useState('RU');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const [prices, setPrices] = useState(() => COINS_DATA.reduce((acc, c) => ({ ...acc, [c.id]: c.base }), {}));
  const [tab, setTab] = useState('trade'); 
  const [selectedDex, setSelectedDex] = useState(null);
  const [activePositions, setActivePositions] = useState({});
  const [pendingTime, setPendingTime] = useState({});
  const [tradeAmount, setTradeAmount] = useState(100);
  
  const [signal, setSignal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [signalTimer, setSignalTimer] = useState(0);
  const [toast, setToast] = useState(null);
  const [tutStep, setTutStep] = useState(() => localStorage.getItem('k_tut') ? -1 : 0);

  const lvl = Math.floor(xp / 150) + 1;
  const t = STRINGS[lang];

  const sndClick = useRef(new Audio('https://www.fesliyanstudios.com/play-mp3/6510'));
  const sndBell = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  // Эффект появления сигнала (Анализ 5 сек)
  useEffect(() => {
    if (tab === 'trade' && !signal && !isAnalyzing) {
      setIsAnalyzing(true);
      const timer = setTimeout(() => {
        const coin = COINS_DATA[Math.floor(Math.random() * COINS_DATA.length)];
        const d1 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
        const d2 = EXCHANGES.find(ex => ex.id !== d1.id);
        
        setSignal({ 
          coin: coin.id, buyDex: d1.name, sellDexName: d2.name, 
          bonus: (Math.random() * 2 + 1).toFixed(2)
        });
        setSignalTimer(90);
        setIsAnalyzing(false);
        if(soundEnabled) sndBell.current.play().catch(() => {});
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [tab, signal, isAnalyzing, soundEnabled]);

  // Таймер сигнала
  useEffect(() => {
    if (signalTimer > 0) {
      const itv = setInterval(() => setSignalTimer(s => s - 1), 1000);
      return () => clearInterval(itv);
    } else if (signal) {
      setSignal(null);
    }
  }, [signalTimer, signal]);

  const handleAction = (coinId) => {
    const pos = activePositions[coinId];
    if (pos) {
      setPendingTime(p => ({ ...p, [coinId]: 10 }));
      const timer = setInterval(() => {
        setPendingTime(prev => {
          if (prev[coinId] <= 1) {
            clearInterval(timer);
            const isWin = Math.random() > 0.2;
            const pnl = pos.amt * (isWin ? 0.05 : -0.05);
            setBalance(b => b + pos.amt + pnl);
            if(isWin) setXp(x => x + 20);
            setToast({ msg: isWin ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`, type: isWin ? 'win' : 'loss' });
            setTimeout(() => setToast(null), 2000);
            return { ...prev, [coinId]: null };
          }
          return { ...prev, [coinId]: prev[coinId] - 1 };
        });
      }, 1000);
      setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    } else {
      if(tradeAmount > balance) return;
      setBalance(b => b - tradeAmount);
      setActivePositions(p => ({ ...p, [coinId]: { amt: tradeAmount } }));
    }
  };

  return (
    <div className="wrapper">
      <style>{`
        :root { --win: #00ff88; --loss: #ff3366; --neon: #00d9ff; --bg: #000; --card: #111; }
        
        /* Глобальные сбросы для мобилок и ПК */
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; user-select: none; }
        html, body { margin: 0; padding: 0; background: #000; width: 100%; height: 100%; overflow: hidden; }
        
        /* Центрирование контейнера на ПК */
        .wrapper {
          width: 100%; height: 100vh;
          display: flex; justify-content: center; align-items: center;
          background: #050505;
        }

        .app-container { 
          width: 100%; max-width: 500px; height: 100%;
          background: var(--bg); display: flex; flex-direction: column;
          position: relative; border-left: 1px solid #222; border-right: 1px solid #222;
        }

        .header { padding: 20px; border-bottom: 1px solid #222; flex-shrink: 0; }
        .balance-val { color: var(--win); font-size: 32px; font-weight: 800; }

        .content { flex: 1; overflow-y: auto; padding: 10px; }
        
        .signal-box { 
          background: rgba(0,217,255,0.05); border: 1px solid var(--neon);
          border-radius: 16px; padding: 20px; margin-bottom: 15px;
          min-height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center;
        }

        .card { background: var(--card); border: 1px solid #222; border-radius: 16px; padding: 15px; margin-bottom: 10px; }
        
        .nav { height: 80px; display: flex; background: #0a0a0a; border-top: 1px solid #222; flex-shrink: 0; }
        .nav-btn { flex: 1; display: flex; align-items: center; justify-content: center; color: #555; font-size: 12px; font-weight: bold; cursor: pointer; }
        .nav-btn.active { color: var(--neon); }

        .toast { 
          position: fixed; top: 30%; left: 50%; transform: translateX(-50%);
          padding: 20px 40px; border-radius: 50px; font-weight: 900; z-index: 9999; font-size: 24px;
        }

        @keyframes pulse { 50% { opacity: 0.3; } }
        @keyframes fly { to { transform: translateY(-80px); opacity: 0; } }

        /* Обучение */
        .tut-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .tut-card { background: #1a1a1a; border: 2px solid var(--neon); padding: 30px; border-radius: 24px; text-align: center; }
        .focus { border: 2px solid white !important; box-shadow: 0 0 20px white; z-index: 1001; }
      `}</style>

      {toast && <div className="toast" style={{background: toast.type==='win'?'var(--win)':'var(--loss)', color:'#000'}}>{toast.msg}</div>}

      <div className="app-container">
        {tutStep >= 0 && (
          <div className="tut-overlay">
            <div className="tut-card">
              <h3 style={{color: 'var(--neon)', marginTop: 0}}>{lang === 'RU' ? 'ОБУЧЕНИЕ' : 'TUTORIAL'}</h3>
              <p>{tutStep === 0 ? t.balance : (tutStep === 1 ? t.analysis : t.mining)}</p>
              <button onClick={() => tutStep < 2 ? setTutStep(tutStep+1) : setTutStep(-1)} style={{width:'100%', padding: 15, background:'var(--neon)', border:'none', borderRadius:12, fontWeight:'bold'}}>OK</button>
            </div>
          </div>
        )}

        <header className={`header ${tutStep === 0 ? 'focus' : ''}`}>
          <div style={{fontSize: 10, color: '#444'}}>ID: {userId}</div>
          <div className="balance-val">${balance.toFixed(2)}</div>
        </header>

        <main className="content">
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className={`signal-box ${tutStep === 1 ? 'focus' : ''}`}>
                    {isAnalyzing ? (
                      <b style={{color: 'var(--neon)', animation: 'pulse 1s infinite'}}>{t.analysis}</b>
                    ) : signal ? (
                      <>
                        <div style={{fontSize: 20, fontWeight: 900}}>{signal.coin}: {signal.buyDex} → {signal.sellDexName}</div>
                        <div style={{color: 'var(--win)', fontWeight: 'bold'}}>+{signal.bonus}% | {signalTimer}s</div>
                      </>
                    ) : <b>{t.wait}</b>}
                  </div>
                  {EXCHANGES.map(ex => (
                    <div key={ex.id} className="card" style={{cursor: 'pointer'}} onClick={() => setSelectedDex(ex.id)}>
                      <b style={{fontSize: 18}}>{ex.name}</b>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} className="card" style={{width: '100%', color: '#fff', border: 'none', textAlign: 'left'}}>{t.back}</button>
                  {COINS_DATA.map(c => {
                    const wait = pendingTime[c.id];
                    const pos = activePositions[c.id];
                    return (
                      <div key={c.id} className="card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <b>{c.id}</b>
                        <button onClick={() => handleAction(c.id)} style={{background: wait ? '#333' : (pos ? 'var(--loss)' : 'var(--win)'), border:'none', padding: '12px 20px', borderRadius: 10, fontWeight:'bold', minWidth: 100}}>
                          {wait ? `${wait}s` : (pos ? t.sell : t.buy)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'mining' && (
            <div style={{height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
              <div onClick={(e) => {
                setBalance(b => b + 0.1);
                if(soundEnabled) { sndClick.current.currentTime = 0; sndClick.current.play().catch(()=>{}); }
                const d = document.createElement('div');
                d.innerText = '$'; d.style.cssText = `position:fixed; left:${e.clientX}px; top:${e.clientY}px; color:var(--win); font-weight:bold; font-size:24px; pointer-events:none; animation:fly 0.6s forwards;`;
                document.body.appendChild(d); setTimeout(() => d.remove(), 600);
              }} style={{width: 200, height: 200, border: '6px solid var(--neon)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, color: 'var(--neon)'}}>$</div>
            </div>
          )}

          {tab === 'opts' && (
            <div style={{padding: 10}}>
              <button onClick={() => setTutStep(0)} className="card" style={{width:'100%', color:'var(--neon)', border:'none'}}>{t.reset}</button>
              <button onClick={() => setSoundEnabled(!soundEnabled)} className="card" style={{width:'100%', color:'#fff', border:'none'}}>{t.sound}: {soundEnabled ? 'ON' : 'OFF'}</button>
              <button onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')} className="card" style={{width:'100%', color:'#fff', border:'none'}}>{t.lang}: {lang}</button>
              <div style={{textAlign: 'center', marginTop: 20}}><a href="https://t.me/kriptoalians" style={{color:'var(--neon)', textDecoration: 'none'}}>@kriptoalians</a></div>
            </div>
          )}
        </main>

        <nav className="nav">
          <div onClick={() => setTab('mining')} className={`nav-btn ${tab === 'mining' ? 'active' : ''}`}>{t.mining}</div>
          <div onClick={() => setTab('trade')} className={`nav-btn ${tab === 'trade' ? 'active' : ''}`}>{t.trade}</div>
          <div onClick={() => setTab('opts')} className={`nav-btn ${tab === 'opts' ? 'active' : ''}`}>{t.opts}</div>
        </nav>
      </div>
    </div>
  );
}
