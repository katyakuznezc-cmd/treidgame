import React, { useState, useEffect } from 'react';

const COINS_DATA = [
  { id: 'TON', base: 5.42, lvl: 1 },
  { id: 'DOGE', base: 0.15, lvl: 1 },
  { id: 'SOL', base: 145.30, lvl: 2 },
  { id: 'BTC', base: 95400, lvl: 3 }
];

const DEX = [
  { id: '1INCH', name: '1INCH' }, { id: 'UNISWAP', name: 'UNISWAP' }, 
  { id: 'PANCAKE', name: 'PANCAKE' }, { id: 'RAYDIUM', name: 'RAYDIUM' }
];

export default function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('st_bal')) || 1000.00);
  const [displayBalance, setDisplayBalance] = useState(balance);
  const [level, setLevel] = useState(() => Number(localStorage.getItem('st_lvl')) || 1);
  const [tradesInLevel, setTradesInLevel] = useState(() => Number(localStorage.getItem('st_prog')) || 0);
  const [userId] = useState(() => localStorage.getItem('st_user_id') || `ST-ID-${Math.floor(100000 + Math.random() * 899999)}`);
  
  const [tab, setTab] = useState('trade');
  const [selectedDex, setSelectedDex] = useState(null);
  const [amount, setAmount] = useState(100);
  const [leverage, setLeverage] = useState(5); 
  const [activePos, setActivePos] = useState(null); 
  const [netTimer, setNetTimer] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [result, setResult] = useState(null);
  const [isBurning, setIsBurning] = useState(false);
  const [clicks, setClicks] = useState([]); 
  
  // Настройки
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('cfg_snd') !== 'false');
  const [fxEnabled, setFxEnabled] = useState(() => localStorage.getItem('cfg_fx') !== 'false');

  const getNeededTrades = (lvl) => lvl === 1 ? 15 : lvl === 2 ? 35 : 75;
  const maxLev = level === 1 ? 5 : level === 2 ? 20 : level === 3 ? 50 : 100;
  const neededTrades = getNeededTrades(level);

  // Калькулятор (Математика +4..6% профита против -3% убытка)
  const estProfit = amount * leverage * (signal ? (parseFloat(signal.perc) / 100) : 0.02);
  const estLoss = amount * leverage * 0.03;

  useEffect(() => {
    localStorage.setItem('st_user_id', userId);
    localStorage.setItem('st_bal', balance.toFixed(2));
    localStorage.setItem('st_lvl', level.toString());
    localStorage.setItem('st_prog', tradesInLevel.toString());
    localStorage.setItem('cfg_snd', soundEnabled);
    localStorage.setItem('cfg_fx', fxEnabled);
  }, [balance, level, tradesInLevel, userId, soundEnabled, fxEnabled]);

  useEffect(() => {
    if (Math.abs(displayBalance - balance) > 0.01) {
      const diff = balance - displayBalance;
      const timer = setTimeout(() => setDisplayBalance(displayBalance + diff / 8), 20);
      return () => clearTimeout(timer);
    } else { setDisplayBalance(balance); }
  }, [balance, displayBalance]);

  useEffect(() => {
    let timer;
    if (tab === 'trade' && !signal && !activePos) {
      setIsAnalyzing(true);
      timer = setTimeout(() => {
        const available = COINS_DATA.filter(c => c.lvl <= level);
        const coin = available[Math.floor(Math.random() * available.length)];
        const bDex = DEX[Math.floor(Math.random()*DEX.length)].name;
        let sDex = DEX[Math.floor(Math.random()*DEX.length)].name;
        while(sDex === bDex) sDex = DEX[Math.floor(Math.random()*DEX.length)].name;
        setSignal({ coin: coin.id, buyDex: bDex, sellDex: sDex, perc: (Math.random() * 2 + 3).toFixed(2) });
        setIsAnalyzing(false);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [tab, signal, activePos, level]);

  const handleOpenPosition = (coinId) => {
    if (balance >= amount) {
      setBalance(b => b - amount);
      setActivePos({ id: coinId, buyDex: selectedDex, amount, leverage, startTime: Date.now() });
    }
  };

  const handleSell = () => {
    const isSameDex = selectedDex === activePos.buyDex;
    if (isSameDex) {
       setBalance(b => b + (activePos.amount * 0.1));
       setResult({ win: false, val: (activePos.amount * 0.9).toFixed(2), msg: "DEX BLOCK" });
       setActivePos(null); setSignal(null);
       return;
    }

    setNetTimer(10);
    const itv = setInterval(() => {
      setNetTimer(p => {
        if (p <= 1) {
          clearInterval(itv);
          const isCorrect = signal && activePos.id === signal.coin && activePos.buyDex === signal.buyDex && selectedDex === signal.sellDex;
          const winChance = isCorrect ? 0.85 : 0.25; 
          const win = Math.random() < winChance;
          
          let pnl;
          if (win) {
            pnl = estProfit;
            setTradesInLevel(t => (t + 1 >= neededTrades) ? 0 : t + 1);
            if (tradesInLevel + 1 >= neededTrades) setLevel(l => l + 1);
          } else {
            pnl = -estLoss;
            setIsBurning(true);
            setTimeout(() => setIsBurning(false), 1000);
            setTradesInLevel(t => Math.max(0, t - 1));
          }
          setBalance(b => Math.max(0, b + activePos.amount + pnl));
          setResult({ win, val: Math.abs(pnl).toFixed(2) });
          setActivePos(null); setSignal(null);
          return null;
        }
        return p - 1;
      });
    }, 1000);
  };

  const handleAction = (e) => {
    if (soundEnabled) {
      const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
      audio.volume = 0.05; audio.play().catch(()=>{});
    }
    if (!fxEnabled) return;
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    if (x && y) {
      const id = Date.now();
      setClicks(prev => [...prev, { id, x, y }]);
      setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 800);
    }
  };

  return (
    <div className={`v ${isBurning ? 'burn' : ''}`} onMouseDown={handleAction} onTouchStart={handleAction} style={{
      width: '100vw', height: '100dvh', background: '#000', color: '#fff', overflow: 'hidden', position: 'relative'
    }}>
      <style>{`
        :root { --neon: #00f2ff; --win: #00ff88; --loss: #ff0055; --gold: #ffcc00; }
        * { box-sizing: border-box; font-family: 'Orbitron', sans-serif; user-select: none; }
        .neon-text { text-shadow: 0 0 10px var(--neon), 0 0 20px var(--neon); color: #fff; }
        .win-text { text-shadow: 0 0 10px var(--win); color: var(--win); }
        .loss-text { text-shadow: 0 0 10px var(--loss); color: var(--loss); }
        .card { background: rgba(15,15,15,0.9); border: 1px solid var(--neon); box-shadow: 0 0 15px rgba(0,242,255,0.1); border-radius: 12px; padding: 15px; margin-bottom: 15px; }
        .btn { width: 100%; padding: 15px; border-radius: 8px; border: none; font-weight: 900; cursor: pointer; transition: 0.2s; text-transform: uppercase; }
        .btn:active { transform: scale(0.95); }
        .dollar { position: absolute; color: var(--win); font-weight: 900; pointer-events: none; animation: pop 0.8s ease-out forwards; z-index: 9999; font-size: 32px; text-shadow: 0 0 10px var(--win); }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-150px); } }
        input { background: #000; border: 1px solid var(--neon); color: var(--neon); padding: 12px; border-radius: 8px; width: 100%; text-align: center; font-size: 20px; box-shadow: inset 0 0 5px var(--neon); }
        .nav-item { flex:1; display:flex; flex-direction: column; align-items:center; justify-content:center; font-size: 10px; font-weight: 900; cursor: pointer; transition: 0.3s; }
        .st-offer { border: 1px solid var(--gold); background: rgba(255,204,0,0.05); padding: 15px; border-radius: 12px; text-decoration: none; display: block; margin: 10px 0; text-align: center; }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-15, top: c.y-25}}>$</div>)}

      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.98)', zIndex:20000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
          <div className="card" style={{borderColor: result.win ? 'var(--win)' : 'var(--loss)', width: '100%', textAlign: 'center', padding: '40px 20px'}}>
            <h2 className={result.win ? 'win-text' : 'loss-text'} style={{fontSize: 24}}>{result.win ? 'DEAL SUCCESS' : 'LIQUIDATION'}</h2>
            <h1 style={{fontSize: 50, margin: '20px 0'}} className="neon-text">{result.win ? '+' : '-'}${result.val}</h1>
            <button className="btn" style={{background: '#fff', color: '#000'}} onClick={() => setResult(null)}>CONTINUE</button>
          </div>
        </div>
      )}

      <div style={{maxWidth: 500, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column'}}>
        
        {/* HEADER */}
        <header style={{padding: '30px 20px', borderBottom: '1px solid #222'}}>
          <div style={{fontSize: 10, color: '#444', marginBottom: 5, letterSpacing: 2}}>{userId}</div>
          <div className="neon-text" style={{fontSize: 42, fontWeight: 900}}>${displayBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div style={{display:'flex', justifyContent:'space-between', marginTop: 15}}>
            <span className="win-text" style={{fontSize: 12}}>LVL {level}</span>
            <span style={{color: '#444', fontSize: 12}}>EXP: {tradesInLevel}/{neededTrades}</span>
          </div>
          <div style={{width:'100%', height:4, background:'#111', marginTop:8, borderRadius:10, overflow:'hidden'}}>
            <div style={{width:`${(tradesInLevel/neededTrades)*100}%`, height:'100%', background:'var(--neon)', boxShadow: '0 0 10px var(--neon)'}} />
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main style={{flex:1, overflowY:'auto', padding: 20, paddingBottom: 100}}>
          
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="card" style={{borderColor: 'var(--gold)'}}>
                    {isAnalyzing ? <div className="win-text" style={{textAlign:'center', fontSize: 12, animate: 'pulse 1s infinite'}}>SCANNING MARKETS...</div> : 
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <div className="neon-text" style={{fontSize: 20}}>{signal.coin}/USDT</div>
                        <div style={{fontSize: 11, color: '#666', marginTop: 5}}>{signal.buyDex} → {signal.sellDex}</div>
                      </div>
                      <div className="win-text" style={{fontSize: 24, fontWeight: 900}}>+{signal.perc}%</div>
                    </div>}
                  </div>

                  <a href="https://t.me/vladstelin78" className="st-offer">
                    <div style={{color: 'var(--gold)', fontSize: 11, fontWeight: 900, marginBottom: 5}}>REAL TRADING ACADEMY</div>
                    <div style={{color: '#fff', fontSize: 13}}>Хотите торговать на реальном рынке?<br/>
                    <span className="neon-text" style={{fontSize: 14}}>Менеджер: @vladstelin78</span></div>
                  </a>

                  <div style={{fontSize: 10, color: '#333', marginBottom: 10, fontWeight: 900}}>SELECT EXCHANGE:</div>
                  {DEX.map(d => (
                    <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{cursor:'pointer', display:'flex', justifyContent:'space-between', padding: '20px'}}>
                      <b style={{fontSize: 18}}>{d.name}</b>
                      <span className="win-text" style={{fontSize: 10}}>STABLE</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div onClick={() => setSelectedDex(null)} style={{color:'var(--neon)', marginBottom: 20, fontSize: 12, cursor:'pointer', fontWeight: 900}}>← BACK TO HUB</div>
                  
                  <div className="card" style={{background: '#080808'}}>
                    <div style={{display:'flex', gap:10, marginBottom: 15}}>
                      <div style={{flex:1}}><label style={{fontSize: 9, color: '#444'}}>INVEST ($)</label><input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))}/></div>
                      <div style={{flex:1}}><label style={{fontSize: 9, color: '#444'}}>LEVERAGE (MAX {maxLev}x)</label><input type="number" value={leverage} onChange={e=>setLeverage(Math.min(maxLev, Number(e.target.value)))}/></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize: 11, fontWeight: 900}}>
                      <span>POTENTIAL: <span className="win-text">+${estProfit.toFixed(2)}</span></span>
                      <span>RISK: <span className="loss-text">-${estLoss.toFixed(2)}</span></span>
                    </div>
                  </div>

                  {COINS_DATA.map(c => {
                    const isActive = activePos?.id === c.id;
                    return (
                      <div key={c.id} className="card" style={{opacity: c.lvl > level ? 0.2 : 1}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <div><div className="neon-text" style={{fontSize: 20}}>{c.id}</div><div style={{fontSize: 12, color: '#444'}}>${c.base}</div></div>
                          {isActive ? (
                            <button className="btn" style={{background: 'var(--loss)', color: '#fff', width: 140}} onClick={handleSell}>{netTimer ? `SYNC ${netTimer}s` : 'SELL NOW'}</button>
                          ) : (
                            <button className="btn" style={{background: 'var(--win)', color: '#000', width: 120}} disabled={!!activePos || c.lvl > level} onClick={() => handleOpenPosition(c.id)}>BUY</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'mining' && (
            <div style={{height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
               <div onClick={() => setBalance(b => b + 0.25)} style={{width: 280, height: 280, border: '8px solid #111', borderTopColor: 'var(--neon)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50, color: 'var(--neon)', fontWeight: '900', cursor: 'pointer', boxShadow: '0 0 50px rgba(0,242,255,0.2)'}}>TAP</div>
               <div className="neon-text" style={{marginTop: 30, fontSize: 14}}>LIQUIDITY MINING...</div>
            </div>
          )}

          {tab === 'opts' && (
            <div>
              <div className="neon-text" style={{fontSize: 20, marginBottom: 20, textAlign: 'center'}}>SETTINGS</div>
              
              <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                <span style={{fontSize: 14}}>SOUND EFFECTS</span>
                <button onClick={() => setSoundEnabled(!soundEnabled)} style={{background: soundEnabled ? 'var(--win)' : '#333', border:'none', padding:'10px 20px', borderRadius:8, fontWeight:900, width: 80}}>{soundEnabled ? 'ON' : 'OFF'}</button>
              </div>

              <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                <span style={{fontSize: 14}}>CLICK VISUALS ($)</span>
                <button onClick={() => setFxEnabled(!fxEnabled)} style={{background: fxEnabled ? 'var(--win)' : '#333', border:'none', padding:'10px 20px', borderRadius:8, fontWeight:900, width: 80}}>{fxEnabled ? 'ON' : 'OFF'}</button>
              </div>

              <a href="https://t.me/kriptoalians" style={{textDecoration:'none'}}>
                <div className="card" style={{textAlign:'center', borderColor: 'var(--gold)'}}>
                  <div style={{color: 'var(--gold)', fontSize: 12, fontWeight: 900}}>CREATORS: @kriptoalians</div>
                </div>
              </a>
            </div>
          )}
        </main>

        {/* BOTTOM NAV */}
        <nav style={{position: 'absolute', bottom: 0, width: '100%', height: 80, background: '#050505', borderTop: '1px solid #222', display: 'flex'}}>
          <div onClick={() => setTab('mining')} className="nav-item" style={{color: tab === 'mining' ? 'var(--neon)' : '#444'}}>
             <span style={{fontSize: 24}}>⚡</span><span>FARM</span>
          </div>
          <div onClick={() => setTab('trade')} className="nav-item" style={{color: tab === 'trade' ? 'var(--neon)' : '#444'}}>
             <span style={{fontSize: 24}}>💹</span><span>TERMINAL</span>
          </div>
          <div onClick={() => setTab('opts')} className="nav-item" style={{color: tab === 'opts' ? 'var(--neon)' : '#444'}}>
             <span style={{fontSize: 24}}>⚙️</span><span>SETTINGS</span>
          </div>
        </nav>
      </div>
    </div>
  );
}
