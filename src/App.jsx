import React, { useState, useEffect, useRef } from 'react';

// Тот же массив данных
const COINS_DATA = [{ id: 'TON', base: 5.42, lvl: 1 }, { id: 'DOGE', base: 0.15, lvl: 1 }, { id: 'SOL', base: 145.30, lvl: 2 }, { id: 'BTC', base: 95400, lvl: 3 }, { id: 'ETH', base: 2600, lvl: 2 }, { id: 'NEAR', base: 6.12, lvl: 1 }];
const DEX = [{ id: '1INCH', name: '1INCH' }, { id: 'UNISWAP', name: 'UNISWAP' }, { id: 'PANCAKE', name: 'PANCAKE' }, { id: 'RAYDIUM', name: 'RAYDIUM' }];

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('st_lang') || 'RU');
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('st_bal')) || 1000.00);
  const [level, setLevel] = useState(() => Number(localStorage.getItem('st_lvl')) || 1);
  const [tab, setTab] = useState('trade');
  const [isProcessing, setIsProcessing] = useState(false);
  const [netTimer, setNetTimer] = useState(null);
  const [activePos, setActivePos] = useState(null);
  const [selectedDex, setSelectedDex] = useState(null);
  const [admCount, setAdmCount] = useState(0);
  const [showAdm, setShowAdm] = useState(false);
  const [passInp, setPassInp] = useState('');
  const [newBal, setNewBal] = useState('');
  const [clicks, setClicks] = useState([]);

  // Фикс мультитапа: Реф-замок
  const hardLock = useRef(false);

  useEffect(() => {
    localStorage.setItem('st_bal', balance.toFixed(2));
    localStorage.setItem('st_lvl', level);
  }, [balance, level]);

  const handleAction = (e) => {
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    if (x && y) {
      const id = Date.now();
      setClicks(prev => [...prev, { id, x, y }]);
      setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 600);
    }
  };

  const sellPos = () => {
    if (hardLock.current) return; // Если замок закрыт, код вообще не идет дальше
    hardLock.current = true;
    setIsProcessing(true);
    
    setNetTimer(5);
    const itv = setInterval(() => {
      setNetTimer(p => {
        if (p <= 1) {
          clearInterval(itv);
          setBalance(b => b + 100); // Для теста просто +100
          setActivePos(null);
          setIsProcessing(false);
          hardLock.current = false; // Открываем замок
          return null;
        }
        return p - 1;
      });
    }, 1000);
  };

  return (
    <div onPointerDown={handleAction} style={{width:'100vw', height:'100dvh', background:'#000', color:'#fff', fontFamily:'sans-serif', overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <style>{`
        .btn { width:100%; padding:15px; border-radius:10px; border:none; font-weight:bold; cursor:pointer; background:#7000ff; color:#fff; margin-top:10px; }
        .card { background:#111; border:1px solid #333; padding:15px; border-radius:12px; margin:10px; }
        .dollar { position: absolute; color: #00ff88; font-weight: 900; pointer-events: none; animation: pop 0.6s forwards; z-index: 999; font-size: 24px; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-100px); } }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x, top: c.y}}>$</div>)}

      {/* АДМИНКА ПОВЕРХ ВСЕГО */}
      {showAdm && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.9)', z-index:10000, padding:20}}>
          <h3>ADMIN PANEL</h3>
          <input type="number" value={newBal} onChange={e=>setNewBal(e.target.value)} placeholder="NEW BALANCE" style={{width:'100%', padding:10}} />
          <button className="btn" onClick={()=>{setBalance(Number(newBal)); setShowAdm(false); setAdmCount(0);}}>SET BALANCE</button>
          <button className="btn" style={{background:'#333'}} onClick={()=>setShowAdm(false)}>CLOSE</button>
        </div>
      )}

      <header style={{padding:20, borderBottom:'1px solid #222'}}>
        <div style={{fontSize:12, color:'#666'}}>ST-ID: {Math.floor(Math.random()*1000)}</div>
        <div style={{fontSize:32, fontWeight:'bold', color:'#00f2ff'}}>${balance.toFixed(2)}</div>
      </header>

      <main style={{flex:1, overflowY:'auto'}}>
        {tab === 'trade' && (
          <div className="card">
            <h3>BTC/USDT</h3>
            {activePos ? (
              isProcessing ? (
                <div style={{padding:15, textAlign:'center', color:'#555'}}>СИНХРОНИЗАЦИЯ {netTimer}s...</div>
              ) : (
                <button className="btn" style={{background:'#ff0055'}} onClick={sellPos}>ЗАКРЫТЬ СДЕЛКУ</button>
              )
            ) : (
              <button className="btn" style={{background:'#00ff88', color:'#000'}} onClick={()=>setActivePos(true)}>ОТКРЫТЬ СДЕЛКУ</button>
            )}
          </div>
        )}

        {tab === 'opts' && (
          <div>
            <h2 onClick={() => {
              if (admCount + 1 >= 5) {
                const p = prompt("CODE:");
                if (p === '2026') setShowAdm(true);
                else setAdmCount(0);
              } else setAdmCount(admCount + 1);
            }} style={{textAlign:'center', color:'#7000ff'}}>ОПЦИИ (V.2.0)</h2>
            <div className="card">Язык: {lang}</div>
            <div className="card" onClick={() => window.open('https://t.me/kriptoalians')}>Creator: @kriptoalians</div>
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
