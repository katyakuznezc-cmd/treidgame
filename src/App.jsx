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
  const [activePos, setActivePos] = useState(null); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [netTimer, setNetTimer] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [clicks, setClicks] = useState([]); 
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [admCount, setAdmCount] = useState(0);
  const [showAdm, setShowAdm] = useState(false);
  const [newBalInput, setNewBalInput] = useState('');

  const clickSound = useRef(null);
  const hardLock = useRef(false);

  useEffect(() => {
    clickSound.current = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
    clickSound.current.volume = 0.1;
  }, []);

  useEffect(() => {
    localStorage.setItem('st_bal', balance.toFixed(2));
    localStorage.setItem('st_lvl', level);
    localStorage.setItem('st_prog', tradesInLevel);
  }, [balance, level, tradesInLevel]);

  // Генерация сигналов
  useEffect(() => {
    let timer;
    if (tab === 'trade' && !signal && !activePos) {
      setIsAnalyzing(true);
      timer = setTimeout(() => {
        const available = COINS_DATA.filter(c => c.lvl <= level);
        const coin = available[Math.floor(Math.random() * available.length)];
        setSignal({ 
            coin: coin.id, 
            buyDex: DEX[Math.floor(Math.random() * DEX.length)].name, 
            sellDex: DEX[Math.floor(Math.random() * DEX.length)].name,
            perc: (Math.random() * 2 + 1).toFixed(2) 
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
    if (x && y) {
      const id = Date.now();
      setClicks(prev => [...prev, { id, x, y }]);
      setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 600);
    }
  };

  const startTrade = (coinId) => {
    if (balance < 100) return;
    setBalance(b => b - 100);
    setActivePos({ id: coinId, amount: 100 });
  };

  const sellPos = (e) => {
    if (e) e.stopPropagation();
    if (hardLock.current || isProcessing) return;
    
    hardLock.current = true;
    setIsProcessing(true);
    setNetTimer(6);

    const itv = setInterval(() => {
      setNetTimer(p => {
        if (p <= 1) {
          clearInterval(itv);
          const profit = 100 * (1 + (Math.random() * 0.1)); 
          setBalance(b => b + profit);
          setTradesInLevel(t => t + 1);
          if (tradesInLevel >= 10) { setLevel(l => l + 1); setTradesInLevel(0); }
          
          setActivePos(null);
          setSignal(null);
          setIsProcessing(false);
          hardLock.current = false;
          return null;
        }
        return p - 1;
      });
    }, 1000);
  };

  return (
    <div onPointerDown={handleGlobalClick} style={{width:'100vw', height:'100dvh', background:'#000', color:'#fff', fontFamily:'Orbitron, sans-serif', overflow:'hidden', display:'flex', flexDirection:'column', position:'relative'}}>
      <style>{`
        .btn { width:100%; padding:15px; border-radius:10px; border:none; font-weight:bold; cursor:pointer; text-transform:uppercase; }
        .card { background:#0a0a0a; border:1px solid #00f2ff; border-radius:12px; padding:15px; margin-bottom:10px; }
        .neon-text { color: #00f2ff; text-shadow: 0 0 10px #00f2ff; }
        .dollar { position: absolute; color: #00ff88; font-weight: 900; pointer-events: none; animation: pop 0.6s forwards; zIndex: 999; font-size: 28px; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-120px); } }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      {/* ADMIN PANEL */}
      {showAdm && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.95)', zIndex:10000, padding:20, display:'flex', flexDirection:'column', justifyContent:'center'}}>
          <div className="card">
            <h3 className="neon-text">ADMIN SETTINGS</h3>
            <input type="number" placeholder="NEW BALANCE" value={newBalInput} onChange={e=>setNewBalInput(e.target.value)} style={{width:'100%', padding:10, background:'#000', border:'1px solid #00f2ff', color:'#fff', marginBottom:10}} />
            <button className="btn" style={{background:'#00ff88', color:'#000'}} onClick={() => { setBalance(Number(newBalInput)); setShowAdm(false); }}>APPLY</button>
            <button className="btn" style={{background:'#333', marginTop:5}} onClick={() => setShowAdm(false)}>CLOSE</button>
          </div>
        </div>
      )}

      <header style={{padding:20, borderBottom:'1px solid #1a1a1a'}}>
        <div className="neon-text" style={{fontSize:28, fontWeight:'bold'}}>${balance.toFixed(2)}</div>
        <div style={{display:'flex', justifyContent:'space-between', fontSize:10, marginTop:5}}>
          <span>LVL {level}</span>
          <span>EXP: {tradesInLevel}/10</span>
        </div>
      </header>

      <main style={{flex:1, overflowY:'auto', padding:20}}>
        {tab === 'trade' && (
          <>
            {!selectedDex ? (
              <div>
                <div className="card" style={{textAlign:'center'}}>
                   {isAnalyzing ? <span className="neon-text">СКАНЕР РЫНКА...</span> : 
                   <div>СИГНАЛ: <span style={{color:'#00ff88'}}>{signal.coin} +{signal.perc}%</span></div>}
                </div>
                <p style={{fontSize:10, color:'#444'}}>ВЫБЕРИТЕ БИРЖУ:</p>
                {DEX.map(d => (
                  <div key={d.id} className="card" onClick={() => setSelectedDex(d.name)} style={{cursor:'pointer'}}>
                    {d.name} <span style={{float:'right', color:'#00ff88', fontSize:10}}>ONLINE</span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div onClick={() => setSelectedDex(null)} style={{color:'#00f2ff', marginBottom:10, fontSize:12}}>← НАЗАД</div>
                <div className="card">ТЕРМИНАЛ: {selectedDex}</div>
                {COINS_DATA.map(c => {
                  const isThisActive = activePos?.id === c.id;
                  return (
                    <div key={c.id} className="card" style={{opacity: c.lvl > level ? 0.3 : 1}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span>{c.id} <br/><small style={{color:'#444'}}>${c.base}</small></span>
                        {isThisActive ? (
                          isProcessing ? (
                            <div style={{color:'#555', fontSize:12}}>{netTimer}s СИНХРОНИЗАЦИЯ...</div>
                          ) : (
                            <button className="btn" style={{background:'#ff0055', width:120}} onPointerDown={sellPos}>ПРОДАТЬ</button>
                          )
                        ) : (
                          <button className="btn" style={{background:'#00ff88', color:'#000', width:100}} disabled={!!activePos || c.lvl > level} onClick={() => startTrade(c.id)}>КУПИТЬ</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'opts' && (
          <div>
            <h2 onPointerDown={() => {
              if(admCount + 1 >= 5) setShowAdm(true);
              else setAdmCount(admCount + 1);
            }} className="neon-text" style={{textAlign:'center'}}>ОПЦИИ</h2>
            <div className="card" onClick={() => setSoundEnabled(!soundEnabled)}>ЗВУК: {soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</div>
            <div className="card" style={{textAlign:'center'}}>
                <a href="https://t.me/kriptoalians" style={{color:'#ffcc00', textDecoration:'none'}}>CREATOR: @kriptoalians</a>
            </div>
          </div>
        )}
      </main>

      <nav style={{height:75, display:'flex', background:'#050505', borderTop:'1px solid #1a1a1a'}}>
        <div onClick={() => setTab('trade')} style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color: tab==='trade'?'#00f2ff':'#444'}}>ТРЕЙД</div>
        <div onClick={() => setTab('opts')} style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color: tab==='opts'?'#00f2ff':'#444'}}>ОПЦИИ</div>
      </nav>
    </div>
  );
}
