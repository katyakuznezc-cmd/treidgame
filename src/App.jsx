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

const VIP_ALERTS = [
  "💎 КУПИТЬ VIP-ДОСТУП: @KRIPTOALIANS", "📉 BTC -2.4% | ETH -1.8% | SOL +5.2%", "🚀 USER_77 ПОДНЯЛ $15,000 С ПЛЕЧОМ 100х", "🔥 НОВЫЙ СИГНАЛ ДОСТУПЕН ДЛЯ LVL 3"
];

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('bal')) || 1000.00);
  const [displayBalance, setDisplayBalance] = useState(balance);
  const [level, setLevel] = useState(() => parseInt(localStorage.getItem('lvl')) || 1);
  const [tradesInLevel, setTradesInLevel] = useState(() => parseInt(localStorage.getItem('trades')) || 0);
  const [userId] = useState(() => localStorage.getItem('userId') || `ID-${Math.floor(10000 + Math.random() * 90000)}`);
  
  const [tab, setTab] = useState('trade');
  const [selectedDex, setSelectedDex] = useState(null);
  const [amount, setAmount] = useState(100);
  const [leverage, setLeverage] = useState(5); 
  const [activePos, setActivePos] = useState(null); 
  const [netTimer, setNetTimer] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [result, setResult] = useState(null);
  const [isBurning, setIsBurning] = useState(false);
  const [clicks, setClicks] = useState([]); 
  const [soundEnabled, setSoundEnabled] = useState(true);

  const maxLev = level === 1 ? 5 : level === 2 ? 20 : level === 3 ? 50 : 100;
  const neededTrades = 12 + (level * 4); // Чуть сложнее качаться

  useEffect(() => {
    if (Math.abs(displayBalance - balance) > 0.01) {
      const diff = balance - displayBalance;
      const timer = setTimeout(() => setDisplayBalance(displayBalance + diff / 8), 20);
      return () => clearTimeout(timer);
    } else { setDisplayBalance(balance); }
  }, [balance, displayBalance]);

  useEffect(() => {
    localStorage.setItem('bal', balance.toString());
    localStorage.setItem('lvl', level.toString());
    localStorage.setItem('trades', tradesInLevel.toString());
  }, [balance, level, tradesInLevel]);

  useEffect(() => {
    let timer;
    if (tab === 'trade' && !signal && !activePos) {
      setIsAnalyzing(true);
      timer = setTimeout(() => {
        const available = COINS_DATA.filter(c => c.lvl <= level);
        const coin = available[Math.floor(Math.random() * available.length)];
        const bDex = DEX[Math.floor(Math.random()*DEX.length)].name;
        let sDex = DEX[Math.floor(Math.random()*DEX.length)].name;
        while(sDex === bDex) sDex = DEX[Math.floor(Math.random()*DEX.length)].name;
        setSignal({ coin: coin.id, buyDex: bDex, sellDex: sDex, perc: (Math.random() * 1.5 + 2).toFixed(2) });
        setIsAnalyzing(false);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [tab, signal, activePos, level]);

  const handleOpenPosition = (coinId) => {
    if (balance >= amount) {
      setBalance(b => b - amount);
      setActivePos({ id: coinId, buyDex: selectedDex, amount, leverage, startTime: Date.now() });
    }
  };

  const handleSell = () => {
    const isSameDex = selectedDex === activePos.buyDex;
    const timePassed = (Date.now() - activePos.startTime) / 1000;

    // Штраф за одну и ту же биржу (Анти-фарм)
    if (isSameDex && timePassed < 90) {
      setNetTimer(3);
      const itv = setInterval(() => {
        setNetTimer(p => {
          if (p <= 1) {
            clearInterval(itv);
            const loss = activePos.amount * 0.98; // Почти всё теряется
            setBalance(b => b + (activePos.amount - loss));
            setResult({ win: false, val: loss.toFixed(2), msg: "АРБИТРАЖ ЗАБЛОКИРОВАН" });
            setIsBurning(true);
            setTimeout(() => setIsBurning(false), 1500);
            setActivePos(null); setSignal(null);
            return null;
          }
          return p - 1;
        });
      }, 1000);
      return;
    }

    setNetTimer(10);
    const itv = setInterval(() => {
      setNetTimer(p => {
        if (p <= 1) {
          clearInterval(itv);
          const isCorrect = signal && activePos.id === signal.coin && activePos.buyDex === signal.buyDex && selectedDex === signal.sellDex;
          
          // --- ИЗМЕНЕННЫЕ ШАНСЫ ---
          const winChance = isCorrect ? 0.85 : 0.30; 
          const win = Math.random() < winChance;
          
          let pnl;
          if (win) {
            const pRange = isCorrect ? (parseFloat(signal.perc) / 100) : 0.01;
            pnl = activePos.amount * activePos.leverage * pRange;
          } else {
            // Увеличили убыток при проигрыше
            pnl = -(activePos.amount * activePos.leverage * 0.025);
            setIsBurning(true);
            setTimeout(() => setIsBurning(false), 1200);
          }
          setBalance(b => Math.max(0, b + activePos.amount + pnl));
          setResult({ win, val: Math.abs(pnl).toFixed(2) });
          setActivePos(null); setSignal(null);
          setTradesInLevel(t => {
            if (t + 1 >= neededTrades) { setLevel(l => l + 1); return 0; }
            return t + 1;
          });
          return null;
        }
        return p - 1;
      });
    }, 1000);
  };

  const handleAction = (e) => {
    if (soundEnabled) {
      const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
      audio.volume = 0.05; audio.play().catch(()=>{});
    }
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    if (x && y) {
      const id = Date.now();
      setClicks(prev => [...prev, { id, x, y }]);
      setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 800);
    }
  };

  return (
    <div className={`v ${isBurning ? 'burn-active' : ''}`} onMouseDown={handleAction} onTouchStart={handleAction} style={{
      width: '100vw', height: '100dvh', background: '#000', display: 'flex', justifyContent: 'center', overflow: 'hidden', position: 'relative', color: '#fff'
    }}>
      <style>{`
        :root { --n: #00d9ff; --w: #00ff88; --l: #ff3366; --vip: #ffd700; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Courier New', monospace; user-select: none; }
        .app { width: 100%; max-width: 500px; height: 100%; display: flex; flex-direction: column; position: relative; border-left: 1px solid #111; border-right: 1px solid #111; }
        .burn-active { animation: shake 0.15s infinite; }
        .burn-active::after { content: ''; position: absolute; inset: 0; background: rgba(255, 0, 0, 0.4); z-index: 20000; pointer-events: none; }
        @keyframes shake { 0% { transform: translate(5px, 5px); } 50% { transform: translate(-5px, -5px); } 100% { transform: translate(0,0); } }
        .ticker-box { background: #1a1500; color: var(--vip); font-size: 11px; padding: 12px; overflow: hidden; white-space: nowrap; border-bottom: 2px solid var(--vip); }
        .ticker { display: inline-block; animation: ticker 25s linear infinite; font-weight: 900; }
        @keyframes ticker { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .card { background: rgba(15, 15, 15, 0.9); border: 1px solid #222; padding: 20px; border-radius: 16px; margin-bottom: 15px; position: relative; backdrop-filter: blur(10px); }
        .vip-card { border: 1px solid var(--vip); box-shadow: 0 0 15px rgba(255,215,0,0.1); }
        .btn { width: 100%; padding: 18px; border-radius: 12px; border: none; font-weight: 900; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; }
        .dollar { position: absolute; color: var(--w); font-weight: 900; pointer-events: none; animation: pop 0.8s ease-out forwards; z-index: 9999; font-size: 32px; text-shadow: 0 0 10px var(--w); }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-160px); } }
        .nav { position: absolute; bottom: 0; width: 100%; height: 80px; background: #050505; border-top: 1px solid #222; display: flex; }
        .tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; color: #444; font-weight: 900; }
        .tab.active { color: var(--n); }
        input { background: #000; border: 1px solid var(--n); color: var(--w); padding: 12px; border-radius: 10px; width: 100%; font-weight: 900; margin-top: 8px; outline: none; text-align: center; font-size: 18px; }
        .lock-progress { position: absolute; top: 0; left: 0; height: 4px; background: var(--l); transition: linear; }
        .ad-banner { background: linear-gradient(90deg, #1a0000, #300); color: #fff; padding: 10px; border-radius: 8px; text-align: center; font-size: 10px; margin-top: 15px; border: 1px dashed var(--l); cursor: pointer; }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.99)', zIndex:15000, display:'flex', alignItems:'center', justifyContent:'center', padding:30}}>
          <div className="card" style={{borderColor: result.win ? 'var(--w)' : 'var(--l)', textAlign: 'center', width: '100%', padding: '50px 20px'}}>
            <h2 style={{color: result.win ? 'var(--w)' : 'var(--l)', fontSize: 24}}>{result.win ? 'ВЫПЛАТА ПОЛУЧЕНА' : 'СДЕЛКА ЛИКВИДИРОВАНА'}</h2>
            <h1 style={{fontSize: 52, margin: '25px 0', fontWeight: 900}}>{result.win ? '+' : '-'}${Number(result.val).toLocaleString()}</h1>
            <button className="btn" style={{background: '#fff', color: '#000'}} onClick={() => setResult(null)}>ВЕРНУТЬСЯ В ТЕРМИНАЛ</button>
          </div>
        </div>
      )}

      <div className="app">
        <div className="ticker-box"><div className="ticker">{VIP_ALERTS.join("  •  ")}</div></div>
        
        <header style={{padding: '25px 20px', background: '#050505', borderBottom: '1px solid #1a1a1a'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <div style={{fontSize: 40, fontWeight: 900}}>${displayBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
              <div style={{fontSize: 10, color: '#333', marginTop: 5}}>{userId}</div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{color: 'var(--vip)', fontWeight: 900, fontSize: 18}}>LVL {level}</div>
              <div style={{fontSize: 10, color: '#444'}}>ПЛЕЧО {maxLev}X</div>
            </div>
          </div>
          <div style={{width:'100%', height:5, background:'#111', marginTop:20, borderRadius:10, overflow:'hidden'}}>
            <div style={{width:`${(tradesInLevel / neededTrades) * 100}%`, height:'100%', background:'var(--n)', boxShadow:'0 0 10px var(--n)'}} />
          </div>
        </header>

        <main style={{flex:1, overflowY:'auto', padding:18, paddingBottom:100}}>
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="card vip-card">
                    {isAnalyzing ? <div style={{textAlign:'center', color:'var(--vip)', fontSize: 11, fontWeight: 900}}>ПОИСК МЕЖБИРЖЕВЫХ ОКРОШЕК...</div> : 
                    <div>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}><b style={{color:'var(--vip)', fontSize: 20}}>{signal.coin}/USDT</b><b style={{color:'var(--w)', fontSize: 20}}>+{signal.perc}%</b></div>
                      <div style={{fontSize: 12, color: '#777', marginTop: 12, fontWeight: 700}}>
                        КУПИТЬ: <span style={{color: '#fff'}}>{signal.buyDex}</span> → ПРОДАТЬ: <span style={{color: '#fff'}}>{signal.sellDex}</span>
                      </div>
                    </div>}
                  </div>

                  <a href="https://t.me/kriptoalians" style={{textDecoration:'none'}}>
                    <div className="ad-banner">
                      <b>НУЖНЫ 100% СИГНАЛЫ?</b><br/>ПИШИ МЕНЕДЖЕРУ: @KRIPTOALIANS
                    </div>
                  </a>
                  
                  <div style={{fontSize: 10, color: '#444', margin: '25px 5px 10px', fontWeight: 900}}>ГЛОБАЛЬНЫЕ ХАБЫ:</div>
                  {DEX.map(d => (
                    <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{display:'flex', justifyContent:'space-between', cursor:'pointer', alignItems: 'center'}}>
                      <b style={{fontSize: 15}}>{d.name}</b>
                      <span style={{color:'var(--w)', fontSize:9, fontWeight: 900}}>ONLINE</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} style={{background:'none', border:'none', color:'var(--n)', marginBottom: 15, fontWeight: 900}}>← К ТЕРМИНАЛАМ</button>
                  
                  <div className="card" style={{borderColor: '#222'}}>
                    <div style={{display:'flex', gap:10}}>
                      <div style={{flex:1}}><label style={{fontSize:9, color: '#444'}}>ДЕПОЗИТ ($)</label><input type="number" value={amount} onChange={(e)=>setAmount(Number(e.target.value))}/></div>
                      <div style={{flex:1}}><label style={{fontSize:9, color: '#444'}}>ПЛЕЧО (МАКС {maxLev}X)</label><input type="number" value={leverage} onChange={(e)=>{let v=parseInt(e.target.value)||0; setLeverage(v>maxLev?maxLev:v)}}/></div>
                    </div>
                  </div>

                  {COINS_DATA.map(c => {
                    const isThisActive = activePos?.id === c.id;
                    const isSameDex = activePos?.buyDex === selectedDex;
                    const timePassed = isThisActive ? (Date.now() - activePos.startTime) / 1000 : 0;

                    return (
                      <div key={c.id} className="card" style={{opacity: (c.lvl > level) ? 0.2 : 1}}>
                        {isThisActive && isSameDex && timePassed < 90 && <div className="lock-progress" style={{width: `${100 - (timePassed/90)*100}%`}} />}
                        
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <div>
                            <b style={{fontSize: 18}}>{c.id}</b>
                            <div style={{fontSize:11, color:'var(--n)', fontWeight: 900}}>${c.base}</div>
                          </div>
                          {isThisActive ? (
                            <div style={{textAlign: 'right'}}>
                              {isSameDex && timePassed < 90 && <div style={{fontSize:8, color:'var(--l)', marginBottom:5, fontWeight:900}}>БЛОК: {Math.ceil(90-timePassed)}с</div>}
                              <button className="btn" style={{background: isSameDex && timePassed < 90 ? '#200' : 'var(--l)', width: 140, color: '#fff', padding: '12px'}} onClick={handleSell}>
                                {netTimer ? `SYNC ${netTimer}с` : 'ПРОДАТЬ'}
                              </button>
                            </div>
                          ) : (
                            <button className="btn" style={{background:'var(--w)', width: 120, color: '#000', padding: '12px'}} disabled={!!activePos || c.lvl > level} onClick={() => handleOpenPosition(c.id)}>КУПИТЬ</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'mining' && (
            <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
               <div onClick={() => setBalance(b => b + 0.15)} style={{width: 240, height: 240, border: '8px solid #0a0a0a', borderTopColor: 'var(--n)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 55, color: 'var(--n)', fontWeight: '900', cursor: 'pointer', boxShadow: '0 0 40px rgba(0,217,255,0.1)'}}>TAP</div>
            </div>
          )}

          {tab === 'opts' && (
            <div style={{padding: 10}}>
               <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                <span style={{fontSize: 14, fontWeight: 900}}>ЗВУКОВЫЕ ЭФФЕКТЫ</span>
                <button onClick={() => setSoundEnabled(!soundEnabled)} style={{background: soundEnabled ? 'var(--w)' : '#222', border:'none', padding:'12px 20px', borderRadius:10, color: '#000', fontWeight: 900}}>{soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</button>
              </div>
              <a href="https://t.me/kriptoalians" style={{textDecoration:'none'}}><div className="card vip-card" style={{textAlign:'center', color: 'var(--vip)', fontWeight: 900, marginTop: 15}}>СВЯЗЬ С МЕНЕДЖЕРОМ: @KRIPTOALIANS</div></a>
            </div>
          )}
        </main>

        <nav className="nav">
          <div onClick={() => setTab('mining')} className={`tab ${tab === 'mining' ? 'active' : ''}`}>⛏ <b>МАЙНИНГ</b></div>
          <div onClick={() => setTab('trade')} className={`tab ${tab === 'trade' ? 'active' : ''}`}>📊 <b>ТЕРМИНАЛ</b></div>
          <div onClick={() => setTab('opts')} className={`tab ${tab === 'opts' ? 'active' : ''}`}>⚙️ <b>СИСТЕМА</b></div>
        </nav>
      </div>
    </div>
  );
}
