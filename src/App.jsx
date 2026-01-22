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
  "VIP: User_99 +$4,200 (BTC/SOL)", "VIP: Новая связка обнаружена!", "VIP: Вывод $1,500 пользователем ID-442", "VIP: Уровень 3 открывает плечо 100х"
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

  // Бегущие цифры баланса
  useEffect(() => {
    if (Math.abs(displayBalance - balance) > 0.05) {
      const diff = balance - displayBalance;
      const timer = setTimeout(() => setDisplayBalance(displayBalance + diff / 10), 25);
      return () => clearTimeout(timer);
    } else { setDisplayBalance(balance); }
  }, [balance, displayBalance]);

  useEffect(() => {
    localStorage.setItem('bal', balance.toString());
    localStorage.setItem('lvl', level.toString());
    localStorage.setItem('trades', tradesInLevel.toString());
  }, [balance, level, tradesInLevel]);

  // Генерация сигналов
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
        setSignal({ coin: coin.id, buyDex: bDex, sellDex: sDex, perc: (Math.random() * 1 + 2.5).toFixed(2) });
        setIsAnalyzing(false);
      }, 4000);
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

    if (isSameDex && timePassed < 90) {
      setNetTimer(3);
      const itv = setInterval(() => {
        setNetTimer(p => {
          if (p <= 1) {
            clearInterval(itv);
            const loss = activePos.amount * 0.9;
            setBalance(b => b + (activePos.amount - loss));
            setResult({ win: false, val: loss.toFixed(2), msg: "ANTI-FARM LIQUIDATION" });
            setIsBurning(true);
            setTimeout(() => setIsBurning(false), 1500);
            setActivePos(null);
            setSignal(null);
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
          const win = isCorrect ? (Math.random() > 0.05) : (Math.random() > 0.6);
          let pnl;
          if (win) {
            const pRange = isCorrect ? (parseFloat(signal.perc) / 100) : 0.01;
            pnl = activePos.amount * activePos.leverage * pRange;
          } else {
            pnl = -(activePos.amount * activePos.leverage * 0.012);
            setIsBurning(true);
            setTimeout(() => setIsBurning(false), 1200);
          }
          setBalance(b => Math.max(0, b + activePos.amount + pnl));
          setResult({ win, val: Math.abs(pnl).toFixed(2) });
          setActivePos(null);
          setSignal(null);
          setTradesInLevel(t => t + 1);
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
        .burn-active { animation: shake 0.2s infinite; }
        .burn-active::after { content: ''; position: absolute; inset: 0; background: rgba(255, 0, 0, 0.4); z-index: 20000; pointer-events: none; }
        @keyframes shake { 0% { transform: translate(4px, 4px); } 50% { transform: translate(-4px, -4px); } 100% { transform: translate(0,0); } }
        .ticker-box { background: #1a1500; color: var(--vip); font-size: 11px; padding: 8px; overflow: hidden; white-space: nowrap; border-bottom: 1px solid var(--vip); }
        .ticker { display: inline-block; animation: ticker 25s linear infinite; font-weight: bold; }
        @keyframes ticker { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .card { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 15px; border-radius: 12px; margin-bottom: 12px; position: relative; transition: 0.3s; }
        .btn { width: 100%; padding: 15px; border-radius: 10px; border: none; font-weight: 900; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; }
        .btn:disabled { opacity: 0.1; filter: grayscale(1); }
        .dollar { position: absolute; color: var(--w); font-weight: 900; pointer-events: none; animation: pop 0.8s ease-out forwards; z-index: 9999; font-size: 28px; text-shadow: 0 0 10px var(--w); }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-150px); } }
        .nav { position: absolute; bottom: 0; width: 100%; height: 75px; background: #050505; border-top: 1px solid #1a1a1a; display: flex; }
        .tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; color: #444; }
        .tab.active { color: var(--n); text-shadow: 0 0 5px var(--n); }
        input { background: #000; border: 1px solid #333; color: var(--w); padding: 10px; border-radius: 8px; width: 100%; font-weight: bold; margin-top: 5px; outline: none; text-align: center; }
        .lock-line { position: absolute; top: 0; left: 0; height: 3px; background: var(--l); transition: linear; box-shadow: 0 0 10px var(--l); }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.98)', zIndex:15000, display:'flex', alignItems:'center', justifyContent:'center', padding:25}}>
          <div className="card" style={{borderColor: result.win ? 'var(--w)' : 'var(--l)', textAlign: 'center', width: '100%', padding: '50px 20px'}}>
            <h2 style={{color: result.win ? 'var(--w)' : 'var(--l)', fontSize: 24}}>{result.msg || (result.win ? 'SUCCESSFUL DEAL' : 'LIQUIDATED')}</h2>
            <h1 style={{fontSize: 48, margin: '20px 0'}}>{result.win ? '+' : '-'}${Number(result.val).toLocaleString()}</h1>
            <button className="btn" style={{background: '#fff', color: '#000'}} onClick={() => setResult(null)}>BACK TO TERMINAL</button>
          </div>
        </div>
      )}

      <div className="app">
        <div className="ticker-box"><div className="ticker">{VIP_ALERTS.join("  •  ")}</div></div>
        
        <header style={{padding: '20px 15px', background: '#050505', borderBottom: '1px solid #1a1a1a'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <div style={{fontSize: 34, fontWeight: 900}}>${displayBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
              <div style={{fontSize: 10, color: '#444', marginTop: 4}}>{userId}</div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{color: 'var(--n)', fontWeight: 'bold', fontSize: 16}}>LVL {level}</div>
              <div style={{fontSize: 10, color: '#444'}}>MAX {maxLev}x</div>
            </div>
          </div>
        </header>

        <main style={{flex:1, overflowY:'auto', padding:15, paddingBottom:90}}>
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="card" style={{border: '1px solid var(--vip)', background: 'linear-gradient(45deg, #0a0a00, #1a1500)'}}>
                    {isAnalyzing ? <div style={{textAlign:'center', color:'var(--vip)', fontSize: 11}}>SCANNING INTER-EXCHANGE LIQUIDITY...</div> : 
                    <div>
                      <div style={{display:'flex', justifyContent:'space-between'}}><b style={{color:'var(--vip)', fontSize: 18}}>{signal.coin}/USDT</b><b style={{color:'var(--w)', fontSize: 18}}>+{signal.perc}%</b></div>
                      <div style={{fontSize: 11, color: '#888', marginTop: 10, lineHeight: '1.6'}}>
                        STEP 1: BUY ON <span style={{color: '#fff', fontWeight:'bold'}}>{signal.buyDex}</span><br/>
                        STEP 2: SELL ON <span style={{color: '#fff', fontWeight:'bold'}}>{signal.sellDex}</span>
                      </div>
                    </div>}
                  </div>
                  
                  <div style={{fontSize: 10, color: '#444', margin: '20px 5px 10px', fontWeight: 'bold'}}>SELECT EXCHANGE:</div>
                  {DEX.map(d => (
                    <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{display:'flex', justifyContent:'space-between', cursor:'pointer', alignItems: 'center'}}>
                      <b style={{fontSize: 14}}>{d.name}</b><span style={{color:'var(--w)', fontSize:9, border: '1px solid var(--w)', padding: '2px 6px', borderRadius: 4}}>ONLINE</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} style={{background:'none', border:'none', color:'var(--n)', marginBottom: 15, fontWeight:'bold', fontSize: 12}}>← BACK TO EXCHANGES</button>
                  
                  {/* ПАНЕЛЬ ТЕРМИНАЛА (СУММА И ПЛЕЧО) */}
                  <div className="card" style={{borderColor: '#222'}}>
                    <div style={{display:'flex', gap:10}}>
                      <div style={{flex:1}}><label style={{fontSize:9, color: '#666'}}>AMOUNT $</label><input type="number" value={amount} onChange={(e)=>setAmount(Number(e.target.value))}/></div>
                      <div style={{flex:1}}><label style={{fontSize:9, color: '#666'}}>LEVERAGE (MAX {maxLev}x)</label><input type="number" value={leverage} onChange={(e)=>{let v=parseInt(e.target.value)||0; setLeverage(v>maxLev?maxLev:v)}}/></div>
                    </div>
                    <div style={{marginTop: 15, padding: '12px', background: '#000', borderRadius: 8, display: 'flex', justifyContent: 'space-between', border: '1px solid #111'}}>
                      <span style={{fontSize: 11, color: '#666'}}>EST. PROFIT:</span>
                      <b style={{color: 'var(--w)'}}>+${(amount * leverage * (signal ? parseFloat(signal.perc)/100 : 0.01)).toFixed(2)}</b>
                    </div>
                  </div>

                  {COINS_DATA.map(c => {
                    const isThisActive = activePos?.id === c.id;
                    const isSameDex = activePos?.buyDex === selectedDex;
                    const timePassed = isThisActive ? (Date.now() - activePos.startTime) / 1000 : 0;

                    return (
                      <div key={c.id} className="card" style={{opacity: (c.lvl > level) ? 0.2 : 1}}>
                        {isThisActive && isSameDex && timePassed < 90 && <div className="lock-line" style={{width: `${100 - (timePassed/90)*100}%`}} />}
                        
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <div><b style={{fontSize: 16}}>{c.id}</b><div style={{fontSize:10, color:'var(--n)'}}>${c.base}</div></div>
                          {isThisActive ? (
                            <div style={{textAlign: 'right'}}>
                              {isSameDex && timePassed < 90 && <div style={{fontSize:8, color:'var(--l)', marginBottom:4, fontWeight:'bold'}}>SAME EXCHANGE LOCK ({Math.ceil(90-timePassed)}s)</div>}
                              <button className="btn" 
                                      style={{background: isSameDex && timePassed < 90 ? '#200' : 'var(--l)', width: 140, color: '#fff'}} 
                                      onClick={handleSell}>
                                {netTimer ? `SYNCING ${netTimer}s` : (isSameDex && timePassed < 90 ? 'FORCE SELL' : 'SELL')}
                              </button>
                            </div>
                          ) : (
                            <button className="btn" style={{background:'var(--w)', width:110, color: '#000'}} disabled={!!activePos || c.lvl > level} onClick={() => handleOpenPosition(c.id)}>BUY</button>
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
               <div onClick={() => setBalance(b => b + 0.1)} style={{width: 220, height: 220, border: '6px solid #111', borderTopColor: 'var(--n)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50, color: 'var(--n)', fontWeight: '900', cursor: 'pointer', boxShadow: '0 0 30px rgba(0,217,255,0.1)'}}>TAP</div>
            </div>
          )}

          {tab === 'opts' && (
            <div style={{padding: 10}}>
              <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                <span style={{fontSize: 12}}>AUDIO FEEDBACK</span>
                <button onClick={() => setSoundEnabled(!soundEnabled)} style={{background: soundEnabled ? 'var(--w)' : '#222', border:'none', padding:'10px 20px', borderRadius:8, color: '#000', fontWeight: 'bold'}}>{soundEnabled ? 'ON' : 'OFF'}</button>
              </div>
              <a href="https://t.me/kriptoalians" style={{textDecoration:'none'}}><div className="card" style={{textAlign:'center', color: 'var(--vip)', border: '1px solid var(--vip)', fontWeight: 'bold', marginTop: 10}}>SUPPORT: @KRIPTOALIANS</div></a>
            </div>
          )}
        </main>

        <nav className="nav">
          <div onClick={() => setTab('mining')} className={`tab ${tab === 'mining' ? 'active' : ''}`}><b style={{fontSize: 9}}>LIQUIDITY</b></div>
          <div onClick={() => setTab('trade')} className={`tab ${tab === 'trade' ? 'active' : ''}`}><b style={{fontSize: 9}}>TERMINAL</b></div>
          <div onClick={() => setTab('opts')} className={`tab ${tab === 'opts' ? 'active' : ''}`}><b style={{fontSize: 9}}>SYSTEM</b></div>
        </nav>
      </div>
    </div>
  );
}
