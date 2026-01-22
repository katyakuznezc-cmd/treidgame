import React, { useState, useEffect, useRef } from 'react';

const COINS_DATA = [
  { id: 'TON', lvl: 1 }, { id: 'DOGE', lvl: 1 }, { id: 'NEAR', lvl: 1 }, { id: 'TRX', lvl: 1 },
  { id: 'SOL', lvl: 2 }, { id: 'ETH', lvl: 2 }, { id: 'XRP', lvl: 2 }, { id: 'ADA', lvl: 2 },
  { id: 'BTC', lvl: 3 }, { id: 'BNB', lvl: 3 }, { id: 'AVAX', lvl: 3 }, { id: 'PEPE', lvl: 3 }
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
  
  const [activePos, setActivePos] = useState(null); 
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

  // ГЕНЕРАТОР СИГНАЛОВ НА ГЛАВНОМ ЭКРАНЕ
  useEffect(() => {
    let timer;
    if (tab === 'trade' && !signal && !activePos && !isSyncing) {
      setIsAnalyzing(true);
      timer = setTimeout(() => {
        const avail = COINS_DATA.filter(c => c.lvl <= level);
        const coin = avail[Math.floor(Math.random() * avail.length)];
        const bDex = DEX[Math.floor(Math.random() * DEX.length)].name;
        let sDex = DEX[Math.floor(Math.random() * DEX.length)].name;
        while(sDex === bDex) sDex = DEX[Math.floor(Math.random() * DEX.length)].name;

        setSignal({
          coin: coin.id,
          buyDex: bDex,
          sellDex: sDex,
          perc: (Math.random() * (4.0 - 3.0) + 3.0).toFixed(2)
        });
        setIsAnalyzing(false);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [tab, signal, activePos, isSyncing, level]);

  const buyCoin = (id) => {
    if (balance < amount || activePos || isSyncing) return;
    setBalance(b => b - amount);
    setActivePos(id);
  };

  const sellCoin = () => {
    if (!activePos || isSyncing) return;
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
    const isWin = Math.random() < 0.8; 
    let pnl;
    if (isWin) {
      pnl = amount * leverage * (parseFloat(signal.perc) / 100);
      if (tradesInLevel + 1 >= neededTrades) {
        setLevel(l => l + 1); setTradesInLevel(0); setLvlUpModal(true);
      } else { setTradesInLevel(t => t + 1); }
    } else {
      pnl = -(amount * leverage * (Math.random() * 0.005 + 0.01)); 
    }
    setBalance(b => b + amount + pnl);
    setResult({ win: isWin, val: Math.abs(pnl).toFixed(2) });
    setIsSyncing(false); setActivePos(null); setSignal(null); setSelectedDex(null);
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
        .card { background:#0a0a0a; border:1px solid #00f2ff; border-radius:12px; padding:15px; margin-bottom:10px; }
        .neon { color:#00f2ff; text-shadow:0 0 10px #00f2ff; }
        .btn { width:100%; padding:15px; border-radius:10px; border:none; font-weight:bold; cursor:pointer; text-transform:uppercase; }
        .dollar { position: absolute; color: #00ff88; font-weight: 900; pointer-events: none; animation: pop 0.6s forwards; z-index: 9999; font-size: 28px; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-120px); } }
        input { background: #000; border: 1px solid #333; color: #00f2ff; padding: 8px; border-radius: 5px; text-align: center; font-weight: bold; }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      <header style={{padding:20, borderBottom:'1px solid #1a1a1a'}}>
        <div className="neon" style={{fontSize:28, fontWeight:'bold'}}>${balance.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
        <div style={{marginTop:10}}>
          <div style={{display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:4}}>
            <span>LVL {level} (MAX x{getMaxLev()})</span>
            <span>EXP: {tradesInLevel}/{neededTrades}</span>
          </div>
          <div style={{width:'100%', height:4, background:'#111', borderRadius:2}}>
            <div style={{width:`${(tradesInLevel/neededTrades)*100}%`, height:'100%', background:'#00f2ff', boxShadow:'0 0 8px #00f2ff'}}></div>
          </div>
        </div>
      </header>

      <main style={{flex:1, overflowY:'auto', padding:15, paddingBottom:80}}>
        {tab === 'trade' && (
          <>
            {/* БЛОК СИГНАЛА - ВСЕГДА СВЕРХУ */}
            <div className="card" style={{textAlign:'center', minHeight: 80, display:'flex', alignItems:'center', justifyContent:'center'}}>
                {isAnalyzing ? (
                  <span className="neon">АНАЛИЗ РЫНКА...</span>
                ) : signal ? (
                  <div>
                    <div style={{fontSize:16, fontWeight:'bold', color:'#00ff88'}}>{signal.coin} +{signal.perc}%</div>
                    <div style={{fontSize:10, color:'#aaa', marginTop:4}}>{signal.buyDex} → {signal.sellDex}</div>
                  </div>
                ) : <span>ОЖИДАНИЕ...</span>}
            </div>

            {!selectedDex ? (
              <div>
                <div style={{fontSize:11, color:'#444', marginBottom:10, fontWeight:'bold'}}>ВЫБЕРИТЕ ТЕРМИНАЛ:</div>
                {DEX.map(d => (
                  <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{cursor:'pointer'}}>
                    {d.name} <span style={{float:'right', fontSize:10, color:'#00ff88'}}>READY</span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div onClick={() => {if(!activePos) setSelectedDex(null)}} style={{color:'#00f2ff', marginBottom:10, fontSize:12, cursor:'pointer'}}>← К БИРЖАМ</div>
                <div className="card">
                  <div style={{display:'flex', gap:10}}>
                    <div style={{flex:1}}><small style={{fontSize:9}}>СУММА</small><input style={{width:'100%'}} type="number" disabled={activePos} value={amount} onChange={e=>setAmount(Number(e.target.value))} /></div>
                    <div style={{flex:1}}><small style={{fontSize:9}}>ПЛЕЧО</small><input style={{width:'100%'}} type="number" disabled={activePos} value={leverage} onChange={e=>{
                      let v = Number(e.target.value); if(v > getMaxLev()) v = getMaxLev(); setLeverage(v);
                    }} /></div>
                  </div>
                </div>

                {COINS_DATA.map(c => (
                  <div key={c.id} className="card" style={{opacity: c.lvl > level ? 0.3 : 1, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <span>{c.id}</span>
                    {activePos === c.id ? (
                        <button className="btn" style={{width:100, background:'#ff0055'}} onClick={sellCoin} disabled={isSyncing}>
                           {isSyncing ? `${syncTimer}s` : 'SELL'}
                        </button>
                    ) : (
                        <button className="btn" style={{width:100, background: c.lvl > level ? '#1a1a1a' : '#00ff88', color:'#000'}} 
                        disabled={c.lvl > level || activePos} onClick={() => buyCoin(c.id)}>
                        {c.lvl > level ? `LVL ${c.lvl}` : 'BUY'}
                        </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'mining' && (
          <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}>
             <div onClick={() => setBalance(b => b + 0.15)} style={{width: 200, height: 200, border: '6px solid #00f2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: '#00f2ff', cursor:'pointer', fontWeight:'bold'}}>TAP</div>
          </div>
        )}

        {tab === 'opts' && (
          <div>
            <div className="card" onClick={() => setSoundEnabled(!soundEnabled)}>ЗВУК: {soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</div>
            <div className="card" onClick={() => window.open('https://t.me/kriptoalians')} style={{color:'#ffcc00', textAlign:'center'}}>@KRIPTOALIANS</div>
          </div>
        )}
      </main>

      <nav style={{height:70, display:'flex', background:'#050505', borderTop:'1px solid #1a1a1a'}}>
        {['mining', 'trade', 'opts'].map(t => (
          <div key={t} onClick={() => setTab(t)} style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color: tab===t?'#00f2ff':'#444', fontSize:10, fontWeight:'bold'}}>{t === 'mining' ? 'ФАРМ' : t === 'trade' ? 'ТРЕЙД' : 'ОПЦИИ'}</div>
        ))}
      </nav>

      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.9)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
            <div className="card" style={{width:'100%', textAlign:'center', borderColor: result.win ? '#00ff88' : '#ff0055', padding:30}}>
                <h2 style={{color: result.win ? '#00ff88' : '#ff0055'}}>{result.win ? 'SUCCESS' : 'LOSS'}</h2>
                <h1 className="neon">${result.val}</h1>
                <button className="btn" style={{background:'#fff', color:'#000', marginTop:20}} onClick={()=>setResult(null)}>OK</button>
            </div>
        </div>
      )}

      {lvlUpModal && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.95)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
            <div className="card" style={{width:'100%', textAlign:'center', borderColor:'#00f2ff', padding:40}}>
                <h1 className="neon">LEVEL UP!</h1>
                <p>Max Lev: <span style={{color:'#00ff88'}}>x{getMaxLev()}</span></p>
                <button className="btn" style={{background:'#00f2ff', color:'#000', marginTop:20}} onClick={()=>setLvlUpModal(false)}>GO</button>
            </div>
        </div>
      )}
    </div>
  );
}
