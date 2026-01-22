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

const VIP_ALERTS = [
  "🚀 VIP: USER_001 ВЫВЕЛ $12,400", "🔥 СИГНАЛ BTC/USDT: +3.42%", "💎 PREMIUM: ДОСТУПЕН ВЫВОД НА КАРТЫ", "⚡️ СКОРОСТЬ СЕТИ: 0.001ms"
];

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('bal')) || 1000.00);
  const [displayBalance, setDisplayBalance] = useState(balance);
  const [level, setLevel] = useState(() => parseInt(localStorage.getItem('lvl')) || 1);
  const [tradesInLevel, setTradesInLevel] = useState(() => parseInt(localStorage.getItem('trades')) || 0);
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
  const [isBurning, setIsBurning] = useState(false);
  const [clicks, setClicks] = useState([]); 
  const [soundEnabled, setSoundEnabled] = useState(true);

  const maxLev = level === 1 ? 5 : level === 2 ? 20 : level === 3 ? 50 : 100;
  const neededTrades = 10 + (level - 1) * 5;

  useEffect(() => {
    if (Math.abs(displayBalance - balance) > 0.01) {
      const diff = balance - displayBalance;
      const timer = setTimeout(() => setDisplayBalance(displayBalance + diff / 8), 20);
      return () => clearTimeout(timer);
    } else { setDisplayBalance(balance); }
  }, [balance, displayBalance]);

  useEffect(() => {
    localStorage.setItem('bal', balance.toString());
    localStorage.setItem('lvl', level.toString());
    localStorage.setItem('trades', tradesInLevel.toString());
  }, [balance, level, tradesInLevel]);

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
    const timePassed = (Date.now() - activePos.startTime) / 1000;

    if (isSameDex && timePassed < 90) {
      setNetTimer(3);
      const itv = setInterval(() => {
        setNetTimer(p => {
          if (p <= 1) {
            clearInterval(itv);
            const loss = activePos.amount * 0.95;
            setBalance(b => b + (activePos.amount - loss));
            setResult({ win: false, val: loss.toFixed(2), msg: "BLOCKCHAIN LOCK: SAME DEX" });
            setIsBurning(true);
            setTimeout(() => setIsBurning(false), 1500);
            setActivePos(null); setSignal(null);
            return null;
          }
          return p - 1;
        });
      }, 1000);
      return;
    }

    setNetTimer(10);
    const itv = setInterval(() => {
      setNetTimer(p => {
        if (p <= 1) {
          clearInterval(itv);
          const isCorrect = signal && activePos.id === signal.coin && activePos.buyDex === signal.buyDex && selectedDex === signal.sellDex;
          const win = isCorrect ? (Math.random() > 0.05) : (Math.random() > 0.65);
          let pnl;
          if (win) {
            const pRange = isCorrect ? (parseFloat(signal.perc) / 100) : 0.01;
            pnl = activePos.amount * activePos.leverage * pRange;
          } else {
            pnl = -(activePos.amount * activePos.leverage * 0.015);
            setIsBurning(true);
            setTimeout(() => setIsBurning(false), 1200);
          }
          setBalance(b => Math.max(0, b + activePos.amount + pnl));
          setResult({ win, val: Math.abs(pnl).toFixed(2) });
          setActivePos(null); setSignal(null);
          setTradesInLevel(t => {
            if (t + 1 >= neededTrades) { setLevel(l => l + 1); return 0; }
            return t + 1;
          });
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
    <div className={`v ${isBurning ? 'burn-active' : ''}`} onMouseDown={handleAction} onTouchStart={handleAction} style={{
      width: '100vw', height: '100dvh', background: '#000', display: 'flex', justifyContent: 'center', overflow: 'hidden', position: 'relative', color: '#fff'
    }}>
      <style>{`
        :root { --n: #00d9ff; --w: #00ff88; --l: #ff3366; --vip: #ffd700; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Courier New', monospace; user-select: none; }
        .app { width: 100%; max-width: 500px; height: 100%; display: flex; flex-direction: column; position: relative; border-left: 1px solid #111; border-right: 1px solid #111; box-shadow: 0 0 50px rgba(0,0,0,1); }
        .burn-active { animation: shake 0.15s infinite; }
        .burn-active::after { content: ''; position: absolute; inset: 0; background: rgba(255, 0, 0, 0.4); z-index: 20000; pointer-events: none; }
        @keyframes shake { 0% { transform: translate(5px, 5px); } 50% { transform: translate(-5px, -5px); } 100% { transform: translate(0,0); } }
        .ticker-box { background: #1a1500; color: var(--vip); font-size: 11px; padding: 10px; overflow: hidden; white-space: nowrap; border-bottom: 2px solid var(--vip); box-shadow: 0 5px 15px rgba(255,215,0,0.2); z-index: 10; }
        .ticker { display: inline-block; animation: ticker 20s linear infinite; font-weight: 900; text-transform: uppercase; }
        @keyframes ticker { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .card { background: rgba(15, 15, 15, 0.8); border: 1px solid #222; padding: 20px; border-radius: 16px; margin-bottom: 15px; position: relative; overflow: hidden; backdrop-filter: blur(10px); }
        .vip-card { border: 1px solid var(--vip); background: linear-gradient(135deg, #0a0a00 0%, #1a1500 100%); box-shadow: 0 0 20px rgba(255,215,0,0.1); }
        .btn { width: 100%; padding: 18px; border-radius: 12px; border: none; font-weight: 900; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; font-size: 14px; transition: 0.2s; }
        .btn-buy { background: var(--w); color: #000; box-shadow: 0 4px 15px rgba(0,255,136,0.3); }
        .btn-sell { background: var(--l); color: #fff; box-shadow: 0 4px 15px rgba(255,51,102,0.3); }
        .dollar { position: absolute; color: var(--w); font-weight: 900; pointer-events: none; animation: pop 0.8s ease-out forwards; z-index: 9999; font-size: 32px; text-shadow: 0 0 15px var(--w); }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-160px) scale(1.6); } }
        .nav { position: absolute; bottom: 0; width: 100%; height: 80px; background: #050505; border-top: 1px solid #222; display: flex; z-index: 100; }
        .tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; color: #444; font-weight: 900; }
        .tab.active { color: var(--n); text-shadow: 0 0 10px var(--n); }
        input { background: #000; border: 1px solid #333; color: var(--w); padding: 14px; border-radius: 10px; width: 100%; font-weight: 900; margin-top: 8px; outline: none; text-align: center; font-size: 18px; border: 1px solid var(--n); }
        .lock-progress { position: absolute; top: 0; left: 0; height: 4px; background: var(--l); transition: linear; box-shadow: 0 0 15px var(--l); }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.99)', zIndex:15000, display:'flex', alignItems:'center', justifyContent:'center', padding:30}}>
          <div className="card" style={{borderColor: result.win ? 'var(--w)' : 'var(--l)', textAlign: 'center', width: '100%', padding: '60px 20px', boxShadow: `0 0 50px ${result.win ? 'rgba(0,255,136,0.2)' : 'rgba(255,51,102,0.2)'}`}}>
            <h2 style={{color: result.win ? 'var(--w)' : 'var(--l)', fontSize: 28, letterSpacing: 4}}>{result.msg || (result.win ? 'DEAL SUCCESS' : 'LIQUIDATED')}</h2>
            <h1 style={{fontSize: 56, margin: '30px 0', fontWeight: 900}}>{result.win ? '+' : '-'}${Number(result.val).toLocaleString()}</h1>
            <button className="btn" style={{background: '#fff', color: '#000'}} onClick={() => setResult(null)}>CLOSE TERMINAL</button>
          </div>
        </div>
      )}

      <div className="app">
        <div className="ticker-box"><div className="ticker">{VIP_ALERTS.join("  •  ")}</div></div>
        
        <header style={{padding: '30px 20px', background: 'linear-gradient(to bottom, #0a0a0a, #000)', borderBottom: '1px solid #222'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
            <div>
              <div style={{fontSize: 10, color: 'var(--n)', fontWeight: 900, marginBottom: 5, letterSpacing: 2}}>NET WORTH:</div>
              <div style={{fontSize: 42, fontWeight: 900, letterSpacing: -1, textShadow: '0 0 20px rgba(255,255,255,0.1)'}}>
                ${displayBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}
              </div>
              <div style={{fontSize: 10, color: '#333', marginTop: 8, fontWeight: 900}}>{userId}</div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{color: 'var(--vip)', fontWeight: 900, fontSize: 20}}>LVL {level}</div>
              <div style={{fontSize: 10, color: '#444', fontWeight: 900, marginTop: 5}}>LIMIT: {maxLev}X</div>
            </div>
          </div>
          <div style={{width:'100%', height:6, background:'#111', marginTop:25, borderRadius:10, overflow:'hidden', border: '1px solid #222'}}>
            <div style={{width:`${(tradesInLevel / neededTrades) * 100}%`, height:'100%', background:'linear-gradient(90deg, var(--n), #fff)', boxShadow:'0 0 15px var(--n)', transition: '0.8s cubic-bezier(0.17, 0.67, 0.83, 0.67)'}} />
          </div>
        </header>

        <main style={{flex:1, overflowY:'auto', padding:20, paddingBottom:100}}>
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="card vip-card">
                    {isAnalyzing ? <div style={{textAlign:'center', color:'var(--vip)', fontSize: 12, fontWeight: 900, padding: 10, animation: 'pulse 1s infinite'}}>INITIALIZING ARBITRAGE SCANNER...</div> : 
                    <div>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}><b style={{color:'var(--vip)', fontSize: 22}}>{signal.coin}/USDT</b><b style={{color:'var(--w)', fontSize: 22}}>+{signal.perc}%</b></div>
                      <div style={{fontSize: 12, color: '#888', marginTop: 15, lineHeight: '1.8', fontWeight: 700}}>
                        <span style={{color: '#555'}}>SIGNAL:</span> BUY ON <span style={{color: '#fff'}}>{signal.buyDex}</span><br/>
                        <span style={{color: '#555'}}>SIGNAL:</span> SELL ON <span style={{color: '#fff'}}>{signal.sellDex}</span>
                      </div>
                    </div>}
                  </div>
                  
                  <div style={{fontSize: 11, color: '#444', margin: '25px 5px 15px', fontWeight: 900, letterSpacing: 2}}>GLOBAL EXCHANGES:</div>
                  {DEX.map(d => (
                    <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{display:'flex', justifyContent:'space-between', cursor:'pointer', alignItems: 'center', borderLeft: '4px solid var(--n)'}}>
                      <b style={{fontSize: 16, letterSpacing: 1}}>{d.name}</b>
                      <div style={{textAlign: 'right'}}>
                        <div style={{color:'var(--w)', fontSize:9, fontWeight: 900}}>STABLE</div>
                        <div style={{fontSize: 8, color: '#333'}}>v2.4.1</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} style={{background:'none', border:'none', color:'var(--n)', marginBottom: 20, fontWeight: 900, fontSize: 14, letterSpacing: 1}}>← TERMINAL EXIT</button>
                  
                  <div className="card" style={{borderColor: 'var(--n)', background: 'rgba(0,217,255,0.02)'}}>
                    <div style={{display:'flex', gap:15}}>
                      <div style={{flex:1}}><label style={{fontSize:10, color: '#555', fontWeight: 900}}>INVESTMENT ($)</label><input type="number" value={amount} onChange={(e)=>setAmount(Number(e.target.value))}/></div>
                      <div style={{flex:1}}><label style={{fontSize:10, color: '#555', fontWeight: 900}}>LEVERAGE ({maxLev}X)</label><input type="number" value={leverage} onChange={(e)=>{let v=parseInt(e.target.value)||0; setLeverage(v>maxLev?maxLev:v)}}/></div>
                    </div>
                    <div style={{marginTop: 20, padding: '15px', background: '#000', borderRadius: 12, display: 'flex', justifyContent: 'space-between', border: '1px solid #222'}}>
                      <span style={{fontSize: 12, color: '#444', fontWeight: 900}}>POTENTIAL PNL:</span>
                      <b style={{color: 'var(--w)', fontSize: 14}}>+${(amount * leverage * (signal ? parseFloat(signal.perc)/100 : 0.015)).toLocaleString()}</b>
                    </div>
                  </div>

                  {COINS_DATA.map(c => {
                    const isThisActive = activePos?.id === c.id;
                    const isSameDex = activePos?.buyDex === selectedDex;
                    const timePassed = isThisActive ? (Date.now() - activePos.startTime) / 1000 : 0;

                    return (
                      <div key={c.id} className="card" style={{opacity: (c.lvl > level) ? 0.2 : 1, borderLeft: isThisActive ? '4px solid var(--l)' : '1px solid #222'}}>
                        {isThisActive && isSameDex && timePassed < 90 && <div className="lock-progress" style={{width: `${100 - (timePassed/90)*100}%`}} />}
                        
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <div>
                            <b style={{fontSize: 20}}>{c.id}</b>
                            <div style={{fontSize:12, color:'var(--n)', fontWeight: 900, marginTop: 4}}>${c.base.toLocaleString()}</div>
                          </div>
                          {isThisActive ? (
                            <div style={{textAlign: 'right'}}>
                              {isSameDex && timePassed < 90 && <div style={{fontSize:9, color:'var(--l)', marginBottom:8, fontWeight:900, animation: 'pulse 0.5s infinite'}}>LOCKED: {Math.ceil(90-timePassed)}s</div>}
                              <button className={`btn btn-sell`} style={{width: 150, padding: '12px'}} onClick={handleSell}>
                                {netTimer ? `WAIT ${netTimer}s` : (isSameDex && timePassed < 90 ? 'FORCE EXIT' : 'CLOSE')}
                              </button>
                            </div>
                          ) : (
                            <button className={`btn btn-buy`} style={{width: 120, padding: '12px'}} disabled={!!activePos || c.lvl > level} onClick={() => handleOpenPosition(c.id)}>BUY</button>
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
               <div onClick={() => setBalance(b => b + 0.15)} style={{width: 250, height: 250, border: '10px solid #0a0a0a', borderTopColor: 'var(--n)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, color: 'var(--n)', fontWeight: '900', cursor: 'pointer', boxShadow: '0 0 50px rgba(0,217,255,0.15)', textShadow: '0 0 20px var(--n)'}}>TAP</div>
            </div>
          )}

          {tab === 'opts' && (
            <div style={{padding: 10}}>
              <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems: 'center', borderLeft: '4px solid var(--w)'}}>
                <span style={{fontSize: 14, fontWeight: 900}}>HAPTIC FEEDBACK</span>
                <button onClick={() => setSoundEnabled(!soundEnabled)} style={{background: soundEnabled ? 'var(--w)' : '#222', border:'none', padding:'12px 25px', borderRadius:10, color: '#000', fontWeight: 900}}>{soundEnabled ? 'ACTIVE' : 'MUTED'}</button>
              </div>
              <a href="https://t.me/kriptoalians" style={{textDecoration:'none'}}><div className="card vip-card" style={{textAlign:'center', color: 'var(--vip)', fontWeight: 900, marginTop: 15, fontSize: 14, letterSpacing: 2}}>CONTACT @KRIPTOALIANS</div></a>
            </div>
          )}
        </main>

        <nav className="nav">
          <div onClick={() => setTab('mining')} className={`tab ${tab === 'mining' ? 'active' : ''}`}><div style={{fontSize: 20, marginBottom: 5}}>⚡️</div><b style={{fontSize: 9, letterSpacing: 1}}>LIQUIDITY</b></div>
          <div onClick={() => setTab('trade')} className={`tab ${tab === 'trade' ? 'active' : ''}`}><div style={{fontSize: 20, marginBottom: 5}}>📉</div><b style={{fontSize: 9, letterSpacing: 1}}>TERMINAL</b></div>
          <div onClick={() => setTab('opts')} className={`tab ${tab === 'opts' ? 'active' : ''}`}><div style={{fontSize: 20, marginBottom: 5}}>⚙️</div><b style={{fontSize: 9, letterSpacing: 1}}>SYSTEM</b></div>
        </nav>
      </div>
    </div>
  );
}
