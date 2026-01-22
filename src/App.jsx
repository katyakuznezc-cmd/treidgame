import React, { useState, useEffect } from 'react';

const COINS_DATA = [
  { id: 'TON', base: 5.42, lvl: 1 },
  { id: 'DOGE', base: 0.15, lvl: 1 },
  { id: 'SOL', base: 145.30, lvl: 2 },
  { id: 'BTC', base: 95400, lvl: 3 }
];

const DEX = [
  { id: '1INCH', name: '1INCH' }, { id: 'UNISWAP', name: 'UNISWAP' }, 
  { id: 'PANCAKE', name: 'PANCAKE' }, { id: 'RAYDIUM', name: 'RAYDIUM' }
];

const TUTORIAL_STEPS = [
  { target: 'header', text: 'Это твой баланс и ID. Повышай уровень, чтобы открыть новые монеты!' },
  { target: 'mining', text: 'В разделе МАЙНИНГ ты можешь натапать стартовый капитал.' },
  { target: 'trade', text: 'На БИРЖЕ ищи сигналы связок: где купить дешевле и продать дороже.' },
  { target: 'leverage', text: 'Используй плечи, но помни: лимиты растут вместе с твоим уровнем!' }
];

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('bal')) || 1000.00);
  const [level, setLevel] = useState(() => parseInt(localStorage.getItem('lvl')) || 1);
  const [tradesInLevel, setTradesInLevel] = useState(() => parseInt(localStorage.getItem('trades')) || 0);
  const [userId] = useState(() => localStorage.getItem('userId') || `ID-${Math.floor(10000 + Math.random() * 90000)}`);
  const [isFirstTime, setIsFirstTime] = useState(() => !localStorage.getItem('tutorialDone'));

  const [tab, setTab] = useState('trade');
  const [tutorialIdx, setTutorialIdx] = useState(0);
  const [selectedDex, setSelectedDex] = useState(null);
  const [amount, setAmount] = useState(100);
  const [leverage, setLeverage] = useState(5); 
  const [activePos, setActivePos] = useState(null);
  const [netTimer, setNetTimer] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [result, setResult] = useState(null);
  const [showAds, setShowAds] = useState(false);
  const [isBurning, setIsBurning] = useState(false);
  const [clicks, setClicks] = useState([]); 
  const [soundEnabled, setSoundEnabled] = useState(true);

  const maxLev = level === 1 ? 5 : level === 2 ? 20 : level === 3 ? 50 : 100;

  useEffect(() => {
    localStorage.setItem('bal', balance);
    localStorage.setItem('lvl', level);
    localStorage.setItem('trades', tradesInLevel);
    localStorage.setItem('userId', userId);
  }, [balance, level, tradesInLevel, userId]);

  const progress = (tradesInLevel / (10 + (level - 1) * 5)) * 100;
  const currentProfit = (amount * leverage * ((signal?.perc || 2.5) / 100)).toFixed(2);

  const handleAction = (e) => {
    if (soundEnabled) {
      const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
      audio.volume = 0.1;
      audio.play().catch(() => {});
    }
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    if (x && y) {
      const id = Date.now();
      setClicks(prev => [...prev, { id, x, y }]);
      setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 800);
    }
  };

  useEffect(() => {
    let timer;
    if (tab === 'trade' && !signal && !activePos) {
      setIsAnalyzing(true);
      timer = setTimeout(() => {
        const available = COINS_DATA.filter(c => c.lvl <= level);
        const coin = available[Math.floor(Math.random() * available.length)];
        setSignal({ 
          coin: coin.id, 
          price: (coin.base * (1 + (Math.random() * 0.02 - 0.01))).toFixed(2),
          buyDex: DEX[Math.floor(Math.random()*DEX.length)].name, 
          sellDex: DEX[Math.floor(Math.random()*DEX.length)].name, 
          perc: (Math.random() * 1.5 + 1.5).toFixed(2) 
        });
        setIsAnalyzing(false);
      }, 2500);
    }
    return () => clearTimeout(timer);
  }, [tab, signal, activePos, level]);

  const handleSell = () => {
    setNetTimer(10);
    const itv = setInterval(() => {
      setNetTimer(p => {
        if (p <= 1) {
          clearInterval(itv);
          const win = Math.random() > 0.2;
          let pnl = win ? parseFloat(currentProfit) : -(amount * 0.6);
          
          if (!win) {
             setIsBurning(true);
             setTimeout(() => setIsBurning(false), 1000);
          }

          setBalance(b => Math.max(0, b + amount + pnl));
          setResult({ win, val: Math.abs(pnl).toFixed(2) });
          setActivePos(null);
          setSignal(null);
          
          const needed = 10 + (level - 1) * 5;
          const newTrades = tradesInLevel + 1;
          if (newTrades >= needed) { setLevel(l => l + 1); setTradesInLevel(0); }
          else { setTradesInLevel(newTrades); }
          if (level >= 3) setShowAds(true);
          return null;
        }
        return p - 1;
      });
    }, 1000);
  };

  return (
    <div className={`v ${isBurning ? 'burn-active' : ''}`} onMouseDown={handleAction} onTouchStart={handleAction} style={{
      width: '100vw', height: '100dvh', background: '#000', display: 'flex', justifyContent: 'center', overflow: 'hidden', position: 'relative', color: '#fff'
    }}>
      <style>{`
        :root { --n: #00d9ff; --w: #00ff88; --l: #ff3366; --vip: #ffd700; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; user-select: none; }
        .app { width: 100%; max-width: 500px; height: 100%; display: flex; flex-direction: column; position: relative; }
        .burn-active { animation: shake 0.3s infinite; }
        .burn-active::after { content: ''; position: absolute; inset: 0; background: rgba(255, 51, 102, 0.2); z-index: 10000; pointer-events: none; }
        @keyframes shake { 0% { transform: translate(1px, 1px); } 20% { transform: translate(-1px, -2px); } 100% { transform: translate(0,0); } }
        .ticker-box { background: #1a1500; color: var(--vip); font-size: 11px; padding: 6px; overflow: hidden; white-space: nowrap; border-bottom: 1px solid var(--vip); }
        .ticker { display: inline-block; animation: ticker 20s linear infinite; }
        @keyframes ticker { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .card { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 15px; border-radius: 12px; margin-bottom: 10px; }
        .btn { width: 100%; padding: 15px; border-radius: 10px; border: none; font-weight: bold; cursor: pointer; }
        .dollar { position: absolute; color: var(--w); font-weight: 900; pointer-events: none; animation: pop 0.8s ease-out forwards; z-index: 9999; font-size: 24px; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-120px); } }
        .tut-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.85); z-index: 20000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .nav { position: absolute; bottom: 0; width: 100%; height: 75px; background: #050505; border-top: 1px solid #1a1a1a; display: flex; }
        .tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; color: #444; }
        .tab.active { color: var(--n); }
        input { background: #111; border: 1px solid #333; color: #fff; padding: 10px; border-radius: 8px; width: 100%; font-weight: bold; margin-top: 5px; }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      {isFirstTime && (
        <div className="tut-overlay">
          <div className="card" style={{borderColor: 'var(--n)', textAlign: 'center', width: '100%'}}>
            <h3 style={{color: 'var(--n)', marginBottom: 10}}>ОБУЧЕНИЕ ({tutorialIdx+1}/4)</h3>
            <p style={{fontSize: 14, lineHeight: '1.5', marginBottom: 20}}>{TUTORIAL_STEPS[tutorialIdx].text}</p>
            <button className="btn" style={{background: 'var(--n)', color: '#000'}} onClick={() => {
              if (tutorialIdx < 3) setTutorialIdx(tutorialIdx + 1);
              else { setIsFirstTime(false); localStorage.setItem('tutorialDone', 'true'); }
            }}>ДАЛЕЕ</button>
          </div>
        </div>
      )}

      <div className="app">
        <div className="ticker-box"><div className="ticker">VIP СИГНАЛ: BTC/USDT +4.1% • СНЯТИЕ $1,400 ЗАВЕРШЕНО • </div></div>

        {showAds && (
          <div className="modal" style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.95)', zIndex:15000, display:'flex', alignItems:'center', padding:20}}>
            <div className="card" style={{borderColor: 'var(--vip)', textAlign:'center', width:'100%'}}>
              <h2 style={{color:'var(--vip)'}}>VIP ДОСТУП</h2>
              <p style={{margin:'15px 0', fontSize:13, color:'#888'}}>Вы прошли квалификацию. Реальный профит ждет в канале.</p>
              <a href="https://t.me/kriptoalians" style={{textDecoration:'none'}}><button className="btn" style={{background:'var(--vip)'}}>ВСТУПИТЬ</button></a>
              <button onClick={()=>setShowAds(false)} style={{background:'none', border:'none', color:'#444', marginTop:15}}>Позже</button>
            </div>
          </div>
        )}

        <header className="header" style={{padding: 15, background: '#050505'}}>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <div>
               <div style={{fontSize: 28, fontWeight: 900, color: isBurning ? 'var(--l)' : '#fff'}}>${balance.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
               <div style={{fontSize: 10, color: '#444'}}>{userId}</div>
            </div>
            <span style={{color: 'var(--n)', fontWeight: 'bold'}}>LVL {level}</span>
          </div>
          <div style={{width:'100%', height:4, background:'#222', marginTop:8, borderRadius:2}}><div style={{width:`${progress}%`, height:'100%', background:'var(--n)', boxShadow:'0 0 8px var(--n)'}} /></div>
        </header>

        <main style={{flex:1, overflowY:'auto', padding:15, paddingBottom:90}}>
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="card" style={{border: '1px solid var(--n)'}}>
                    {isAnalyzing ? <div style={{textAlign:'center', color:'var(--n)', fontSize: 12}}>АНАЛИЗ СВЯЗОК...</div> : 
                    <div>
                      <div style={{display:'flex', justifyContent:'space-between'}}><b>{signal.coin}/USDT</b><b style={{color:'var(--w)'}}>+{signal.perc}%</b></div>
                      <div style={{fontSize: 10, color: '#888', marginTop: 5}}>КУПИТЬ: {signal.buyDex} → ПРОДАТЬ: {signal.sellDex}</div>
                    </div>}
                  </div>
                  {DEX.map(d => <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{display:'flex', justifyContent:'space-between'}}><b>{d.name}</b><span style={{color:'var(--w)', fontSize:10}}>LIVE</span></div>)}
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} style={{background:'none', border:'none', color:'#444', marginBottom: 10}}>← НАЗАД</button>
                  <div className="card">
                    <div style={{display:'flex', gap:10}}>
                      <div style={{flex:1}}><label style={{fontSize:10}}>СУММА</label><input type="number" value={amount} onChange={(e)=>setAmount(Number(e.target.value))}/></div>
                      <div style={{flex:1}}><label style={{fontSize:10}}>ПЛЕЧО (MAX {maxLev}x)</label><input type="number" value={leverage} onChange={(e)=>{let v=parseInt(e.target.value)||0; setLeverage(v>maxLev?maxLev:v)}}/></div>
                    </div>
                  </div>
                  {COINS_DATA.map(c => {
                    const lock = c.lvl > level;
                    return (
                      <div key={c.id} className="card" style={{opacity: lock ? 0.3 : 1, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div><b>{c.id}</b><div style={{fontSize:10, color:'var(--n)'}}>${c.base}</div></div>
                        {lock ? <span>LVL {c.lvl}</span> : (
                          activePos?.id === c.id ? <button className="btn" style={{background:'var(--l)', width:100, color:'#fff'}} onClick={handleSell}>{netTimer || 'SELL'}</button> :
                          <button className="btn" style={{background:'var(--w)', width:100}} onClick={() => {if(balance >= amount){setBalance(b=>b-amount); setActivePos({id:c.id})}}}>BUY</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'mining' && (
            <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
               <div onClick={() => setBalance(b => b + 0.1)} style={{width: 180, height: 180, border: '6px solid var(--n)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: 'var(--n)', fontWeight: 'bold', cursor: 'pointer'}}>TAP</div>
            </div>
          )}

          {tab === 'opts' && (
            <div style={{padding: 10}}>
              <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                <span>ЗВУКИ</span>
                <button onClick={() => setSoundEnabled(!soundEnabled)} style={{background: soundEnabled ? 'var(--w)' : '#333', border:'none', padding:'8px 15px', borderRadius:5}}>{soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</button>
              </div>
              <a href="https://t.me/kriptoalians" style={{textDecoration:'none'}}><div className="card" style={{textAlign:'center', color: 'var(--n)'}}>@KRIPTOALIANS</div></a>
              <button onClick={() => {localStorage.clear(); window.location.reload();}} className="btn" style={{background: '#111', color: 'var(--l)', border: '1px solid var(--l)', marginTop: 20}}>СБРОСИТЬ АККАУНТ</button>
            </div>
          )}
        </main>

        <nav className="nav">
          <div onClick={() => setTab('mining')} className={`tab ${tab === 'mining' ? 'active' : ''}`}><b>МАЙНИНГ</b></div>
          <div onClick={() => setTab('trade')} className={`tab ${tab === 'trade' ? 'active' : ''}`}><b>БИРЖА</b></div>
          <div onClick={() => setTab('opts')} className={`tab ${tab === 'opts' ? 'active' : ''}`}><b>ОПЦИИ</b></div>
        </nav>
      </div>
    </div>
  );
}
