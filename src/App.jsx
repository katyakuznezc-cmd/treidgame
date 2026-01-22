import React, { useState, useEffect } from 'react';

const COINS_DATA = [
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
  "VIP: User_882 +$512.40 (BTC)", "VIP: Сигнал 1INCH +4.2%", "VIP: User_012 вывел $2,300", "VIP: Доступ в приват открыт"
];

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('bal')) || 1000.00);
  const [level, setLevel] = useState(() => parseInt(localStorage.getItem('lvl')) || 1);
  const [tradesInLevel, setTradesInLevel] = useState(() => parseInt(localStorage.getItem('trades')) || 0);
  const [totalTrades, setTotalTrades] = useState(() => parseInt(localStorage.getItem('total')) || 0);
  const [userId] = useState(() => localStorage.getItem('userId') || `ID-${Math.floor(10000 + Math.random() * 90000)}`);

  const [tab, setTab] = useState('trade');
  const [selectedDex, setSelectedDex] = useState(null);
  const [amount, setAmount] = useState(100);
  const [leverage, setLeverage] = useState(5); 
  const [activePos, setActivePos] = useState(null);
  const [netTimer, setNetTimer] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [result, setResult] = useState(null);
  const [showAds, setShowAds] = useState(false);
  const [clicks, setClicks] = useState([]); 
  const [soundEnabled, setSoundEnabled] = useState(true);

  const getMaxLeverage = (lvl) => {
    if (lvl === 1) return 5;
    if (lvl === 2) return 20;
    if (lvl === 3) return 50;
    return 100;
  };

  const maxLev = getMaxLeverage(level);

  useEffect(() => {
    localStorage.setItem('bal', balance);
    localStorage.setItem('lvl', level);
    localStorage.setItem('trades', tradesInLevel);
    localStorage.setItem('total', totalTrades);
    localStorage.setItem('userId', userId);
  }, [balance, level, tradesInLevel, totalTrades, userId]);

  const progress = (tradesInLevel / (10 + (level - 1) * 5)) * 100;
  const currentProfit = (amount * leverage * ((signal?.perc || 2.5) / 100)).toFixed(2);

  const playSound = () => {
    if (!soundEnabled) return;
    const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
    audio.volume = 0.1;
    audio.play().catch(() => {});
  };

  const handleAction = (e) => {
    playSound();
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    if (x && y) {
      const id = Date.now();
      setClicks(prev => [...prev, { id, x, y }]);
      setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 800);
    }
  };

  const handleLevChange = (val) => {
    let n = parseInt(val) || 0;
    if (n > maxLev) n = maxLev;
    setLeverage(n);
  };

  useEffect(() => {
    let timer;
    if (tab === 'trade' && !signal && !activePos) {
      setIsAnalyzing(true);
      timer = setTimeout(() => {
        const available = COINS_DATA.filter(c => c.lvl <= level);
        const coin = available[Math.floor(Math.random() * available.length)];
        const d1 = DEX[Math.floor(Math.random() * DEX.length)];
        let d2 = DEX[Math.floor(Math.random() * DEX.length)];
        while (d1.name === d2.name) d2 = DEX[Math.floor(Math.random() * DEX.length)];
        setSignal({ 
          coin: coin.id, 
          price: (coin.base * (1 + (Math.random() * 0.02 - 0.01))).toFixed(2),
          buyDex: d1.name, 
          sellDex: d2.name, 
          perc: (Math.random() * 1.5 + 1.5).toFixed(2) 
        });
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
          let pnl = win ? parseFloat(currentProfit) : -(amount * 0.3);
          setBalance(b => Math.max(0, b + amount + pnl));
          setResult({ win, val: Math.abs(pnl).toFixed(2) });
          setActivePos(null);
          setSignal(null);
          
          const needed = 10 + (level - 1) * 5;
          const newTrades = tradesInLevel + 1;
          setTotalTrades(t => t + 1);
          if (newTrades >= needed) { setLevel(l => l + 1); setTradesInLevel(0); }
          else { setTradesInLevel(newTrades); }
          if (level >= 3) setTimeout(() => setShowAds(true), 1500);
          return null;
        }
        return p - 1;
      });
    }, 1000);
  };

  return (
    <div className="v" onMouseDown={handleAction} onTouchStart={handleAction} style={{
      width: '100vw', height: '100dvh', background: '#000', display: 'flex', justifyContent: 'center', overflow: 'hidden', position: 'relative', color: '#fff'
    }}>
      <style>{`
        :root { --n: #00d9ff; --w: #00ff88; --l: #ff3366; --vip: #ffd700; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; user-select: none; }
        .app { width: 100%; max-width: 500px; height: 100%; display: flex; flex-direction: column; border: 1px solid #111; position: relative; }
        .ticker-box { background: #1a1500; color: var(--vip); font-size: 11px; padding: 6px; border-bottom: 1px solid var(--vip); overflow: hidden; white-space: nowrap; }
        .ticker { display: inline-block; animation: ticker 25s linear infinite; }
        @keyframes ticker { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .header { padding: 15px; background: #050505; }
        .xp-bg { width: 100%; height: 4px; background: #222; margin-top: 8px; border-radius: 2px; }
        .xp-fill { height: 100%; background: var(--n); transition: 0.5s; box-shadow: 0 0 8px var(--n); }
        .main { flex: 1; overflow-y: auto; padding: 15px; padding-bottom: 90px; }
        .card { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 15px; border-radius: 12px; margin-bottom: 10px; }
        .btn { width: 100%; padding: 15px; border-radius: 10px; border: none; font-weight: bold; cursor: pointer; text-align: center; }
        .dollar { position: absolute; color: var(--w); font-weight: 900; pointer-events: none; animation: pop 0.8s ease-out forwards; z-index: 9999; font-size: 24px; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-120px); } }
        .modal { position: absolute; inset: 0; background: rgba(0,0,0,0.98); z-index: 5000; display: flex; align-items: center; justify-content: center; padding: 25px; }
        .nav { position: absolute; bottom: 0; width: 100%; height: 75px; background: #050505; border-top: 1px solid #1a1a1a; display: flex; }
        .tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; color: #444; }
        .tab.active { color: var(--n); }
        input { background: #111; border: 1px solid #333; color: #fff; padding: 10px; border-radius: 8px; width: 100%; font-weight: bold; outline: none; margin-top: 5px; font-size: 16px; }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      <div className="app">
        <div className="ticker-box"><div className="ticker">{VIP_ALERTS.join(" • ")}</div></div>

        {showAds && (
          <div className="modal">
            <div style={{background: '#111', border: '1px solid var(--vip)', padding: 30, borderRadius: 20, textAlign: 'center'}}>
              <h2 style={{color: 'var(--vip)', marginBottom: 15}}>УРОВЕНЬ {level}</h2>
              <p style={{color: '#888', fontSize: 14, marginBottom: 25}}>Ваш профит стабилен. Заберите доступ к реальному VIP каналу.</p>
              <a href="https://t.me/kriptoalians" style={{textDecoration: 'none'}}><button className="btn" style={{background: 'var(--vip)', color: '#000'}}>ЗАПРОСИТЬ ДОСТУП</button></a>
              <button onClick={() => setShowAds(false)} style={{background:'none', border:'none', color:'#444', marginTop: 15}}>Позже</button>
            </div>
          </div>
        )}

        {result && (
          <div className="modal">
            <div style={{background: '#0a0a0a', border: `1px solid ${result.win ? 'var(--w)' : 'var(--l)'}`, padding: 30, borderRadius: 20, textAlign: 'center', width: '80%'}}>
              <h1 style={{color: result.win ? 'var(--w)' : 'var(--l)'}}>{result.win ? 'УСПЕХ' : 'УБЫТОК'}</h1>
              <p style={{fontSize: 28, margin: '15px 0'}}>${Number(result.val).toLocaleString()}</p>
              <button className="btn" style={{background: '#fff', color: '#000'}} onClick={() => setResult(null)}>OK</button>
            </div>
          </div>
        )}

        <header className="header">
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <div>
               <div style={{fontSize: 28, fontWeight: 900}}>${balance.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
               <div style={{fontSize: 10, color: '#444'}}>{userId}</div>
            </div>
            <span style={{color: 'var(--n)', fontWeight: 'bold'}}>LVL {level}</span>
          </div>
          <div className="xp-bg"><div className="xp-fill" style={{width: `${progress}%`}}></div></div>
        </header>

        <main className="main">
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="card" style={{border: '1px solid var(--n)'}}>
                    {isAnalyzing ? <div style={{textAlign:'center', color:'var(--n)', fontSize: 12}}>АНАЛИЗ РЫНКА...</div> : 
                    <div style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                      <div>
                        <b>{signal.coin}/USDT</b>
                        <div style={{fontSize: 10, color: '#666'}}>${signal.price}</div>
                      </div>
                      <b style={{color:'var(--w)'}}>+{signal.perc}%</b>
                    </div>}
                  </div>
                  {DEX.map(d => (
                    <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{display:'flex', justifyContent:'space-between', cursor: 'pointer'}}>
                      <b>{d.name}</b> <span style={{color:'var(--w)', fontSize:10}}>ONLINE</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} style={{background:'none', border:'none', color:'#444', marginBottom: 10}}>← НАЗАД</button>
                  <div className="card" style={{borderColor: '#333'}}>
                    <div style={{display: 'flex', gap: '10px'}}>
                      <div style={{flex: 1}}><label style={{fontSize: 10, color: '#666'}}>СУММА</label><input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
                      <div style={{flex: 1}}><label style={{fontSize: 10, color: '#666'}}>ПЛЕЧО (MAX: {maxLev}x)</label><input type="number" value={leverage} onChange={(e) => handleLevChange(e.target.value)} /></div>
                    </div>
                  </div>
                  {COINS_DATA.map(c => {
                    const lock = c.lvl > level;
                    const livePrice = signal?.coin === c.id ? signal.price : c.base.toFixed(2);
                    return (
                      <div key={c.id} className="card" style={{opacity: lock ? 0.3 : 1, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div>
                          <b>{c.id}/USDT</b>
                          <div style={{fontSize:11, color:'var(--n)'}}>${livePrice}</div>
                        </div>
                        {lock ? <span style={{fontSize: 10}}>LVL {c.lvl}</span> : (
                          activePos?.id === c.id ? (
                            <button className="btn" style={{background:'var(--l)', width: 100, color:'#fff', padding: '10px'}} onClick={handleSell}>{netTimer || 'SELL'}</button>
                          ) : (
                            <button className="btn" style={{background:'var(--w)', width: 100, color: '#000', padding: '10px'}} onClick={() => {if(balance >= amount){setBalance(b => b - amount); setActivePos({id: c.id});}}} disabled={!!activePos}>BUY</button>
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
               <div onClick={() => setBalance(b => b + 0.1)} style={{width: 200, height: 200, border: '6px solid var(--n)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, color: 'var(--n)', cursor: 'pointer'}}>TAP</div>
            </div>
          )}
          {tab === 'opts' && (
            <div style={{padding: 10}}>
              <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                <span>ЗВУКИ</span>
                <button onClick={() => setSoundEnabled(!soundEnabled)} style={{background: soundEnabled ? 'var(--w)' : '#333', border:'none', padding:'8px 15px', borderRadius:5, color: '#000'}}>{soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</button>
              </div>
              <a href="https://t.me/kriptoalians" style={{textDecoration:'none'}}><div className="card" style={{textAlign:'center', color: 'var(--n)', border: '1px solid var(--n)'}}>@KRIPTOALIANS</div></a>
              <button onClick={() => {if(window.confirm("Сбросить?")){localStorage.clear(); window.location.reload();}}} className="btn" style={{background: '#111', color: 'var(--l)', border: '1px solid var(--l)', marginTop: 20}}>ОБНУЛИТЬ</button>
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
