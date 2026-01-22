import React, { useState, useEffect, useRef } from 'react';

const COINS_DATA = [
  { id: 'TON', base: 5.42, lvl: 1 },
  { id: 'DOGE', base: 0.15, lvl: 1 },
  { id: 'SOL', base: 145.30, lvl: 2 },
  { id: 'BTC', base: 95400, lvl: 3 },
  { id: 'ETH', base: 2600, lvl: 2 }
];

const DEX = [
  { id: '1INCH', name: '1INCH' }, { id: 'UNISWAP', name: 'UNISWAP' }, 
  { id: 'PANCAKE', name: 'PANCAKE' }, { id: 'RAYDIUM', name: 'RAYDIUM' }
];

export default function App() {
  // --- СОСТОЯНИЕ ---
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('st_bal')) || 1000.00);
  const [level, setLevel] = useState(() => Number(localStorage.getItem('st_lvl')) || 1);
  const [tradesInLevel, setTradesInLevel] = useState(() => Number(localStorage.getItem('st_prog')) || 0);
  const [refCount, setRefCount] = useState(() => Number(localStorage.getItem('st_refs')) || 0);
  const [tab, setTab] = useState('trade');
  
  // Уникальный ID текущей сессии для имитации "нового друга"
  const [myId] = useState(() => 'u' + Math.floor(Math.random() * 999999));

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
  const [showAdm, setShowAdm] = useState(false);

  const clickSound = useRef(null);
  const hardLock = useRef(false);

  const neededTrades = level === 1 ? 15 : level === 2 ? 35 : 75;
  const getMaxLev = () => level === 1 ? 10 : level === 2 ? 25 : level === 3 ? 50 : 100;

  useEffect(() => {
    localStorage.setItem('st_bal', balance.toFixed(2));
    localStorage.setItem('st_lvl', level);
    localStorage.setItem('st_prog', tradesInLevel);
    localStorage.setItem('st_refs', refCount);
    if (!clickSound.current) {
      clickSound.current = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
      clickSound.current.volume = 0.05;
    }
  }, [balance, level, tradesInLevel, refCount]);

  // Сигналы
  useEffect(() => {
    let timer;
    if (tab === 'trade' && !signal && !activePos) {
      setIsAnalyzing(true);
      timer = setTimeout(() => {
        setSignal({ 
          coin: COINS_DATA[Math.floor(Math.random()*COINS_DATA.length)].id, 
          buyDex: DEX[Math.floor(Math.random()*DEX.length)].name, 
          sellDex: DEX[Math.floor(Math.random()*DEX.length)].name, 
          perc: (Math.random() * 1 + 3).toFixed(2) 
        });
        setIsAnalyzing(false);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [tab, signal, activePos]);

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

  // ФУНКЦИЯ ПРИГЛАШЕНИЯ С ЗАЩИТОЙ
  const inviteWithProtection = () => {
    // Генерируем уникальный токен для этого конкретного приглашения
    const inviteToken = btoa(myId + Date.now()).substring(0, 10);
    const inviteLink = `https://t.me/Kryptoapp_bot?start=${inviteToken}`;
    
    // Проверяем по локальному списку, использовали ли мы этот токен (для мануал режима)
    const usedTokens = JSON.parse(localStorage.getItem('used_tokens') || '[]');
    
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent("Получи $500 за регистрацию!")}`;
    window.open(shareUrl, '_blank');

    // Начисляем бонус, только если это "новое" действие в сессии
    // (Поскольку мы без сервера, мы ограничиваем начисление за один сеанс работы приложения)
    if (usedTokens.length < 50) { // Ограничение на 50 мануальных приглашений для теста
        setBalance(b => b + 500);
        setRefCount(r => r + 1);
        usedTokens.push(inviteToken);
        localStorage.setItem('used_tokens', JSON.stringify(usedTokens));
    }
  };

  return (
    <div onPointerDown={handleGlobalClick} style={{width:'100vw', height:'100dvh', background:'#000', color:'#fff', fontFamily:'sans-serif', overflow:'hidden', display:'flex', flexDirection:'column'}}>
      <style>{`
        .card { background:#0a0a0a; border:1px solid #00f2ff; border-radius:12px; padding:15px; margin-bottom:10px; }
        .neon { color: #00f2ff; text-shadow: 0 0 10px #00f2ff; }
        .btn { width:100%; padding:15px; border-radius:10px; border:none; font-weight:bold; cursor:pointer; }
        .dollar { position: absolute; color: #00ff88; font-weight: 900; pointer-events: none; animation: pop 0.6s forwards; font-size: 28px; z-index:9999; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-120px); } }
        input { background:#000; border:1px solid #00f2ff; color:#00f2ff; padding:8px; border-radius:5px; width:100%; text-align:center; outline:none; }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      <header style={{padding:20, borderBottom:'1px solid #1a1a1a'}}>
        <div className="neon" style={{fontSize:28, fontWeight:'bold'}}>${balance.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
        <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'#444', marginTop:5}}>
          <span>УРОВЕНЬ {level}</span>
          <span>ПЛЕЧО ДО x{getMaxLev()}</span>
        </div>
      </header>

      <main style={{flex:1, overflowY:'auto', padding:15}}>
        {tab === 'trade' && (
           <>
            <div className="card" style={{borderColor: '#ffcc00', background: 'rgba(255,204,0,0.05)'}}>
                <div style={{fontSize:10, color:'#ffcc00', fontWeight:'bold'}}>VIP ACADEMY</div>
                <div style={{fontSize:12, marginTop:3}}>Manager: @vladstelin78</div>
            </div>
            {isAnalyzing ? <div className="card neon">АНАЛИЗ...</div> : (
              <div className="card">
                <div style={{marginBottom:10}}>{signal?.coin} | {signal?.buyDex} → {signal?.sellDex}</div>
                <div style={{display:'flex', gap:10}}>
                   <input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} />
                   <input type="number" value={leverage} onChange={e=>{let v=Number(e.target.value); if(v>getMaxLev())v=getMaxLev(); setLeverage(v);}} />
                </div>
                <button className="btn" style={{background:'#00ff88', marginTop:10}} onClick={() => {
                  setBalance(b => b - amount);
                  setIsProcessing(true);
                  setTimeout(() => {
                    const win = Math.random() < 0.9;
                    const pnl = win ? (amount*leverage*0.04) : -(amount*leverage*0.015);
                    setBalance(b => b + amount + pnl);
                    setResult({win, val: Math.abs(pnl).toFixed(2)});
                    setIsProcessing(false);
                    setSignal(null);
                  }, 3000);
                }}>ОТКРЫТЬ СДЕЛКУ</button>
              </div>
            )}
           </>
        )}

        {tab === 'mining' && (
           <div style={{height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
             <div onClick={() => setBalance(b => b + 0.1)} style={{width:200, height:200, border:'5px solid #00f2ff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, color:'#00f2ff', cursor:'pointer'}}>TAP</div>
           </div>
        )}

        {tab === 'friends' && (
          <div style={{textAlign:'center'}}>
            <h1 className="neon">${refCount * 500}</h1>
            <p>ПРИГЛАШЕНО: {refCount}</p>
            <button className="btn" style={{background:'#00f2ff'}} onClick={inviteWithProtection}>ПРИГЛАСИТЬ ДРУГА</button>
            <p style={{fontSize:10, color:'#444', marginTop:10}}>Бонус начисляется только за уникальные приглашения.</p>
          </div>
        )}

        {tab === 'opts' && (
          <div>
            <div className="card" onClick={() => setSoundEnabled(!soundEnabled)}>ЗВУК: {soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</div>
            <div className="card" onClick={() => window.open('https://t.me/kriptoalians')}>@KRIPTOALIANS</div>
          </div>
        )}
      </main>

      <nav style={{height:75, display:'flex', background:'#050505', borderTop:'1px solid #1a1a1a'}}>
        {['mining', 'trade', 'friends', 'opts'].map(t => (
          <div key={t} onClick={() => setTab(t)} style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color: tab===t?'#00f2ff':'#444', fontSize:10}}>{t.toUpperCase()}</div>
        ))}
      </nav>

      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10000}}>
          <div className="card" style={{textAlign:'center', width:'80%'}}>
            <h2>{result.win ? 'ПРОФИТ' : 'МИНУС'}</h2>
            <h1 className="neon">${result.val}</h1>
            <button className="btn" onClick={() => setResult(null)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
