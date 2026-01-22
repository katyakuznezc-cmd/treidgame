import React, { useState, useEffect, useRef } from 'react';

// РАСШИРЕННЫЙ СПИСОК МОНЕТ
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [signal, setSignal] = useState(null);
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

  // Генератор сигналов 3-4%
  useEffect(() => {
    if (tab === 'trade' && !signal && !isProcessing) {
      const timer = setTimeout(() => {
        const avail = COINS_DATA.filter(c => c.lvl <= level);
        setSignal({
          coin: avail[Math.floor(Math.random()*avail.length)].id,
          buyDex: DEX[Math.floor(Math.random()*DEX.length)].name,
          sellDex: DEX[Math.floor(Math.random()*DEX.length)].name,
          perc: (Math.random() * (4.0 - 3.0) + 3.0).toFixed(2)
        });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [tab, signal, isProcessing, level]);

  const handleTrade = (coinId) => {
    if (balance < amount || isProcessing) return;
    setBalance(b => b - amount);
    setIsProcessing(true);
    
    setTimeout(() => {
      const isWin = Math.random() < 0.8; // ШАНС 80%
      let pnl;
      if (isWin) {
        pnl = amount * leverage * (parseFloat(signal.perc) / 100);
        if (tradesInLevel + 1 >= neededTrades) {
          setLevel(l => l + 1);
          setTradesInLevel(0);
          setLvlUpModal(true); // Окно нового уровня
        } else {
          setTradesInLevel(t => t + 1);
        }
      } else {
        const lossPerc = (Math.random() * (1.5 - 1.0) + 1.0) / 100; // МИНУС 1.0 - 1.5%
        pnl = -(amount * leverage * lossPerc);
      }
      setBalance(b => b + amount + pnl);
      setResult({ win: isWin, val: Math.abs(pnl).toFixed(2) });
      setIsProcessing(false);
      setSignal(null);
      setSelectedDex(null);
    }, 4000);
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
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      {/* ШАПКА */}
      <header style={{padding:20, borderBottom:'1px solid #1a1a1a'}}>
        <div className="neon" style={{fontSize:28, fontWeight:'bold'}}>${balance.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
        <div style={{marginTop:10}}>
          <div style={{display:'flex', justifyContent:'space-between', fontSize:10, marginBottom:4}}>
            <span>LVL {level} (MAX x{getMaxLev()})</span>
            <span>EXP: {tradesInLevel}/{neededTrades}</span>
          </div>
          <div style={{width:'100%', height:4, background:'#111', borderRadius:2}}>
            <div style={{width:`${(tradesInLevel/neededTrades)*100}%`, height:'100%', background:'#00f2ff', boxShadow:'0 0 8px #00f2ff', transition:'0.3s'}}></div>
          </div>
        </div>
      </header>

      <main style={{flex:1, overflowY:'auto', padding:15, paddingBottom:80}}>
        {tab === 'trade' && (
          <>
            <div className="card" style={{borderColor:'#ffcc00', background:'rgba(255,204,0,0.05)', textAlign:'center'}}>
              <small style={{color:'#ffcc00'}}>VIP SIGNALS BY @vladstelin78</small>
            </div>
            
            {!selectedDex ? (
              <div>
                <div className="card" style={{textAlign:'center', padding:20}}>
                  {signal ? <div>SIGNAL: <span style={{color:'#00ff88'}}>{signal.coin} +{signal.perc}%</span></div> : <span className="neon">SCANNING...</span>}
                </div>
                {DEX.map(d => <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{cursor:'pointer'}}>{d.name} <span style={{float:'right', fontSize:10, color:'#00ff88'}}>ONLINE</span></div>)}
              </div>
            ) : (
              <div>
                <div onClick={() => setSelectedDex(null)} style={{color:'#00f2ff', marginBottom:10, fontSize:12}}>← BACK TO DEX</div>
                <div className="card">
                  <div style={{display:'flex', gap:10}}>
                    <div style={{flex:1}}><small>AMOUNT</small><input style={{width:'100%', background:'#000', border:'1px solid #333', color:'#fff', padding:8}} type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} /></div>
                    <div style={{flex:1}}><small>LEVERAGE</small><input style={{width:'100%', background:'#000', border:'1px solid #333', color:'#fff', padding:8}} type="number" value={leverage} onChange={e=>{
                      let v = Number(e.target.value);
                      if(v > getMaxLev()) v = getMaxLev();
                      setLeverage(v);
                    }} /></div>
                  </div>
                </div>
                {COINS_DATA.map(c => (
                  <div key={c.id} className="card" style={{opacity: c.lvl > level ? 0.3 : 1, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <span>{c.id}</span>
                    <button className="btn" style={{width:100, background: c.lvl > level ? '#1a1a1a' : '#00ff88', color:'#000'}} 
                      disabled={c.lvl > level || isProcessing} onClick={() => handleTrade(c.id)}>
                      {c.lvl > level ? `LVL ${c.lvl}` : (isProcessing ? '...' : 'BUY')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'mining' && (
          <div style={{height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
             <div onClick={() => setBalance(b => b + 0.10)} style={{width: 220, height: 220, border: '8px solid #111', borderTopColor: '#00f2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#00f2ff', fontWeight: 'bold', cursor:'pointer', boxShadow:'0 0 20px rgba(0,242,255,0.1)'}}>TAP</div>
          </div>
        )}

        {tab === 'friends' && (
          <div style={{textAlign:'center', paddingTop:40}}>
            <h1 className="neon" style={{fontSize:48}}>${refCount * 500}</h1>
            <button className="btn" style={{background:'#00f2ff', color:'#000', marginTop:20}} onClick={() => {
              const link = `https://t.me/Kryptoapp_bot?start=${Math.random().toString(36).substr(2,9)}`;
              window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=Join+and+get+$500!`, '_blank');
              setBalance(b => b + 500); setRefCount(r => r + 1);
            }}>INVITE FRIEND</button>
          </div>
        )}

        {tab === 'opts' && (
          <div>
            <div className="card" onClick={() => setSoundEnabled(!soundEnabled)}>SOUND: {soundEnabled ? 'ON' : 'OFF'}</div>
            <div className="card" onClick={() => window.open('https://t.me/kriptoalians')} style={{color:'#ffcc00', textAlign:'center', fontWeight:'bold'}}>@KRIPTOALIANS</div>
          </div>
        )}
      </main>

      {/* НАВИГАЦИЯ */}
      <nav style={{height:70, position:'fixed', bottom:0, width:'100%', display:'flex', background:'#050505', borderTop:'1px solid #1a1a1a'}}>
        {['mining', 'trade', 'friends', 'opts'].map(t => (
          <div key={t} onClick={() => setTab(t)} style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color: tab===t?'#00f2ff':'#444', fontSize:10, fontWeight:'bold'}}>{t.toUpperCase()}</div>
        ))}
      </nav>

      {/* МОДАЛКА РЕЗУЛЬТАТА */}
      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.9)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
            <div className="card" style={{width:'100%', textAlign:'center', borderColor: result.win ? '#00ff88' : '#ff0055'}}>
                <h2 style={{color: result.win ? '#00ff88' : '#ff0055'}}>{result.win ? 'PROFIT' : 'LOSS'}</h2>
                <h1 className="neon">${result.val}</h1>
                <button className="btn" style={{background:'#fff', color:'#000'}} onClick={()=>setResult(null)}>CONTINUE</button>
            </div>
        </div>
      )}

      {/* МОДАЛКА НОВОГО УРОВНЯ */}
      {lvlUpModal && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.95)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
            <div className="card" style={{width:'100%', textAlign:'center', borderColor:'#00f2ff', padding:40}}>
                <h1 className="neon">LEVEL UP!</h1>
                <p>Теперь доступно плечо: <span style={{color:'#00ff88'}}>x{getMaxLev()}</span></p>
                <p style={{fontSize:12, color:'#666'}}>Разблокированы новые активы!</p>
                <button className="btn" style={{background:'#00f2ff', color:'#000', marginTop:20}} onClick={()=>setLvlUpModal(false)}>LET'S GO</button>
            </div>
        </div>
      )}
    </div>
  );
}
