import React, { useState, useEffect, useRef } from 'react';

const COINS_DATA = [
  { id: 'TON', base: 5.42, lvl: 1 },
  { id: 'DOGE', base: 0.15, lvl: 1 },
  { id: 'SOL', base: 145.30, lvl: 2 },
  { id: 'BTC', base: 95400, lvl: 3 },
  { id: 'ETH', base: 2600, lvl: 2 },
  { id: 'NEAR', base: 6.12, lvl: 1 }
];

export default function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('st_bal')) || 1000.00);
  const [level, setLevel] = useState(() => Number(localStorage.getItem('st_lvl')) || 1);
  const [tab, setTab] = useState('trade');
  const [isProcessing, setIsProcessing] = useState(false);
  const [netTimer, setNetTimer] = useState(null);
  const [activePos, setActivePos] = useState(null);
  const [admCount, setAdmCount] = useState(0);
  const [showAdm, setShowAdm] = useState(false);
  const [newBal, setNewBal] = useState('');
  const [clicks, setClicks] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const hardLock = useRef(false);
  // Реф для звука, чтобы он загружался один раз
  const clickSound = useRef(null);

  useEffect(() => {
    // Инициализация звука
    clickSound.current = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
    clickSound.current.volume = 0.1;
    
    localStorage.setItem('st_bal', balance.toFixed(2));
    localStorage.setItem('st_lvl', level);
  }, [balance, level]);

  const handleAction = (e) => {
    // Проигрывание звука при клике
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

  const sellPos = (e) => {
    if (e) e.stopPropagation();
    if (hardLock.current || isProcessing) return;
    
    hardLock.current = true;
    setIsProcessing(true);
    
    setNetTimer(5);
    const itv = setInterval(() => {
      setNetTimer(p => {
        if (p <= 1) {
          clearInterval(itv);
          setBalance(b => b + 100); 
          setActivePos(null);
          setIsProcessing(false);
          hardLock.current = false;
          return null;
        }
        return p - 1;
      });
    }, 1000);
  };

  return (
    <div onPointerDown={handleAction} style={{width:'100vw', height:'100dvh', background:'#000', color:'#fff', fontFamily:'sans-serif', overflow:'hidden', display:'flex', flexDirection:'column', position:'relative'}}>
      <style>{`
        .btn { width:100%; padding:15px; border-radius:10px; border:none; font-weight:bold; cursor:pointer; background:#7000ff; color:#fff; margin-top:10px; }
        .btn-locked { width:100%; padding:15px; border-radius:10px; background:#1a1a1a; color:#444; text-align:center; border:1px solid #333; margin-top:10px; }
        .card { background:#111; border:1px solid #333; padding:15px; border-radius:12px; margin:10px; }
        .dollar { position: absolute; color: #00ff88; font-weight: 900; pointer-events: none; animation: pop 0.6s forwards; zIndex: 999; font-size: 24px; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-100px); } }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x, top: c.y}}>$</div>)}

      {/* АДМИНКА - ИСПРАВЛЕН zIndex */}
      {showAdm && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.95)', zIndex:10000, padding:20, display:'flex', flexDirection:'column', justifyContent:'center'}}>
          <div className="card">
            <h3>ADMIN PANEL</h3>
            <input 
              type="number" 
              value={newBal} 
              onChange={e => setNewBal(e.target.value)} 
              placeholder="NEW BALANCE" 
              style={{width:'100%', padding:10, background:'#000', border:'1px solid #7000ff', color:'#fff', borderRadius:8, boxSizing:'border-box'}} 
            />
            <button className="btn" onClick={() => { setBalance(Number(newBal)); setShowAdm(false); setAdmCount(0); }}>SET BALANCE</button>
            <button className="btn" style={{background:'#333'}} onClick={() => setShowAdm(false)}>CLOSE</button>
          </div>
        </div>
      )}

      <header style={{padding:20, borderBottom:'1px solid #222'}}>
        <div style={{fontSize:10, color:'#444'}}>WEBAPP V2.2</div>
        <div style={{fontSize:32, fontWeight:'bold', color:'#00f2ff'}}>${balance.toLocaleString()}</div>
      </header>

      <main style={{flex:1, overflowY:'auto'}}>
        {tab === 'trade' && (
          <div className="card">
            <h3 style={{margin:0}}>BTC/USDT</h3>
            {activePos ? (
              isProcessing ? (
                <div className="btn-locked">СИНХРОНИЗАЦИЯ {netTimer}s...</div>
              ) : (
                <button className="btn" style={{background:'#ff0055'}} onPointerDown={sellPos}>ЗАКРЫТЬ СДЕЛКУ</button>
              )
            ) : (
              <button className="btn" style={{background:'#00ff88', color:'#000'}} onPointerDown={() => setActivePos(true)}>ОТКРЫТЬ СДЕЛКУ</button>
            )}
          </div>
        )}

        {tab === 'opts' && (
          <div style={{paddingBottom: 20}}>
            <h2 onClick={() => {
              if (admCount + 1 >= 5) { setShowAdm(true); } else { setAdmCount(admCount + 1); }
            }} style={{textAlign:'center', color:'#7000ff', cursor: 'pointer'}}>ОПЦИИ</h2>
            <div className="card" onClick={() => setSoundEnabled(!soundEnabled)}>Звук: {soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</div>
            <div className="card">Версия: 2.2</div>
            <a href="https://t.me/kriptoalians" style={{textDecoration:'none'}} className="card">
               <div style={{textAlign:'center', color: '#ffcc00'}}>@kriptoalians</div>
            </a>
          </div>
        )}
      </main>

      <nav style={{height:70, display:'flex', background:'#050505', borderTop:'1px solid #222'}}>
        <div onClick={()=>setTab('trade')} style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color: tab==='trade'?'#00f2ff':'#555'}}>TRADE</div>
        <div onClick={()=>setTab('opts')} style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color: tab==='opts'?'#00f2ff':'#555'}}>SETTINGS</div>
      </nav>
    </div>
  );
}
