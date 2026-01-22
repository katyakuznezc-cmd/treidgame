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

  // Калькулятор профита
  const calcProfit = () => {
    if (!signal) return "0.00";
    const p = (amount * leverage * (parseFloat(signal.perc) / 100)).toFixed(2);
    return p;
  };

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
      pnl = parseFloat(calcProfit());
      const nextProg = tradesInLevel + 1;
      if (nextProg >= neededTrades && level < 12) {
        setLevel(l => l + 1); setTradesInLevel(0); setLvlUpModal(true);
      } else { setTradesInLevel(nextProg); }
    } else {
      pnl = -(activeTrade.amount * activeTrade.leverage * (isCorrectDex ? 0.02 : 0.08));
    }
    setBalance(b => b + activeTrade.amount + pnl);
    setResult({ win: isWin, val: Math.abs(pnl).toFixed(2), reason: !isCorrectDex ? "НЕВЕРНАЯ БИРЖА" : "" });
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
    <div onPointerDown={handleGlobalClick} style={{width:'100vw', height:'100dvh', background:'#000', color:'#fff', fontFamily:'sans-serif', overflow:'hidden', display:'flex', flexDirection:'column', position:'relative'}}>
      <style>{`
        .card { background:#0a0a0a; border:1px solid #00f2ff; border-radius:12px; padding:12px; margin-bottom:10px; }
        .neon { color:#00f2ff; text-shadow:0 0 10px #00f2ff; }
        .btn { width:100%; padding:15px; border-radius:10px; border:none; font-weight:bold; cursor:pointer; text-transform:uppercase; transition: 0.2s; }
        .dollar { position: absolute; color: #00ff88; font-weight: 900; pointer-events: none; animation: pop 0.6s forwards; z-index: 9999; font-size: 28px; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-120px); } }
        input { background: #000; border: 1px solid #333; color: #00f2ff; padding: 10px; border-radius: 8px; text-align: center; width:100%; font-size: 16px; }
        
        .coin-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 1px solid #111; }
        .locked-row { background: rgba(10, 10, 10, 0.8); }
        
        .progress-container { width: 100%; height: 8px; background: #111; border-radius: 4px; overflow: hidden; margin-top: 6px; border: 1px solid #222; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #0088ff, #00f2ff); boxShadow: 0 0 10px #00f2ff; transition: width 0.4s ease; }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      <header style={{padding:15, borderBottom:'1px solid #1a1a1a', background: '#050505'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div className="neon" style={{fontSize:24, fontWeight:'bold'}}>${balance.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
            <div style={{background:'#00f2ff', color:'#000', padding:'3px 10px', borderRadius:12, fontSize:10, fontWeight:'900'}}>LVL {level}</div>
        </div>
        <div style={{marginTop:12}}>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:10, fontWeight:'bold', marginBottom:4}}>
                <span style={{color:'#aaa'}}>ПРОГРЕСС ДО LVL {level + 1}</span>
                <span className="neon">{tradesInLevel} / {neededTrades} TRADES</span>
            </div>
            <div className="progress-container">
                <div className="progress-fill" style={{width: `${(tradesInLevel/neededTrades)*100}%`}}></div>
            </div>
        </div>
      </header>

      <main style={{flex:1, overflowY:'auto', padding:15, paddingBottom:80}}>
        {tab === 'trade' && (
          <>
            <div className="card" onClick={() => openLink('https://t.me/vladstelin78')} style={{borderColor: '#ffcc00', background: 'rgba(255,204,0,0.1)', textAlign:'center', cursor:'pointer', padding: 8}}>
              <div style={{fontSize:11, color:'#ffcc00', fontWeight:'bold'}}>SUPPORT: @vladstelin78</div>
            </div>

            <div className="card" style={{textAlign:'center', minHeight: 80, display:'flex', alignItems:'center', justifyContent:'center', background: '#080808'}}>
                {isAnalyzing ? <div className="neon" style={{fontSize:12}}>АНАЛИЗ РЫНКА...</div> : 
                signal ? (<div>
                    <div style={{fontSize:18, fontWeight:'bold', color:'#00ff88'}}>{signal.coin} <span style={{fontSize:12}}>+{signal.perc}%</span></div>
                    <div style={{fontSize:11, color:'#aaa', marginTop:4}}>{signal.buyDex} <span style={{color:'#555'}}>→</span> {signal.sellDex}</div>
                </div>) : <div style={{color:'#444'}}>ПОИСК СИГНАЛА...</div>}
            </div>

            {!selectedDex ? (
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                {DEX.map(d => (
                   <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{cursor:'pointer', margin:0, textAlign:'center', padding:'20px 10px'}}>
                      <div style={{fontSize:14, fontWeight:'bold'}}>{d.name}</div>
                      <div style={{fontSize:8, color:'#00ff88', marginTop:5}}>LIVE</div>
                   </div>
                ))}
              </div>
            ) : (
              <div>
                <div onClick={() => setSelectedDex(null)} style={{color:'#00f2ff', marginBottom:12, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center'}}>
                   <span style={{marginRight:5}}>←</span> НАЗАД К БИРЖАМ
                </div>
                
                {/* КАЛЬКУЛЯТОР */}
                <div className="card" style={{background: '#000'}}>
                  <div style={{display:'flex', gap:10, marginBottom:10}}>
                    <div style={{flex:1}}><small style={{fontSize:9, color:'#555'}}>SUM ($)</small><input type="number" disabled={activeTrade} value={amount} onChange={e=>setAmount(Number(e.target.value))} /></div>
                    <div style={{flex:1}}><small style={{fontSize:9, color:'#555'}}>LEV (MAX x{getMaxLev()})</small><input type="number" disabled={activeTrade} value={leverage} onChange={e=>{
                      let v = Number(e.target.value); if(v > getMaxLev()) v = getMaxLev(); setLeverage(v);
                    }} /></div>
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between', padding: '0 5px'}}>
                      <div style={{fontSize:10, color:'#aaa'}}>ОЖИДАЕМАЯ ПРИБЫЛЬ:</div>
                      <div style={{fontSize:10, color:'#00ff88', fontWeight:'bold'}}>+${calcProfit()}</div>
                  </div>
                </div>

                <div className="card" style={{padding:0, overflow:'hidden'}}>
                  {COINS_DATA.map(c => {
                    const isLocked = c.lvl > level;
                    return (
                      <div key={c.id} className={`coin-row ${isLocked ? 'locked-row' : ''}`}>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:'bold', fontSize:14, color: isLocked ? '#333' : '#fff'}}>{c.id}</div>
                          <div style={{fontSize:11, color: isLocked ? '#222' : '#00f2ff'}}>${c.base.toFixed(2)}</div>
                        </div>
                        
                        <div style={{width: 110}}>
                          {activeTrade?.coinId === c.id ? (
                            <button className="btn" style={{padding: '10px', background:'#ff0055', fontSize:11}} onClick={sellCoin} disabled={isSyncing}>
                               {isSyncing ? `${syncTimer}S` : 'SELL NOW'}
                            </button>
                          ) : (
                            <button className="btn" 
                              style={{
                                padding: '10px', 
                                background: isLocked ? '#0a0a0a' : '#00ff88', 
                                color: isLocked ? '#222' : '#000',
                                fontSize: 10,
                                border: isLocked ? '1px solid #1a1a1a' : 'none'
                              }} 
                              disabled={isLocked || activeTrade} 
                              onClick={() => buyCoin(c.id)}
                            >
                              {isLocked ? `🔒 LVL ${c.lvl}` : 'BUY'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
        
        {tab === 'mining' && <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}><div onClick={() => setBalance(b => b + 0.25)} style={{width: 220, height: 220, border: '8px solid #00f2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#00f2ff', cursor:'pointer', fontWeight:'900', boxShadow:'0 0 20px rgba(0,242,255,0.2)'}}>TAP</div></div>}
        
        {tab === 'opts' && <div>
            <div className="card" onClick={() => setSoundEnabled(!soundEnabled)} style={{cursor:'pointer'}}>ЗВУК: {soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</div>
            <div className="card" onClick={() => openLink('https://t.me/kriptoalians')} style={{color:'#00f2ff', textAlign:'center', cursor:'pointer'}}>КАНАЛ: @KRIPTOALIANS</div>
        </div>}
      </main>

      <nav style={{height:75, display:'flex', background:'#050505', borderTop:'1px solid #1a1a1a', paddingBottom: 10}}>
        {['mining', 'trade', 'opts'].map(t => (
          <div key={t} onClick={() => setTab(t)} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color: tab===t?'#00f2ff':'#444', fontSize:10, fontWeight:'bold'}}>
            <div style={{fontSize:16, marginBottom:2}}>{t === 'mining' ? '⛏️' : t === 'trade' ? '📈' : '⚙️'}</div>
            {t === 'mining' ? 'ФАРМ' : t === 'trade' ? 'БИРЖА' : 'ОПЦИИ'}
          </div>
        ))}
      </nav>

      {/* Модалки */}
      {lvlUpModal && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.95)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
            <div className="card" style={{width:'100%', textAlign:'center', borderColor:'#00f2ff', padding:40}}>
                <div style={{fontSize:50, marginBottom:10}}>🚀</div>
                <h1 className="neon" style={{fontSize:28, margin:0}}>LEVEL UP!</h1>
                <p style={{color:'#aaa', fontSize:14, marginTop:10}}>Вы открыли новый актив и увеличили макс. плечо до x{getMaxLev()}!</p>
                <button className="btn" style={{background:'#00f2ff', color:'#000', marginTop:20}} onClick={()=>setLvlUpModal(false)}>ПОНЯТНО</button>
            </div>
        </div>
      )}

      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.9)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
            <div className="card" style={{width:'100%', textAlign:'center', borderColor: result.win ? '#00ff88' : '#ff0055', background:'#000'}}>
                <h2 style={{color: result.win ? '#00ff88' : '#ff0055', margin:0}}>{result.win ? 'СДЕЛКА УСПЕШНА' : 'СДЕЛКА ЗАКРЫТА'}</h2>
                {result.reason && <div style={{fontSize:10, color:'#ff4444', marginTop:5}}>{result.reason}</div>}
                <h1 className="neon" style={{fontSize:36, margin:'10px 0'}}>${result.val}</h1>
                <button className="btn" style={{background:'#fff', color:'#000'}} onClick={()=>setResult(null)}>ОК</button>
            </div>
        </div>
      )}
    </div>
  );
}
