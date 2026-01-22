
import React, { useState, useEffect, useRef } from 'react';

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
  // Баланс для хранения значения и баланс для отображения (анимации)
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

  // Эффект "бегущих цифр"
  useEffect(() => {
    if (displayBalance !== balance) {
      const diff = balance - displayBalance;
      const step = diff / 20; // Скорость анимации
      const timer = setTimeout(() => {
        if (Math.abs(diff) < 0.1) setDisplayBalance(balance);
        else setDisplayBalance(displayBalance + step);
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [balance, displayBalance]);

  useEffect(() => {
    localStorage.setItem('bal', balance);
    localStorage.setItem('lvl', level);
    localStorage.setItem('trades', tradesInLevel);
  }, [balance, level, tradesInLevel]);

  const calcExpectedProfit = () => {
    const p = signal ? parseFloat(signal.perc) : 2.5;
    return (amount * leverage * (p / 100)).toFixed(2);
  };

  const handleAction = (e) => {
    if (soundEnabled) {
      const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
      audio.volume = 0.05;
      audio.play().catch(() => {});
    }
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
        const available = COINS_DATA.filter(c => c.lvl <= level);
        const coin = available[Math.floor(Math.random() * available.length)];
        setSignal({ 
          coin: coin.id, 
          buyDex: DEX[Math.floor(Math.random()*DEX.length)].name, 
          sellDex: DEX[Math.floor(Math.random()*DEX.length)].name, 
          perc: (Math.random() * 1 + 2).toFixed(2) // Профит от 2 до 3%
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
          const win = Math.random() > 0.2;
          let pnl;
          
          if (win) {
            // Профит: 2% - 3% от позиции
            const randPerc = (Math.random() * 1 + 2) / 100;
            pnl = amount * leverage * randPerc;
          } else {
            // Убыток: до 1.5% от позиции
            const lossPerc = (Math.random() * 0.5 + 1) / 100; 
            pnl = -(amount * leverage * lossPerc);
            setIsBurning(true);
            setTimeout(() => setIsBurning(false), 1000);
          }

          setBalance(b => Math.max(0, b + amount + pnl));
          setResult({ win, val: Math.abs(pnl).toFixed(2) });
          setActivePos(null);
          setSignal(null);
          
          const needed = 10 + (level - 1) * 5;
          setTradesInLevel(t => {
            const next = t + 1;
            if (next >= needed) { setLevel(l => l + 1); return 0; }
            return next;
          });
          return null;
        }
        return p - 1;
      });
    }, 1000);
  };

  return (
    <div className={`v ${isBurning ? 'burn-active' : ''}`} onMouseDown={handleAction} onTouchStart={handleAction} style={{
      width: '100vw', height: '100dvh', background: '#000', display: 'flex', justifyContent: 'center', overflow: 'hidden', position: 'relative', color: '#fff'
    }}>
      <style>{`
        :root { --n: #00d9ff; --w: #00ff88; --l: #ff3366; --vip: #ffd700; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Courier New', monospace; user-select: none; }
        .app { width: 100%; max-width: 500px; height: 100%; display: flex; flex-direction: column; position: relative; }
        .burn-active { animation: shake 0.2s infinite; }
        .burn-active::after { content: ''; position: absolute; inset: 0; background: rgba(255, 51, 102, 0.4); z-index: 10000; pointer-events: none; }
        @keyframes shake { 0% { transform: translate(3px, 3px); } 50% { transform: translate(-3px, -3px); } 100% { transform: translate(0,0); } }
        .card { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 15px; border-radius: 12px; margin-bottom: 10px; }
        .btn { width: 100%; padding: 15px; border-radius: 10px; border: none; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .btn:active { transform: scale(0.98); }
        .dollar { position: absolute; color: var(--w); font-weight: 900; pointer-events: none; animation: pop 0.8s ease-out forwards; z-index: 9999; font-size: 26px; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-130px); } }
        .modal { position: absolute; inset: 0; background: rgba(0,0,0,0.95); z-index: 15000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .nav { position: absolute; bottom: 0; width: 100%; height: 75px; background: #050505; border-top: 1px solid #1a1a1a; display: flex; }
        .tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; color: #444; }
        .tab.active { color: var(--n); }
        input { background: #111; border: 1px solid #333; color: #fff; padding: 10px; border-radius: 8px; width: 100%; font-weight: bold; margin-top: 5px; outline: none; }
        input:focus { border-color: var(--n); }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      {result && (
        <div className="modal">
          <div className="card" style={{borderColor: result.win ? 'var(--w)' : 'var(--l)', textAlign: 'center', width: '85%', padding: '40px 20px', boxShadow: result.win ? '0 0 20px rgba(0,255,136,0.2)' : '0 0 20px rgba(255,51,102,0.2)'}}>
            <h1 style={{color: result.win ? 'var(--w)' : 'var(--l)', fontSize: 36, letterSpacing: 2}}>{result.win ? 'SUCCESS' : 'LOSS'}</h1>
            <p style={{fontSize: 32, margin: '20px 0', fontWeight: 'bold'}}>{result.win ? '+' : '-'}${Number(result.val).toLocaleString()}</p>
            <button className="btn" style={{background: '#fff', color: '#000'}} onClick={() => setResult(null)}>ПРОДОЛЖИТЬ</button>
          </div>
        </div>
      )}

      <div className="app">
        <header className="header" style={{padding: '20px 15px', background: '#050505', borderBottom: '1px solid #111'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
               <div style={{fontSize: 32, fontWeight: 900, color: isBurning ? 'var(--l)' : '#fff', transition: 'color 0.3s'}}>
                 ${displayBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
               </div>
               <div style={{fontSize: 10, color: '#444', marginTop: 4}}>{userId}</div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{color: 'var(--n)', fontWeight: 'bold', fontSize: 14}}>LVL {level}</div>
              <div style={{fontSize: 9, color: '#666'}}>LEVERAGE UP TO {maxLev}x</div>
            </div>
          </div>
          <div style={{width:'100%', height:3, background:'#111', marginTop:15, borderRadius:2}}>
            <div style={{width:`${(tradesInLevel / (10 + (level - 1) * 5)) * 100}%`, height:'100%', background:'var(--n)', boxShadow:'0 0 10px var(--n)', transition: '0.5s'}} />
          </div>
        </header>

        <main style={{flex:1, overflowY:'auto', padding:15, paddingBottom:90}}>
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="card" style={{border: '1px solid var(--n)', background: 'rgba(0, 217, 255, 0.05)'}}>
                    {isAnalyzing ? <div style={{textAlign:'center', color:'var(--n)', fontSize: 11, letterSpacing: 1}}>SCANNING FOR ARBITRAGE...</div> : 
                    <div>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                        <b style={{fontSize: 18}}>{signal.coin}/USDT</b>
                        <b style={{color:'var(--w)', fontSize: 18}}>+{signal.perc}%</b>
                      </div>
                      <div style={{fontSize: 10, color: '#888', marginTop: 8}}>
                        BUY: <span style={{color: '#ccc'}}>{signal.buyDex}</span> → SELL: <span style={{color: '#ccc'}}>{signal.sellDex}</span>
                      </div>
                    </div>}
                  </div>
                  <div style={{fontSize: 10, color: '#444', margin: '15px 0 5px 5px'}}>LIQUIDITY PROVIDERS:</div>
                  {DEX.map(d => <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{display:'flex', justifyContent:'space-between', cursor: 'pointer', alignItems: 'center'}}>
                    <b>{d.name}</b><span style={{color:'var(--w)', fontSize:9, border: '1px solid var(--w)', padding: '2px 5px', borderRadius: 4}}>ACTIVE</span>
                  </div>)}
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} style={{background:'none', border:'none', color:'#666', marginBottom: 15, fontSize: 12, fontWeight: 'bold'}}>← BACK TO EXCHANGES</button>
                  
                  <div className="card" style={{borderColor: '#222'}}>
                    <div style={{display:'flex', gap:10}}>
                      <div style={{flex:1}}><label style={{fontSize:9, color: '#666'}}>INVEST AMOUNT</label><input type="number" value={amount} onChange={(e)=>setAmount(Number(e.target.value))}/></div>
                      <div style={{flex:1}}><label style={{fontSize:9, color: '#666'}}>LEVERAGE (MAX {maxLev}x)</label><input type="number" value={leverage} onChange={(e)=>{let v=parseInt(e.target.value)||0; setLeverage(v>maxLev?maxLev:v)}}/></div>
                    </div>
                    <div style={{marginTop: 15, padding: '12px', background: '#000', border: '1px solid #111', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span style={{fontSize: 11, color: '#666'}}>ESTIMATED PROFIT:</span>
                      <b style={{color: 'var(--w)', fontSize: 14}}>+${Number(calcExpectedProfit()).toLocaleString()}</b>
                    </div>
                  </div>

                  {COINS_DATA.map(c => {
                    const lock = c.lvl > level;
                    return (
                      <div key={c.id} className="card" style={{opacity: lock ? 0.2 : 1, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div><b style={{fontSize: 16}}>{c.id}</b><div style={{fontSize:10, color:'var(--n)'}}>${c.base.toLocaleString()}</div></div>
                        {lock ? <span style={{fontSize: 10, color: '#444'}}>LOCKED LVL {c.lvl}</span> : (
                          activePos?.id === c.id ? <button className="btn" style={{background:'var(--l)', width:110, color:'#fff'}} onClick={handleSell}>{netTimer ? `WAIT ${netTimer}s` : 'CLOSE'}</button> :
                          <button className="btn" style={{background:'var(--w)', width:110, color: '#000'}} onClick={() => {if(balance >= amount){setBalance(b=>b-amount); setActivePos({id:c.id})}}}>OPEN POSITION</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'mining' && (
            <div style={{height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
               <div onClick={() => setBalance(b => b + 0.1)} style={{width: 220, height: 220, border: '8px solid #111', borderTopColor: 'var(--n)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: 'var(--n)', fontWeight: '900', cursor: 'pointer', boxShadow: '0 0 40px rgba(0, 217, 255, 0.1)', animation: 'spin 4s linear infinite'}}>TAP</div>
               <p style={{marginTop: 30, color: '#444', fontSize: 12}}>CLICK TO GENERATE LIQUIDITY</p>
            </div>
          )}

          {tab === 'opts' && (
            <div style={{padding: 10}}>
              <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                <span style={{fontSize: 12}}>HAPTIC FEEDBACK</span>
                <button onClick={() => setSoundEnabled(!soundEnabled)} style={{background: soundEnabled ? 'var(--w)' : '#222', border:'none', padding:'10px 20px', borderRadius:8, color: '#000', fontWeight: 'bold', fontSize: 11}}>{soundEnabled ? 'ENABLED' : 'DISABLED'}</button>
              </div>
              <a href="https://t.me/kriptoalians" style={{textDecoration:'none'}}><div className="card" style={{textAlign:'center', color: 'var(--n)', border: '1px solid var(--n)', fontSize: 13, fontWeight: 'bold'}}>JOIN @KRIPTOALIANS</div></a>
              <button onClick={() => {if(window.confirm("RESET ALL PROGRESS?")){localStorage.clear(); window.location.reload();}}} className="btn" style={{background: '#000', color: 'var(--l)', border: '1px solid var(--l)', marginTop: 20, fontSize: 11}}>HARD RESET</button>
            </div>
          )}
        </main>

        <nav className="nav">
          <div onClick={() => setTab('mining')} className={`tab ${tab === 'mining' ? 'active' : ''}`}><b style={{fontSize: 9}}>LIQUIDITY</b></div>
          <div onClick={() => setTab('trade')} className={`tab ${tab === 'trade' ? 'active' : ''}`}><b style={{fontSize: 9}}>TERMINAL</b></div>
          <div onClick={() => setTab('opts')} className={`tab ${tab === 'opts' ? 'active' : ''}`}><b style={{fontSize: 9}}>SYSTEM</b></div>
        </nav>
      </div>
    </div>
  );
}
