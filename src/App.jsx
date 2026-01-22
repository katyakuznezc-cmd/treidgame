import React, { useState, useEffect, useRef } from 'react';

const COINS_DATA = [
  { id: 'TON', base: 5.42, lvl: 1 }, { id: 'DOGE', base: 0.15, lvl: 1 }, 
  { id: 'NEAR', base: 6.12, lvl: 1 }, { id: 'TRX', base: 0.11, lvl: 1 },
  { id: 'SOL', base: 145.30, lvl: 2 }, { id: 'ETH', base: 2640, lvl: 2 }, 
  { id: 'XRP', base: 0.62, lvl: 2 }, { id: 'ADA', base: 0.45, lvl: 2 },
  { id: 'BTC', base: 96200, lvl: 3 }, { id: 'BNB', base: 590, lvl: 3 }, 
  { id: 'AVAX', base: 34.20, lvl: 3 }, { id: 'PEPE', base: 0.000008, lvl: 3 }
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
  const neededTrades = level === 1 ? 15 : level === 2 ? 35 : 75;
  const getMaxLev = () => level === 1 ? 10 : level === 2 ? 25 : level === 3 ? 50 : 100;

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
          perc: (Math.random() * (4.0 - 3.0) + 3.0).toFixed(2)
        });
        setIsAnalyzing(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [tab, signal, activeTrade, isSyncing, level]);

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
        if (prev <= 1) {
          clearInterval(itv);
          finalizeTrade();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const finalizeTrade = () => {
    const isCorrectDex = selectedDex === signal.sellDex;
    const luck = Math.random() < 0.85; // 85% шанс на успех при правильной бирже
    const isWin = isCorrectDex && luck;

    let pnl;
    if (isWin) {
      pnl = activeTrade.amount * activeTrade.leverage * (parseFloat(signal.perc) / 100);
      if (tradesInLevel + 1 >= neededTrades) {
        setLevel(l => l + 1); setTradesInLevel(0); setLvlUpModal(true);
      } else { setTradesInLevel(t => t + 1); }
    } else {
      // Если биржа неверная — убыток фиксированный и крупный
      const lossPerc = isCorrectDex ? (Math.random() * 0.5 + 1.0) : 3.5;
      pnl = -(activeTrade.amount * activeTrade.leverage * (lossPerc / 100));
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
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    if (x) {
      const id = Date.now();
      setClicks(prev => [...prev, { id, x, y }]);
      setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 600);
    }
  };

  return (
    <div onPointerDown={handleGlobalClick} style={{width:'100vw', height:'100dvh', background:'#000', color:'#fff', fontFamily:'sans-serif', overflow:'hidden', display:'flex', flexDirection:'column', position:'relative'}}>
      <style>{`
        .card { background:#0a0a0a; border:1px solid #00f2ff; border-radius:12px; padding:12px; margin-bottom:10px; transition: 0.2s; }
        .neon { color:#00f2ff; text-shadow:0 0 10px #00f2ff; }
        .btn { width:100%; padding:15px; border-radius:10px; border:none; font-weight:bold; cursor:pointer; text-transform:uppercase; }
        .dollar { position: absolute; color: #00ff88; font-weight: 900; pointer-events: none; animation: pop 0.6s forwards; z-index: 9999; font-size: 28px; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-120px); } }
        input { background: #000; border: 1px solid #333; color: #00f2ff; padding: 8px; border-radius: 5px; text-align: center; width:100%; }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      <header style={{padding:15, borderBottom:'1px solid #1a1a1a'}}>
        <div className="neon" style={{fontSize:24, fontWeight:'bold'}}>${balance.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
        <div style={{width:'100%', height:4, background:'#111', borderRadius:2, marginTop:10}}>
          <div style={{width:`${(tradesInLevel/neededTrades)*100}%`, height:'100%', background:'#00f2ff', boxShadow:'0 0 8px #00f2ff'}}></div>
        </div>
      </header>

      <main style={{flex:1, overflowY:'auto', padding:15, paddingBottom:80}}>
        {tab === 'trade' && (
          <>
            <div className="card" style={{borderColor: '#ffcc00', background: 'rgba(255,204,0,0.05)', textAlign:'center'}}>
              <div style={{fontSize:10, color:'#ffcc00'}}>VIP ACADEMY - Manager: @vladstelin78</div>
            </div>

            <div className="card" style={{textAlign:'center', minHeight: 70, display:'flex', alignItems:'center', justifyContent:'center'}}>
                {isAnalyzing ? <span className="neon">SCANNING LIQUIDITY...</span> : 
                signal ? (<div>
                    <div style={{fontSize:14, fontWeight:'bold', color:'#00ff88'}}>{signal.coin} +{signal.perc}%</div>
                    <div style={{fontSize:10, color:'#aaa'}}>BUY: <span style={{color: activeTrade ? '#444' : '#00f2ff'}}>{signal.buyDex}</span> → SELL: <span style={{color:'#00f2ff'}}>{signal.sellDex}</span></div>
                    {activeTrade && <div style={{fontSize:9, color:'#ffcc00', marginTop:5}}>ОРДЕР ВЫПОЛНЕН. НАЙДИТЕ БИРЖУ ДЛЯ ПРОДАЖИ!</div>}
                </div>) : <span>WAITING...</span>}
            </div>

            {!selectedDex ? (
              DEX.map(d => (
                <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{cursor:'pointer'}}>
                  {d.name} <span style={{float:'right', fontSize:10, color:'#222'}}>CONNECTED</span>
                </div>
              ))
            ) : (
              <div>
                <div onClick={() => setSelectedDex(null)} style={{color:'#00f2ff', marginBottom:10, fontSize:12, cursor:'pointer'}}>← ВЕРНУТЬСЯ К СПИСКУ БИРЖ</div>
                
                <div className="card">
                  <div style={{display:'flex', gap:10, marginBottom:10}}>
                    <div style={{flex:1}}><small style={{fontSize:9, color:'#666'}}>SUM ($)</small><input type="number" disabled={activeTrade} value={amount} onChange={e=>setAmount(Number(e.target.value))} /></div>
                    <div style={{flex:1}}><small style={{fontSize:9, color:'#666'}}>LEV (MAX x{getMaxLev()})</small><input type="number" disabled={activeTrade} value={leverage} onChange={e=>{
                      let v = Number(e.target.value); if(v > getMaxLev()) v = getMaxLev(); setLeverage(v);
                    }} /></div>
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:9}}>
                    <span style={{color:'#00ff88'}}>PROFIT: +${(amount * leverage * (parseFloat(signal?.perc || 0)/100)).toFixed(2)}</span>
                    <span style={{color:'#ff4444'}}>RISK: -${(amount * leverage * 0.015).toFixed(2)}</span>
                  </div>
                </div>

                {COINS_DATA.map(c => (
                  <div key={c.id} className="card" style={{opacity: c.lvl > level ? 0.3 : 1, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div>
                        <div style={{fontWeight:'bold'}}>{c.id}</div>
                        <div style={{fontSize:10, color:'#555'}}>${(c.base + (Math.random()*0.05)).toFixed(2)}</div>
                    </div>
                    {activeTrade?.coinId === c.id ? (
                        <button className="btn" style={{width:90, background:'#ff0055'}} onClick={sellCoin} disabled={isSyncing}>
                           {isSyncing ? `${syncTimer}s` : 'SELL'}
                        </button>
                    ) : (
                        <button className="btn" style={{width:90, background: c.lvl > level ? '#1a1a1a' : '#00ff88', color:'#000'}} 
                        disabled={c.lvl > level || activeTrade} onClick={() => buyCoin(c.id)}>
                        {c.lvl > level ? `LVL ${c.lvl}` : 'BUY'}
                        </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {tab === 'mining' && <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}><div onClick={() => setBalance(b => b + 0.15)} style={{width: 200, height: 200, border: '6px solid #00f2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: '#00f2ff', cursor:'pointer'}}>TAP</div></div>}
        {tab === 'opts' && <div><div className="card" onClick={() => setSoundEnabled(!soundEnabled)}>SOUND: {soundEnabled ? 'ON' : 'OFF'}</div><div className="card" onClick={() => window.open('https://t.me/kriptoalians')} style={{color:'#ffcc00', textAlign:'center'}}>@KRIPTOALIANS</div></div>}
      </main>

      <nav style={{height:70, display:'flex', background:'#050505', borderTop:'1px solid #1a1a1a'}}>
        {['mining', 'trade', 'opts'].map(t => (
          <div key={t} onClick={() => setTab(t)} style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color: tab===t?'#00f2ff':'#444', fontSize:10, fontWeight:'bold'}}>{t.toUpperCase()}</div>
        ))}
      </nav>

      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.9)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
            <div className="card" style={{width:'100%', textAlign:'center', borderColor: result.win ? '#00ff88' : '#ff0055'}}>
                <h2 style={{color: result.win ? '#00ff88' : '#ff0055'}}>{result.win ? 'УСПЕХ' : 'ОШИБКА'}</h2>
                <div style={{fontSize:10, color:'#aaa', marginBottom:10}}>{result.reason}</div>
                <h1 className="neon">${result.val}</h1>
                <button className="btn" style={{background:'#fff', color:'#000'}} onClick={()=>setResult(null)}>OK</button>
            </div>
        </div>
      )}
    </div>
  );
}
