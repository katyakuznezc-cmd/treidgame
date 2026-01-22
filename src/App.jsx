import React, { useState, useEffect, useRef } from 'react';

const COINS_DATA = [
  { id: 'TON', base: 5.42, lvl: 1 },
  { id: 'DOGE', base: 0.15, lvl: 1 },
  { id: 'SOL', base: 145.30, lvl: 2 },
  { id: 'BTC', base: 95400, lvl: 3 },
  { id: 'ETH', base: 2600, lvl: 2 },
  { id: 'NEAR', base: 6.12, lvl: 1 }
];

const DEX = [
  { id: '1INCH', name: '1INCH' }, { id: 'UNISWAP', name: 'UNISWAP' }, 
  { id: 'PANCAKE', name: 'PANCAKE' }, { id: 'RAYDIUM', name: 'RAYDIUM' }
];

export default function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('st_bal')) || 1000.00);
  const [level, setLevel] = useState(() => Number(localStorage.getItem('st_lvl')) || 1);
  const [tradesInLevel, setTradesInLevel] = useState(() => Number(localStorage.getItem('st_prog')) || 0);
  const [tab, setTab] = useState('trade');
  
  const [selectedDex, setSelectedDex] = useState(null);
  const [amount, setAmount] = useState(100);
  const [leverage, setLeverage] = useState(5); 
  const [activePos, setActivePos] = useState(null); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [netTimer, setNetTimer] = useState(null);
  
  const [signal, setSignal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [result, setResult] = useState(null);
  const [clicks, setClicks] = useState([]); 
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [admCount, setAdmCount] = useState(0);
  const [showAdm, setShowAdm] = useState(false);
  const [newBalInp, setNewBalInp] = useState('');

  const clickSound = useRef(null);
  const hardLock = useRef(false);

  const neededTrades = level === 1 ? 15 : level === 2 ? 35 : 75;

  // ЛОГИКА ОГРАНИЧЕНИЯ ПЛЕЧА ПО УРОВНЮ
  const getMaxLeverage = () => {
    if (level === 1) return 10;
    if (level === 2) return 25;
    if (level === 3) return 50;
    return 100;
  };

  useEffect(() => {
    clickSound.current = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
    clickSound.current.volume = 0.05;
    localStorage.setItem('st_bal', balance.toFixed(2));
    localStorage.setItem('st_lvl', level);
    localStorage.setItem('st_prog', tradesInLevel);
  }, [balance, level, tradesInLevel]);

  useEffect(() => {
    let timer;
    if (tab === 'trade' && !signal && !activePos) {
      setIsAnalyzing(true);
      timer = setTimeout(() => {
        const available = COINS_DATA.filter(c => c.lvl <= level);
        const coin = available[Math.floor(Math.random() * available.length)];
        const bDex = DEX[Math.floor(Math.random() * DEX.length)].name;
        let sDex = DEX[Math.floor(Math.random() * DEX.length)].name;
        while(sDex === bDex) sDex = DEX[Math.floor(Math.random() * DEX.length)].name;
        setSignal({ 
            coin: coin.id, 
            buyDex: bDex, 
            sellDex: sDex, 
            perc: (Math.random() * 1 + 3).toFixed(2) 
        });
        setIsAnalyzing(false);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [tab, signal, activePos, level]);

  const handleGlobalClick = (e) => {
    if (soundEnabled && clickSound.current) {
      clickSound.current.currentTime = 0;
      clickSound.current.play().catch(() => {});
    }
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    if (x) {
      const id = Date.now();
      setClicks(prev => [...prev, { id, x, y }]);
      setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 600);
    }
  };

  const sellPos = () => {
    if (hardLock.current || isProcessing) return;
    hardLock.current = true;
    setIsProcessing(true);
    setNetTimer(6);

    const itv = setInterval(() => {
      setNetTimer(p => {
        if (p <= 1) {
          clearInterval(itv);
          const isCorrectDex = selectedDex === signal?.sellDex;
          const win = Math.random() < (isCorrectDex ? 0.9 : 0.1);
          
          let pnl;
          if (win) {
            pnl = (amount * leverage * (parseFloat(signal?.perc || 3.5) / 100));
            setTradesInLevel(t => (t + 1 >= neededTrades) ? 0 : t + 1);
            if (tradesInLevel + 1 >= neededTrades) setLevel(l => l + 1);
          } else {
            const lossPerc = (Math.random() * 0.5 + 1.0) / 100; 
            pnl = -(amount * leverage * lossPerc);
          }

          setBalance(b => Math.max(0, b + amount + pnl));
          setResult({ win, val: Math.abs(pnl).toFixed(2) });
          setActivePos(null); setSignal(null); setIsProcessing(false); hardLock.current = false;
          return null;
        }
        return p - 1;
      });
    }, 1000);
  };

  const estProfit = (amount * leverage * (parseFloat(signal?.perc || 3.5) / 100)).toFixed(2);
  const estLoss = (amount * leverage * 0.015).toFixed(2);

  return (
    <div onPointerDown={handleGlobalClick} style={{width:'100vw', height:'100dvh', background:'#000', color:'#fff', fontFamily:'sans-serif', overflow:'hidden', display:'flex', flexDirection:'column', position:'relative'}}>
      <style>{`
        .btn { width:100%; padding:15px; border-radius:10px; border:none; font-weight:bold; cursor:pointer; text-transform:uppercase; }
        .card { background:#0a0a0a; border:1px solid #00f2ff; border-radius:12px; padding:15px; margin-bottom:10px; }
        .neon { color: #00f2ff; text-shadow: 0 0 10px #00f2ff; }
        .dollar { position: absolute; color: #00ff88; font-weight: 900; pointer-events: none; animation: pop 0.6s forwards; zIndex: 999; font-size: 28px; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-120px); } }
        input { background:#000; border:1px solid #00f2ff; color:#00f2ff; padding:8px; border-radius:5px; width:100%; text-align:center; outline:none; font-weight:bold; }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      {showAdm && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.95)', zIndex:10000, padding:20, display:'flex', flexDirection:'column', justifyContent:'center'}}>
          <div className="card">
            <h3 className="neon">ADMIN</h3>
            <input type="number" value={newBalInp} onChange={e=>setNewBalInp(e.target.value)} placeholder="BALANCE" />
            <button className="btn" style={{background:'#00ff88', color:'#000', marginTop:10}} onClick={() => {setBalance(Number(newBalInp)); setShowAdm(false);}}>SET</button>
            <button className="btn" style={{background:'#333', marginTop:5}} onClick={()=>setShowAdm(false)}>CLOSE</button>
          </div>
        </div>
      )}

      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.9)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
            <div className="card" style={{width:'100%', textAlign:'center', borderColor: result.win ? '#00ff88' : '#ff0055'}}>
                <h2 style={{color: result.win ? '#00ff88' : '#ff0055'}}>{result.win ? 'PROFIT' : 'LOSS'}</h2>
                <h1 className="neon">{result.win ? '+' : '-'}${result.val}</h1>
                <button className="btn" style={{background:'#fff', color:'#000'}} onClick={()=>setResult(null)}>OK</button>
            </div>
        </div>
      )}

      <header style={{padding:20, borderBottom:'1px solid #1a1a1a'}}>
        <div className="neon" style={{fontSize:28, fontWeight:'bold'}}>${balance.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
        <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'#444', marginTop:5}}>
          <span>LVL {level}</span>
          <span>MAX LEV: x{getMaxLeverage()}</span>
        </div>
      </header>

      <main style={{flex:1, overflowY:'auto', padding:15}}>
        {tab === 'trade' && (
          <>
            <div className="card" style={{borderColor: '#ffcc00', background: 'rgba(255,204,0,0.05)'}}>
                <div style={{fontSize:10, color:'#ffcc00', fontWeight:'bold'}}>VIP ACADEMY</div>
                <div style={{fontSize:12, marginTop:3}}>Manager: @vladstelin78</div>
            </div>

            {!selectedDex ? (
              <div>
                <div className="card" style={{textAlign:'center'}}>
                   {isAnalyzing ? <span className="neon">ANALYZING...</span> : 
                   <div>SIGNAL: <span style={{color:'#00ff88'}}>{signal.coin} +{signal.perc}%</span><br/><small style={{color:'#444'}}>{signal.buyDex} → {signal.sellDex}</small></div>}
                </div>
                {DEX.map(d => (
                  <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{cursor:'pointer'}}>
                    {d.name} <span style={{float:'right', color:'#00ff88', fontSize:9}}>ONLINE</span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div onClick={() => setSelectedDex(null)} style={{color:'#00f2ff', marginBottom:10, fontSize:12, cursor:'pointer'}}>← TERMINALS</div>
                
                <div className="card" style={{background:'#050505'}}>
                    <div style={{display:'flex', gap:10, marginBottom:10}}>
                        <div style={{flex:1}}><label style={{fontSize:9, color:'#444'}}>INVEST ($)</label><input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} /></div>
                        <div style={{flex:1}}>
                            <label style={{fontSize:9, color:'#444'}}>LEVERAGE (Max x{getMaxLeverage()})</label>
                            <input 
                              type="number" 
                              value={leverage} 
                              onChange={e => {
                                let val = Number(e.target.value);
                                if (val > getMaxLeverage()) val = getMaxLeverage();
                                setLeverage(val);
                              }} 
                            />
                        </div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:11, padding:'5px 0', borderTop:'1px solid #1a1a1a'}}>
                        <span style={{color:'#00ff88'}}>PROFIT: +${estProfit}</span>
                        <span style={{color:'#ff0055'}}>RISK: -${estLoss}</span>
                    </div>
                </div>

                {COINS_DATA.map(c => {
                  const isActive = activePos?.id === c.id;
                  return (
                    <div key={c.id} className="card" style={{opacity: c.lvl > level ? 0.3 : 1}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span>{c.id}</span>
                        {isActive ? (
                          isProcessing ? <div className="neon" style={{fontSize:12}}>{netTimer}s...</div> :
                          <button className="btn" style={{background:'#ff0055', width:120}} onClick={sellPos}>SELL</button>
                        ) : (
                          <button className="btn" style={{background:'#00ff88', color:'#000', width:100}} disabled={!!activePos || c.lvl > level} onClick={() => {
                            if(balance >= amount) { setBalance(b => b - amount); setActivePos({id: c.id}); }
                          }}>BUY</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'mining' && (
          <div style={{height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
             <div onClick={() => setBalance(b => b + 0.10)} style={{width: 220, height: 220, border: '8px solid #111', borderTopColor: '#00f2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#00f2ff', fontWeight: 'bold', cursor:'pointer'}}>TAP</div>
             <p className="neon" style={{marginTop:30}}>MINING...</p>
          </div>
        )}

        {tab === 'opts' && (
          <div>
            <h2 onPointerDown={() => {if(admCount+1>=5) setShowAdm(true); else setAdmCount(admCount+1);}} className="neon" style={{textAlign:'center', cursor:'pointer', marginBottom:20}}>OPTIONS</h2>
            <div className="card" onClick={() => setSoundEnabled(!soundEnabled)}>SOUND: {soundEnabled ? 'ON' : 'OFF'}</div>
            <div className="card" onClick={() => window.open('https://t.me/kriptoalians')} style={{textAlign:'center', borderColor:'#ffcc00', color:'#ffcc00', cursor:'pointer'}}>
               @KRIPTOALIANS
            </div>
          </div>
        )}
      </main>

      <nav style={{height:75, display:'flex', background:'#050505', borderTop:'1px solid #1a1a1a'}}>
        <div onClick={() => setTab('mining')} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color: tab==='mining'?'#00f2ff':'#444', fontSize:10}}>⛏ FARM</div>
        <div onClick={() => setTab('trade')} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color: tab==='trade'?'#00f2ff':'#444', fontSize:10}}>💹 TRADE</div>
        <div onClick={() => setTab('opts')} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color: tab==='opts'?'#00f2ff':'#444', fontSize:10}}>⚙ OPTS</div>
      </nav>
    </div>
  );
}
