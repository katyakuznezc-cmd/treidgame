import React, { useState, useEffect } from 'react';

const COINS = [
  { id: 'TON', base: 5.42, lvl: 1 },
  { id: 'DOGE', base: 0.15, lvl: 1 },
  { id: 'SOL', base: 145.30, lvl: 2 },
  { id: 'BTC', base: 95400, lvl: 3 }
];

const DEX = [
  { id: '1in', name: '1INCH' }, { id: 'uni', name: 'UNISWAP' }, 
  { id: 'pancake', name: 'PANCAKE' }, { id: 'ray', name: 'RAYDIUM' }
];

const VIP_ALERTS = [
  "VIP: User_882 +$512.40 (BTC)", "VIP: Сигнал 1INCH отработал +4.2%", "VIP: User_012 вывел $2,300", "VIP: Новый слот на обучение открыт"
];

export default function App() {
  const [balance, setBalance] = useState(1000.00);
  const [level, setLevel] = useState(1);
  const [tradesInLevel, setTradesInLevel] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);
  const [tab, setTab] = useState('trade');
  const [selectedDex, setSelectedDex] = useState(null);
  const [activePos, setActivePos] = useState(null);
  const [netTimer, setNetTimer] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [result, setResult] = useState(null);
  const [showAds, setShowAds] = useState(false);
  const [clicks, setClicks] = useState([]); 
  const [soundEnabled, setSoundEnabled] = useState(true);

  const neededForNext = 10 + (level - 1) * 5;
  const progress = (tradesInLevel / neededForNext) * 100;

  // Звук клика
  const playClick = () => {
    if (!soundEnabled) return;
    const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
    audio.volume = 0.1;
    audio.play().catch(() => {});
  };

  // Обработка эффекта доллара
  const handleAction = (e) => {
    playClick();
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    if (x && y) {
      const id = Date.now();
      setClicks(prev => [...prev, { id, x, y }]);
      setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 800);
    }
  };

  useEffect(() => {
    let timer;
    if (tab === 'trade' && !signal && !activePos) {
      setIsAnalyzing(true);
      timer = setTimeout(() => {
        const available = COINS.filter(c => c.lvl <= level);
        const coin = available[Math.floor(Math.random() * available.length)];
        const d1 = DEX[Math.floor(Math.random() * DEX.length)];
        let d2 = DEX[Math.floor(Math.random() * DEX.length)];
        while (d1.name === d2.name) d2 = DEX[Math.floor(Math.random() * DEX.length)];
        setSignal({ coin: coin.id, buyDex: d1.name, sellDex: d2.name, perc: (Math.random() * 1.5 + 1.5).toFixed(2) });
        setIsAnalyzing(false);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [tab, signal, activePos, level]);

  const handleSell = () => {
    setNetTimer(10);
    const itv = setInterval(() => {
      setNetTimer(p => {
        if (p <= 1) {
          clearInterval(itv);
          const win = Math.random() > 0.15;
          let pnl = win ? (100 * 10 * (signal.perc / 100)) : -20;
          setBalance(b => b + 100 + pnl);
          setResult({ win, val: Math.abs(pnl).toFixed(2) });
          setActivePos(null);
          setSignal(null);
          
          const newTrades = tradesInLevel + 1;
          setTotalTrades(t => t + 1);
          if (newTrades >= neededForNext) { setLevel(l => l + 1); setTradesInLevel(0); }
          else { setTradesInLevel(newTrades); }

          if (level >= 3) setTimeout(() => setShowAds(true), 1500);
          return null;
        }
        return p - 1;
      });
    }, 1000);
  };

  return (
    <div className="v" onMouseDown={handleAction} onTouchStart={handleAction}>
      <style>{`
        :root { --n: #00d9ff; --w: #00ff88; --l: #ff3366; --vip: #ffd700; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; user-select: none; }
        .v { width: 100vw; height: 100dvh; background: #000; display: flex; justify-content: center; overflow: hidden; position: relative; color: #fff; }
        .app { width: 100%; max-width: 500px; height: 100%; display: flex; flex-direction: column; border-left: 1px solid #111; border-right: 1px solid #111; position: relative; }
        
        .vip- лента { background: #1a1500; color: var(--vip); font-size: 11px; font-weight: bold; padding: 6px; border-bottom: 1px solid var(--vip); overflow: hidden; white-space: nowrap; }
        .ticker { display: inline-block; animation: ticker 25s linear infinite; }
        @keyframes ticker { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }

        .header { padding: 15px; background: #050505; }
        .xp-cont { width: 100%; height: 4px; background: #222; border-radius: 2px; margin-top: 8px; }
        .xp-fill { height: 100%; background: var(--n); box-shadow: 0 0 8px var(--n); transition: 0.5s; }

        .main { flex: 1; overflow-y: auto; padding: 15px; padding-bottom: 90px; }
        .card { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 15px; border-radius: 12px; margin-bottom: 10px; }
        .btn { width: 100%; padding: 15px; border-radius: 10px; border: none; font-weight: bold; cursor: pointer; transition: 0.2s; text-align: center; color: #000; }
        
        .dollar { position: absolute; color: var(--w); font-weight: 900; pointer-events: none; animation: pop 0.8s ease-out forwards; z-index: 9999; font-size: 24px; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-120px) scale(1.5); } }

        .modal { position: absolute; inset: 0; background: rgba(0,0,0,0.98); z-index: 5000; display: flex; align-items: center; justify-content: center; padding: 25px; }
        .nav { position: absolute; bottom: 0; width: 100%; height: 75px; background: #050505; border-top: 1px solid #1a1a1a; display: flex; }
        .tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; color: #444; }
        .tab.active { color: var(--n); }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      <div className="app">
        <div className="vip-лента">
          <div className="ticker">{VIP_ALERTS.join(" • ")} • {VIP_ALERTS.join(" • ")}</div>
        </div>

        {showAds && (
          <div className="modal">
            <div style={{background: '#111', border: '1px solid var(--vip)', padding: 30, borderRadius: 20, textAlign: 'center'}}>
              <h2 style={{color: var(--vip), marginBottom: 15}}>ЗАПРОСИТЬ VIP ДОСТУП?</h2>
              <p style={{color: '#888', fontSize: 14, marginBottom: 25, lineHeight: 1.5}}>
                Ваша демо-прибыль превысила ожидания. Вы готовы к реальным сделкам с доходностью до +30% в день.
              </p>
              <a href="https://t.me/kriptoalians" style={{textDecoration: 'none'}}>
                <button className="btn" style={{background: var(--vip)}}>ЗАПРОСИТЬ ДОСТУП</button>
              </a>
              <button onClick={() => setShowAds(false)} style={{background:'none', border:'none', color:'#444', marginTop: 15}}>Продолжить обучение</button>
            </div>
          </div>
        )}

        {result && (
          <div className="modal">
            <div style={{background: '#0a0a0a', border: `1px solid ${result.win ? 'var(--w)' : 'var(--l)'}`, padding: 30, borderRadius: 20, textAlign: 'center', width: '80%'}}>
              <h1 style={{color: result.win ? 'var(--w)' : 'var(--l)'}}>{result.win ? 'SUCCESS' : 'LOSS'}</h1>
              <p style={{fontSize: 32, margin: '15px 0'}}>${result.val}</p>
              <button className="btn" style={{background: '#fff'}} onClick={() => setResult(null)}>OK</button>
            </div>
          </div>
        )}

        <header className="header">
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span style={{fontSize: 28, fontWeight: 900}}>${balance.toLocaleString()}</span>
            <span style={{color: var(--n), fontWeight: 'bold'}}>LVL {level}</span>
          </div>
          <div className="xp-cont"><div className="xp-fill" style={{width: `${progress}%`}}></div></div>
          <div style={{fontSize: 10, color: '#444', marginTop: 5}}>СДЕЛКИ НА УРОВНЕ: {tradesInLevel}/{neededForNext}</div>
        </header>

        <main className="main">
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="card" style={{border: '1px solid var(--n)'}}>
                    {isAnalyzing ? <div style={{textAlign:'center', color:var(--n)}}>ПОИСК ПРИБЫЛЬНОЙ СВЯЗКИ...</div> : 
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                      <b>{signal.coin}/USDT</b> <b style={{color:'var(--w)'}}>+{signal.perc}%</b>
                    </div>}
                  </div>
                  {DEX.map(d => (
                    <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{display:'flex', justifyContent:'space-between'}}>
                      <b>{d.name}</b> <span style={{color:'var(--w)', fontSize:10}}>ONLINE</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} style={{background:'none', border:'none', color:'#444', marginBottom: 10}}>← НАЗАД</button>
                  {COINS.map(c => {
                    const lock = c.lvl > level;
                    return (
                      <div key={c.id} className="card" style={{opacity: lock ? 0.3 : 1, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div><b>{c.id}</b><div style={{fontSize:10, color:'#444'}}>${c.base}</div></div>
                        {lock ? <span>LVL {c.lvl}</span> : (
                          activePos?.id === c.id ? (
                            <button className="btn" style={{background:var(--l), width: 100, color:'#fff'}} onClick={handleSell}>{netTimer || 'SELL'}</button>
                          ) : (
                            <button className="btn" style={{background:var(--w), width: 100}} onClick={() => {setBalance(b => b - 100); setActivePos({id: c.id})}} disabled={!!activePos}>BUY</button>
                          )
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'mining' && (
            <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
               <div onClick={() => setBalance(b => b + 0.1)} style={{width: 200, height: 200, border: '6px solid var(--n)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, color: var(--n), boxShadow: '0 0 20px rgba(0,217,255,0.1)'}}>TAP</div>
            </div>
          )}

          {tab === 'opts' && (
            <div style={{padding: 10}}>
              <div className="card" style={{display:'flex', justifyContent:'space-between'}}>
                <span>ЗВУКИ</span>
                <button onClick={() => setSoundEnabled(!soundEnabled)} style={{background: soundEnabled ? var(--w) : '#333', border:'none', padding:'5px 10px', borderRadius:5}}>{soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</button>
              </div>
              <a href="https://t.me/kriptoalians" style={{textDecoration:'none'}}>
                <div className="card" style={{textAlign:'center', color: var(--n), marginTop: 10}}>ОФИЦИАЛЬНЫЙ КАНАЛ</div>
              </a>
            </div>
          )}
        </main>

        <nav className="nav">
          <div onClick={() => setTab('mining')} className={`tab ${tab === 'mining' ? 'active' : ''}`}><b>МАЙНИНГ</b></div>
          <div onClick={() => setTab('trade')} className={`tab ${tab === 'trade' ? 'active' : ''}`}><b>БИРЖА</b></div>
          <div onClick={() => setTab('opts')} className={`tab ${tab === 'opts' ? 'active' : ''}`}><b>ОПЦИИ</b></div>
        </nav>
      </div>
    </div>
  );
}
