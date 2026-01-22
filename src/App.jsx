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
  const [soundEnabled, setSoundEnabled] = useState(true);

  const getNeededTrades = (lvl) => lvl === 1 ? 15 : lvl === 2 ? 35 : 75;
  const maxLev = level === 1 ? 5 : level === 2 ? 20 : level === 3 ? 50 : 100;
  const neededTrades = getNeededTrades(level);

  // Калькулятор профита (прогноз)
  const estProfit = amount * leverage * (signal ? parseFloat(signal.perc)/100 : 0.015);
  const estLoss = amount * leverage * 0.035;

  useEffect(() => {
    localStorage.setItem('st_user_id', userId);
    localStorage.setItem('st_bal', balance.toFixed(2));
    localStorage.setItem('st_lvl', level.toString());
    localStorage.setItem('st_prog', tradesInLevel.toString());
  }, [balance, level, tradesInLevel, userId]);

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
        setSignal({ coin: coin.id, buyDex: bDex, sellDex: sDex, perc: (Math.random() * 1.5 + 2).toFixed(2) });
        setIsAnalyzing(false);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [tab, signal, activePos, level]);

  const handleOpenPosition = (coinId) => {
    if (balance >= amount) {
      setBalance(b => b - amount);
      setActivePos({ id: coinId, buyDex: selectedDex, amount, leverage, startTime: Date.now(), signalUsed: !!signal });
    }
  };

  const handleSell = () => {
    const isSameDex = selectedDex === activePos.buyDex;
    if (isSameDex) {
       setBalance(b => b + (activePos.amount * 0.1)); // Штраф 90% за ту же биржу
       setResult({ win: false, val: (activePos.amount * 0.9).toFixed(2), msg: "DEX LOCKUP" });
       setActivePos(null); setSignal(null); setTradesInLevel(t => Math.max(0, t - 2));
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
            const pRange = isCorrect ? (parseFloat(signal.perc) / 100) : 0.012;
            pnl = activePos.amount * activePos.leverage * pRange;
            setTradesInLevel(t => (t + 1 >= neededTrades) ? 0 : t + 1);
            if (tradesInLevel + 1 >= neededTrades) setLevel(l => l + 1);
          } else {
            pnl = -(activePos.amount * activePos.leverage * 0.035); 
            setIsBurning(true);
            setTimeout(() => setIsBurning(false), 1200);
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
        .burn { animation: shake 0.1s infinite; background: #1a0000 !important; }
        @keyframes shake { 0% { transform: translate(3px,3px); } 50% { transform: translate(-3px,-3px); } }
        .neon-text { text-shadow: 0 0 10px var(--neon), 0 0 20px var(--neon); color: #fff; }
        .win-text { text-shadow: 0 0 10px var(--win); color: var(--win); }
        .loss-text { text-shadow: 0 0 10px var(--loss); color: var(--loss); }
        .card { background: rgba(10,10,10,0.8); border: 1px solid var(--neon); box-shadow: inset 0 0 15px rgba(0,242,255,0.2); border-radius: 12px; padding: 15px; margin-bottom: 15px; }
        .btn { width: 100%; padding: 15px; border-radius: 8px; border: none; font-weight: 900; letter-spacing: 1px; cursor: pointer; transition: 0.2s; }
        .btn:active { transform: scale(0.96); }
        .dollar { position: absolute; color: var(--win); font-weight: 900; pointer-events: none; animation: pop 0.8s ease-out forwards; z-index: 9999; font-size: 28px; text-shadow: 0 0 10px var(--win); }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-120px); } }
        input { background: #000; border: 1px solid var(--neon); color: var(--neon); padding: 10px; border-radius: 5px; width: 100%; text-align: center; outline: none; font-size: 18px; margin-top: 5px; }
        .st-offer { border: 2px solid var(--gold); background: rgba(255,204,0,0.05); padding: 15px; border-radius: 12px; text-decoration: none; display: block; margin: 15px 0; text-align: center; box-shadow: 0 0 20px rgba(255,204,0,0.1); }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.95)', zIndex:20000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
          <div className="card" style={{borderColor: result.win ? 'var(--win)' : 'var(--loss)', width: '100%', textAlign: 'center'}}>
            <h2 className={result.win ? 'win-text' : 'loss-text'}>{result.win ? 'DEAL SUCCESS' : 'LIQUIDATION'}</h2>
            <h1 style={{fontSize: 45, margin: '20px 0'}}>{result.win ? '+' : '-'}${result.val}</h1>
            <button className="btn" style={{background: '#fff'}} onClick={() => setResult(null)}>CONTINUE</button>
          </div>
        </div>
      )}

      <div style={{maxWidth: 500, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column'}}>
        <header style={{padding: 20, borderBottom: '1px solid #222'}}>
          <div style={{fontSize: 10, color: '#666', marginBottom: 5}}>{userId}</div>
          <div className="neon-text" style={{fontSize: 38, fontWeight: 900}}>${displayBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div style={{display:'flex', justifyContent:'space-between', marginTop: 15, fontSize: 12}}>
            <span style={{color: 'var(--gold)'}}>LVL {level}</span>
            <span style={{color: '#444'}}>PROGRESS: {tradesInLevel}/{neededTrades}</span>
          </div>
          <div style={{width:'100%', height:4, background:'#111', marginTop:8, borderRadius:2, overflow:'hidden'}}>
            <div style={{width:`${(tradesInLevel/neededTrades)*100}%`, height:'100%', background:'var(--neon)', boxShadow: '0 0 10px var(--neon)'}} />
          </div>
        </header>

        <main style={{flex:1, overflowY:'auto', padding: 20, paddingBottom: 100}}>
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="card" style={{borderColor: 'var(--gold)'}}>
                    {isAnalyzing ? <div className="win-text" style={{textAlign:'center', fontSize: 12}}>SCANNING NETWORKS...</div> : 
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <div className="neon-text" style={{fontSize: 20}}>{signal.coin}/USDT</div>
                        <div style={{fontSize: 10, color: '#555', marginTop: 5}}>{signal.buyDex} → {signal.sellDex}</div>
                      </div>
                      <div className="win-text" style={{fontSize: 22}}>+{signal.perc}%</div>
                    </div>}
                  </div>

                  <a href="https://t.me/vladstelin78" className="st-offer">
                    <div style={{color: 'var(--gold)', fontSize: 10, fontWeight: 900, marginBottom: 5}}>VIP СВЯЗЬ</div>
                    <div style={{color: '#fff', fontSize: 13, lineHeight: 1.4}}>Желаете трейдить на реальных сделках?<br/>
                    <span className="neon-text">Менеджер: @vladstelin78</span></div>
                  </a>

                  {DEX.map(d => (
                    <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{cursor:'pointer', display:'flex', justifyContent:'space-between'}}>
                      <b>{d.name}</b>
                      <span className="win-text" style={{fontSize: 10}}>ONLINE</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div onClick={() => setSelectedDex(null)} style={{color:'var(--neon)', marginBottom: 15, fontSize: 12, cursor:'pointer'}}>← BACK TO HUB</div>
                  
                  {/* КАЛЬКУЛЯТОР ПРОФИТА */}
                  <div className="card" style={{background: '#050505'}}>
                    <div style={{display:'flex', gap:10, marginBottom: 15}}>
                      <div style={{flex:1}}><label style={{fontSize: 10, color: '#444'}}>AMOUNT</label><input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))}/></div>
                      <div style={{flex:1}}><label style={{fontSize: 10, color: '#444'}}>LEVERAGE (MAX {maxLev}x)</label><input type="number" value={leverage} onChange={e=>setLeverage(Math.min(maxLev, Number(e.target.value)))}/></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize: 11}}>
                      <span>EST. PROFIT: <span className="win-text">+${estProfit.toFixed(2)}</span></span>
                      <span>EST. LOSS: <span className="loss-text">-${estLoss.toFixed(2)}</span></span>
                    </div>
                  </div>

                  {COINS_DATA.map(c => {
                    const isActive = activePos?.id === c.id;
                    return (
                      <div key={c.id} className="card" style={{opacity: c.lvl > level ? 0.3 : 1}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <div><div className="neon-text" style={{fontSize: 18}}>{c.id}</div><div style={{fontSize: 12, color: '#444'}}>${c.base}</div></div>
                          {isActive ? (
                            <button className="btn" style={{background: 'var(--loss)', color: '#fff', width: 120}} onClick={handleSell}>{netTimer ? `${netTimer}s` : 'SELL'}</button>
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
            <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
               <div onClick={() => setBalance(b => b + 0.15)} style={{width: 250, height: 250, border: '5px solid #111', borderTopColor: 'var(--neon)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: 'var(--neon)', fontWeight: '900', cursor: 'pointer', boxShadow: '0 0 30px rgba(0,242,255,0.1)'}}>TAP</div>
            </div>
          )}

          {tab === 'opts' && (
            <div className="card">
              <div style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                <span>HAPTIC SOUND</span>
                <button onClick={() => setSoundEnabled(!soundEnabled)} style={{background: soundEnabled ? 'var(--win)' : '#222', border:'none', padding:'10px 20px', borderRadius:5, fontWeight:900}}>{soundEnabled ? 'ON' : 'OFF'}</button>
              </div>
            </div>
          )}
        </main>

        <nav style={{position: 'absolute', bottom: 0, width: '100%', height: 70, background: '#050505', borderTop: '1px solid #222', display: 'flex'}}>
          <div onClick={() => setTab('trade')} style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color: tab === 'trade' ? 'var(--neon)' : '#444', fontWeight: 900}}>TERMINAL</div>
          <div onClick={() => setTab('mining')} style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color: tab === 'mining' ? 'var(--neon)' : '#444', fontWeight: 900}}>FARM</div>
          <div onClick={() => setTab('opts')} style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color: tab === 'opts' ? 'var(--neon)' : '#444', fontWeight: 900}}>SYSTEM</div>
        </nav>
      </div>
    </div>
  );
}
