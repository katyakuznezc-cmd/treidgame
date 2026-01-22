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
  const [userId] = useState(() => {
    let id = localStorage.getItem('st_user_id');
    if (!id) {
      id = `USER-${Math.floor(100000 + Math.random() * 900000)}`;
      localStorage.setItem('st_user_id', id);
    }
    return id;
  });
  
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

  const getNeededTrades = (lvl) => {
    if (lvl === 1) return 15;
    if (lvl === 2) return 35;
    if (lvl === 3) return 75;
    return 150;
  };
  
  const maxLev = level === 1 ? 5 : level === 2 ? 20 : level === 3 ? 50 : 100;
  const neededTrades = getNeededTrades(level);

  useEffect(() => {
    if (Math.abs(displayBalance - balance) > 0.01) {
      const diff = balance - displayBalance;
      const timer = setTimeout(() => setDisplayBalance(displayBalance + diff / 8), 20);
      return () => clearTimeout(timer);
    } else { setDisplayBalance(balance); }
  }, [balance, displayBalance]);

  useEffect(() => {
    localStorage.setItem('st_bal', balance.toFixed(2));
    localStorage.setItem('st_lvl', level.toString());
    localStorage.setItem('st_prog', tradesInLevel.toString());
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
      }, 5000);
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
            setResult({ win: false, val: loss.toFixed(2), msg: "ANTI-FARM EXPLOIT DETECTED" });
            setIsBurning(true);
            setTimeout(() => setIsBurning(false), 1500);
            setActivePos(null); setSignal(null);
            setTradesInLevel(t => Math.max(0, t - 2));
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
          const winChance = isCorrect ? 0.85 : 0.25; 
          const win = Math.random() < winChance;
          
          let pnl;
          if (win) {
            const pRange = isCorrect ? (parseFloat(signal.perc) / 100) : 0.012;
            pnl = activePos.amount * activePos.leverage * pRange;
            setTradesInLevel(t => {
              if (t + 1 >= neededTrades) { setLevel(l => l + 1); return 0; }
              return t + 1;
            });
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
    <div className={`v ${isBurning ? 'burn-active' : ''}`} onMouseDown={handleAction} onTouchStart={handleAction} style={{
      width: '100vw', height: '100dvh', background: '#000', display: 'flex', justifyContent: 'center', overflow: 'hidden', position: 'relative', color: '#fff'
    }}>
      <style>{`
        :root { --n: #00d9ff; --w: #00ff88; --l: #ff3366; --vip: #ffd700; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Courier New', monospace; user-select: none; }
        .app { width: 100%; max-width: 500px; height: 100%; display: flex; flex-direction: column; position: relative; border-left: 1px solid #111; border-right: 1px solid #111; }
        .burn-active { animation: shake 0.1s infinite; }
        @keyframes shake { 0% { transform: translate(4px, 4px); } 50% { transform: translate(-4px, -4px); } 100% { transform: translate(0,0); } }
        .ticker-box { background: #1a1500; color: var(--vip); font-size: 11px; padding: 10px; overflow: hidden; white-space: nowrap; border-bottom: 2px solid var(--vip); font-weight: 900; }
        .ticker { display: inline-block; animation: ticker 25s linear infinite; }
        @keyframes ticker { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .card { background: rgba(12, 12, 12, 0.95); border: 1px solid #222; padding: 20px; border-radius: 16px; margin-bottom: 12px; position: relative; backdrop-filter: blur(5px); }
        .vip-card { border: 1px solid var(--vip); box-shadow: 0 0 20px rgba(255,215,0,0.15); }
        .btn { width: 100%; padding: 18px; border-radius: 12px; border: none; font-weight: 900; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; }
        .dollar { position: absolute; color: var(--w); font-weight: 900; pointer-events: none; animation: pop 0.8s ease-out forwards; z-index: 9999; font-size: 32px; text-shadow: 0 0 10px var(--w); }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-160px); } }
        .nav { position: absolute; bottom: 0; width: 100%; height: 80px; background: #050505; border-top: 1px solid #222; display: flex; }
        .tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; color: #444; font-weight: 900; }
        .tab.active { color: var(--n); }
        input { background: #000; border: 1px solid var(--n); color: var(--w); padding: 12px; border-radius: 10px; width: 100%; font-weight: 900; margin-top: 5px; outline: none; text-align: center; font-size: 18px; }
        .st-offer { background: linear-gradient(135deg, #111, #0a0a00); border: 1px solid var(--vip); color: #fff; padding: 20px; border-radius: 16px; text-align: center; margin: 15px 0; cursor: pointer; text-decoration: none; display: block; }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.99)', zIndex:15000, display:'flex', alignItems:'center', justifyContent:'center', padding:30}}>
          <div className="card" style={{borderColor: result.win ? 'var(--w)' : 'var(--l)', textAlign: 'center', width: '100%', padding: '50px 20px'}}>
            <h2 style={{color: result.win ? 'var(--w)' : 'var(--l)', fontSize: 24}}>{result.win ? 'DEAL SUCCESS' : 'LIQUIDATION'}</h2>
            <h1 style={{fontSize: 52, margin: '25px 0', fontWeight: 900}}>{result.win ? '+' : '-'}${Number(result.val).toLocaleString()}</h1>
            <button className="btn" style={{background: '#fff', color: '#000'}} onClick={() => setResult(null)}>OK</button>
          </div>
        </div>
      )}

      <div className="app">
        <div className="ticker-box"><div className="ticker">💎 РЕАЛЬНЫЙ ТРЕЙДИНГ: @vladstelin78  •  📈 ПРОГРЕСС LVL: {tradesInLevel}/{neededTrades}  •  🚀 VIP СИГНАЛЫ ВКЛЮЧЕНЫ</div></div>
        
        <header style={{padding: '30px 20px', background: '#050505', borderBottom: '1px solid #1a1a1a'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <div style={{fontSize: 42, fontWeight: 900}}>${displayBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
              <div style={{fontSize: 11, color: '#333', marginTop: 5}}>{userId}</div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{color: 'var(--vip)', fontWeight: 900, fontSize: 18}}>LVL {level}</div>
              <div style={{fontSize: 9, color: '#444'}}>MAX {maxLev}X</div>
            </div>
          </div>
          <div style={{width:'100%', height:6, background:'#111', marginTop:20, borderRadius:10, overflow:'hidden'}}>
            <div style={{width:`${(tradesInLevel / neededTrades) * 100}%`, height:'100%', background:'var(--n)', transition: '0.3s'}} />
          </div>
        </header>

        <main style={{flex:1, overflowY:'auto', padding:20, paddingBottom:100}}>
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="card vip-card">
                    {isAnalyzing ? <div style={{textAlign:'center', color:'var(--vip)', fontSize: 12, fontWeight: 900}}>SCANNING...</div> : 
                    <div>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}><b style={{color:'var(--vip)', fontSize: 22}}>{signal.coin}/USDT</b><b style={{color:'var(--w)', fontSize: 22}}>+{signal.perc}%</b></div>
                      <div style={{fontSize: 12, color: '#666', marginTop: 15}}>BUY: {signal.buyDex} → SELL: {signal.sellDex}</div>
                    </div>}
                  </div>

                  {/* ИСПРАВЛЕННЫЙ БАННЕР ТУТ */}
                  <a href="https://t.me/vladstelin78" className="st-offer">
                    <div style={{fontSize: 10, color: 'var(--vip)', fontWeight: '900', marginBottom: '8px', letterSpacing: '1px'}}>ОБРАЩЕНИЕ К ТРЕЙДЕРАМ</div>
                    <div style={{fontSize: '13px', fontWeight: '900', lineHeight: '1.5'}}>
                      Есть желание трейдить на реальных сделках?<br/>
                      <span style={{color: 'var(--n)', fontSize: '14px'}}>Напишите менеджеру: @vladstelin78</span>
                    </div>
                  </a>
                  
                  {DEX.map(d => (
                    <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{display:'flex', justifyContent:'space-between', cursor:'pointer', alignItems: 'center'}}>
                      <b style={{fontSize: 16}}>{d.name}</b>
                      <span style={{color:'var(--w)', fontSize: 10}}>CONNECTED</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} style={{background:'none', border:'none', color:'var(--n)', marginBottom: 20, fontWeight: 900}}>← BACK</button>
                  <div className="card"><div style={{display:'flex', gap:10}}>
                    <div style={{flex:1}}><label style={{fontSize:9, color:'#444'}}>AMOUNT</label><input type="number" value={amount} onChange={(e)=>setAmount(Number(e.target.value))}/></div>
                    <div style={{flex:1}}><label style={{fontSize:9, color:'#444'}}>LEVERAGE</label><input type="number" value={leverage} onChange={(e)=>setLeverage(Number(e.target.value))}/></div>
                  </div></div>
                  {COINS_DATA.map(c => (
                    <div key={c.id} className="card" style={{opacity: (c.lvl > level) ? 0.2 : 1}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div><b style={{fontSize: 18}}>{c.id}</b><div style={{fontSize:11, color:'var(--n)'}}>${c.base}</div></div>
                        {activePos?.id === c.id ? (
                          <button className="btn" style={{background:'var(--l)', width:120}} onClick={handleSell}>{netTimer ? `${netTimer}s` : 'SELL'}</button>
                        ) : (
                          <button className="btn" style={{background:'var(--w)', width:120, color:'#000'}} disabled={!!activePos || c.lvl > level} onClick={() => handleOpenPosition(c.id)}>BUY</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {tab === 'mining' && (
            <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}>
               <div onClick={() => setBalance(b => b + 0.15)} style={{width:250, height:250, border:'10px solid #111', borderTopColor:'var(--n)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:60, color:'var(--n)', fontWeight:'900', cursor:'pointer'}}>TAP</div>
            </div>
          )}
        </main>

        <nav className="nav">
          <div onClick={() => setTab('mining')} className={`tab ${tab === 'mining' ? 'active' : ''}`}>⚡️ <b>FARM</b></div>
          <div onClick={() => setTab('trade')} className={`tab ${tab === 'trade' ? 'active' : ''}`}>💹 <b>MARKET</b></div>
        </nav>
      </div>
    </div>
  );
}
