import React, { useState, useEffect, useRef } from 'react';

const COINS_DATA = [
  { id: 'TON', base: 5.42, lvl: 1 },
  { id: 'DOGE', base: 0.15, lvl: 1 },
  { id: 'NEAR', base: 6.12, lvl: 1 },
  { id: 'TRX', base: 0.11, lvl: 2 },
  { id: 'SOL', base: 145.30, lvl: 3 },
  { id: 'ETH', base: 2640, lvl: 4 },
  { id: 'XRP', base: 0.62, lvl: 5 },
  { id: 'ADA', base: 0.45, lvl: 6 },
  { id: 'AVAX', base: 34.20, lvl: 7 },
  { id: 'BNB', base: 590, lvl: 8 },
  { id: 'PEPE', base: 0.000008, lvl: 9 },
  { id: 'BTC', base: 96200, lvl: 10 }
];

const DEX = [{ name: '1INCH' }, { name: 'UNISWAP' }, { name: 'PANCAKE' }, { name: 'RAYDIUM' }];

export default function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('st_bal')) || 1000.00);
  const [level, setLevel] = useState(() => Number(localStorage.getItem('st_lvl')) || 1);
  const [tradesInLevel, setTradesInLevel] = useState(() => Number(localStorage.getItem('st_prog')) || 0);
  const [tab, setTab] = useState('trade');
  const [selectedDex, setSelectedDex] = useState(null);
  const [amount, setAmount] = useState(100);
  const [leverage, setLeverage] = useState(5);
  const [activeTrade, setActiveTrade] = useState(null); 
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncTimer, setSyncTimer] = useState(0);
  const [signal, setSignal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [result, setResult] = useState(null);
  const [lvlUpModal, setLvlUpModal] = useState(false);
  const [clicks, setClicks] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const clickSound = useRef(null);

  const neededTrades = 5; 
  const getMaxLev = () => Math.min(level * 10, 100);

  useEffect(() => {
    localStorage.setItem('st_bal', balance.toFixed(2));
    localStorage.setItem('st_lvl', level);
    localStorage.setItem('st_prog', tradesInLevel);
    if (!clickSound.current) {
      clickSound.current = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
      clickSound.current.volume = 0.05;
    }
  }, [balance, level, tradesInLevel]);

  useEffect(() => {
    if (tab === 'trade' && !signal && !activeTrade && !isSyncing) {
      setIsAnalyzing(true);
      const timer = setTimeout(() => {
        const avail = COINS_DATA.filter(c => c.lvl <= level);
        const coin = avail[Math.floor(Math.random() * avail.length)];
        const bDex = DEX[Math.floor(Math.random() * DEX.length)].name;
        let sDex = DEX[Math.floor(Math.random() * DEX.length)].name;
        while(sDex === bDex) sDex = DEX[Math.floor(Math.random() * DEX.length)].name;
        setSignal({
          coin: coin.id, buyDex: bDex, sellDex: sDex,
          perc: (Math.random() * (4.5 - 2.5) + 2.5).toFixed(2)
        });
        setIsAnalyzing(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [tab, signal, activeTrade, isSyncing, level]);

  const openLink = (url) => { window.open(url, '_blank', 'noopener,noreferrer'); };

  const buyCoin = (id) => {
    if (balance < amount || activeTrade || isSyncing) return;
    setBalance(b => b - amount);
    setActiveTrade({ coinId: id, buyDex: selectedDex, amount, leverage });
  };

  const sellCoin = () => {
    if (!activeTrade || isSyncing) return;
    setIsSyncing(true);
    setSyncTimer(6);
    const itv = setInterval(() => {
      setSyncTimer(prev => {
        if (prev <= 1) { clearInterval(itv); finalizeTrade(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const finalizeTrade = () => {
    const isCorrectDex = selectedDex === signal.sellDex;
    const isWin = isCorrectDex && Math.random() < 0.92;
    let pnl;
    if (isWin) {
      pnl = activeTrade.amount * activeTrade.leverage * (parseFloat(signal.perc) / 100);
      const nextProg = tradesInLevel + 1;
      if (nextProg >= neededTrades && level < 10) {
        setLevel(l => l + 1); setTradesInLevel(0); setLvlUpModal(true);
      } else { setTradesInLevel(nextProg); }
    } else {
      pnl = -(activeTrade.amount * activeTrade.leverage * (isCorrectDex ? 0.02 : 0.06));
    }
    setBalance(b => b + activeTrade.amount + pnl);
    setResult({ win: isWin, val: Math.abs(pnl).toFixed(2), reason: !isCorrectDex ? "НЕВЕРНАЯ БИРЖА ПРОДАЖИ" : "" });
    setIsSyncing(false); setActiveTrade(null); setSignal(null); setSelectedDex(null);
  };

  const handleGlobalClick = (e) => {
    if (soundEnabled && clickSound.current) {
      clickSound.current.currentTime = 0;
      clickSound.current.play().catch(() => {});
    }
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) || 0;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) || 0;
    if (x) {
      const id = Date.now();
      setClicks(prev => [...prev, { id, x, y }]);
      setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 600);
    }
  };

  return (
    <div onPointerDown={handleGlobalClick} style={{width:'100vw', height:'100dvh', background:'#000', color:'#fff', fontFamily:'sans-serif', overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <style>{`
        .card { background:#0a0a0a; border:1px solid #00f2ff; border-radius:12px; padding:12px; margin-bottom:10px; }
        .neon { color:#00f2ff; text-shadow:0 0 10px #00f2ff; }
        .btn { width:100%; padding:15px; border-radius:10px; border:none; font-weight:bold; cursor:pointer; text-transform:uppercase; }
        .dollar { position: absolute; color: #00ff88; font-weight: 900; pointer-events: none; animation: pop 0.6s forwards; z-index: 9999; font-size: 28px; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-120px); } }
        input { background: #000; border: 1px solid #333; color: #00f2ff; padding: 8px; border-radius: 5px; text-align: center; width:100%; }
        .locked-coin { opacity: 0.15; filter: grayscale(1); border-color: #1a1a1a; }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      <header style={{padding:15, borderBottom:'1px solid #1a1a1a'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div className="neon" style={{fontSize:22, fontWeight:'bold'}}>${balance.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
            <div style={{fontSize:10, color:'#00f2ff', border:'1px solid #00f2ff', padding:'2px 8px', borderRadius:10}}>LVL {level}</div>
        </div>
        <div style={{marginTop:10}}>
            <div style={{fontSize:8, color:'#555', marginBottom:3}}>ПРОГРЕСС УРОВНЯ ({tradesInLevel}/{neededTrades})</div>
            <div style={{width:'100%', height:3, background:'#111', borderRadius:2}}>
                <div style={{width:`${(tradesInLevel/neededTrades)*100}%`, height:'100%', background:'#00f2ff'}}></div>
            </div>
        </div>
      </header>

      <main style={{flex:1, overflowY:'auto', padding:15, paddingBottom:80}}>
        {tab === 'trade' && (
          <>
            <div className="card" onClick={() => openLink('https://t.me/vladstelin78')} style={{borderColor: '#ffcc00', background: 'rgba(255,204,0,0.1)', textAlign:'center', cursor:'pointer'}}>
              <div style={{fontSize:10, color:'#ffcc00'}}>МЕНЕДЖЕР: @vladstelin78</div>
            </div>

            <div className="card" style={{textAlign:'center', minHeight: 70, display:'flex', alignItems:'center', justifyContent:'center'}}>
                {isAnalyzing ? <span className="neon">АНАЛИЗ РЫНКА...</span> : 
                signal ? (<div>
                    <div style={{fontSize:14, fontWeight:'bold', color:'#00ff88'}}>{signal.coin} +{signal.perc}%</div>
                    <div style={{fontSize:10, color:'#aaa'}}>{signal.buyDex} → {signal.sellDex}</div>
                </div>) : <span>ОЖИДАНИЕ...</span>}
            </div>

            {!selectedDex ? (
              DEX.map(d => <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{cursor:'pointer'}}>{d.name}</div>)
            ) : (
              <div>
                <div onClick={() => setSelectedDex(null)} style={{color:'#00f2ff', marginBottom:10, fontSize:12, cursor:'pointer'}}>← К ТЕРМИНАЛАМ</div>
                <div className="card">
                  <div style={{display:'flex', gap:10, marginBottom:10}}>
                    <div style={{flex:1}}><small style={{fontSize:9}}>СУММА</small><input type="number" disabled={activeTrade} value={amount} onChange={e=>setAmount(Number(e.target.value))} /></div>
                    <div style={{flex:1}}><small style={{fontSize:9}}>ПЛЕЧО (MAX x{getMaxLev()})</small><input type="number" disabled={activeTrade} value={leverage} onChange={e=>{
                      let v = Number(e.target.value); if(v > getMaxLev()) v = getMaxLev(); setLeverage(v);
                    }} /></div>
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:9, padding:'0 5px'}}>
                    <span style={{color:'#00ff88'}}>PROFIT: +${(amount * leverage * (parseFloat(signal?.perc || 0)/100)).toFixed(2)}</span>
                    <span style={{color:'#ff4444'}}>LOSS: -${(amount * leverage * 0.02).toFixed(2)}</span>
                  </div>
                </div>

                {COINS_DATA.map(c => (
                  <div key={c.id} className={`card ${c.lvl > level ? 'locked-coin' : ''}`} style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div><div style={{fontWeight:'bold'}}>{c.id}</div><div style={{fontSize:10, color:'#555'}}>${(c.base + Math.random()*0.1).toFixed(2)}</div></div>
                    {activeTrade?.coinId === c.id ? (
                        <button className="btn" style={{width:90, background:'#ff0055'}} onClick={sellCoin} disabled={isSyncing}>{isSyncing ? `${syncTimer}s` : 'SELL'}</button>
                    ) : (
                        <button className="btn" style={{width:90, background: c.lvl > level ? '#111' : '#00ff88', color:'#000'}} 
                        disabled={c.lvl > level || activeTrade} onClick={() => buyCoin(c.id)}>{c.lvl > level ? `LVL ${c.lvl}` : 'BUY'}</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        {tab === 'mining' && <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}><div onClick={() => setBalance(b => b + 0.20)} style={{width: 200, height: 200, border: '6px solid #00f2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: '#00f2ff', cursor:'pointer'}}>TAP</div></div>}
        
        {tab === 'opts' && <div>
            <div className="card" onClick={() => setSoundEnabled(!soundEnabled)}>ЗВУК: {soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</div>
            <div className="card" onClick={() => openLink('https://t.me/kriptoalians')} style={{color:'#00f2ff', textAlign:'center'}}>КАНАЛ: @KRIPTOALIANS</div>
        </div>}
      </main>

      <nav style={{height:70, display:'flex', background:'#050505', borderTop:'1px solid #1a1a1a'}}>
        {['mining', 'trade', 'opts'].map(t => (
          <div key={t} onClick={() => setTab(t)} style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color: tab===t?'#00f2ff':'#444', fontSize:10, fontWeight:'bold'}}>{t.toUpperCase()}</div>
        ))}
      </nav>

      {lvlUpModal && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.95)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
            <div className="card" style={{width:'100%', textAlign:'center', borderColor:'#00f2ff', padding:40}}>
                <h1 className="neon" style={{fontSize:24}}>LEVEL UP!</h1>
                <p>Открыт новый актив и повышено плечо!</p>
                <button className="btn" style={{background:'#00f2ff', color:'#000', marginTop:20}} onClick={()=>setLvlUpModal(false)}>ВПЕРЕД</button>
            </div>
        </div>
      )}

      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.9)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
            <div className="card" style={{width:'100%', textAlign:'center', borderColor: result.win ? '#00ff88' : '#ff0055'}}>
                <h2 style={{color: result.win ? '#00ff88' : '#ff0055'}}>{result.win ? 'SUCCESS' : 'FAILED'}</h2>
                {result.reason && <div style={{fontSize:10, color:'#aaa', marginBottom:10}}>{result.reason}</div>}
                <h1 className="neon">${result.val}</h1>
                <button className="btn" style={{background:'#fff', color:'#000', marginTop:10}} onClick={()=>setResult(null)}>OK</button>
            </div>
        </div>
      )}
    </div>
  );
}
