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
  // --- СОСТОЯНИЕ (LocalStorage) ---
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('st_bal')) || 1000.00);
  const [level, setLevel] = useState(() => Number(localStorage.getItem('st_lvl')) || 1);
  const [tradesInLevel, setTradesInLevel] = useState(() => Number(localStorage.getItem('st_prog')) || 0);
  const [refCount, setRefCount] = useState(() => Number(localStorage.getItem('st_refs')) || 0);
  const [userId] = useState(() => localStorage.getItem('st_uid') || 'u' + Math.floor(Math.random() * 900000 + 100000));
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
  const getMaxLev = () => level === 1 ? 10 : level === 2 ? 25 : level === 3 ? 50 : 100;

  // --- ЭФФЕКТЫ ---
  useEffect(() => {
    localStorage.setItem('st_uid', userId);
    localStorage.setItem('st_bal', balance.toFixed(2));
    localStorage.setItem('st_lvl', level);
    localStorage.setItem('st_prog', tradesInLevel);
    localStorage.setItem('st_refs', refCount);
    if (!clickSound.current) {
      clickSound.current = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
      clickSound.current.volume = 0.05;
    }
  }, [balance, level, tradesInLevel, refCount, userId]);

  // Генератор сигналов
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
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) || 0;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) || 0;
    if (x > 0) {
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
          const isWin = selectedDex === signal?.sellDex && Math.random() < 0.9;
          let pnl;
          if (isWin) {
            pnl = amount * leverage * (parseFloat(signal?.perc) / 100);
            setTradesInLevel(t => (t + 1 >= neededTrades) ? 0 : t + 1);
            if (tradesInLevel + 1 >= neededTrades) setLevel(l => l + 1);
          } else {
            pnl = -(amount * leverage * (Math.random() * 0.005 + 0.01)); 
          }
          setBalance(b => Math.max(0, b + amount + pnl));
          setResult({ win: isWin, val: Math.abs(pnl).toFixed(2) });
          setActivePos(null); setSignal(null); setIsProcessing(false); hardLock.current = false;
          return null;
        }
        return p - 1;
      });
    }, 1000);
  };

  const inviteFriend = () => {
    const botUsername = "Kryptoapp_bot"; 
    const inviteLink = `https://t.me/${botUsername}?start=${userId}`;
    const text = "Заходи в арбитраж-симулятор и получи $500 бонуса!";
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
    
    window.open(shareUrl, '_blank');
    
    // Имитация зачисления для визуала (в Firebase это будет автоматизировано)
    setBalance(b => b + 500);
    setRefCount(r => r + 1);
  };

  return (
    <div onPointerDown={handleGlobalClick} style={{width:'100vw', height:'100dvh', background:'#000', color:'#fff', fontFamily:'sans-serif', overflow:'hidden', display:'flex', flexDirection:'column', position:'relative'}}>
      <style>{`
        .btn { width:100%; padding:15px; border-radius:10px; border:none; font-weight:bold; cursor:pointer; text-transform:uppercase; transition: 0.2s; }
        .btn:active { transform: scale(0.98); }
        .card { background:#0a0a0a; border:1px solid #00f2ff; border-radius:12px; padding:15px; margin-bottom:10px; }
        .neon { color: #00f2ff; text-shadow: 0 0 10px #00f2ff; }
        .dollar { position: absolute; color: #00ff88; font-weight: 900; pointer-events: none; animation: pop 0.6s forwards; zIndex: 999; font-size: 28px; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-120px); } }
        input { background:#000; border:1px solid #00f2ff; color:#00f2ff; padding:8px; border-radius:5px; width:100%; text-align:center; outline:none; font-weight:bold; }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      {/* HEADER */}
      <header style={{padding:20, borderBottom:'1px solid #1a1a1a'}}>
        <div className="neon" style={{fontSize:28, fontWeight:'bold'}}>${balance.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
        <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'#444', marginTop:5}}>
          <span>LVL {level} (MAX x{getMaxLev()})</span>
          <span>EXP: {tradesInLevel}/{neededTrades}</span>
        </div>
      </header>

      {/* CONTENT */}
      <main style={{flex:1, overflowY:'auto', padding:15}}>
        
        {tab === 'trade' && (
          <>
            <div className="card" style={{borderColor: '#ffcc00', background: 'rgba(255,204,0,0.05)'}}>
                <div style={{fontSize:10, color:'#ffcc00', fontWeight:'bold'}}>VIP ACADEMY</div>
                <div style={{fontSize:12, marginTop:3}}>Менеджер: @vladstelin78</div>
            </div>

            {!selectedDex ? (
              <div>
                <div className="card" style={{textAlign:'center'}}>
                   {isAnalyzing ? <span className="neon">АНАЛИЗ РЫНКА...</span> : 
                   <div>СИГНАЛ: <span style={{color:'#00ff88'}}>{signal.coin} +{signal.perc}%</span><br/><small style={{color:'#444'}}>{signal.buyDex} → {signal.sellDex}</small></div>}
                </div>
                {DEX.map(d => (
                  <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{cursor:'pointer'}}>{d.name} <span style={{float:'right', fontSize:10, color:'#00ff88'}}>LIVE</span></div>
                ))}
              </div>
            ) : (
              <div>
                <div onClick={() => setSelectedDex(null)} style={{color:'#00f2ff', marginBottom:10, fontSize:12, cursor:'pointer'}}>← ТЕРМИНАЛЫ</div>
                <div className="card" style={{background:'#050505'}}>
                    <div style={{display:'flex', gap:10, marginBottom:10}}>
                        <div style={{flex:1}}><label style={{fontSize:9, color:'#444'}}>INVEST ($)</label><input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} /></div>
                        <div style={{flex:1}}><label style={{fontSize:9, color:'#444'}}>LEVERAGE (MAX x{getMaxLev()})</label>
                           <input type="number" value={leverage} onChange={e=>{
                             let v = Number(e.target.value);
                             if(v > getMaxLev()) v = getMaxLev();
                             setLeverage(v);
                           }} />
                        </div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:10, borderTop:'1px solid #1a1a1a', paddingTop:10}}>
                        <span style={{color:'#00ff88'}}>PROFIT: +${(amount*leverage*(parseFloat(signal?.perc || 3.5)/100)).toFixed(2)}</span>
                        <span style={{color:'#ff0055'}}>RISK: -${(amount*leverage*0.015).toFixed(2)}</span>
                    </div>
                </div>
                {COINS_DATA.map(c => (
                  <div key={c.id} className="card" style={{opacity: c.lvl > level ? 0.3 : 1, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <span>{c.id}</span>
                    {activePos?.id === c.id ? (
                      isProcessing ? <div className="neon">{netTimer}s SYNC...</div> : <button className="btn" style={{background:'#ff0055', width:100}} onClick={sellPos}>SELL</button>
                    ) : (
                      <button className="btn" style={{background:'#00ff88', color:'#000', width:100}} disabled={c.lvl > level} onClick={() => {if(balance>=amount){setBalance(b=>b-amount); setActivePos({id:c.id})}}}>BUY</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'mining' && (
          <div style={{height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
             <div onClick={() => setBalance(b => b + 0.10)} style={{width: 220, height: 220, border: '8px solid #111', borderTopColor: '#00f2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#00f2ff', fontWeight: 'bold', cursor:'pointer'}}>TAP</div>
             <p className="neon" style={{marginTop:30}}>MINING LIQUIDITY...</p>
          </div>
        )}

        {tab === 'friends' && (
          <div>
            <div className="card" style={{textAlign:'center', background:'#111', borderColor:'#00ff88', padding: 25}}>
              <h1 style={{margin:0, color:'#00ff88'}}>${(refCount * 500).toLocaleString()}</h1>
              <p style={{fontSize:11, color:'#666', marginTop:5}}>БОНУСЫ ЗА ДРУЗЕЙ</p>
            </div>
            <div className="card">
               <h3 style={{marginTop:0}}>ДРУЗЬЯ: {refCount}</h3>
               <p style={{fontSize:12, color:'#444', lineHeight:'1.5'}}>Приглашайте друзей и получайте мгновенно <span style={{color:'#00ff88'}}>$500</span> на баланс за каждого!</p>
               <button className="btn" style={{background:'#00f2ff', color:'#000', marginTop:10}} onClick={inviteFriend}>ПРИГЛАСИТЬ ДРУГА</button>
            </div>
          </div>
        )}

        {tab === 'opts' && (
          <div>
            <h2 onPointerDown={()=>{setAdmCount(admCount+1); if(admCount+1>=5)setShowAdm(true)}} className="neon" style={{textAlign:'center', cursor:'pointer'}}>OPTIONS</h2>
            <div className="card" onClick={() => setSoundEnabled(!soundEnabled)} style={{cursor:'pointer'}}>SOUND: {soundEnabled ? 'ON' : 'OFF'}</div>
            <div className="card" onClick={() => window.open('https://t.me/kriptoalians')} style={{textAlign:'center', borderColor:'#ffcc00', color:'#ffcc00', cursor:'pointer'}}>@kriptoalians</div>
            <div style={{textAlign:'center', fontSize:9, color:'#222', marginTop:20}}>ID: {userId}</div>
          </div>
        )}

      </main>

      {/* TAB BAR */}
      <nav style={{height:75, display:'flex', background:'#050505', borderTop:'1px solid #1a1a1a'}}>
        {[
          {id:'mining', n:'ФАРМ'},
          {id:'trade', n:'ТРЕЙД'},
          {id:'friends', n:'ДРУЗЬЯ'},
          {id:'opts', n:'ОПЦИИ'}
        ].map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontSize:10, color: tab===t.id?'#00f2ff':'#444', fontWeight:'bold', cursor:'pointer'}}>
            {t.n}
          </div>
        ))}
      </nav>

      {/* MODALS */}
      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.9)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
            <div className="card" style={{width:'100%', textAlign:'center', borderColor: result.win ? '#00ff88' : '#ff0055'}}>
                <h2 style={{color: result.win ? '#00ff88' : '#ff0055'}}>{result.win ? 'SUCCESS' : 'LIQUIDATED'}</h2>
                <h1 className="neon">{result.win ? '+' : '-'}${result.val}</h1>
                <button className="btn" style={{background:'#fff', color:'#000'}} onClick={()=>setResult(null)}>CONTINUE</button>
            </div>
        </div>
      )}
      {showAdm && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.95)', zIndex:10000, padding:20, display:'flex', flexDirection:'column', justifyContent:'center'}}>
          <div className="card">
            <h3 className="neon">ADMIN PANEL</h3>
            <input type="number" placeholder="NEW BALANCE" onChange={e=>setNewBalInp(e.target.value)} />
            <button className="btn" style={{background:'#00ff88', color:'#000', marginTop:10}} onClick={()=>{setBalance(Number(newBalInp)); setShowAdm(false)}}>APPLY</button>
            <button className="btn" style={{background:'#333', marginTop:5}} onClick={()=>setShowAdm(false)}>CLOSE</button>
          </div>
        </div>
      )}
    </div>
  );
}
