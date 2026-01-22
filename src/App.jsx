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
  "VIP: Арбитраж BTC +$2,100", "VIP: Пользователь ID-9921 повысил уровень", "VIP: Вывод $450 через TON завершен", "ВНИМАНИЕ: Продажа на той же бирже блокирует ликвидность на 90с!"
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
  const [activePos, setActivePos] = useState(null); // { id, dex, isSignal, startTime }
  const [netTimer, setNetTimer] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [result, setResult] = useState(null);
  const [isBurning, setIsBurning] = useState(false);
  const [clicks, setClicks] = useState([]); 
  const [soundEnabled, setSoundEnabled] = useState(true);

  const maxLev = level === 1 ? 5 : level === 2 ? 20 : level === 3 ? 50 : 100;

  // Анимация баланса
  useEffect(() => {
    if (Math.abs(displayBalance - balance) > 0.1) {
      const diff = balance - displayBalance;
      const timer = setTimeout(() => setDisplayBalance(displayBalance + diff / 10), 25);
      return () => clearTimeout(timer);
    } else { setDisplayBalance(balance); }
  }, [balance, displayBalance]);

  useEffect(() => {
    localStorage.setItem('bal', balance);
    localStorage.setItem('lvl', level);
    localStorage.setItem('trades', tradesInLevel);
  }, [balance, level, tradesInLevel]);

  // Сигналы
  useEffect(() => {
    let timer;
    if (tab === 'trade' && !signal && !activePos) {
      setIsAnalyzing(true);
      timer = setTimeout(() => {
        const available = COINS_DATA.filter(c => c.lvl <= level);
        const coin = available[Math.floor(Math.random() * available.length)];
        setSignal({ 
          coin: coin.id, 
          buyDex: DEX[Math.floor(Math.random()*DEX.length)].name, 
          sellDex: DEX[Math.floor(Math.random()*DEX.length)].name, 
          perc: (Math.random() * 1 + 2).toFixed(2) 
        });
        setIsAnalyzing(false);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [tab, signal, activePos, level]);

  const handleOpenPosition = (coinId, fromSignal = false) => {
    if (balance >= amount) {
      setBalance(b => b - amount);
      setActivePos({ 
        id: coinId, 
        dex: selectedDex || (fromSignal ? signal.buyDex : 'SIGNAL'), 
        isSignal: fromSignal,
        startTime: Date.now() 
      });
    }
  };

  const handleSell = () => {
    const now = Date.now();
    const timePassed = (now - activePos.startTime) / 1000;
    const sameDex = selectedDex === activePos.dex;

    // Логика штрафа за одну и ту же биржу
    if (sameDex && timePassed < 90) {
      // Принудительный проигрыш
      setNetTimer(3); 
      const itv = setInterval(() => {
        setNetTimer(p => {
          if (p <= 1) {
            clearInterval(itv);
            const lossVal = amount * 0.8; // Теряет 80% от ставки
            setBalance(b => Math.max(0, b + (amount - lossVal)));
            setResult({ win: false, val: lossVal.toFixed(2), msg: "ОШИБКА: ОДНА БИРЖА (ШТРАФ)" });
            setIsBurning(true);
            setTimeout(() => setIsBurning(false), 1500);
            setActivePos(null);
            if (activePos?.isSignal) setSignal(null);
            return null;
          }
          return p - 1;
        });
      }, 1000);
      return;
    }

    // Стандартная продажа (Арбитраж)
    setNetTimer(10);
    const itv = setInterval(() => {
      setNetTimer(p => {
        if (p <= 1) {
          clearInterval(itv);
          const win = Math.random() > 0.15;
          let pnl;
          if (win) {
            pnl = amount * leverage * ((Math.random() * 1 + 2) / 100);
          } else {
            pnl = -(amount * leverage * 0.015);
            setIsBurning(true);
            setTimeout(() => setIsBurning(false), 1000);
          }
          setBalance(b => Math.max(0, b + amount + pnl));
          setResult({ win, val: Math.abs(pnl).toFixed(2) });
          setActivePos(null);
          if (activePos?.isSignal) setSignal(null);
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
      audio.volume = 0.05;
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

  return (
    <div className={`v ${isBurning ? 'burn-active' : ''}`} onMouseDown={handleAction} onTouchStart={handleAction} style={{
      width: '100vw', height: '100dvh', background: '#000', display: 'flex', justifyContent: 'center', overflow: 'hidden', position: 'relative', color: '#fff'
    }}>
      <style>{`
        :root { --n: #00d9ff; --w: #00ff88; --l: #ff3366; --vip: #ffd700; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Courier New', monospace; user-select: none; }
        .app { width: 100%; max-width: 500px; height: 100%; display: flex; flex-direction: column; position: relative; }
        .burn-active { animation: shake 0.2s infinite; }
        .burn-active::after { content: ''; position: absolute; inset: 0; background: rgba(255, 0, 0, 0.3); z-index: 20000; pointer-events: none; }
        @keyframes shake { 0% { transform: translate(3px, 3px); } 50% { transform: translate(-3px, -3px); } 100% { transform: translate(0,0); } }
        .ticker-box { background: #1a1500; color: var(--vip); font-size: 11px; padding: 8px; overflow: hidden; white-space: nowrap; border-bottom: 1px solid var(--vip); }
        .ticker { display: inline-block; animation: ticker 25s linear infinite; font-weight: bold; }
        @keyframes ticker { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .card { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 15px; border-radius: 12px; margin-bottom: 12px; }
        .btn { width: 100%; padding: 15px; border-radius: 10px; border: none; font-weight: 900; cursor: pointer; text-transform: uppercase; }
        .btn:disabled { opacity: 0.1; }
        .dollar { position: absolute; color: var(--w); font-weight: 900; pointer-events: none; animation: pop 0.8s ease-out forwards; z-index: 9999; font-size: 28px; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-140px); } }
        .modal { position: absolute; inset: 0; background: rgba(0,0,0,0.98); z-index: 15000; display: flex; align-items: center; justify-content: center; padding: 25px; }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      {result && (
        <div className="modal">
          <div className="card" style={{borderColor: result.win ? 'var(--w)' : 'var(--l)', textAlign: 'center', width: '90%', padding: '40px 20px'}}>
            <h2 style={{color: result.win ? 'var(--w)' : 'var(--l)', fontSize: 28}}>{result.msg || (result.win ? 'УСПЕШНО' : 'УБЫТОК')}</h2>
            <h1 style={{fontSize: 42, margin: '15px 0'}}>{result.win ? '+' : '-'}${Number(result.val).toLocaleString()}</h1>
            <button className="btn" style={{background: '#fff', color: '#000'}} onClick={() => setResult(null)}>В ТЕРМИНАЛ</button>
          </div>
        </div>
      )}

      <div className="app">
        <div className="ticker-box"><div className="ticker">{VIP_ALERTS.join("  •  ")}</div></div>

        <header style={{padding: '20px 15px', background: '#050505', borderBottom: '1px solid #111'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
               <div style={{fontSize: 32, fontWeight: 900, color: isBurning ? 'var(--l)' : '#fff'}}>
                 ${displayBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
               </div>
               <div style={{fontSize: 10, color: '#444'}}>{userId}</div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{color: 'var(--n)', fontWeight: 'bold'}}>LVL {level}</div>
              <div style={{fontSize: 9, color: '#444'}}>MAX {maxLev}x</div>
            </div>
          </div>
          <div style={{width:'100%', height:3, background:'#111', marginTop:15, borderRadius:2}}>
            <div style={{width:`${(tradesInLevel / (10 + (level - 1) * 5)) * 100}%`, height:'100%', background:'var(--n)', boxShadow:'0 0 10px var(--n)'}} />
          </div>
        </header>

        <main style={{flex:1, overflowY:'auto', padding:15, paddingBottom:90}}>
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="card" style={{border: '1px solid var(--vip)', background: '#0a0a00', opacity: (activePos && !activePos.isSignal) ? 0.3 : 1}}>
                    {isAnalyzing ? <div style={{textAlign:'center', color:'var(--vip)', fontSize: 11}}>ПОИСК СВЯЗОК...</div> : 
                    <div>
                      <div style={{display:'flex', justifyContent:'space-between'}}><b>{signal.coin}/USDT</b><b style={{color:'var(--w)'}}>+{signal.perc}%</b></div>
                      <div style={{fontSize: 10, color: '#888', marginTop: 5}}>КУПИТЬ: {signal.buyDex} → ПРОДАТЬ: {signal.sellDex}</div>
                      {activePos?.isSignal ? (
                        <button className="btn" style={{background: 'var(--l)', color: '#fff', marginTop: 15}} onClick={handleSell}>{netTimer ? `СИНХРОНИЗАЦИЯ ${netTimer}с` : 'ЗАКРЫТЬ СВЯЗКУ'}</button>
                      ) : (
                        <button className="btn" style={{background: 'var(--vip)', color: '#000', marginTop: 15}} disabled={!!activePos} onClick={() => handleOpenPosition(signal.coin, true)}>ИСПОЛЬЗОВАТЬ СИГНАЛ</button>
                      )}
                    </div>}
                  </div>
                  <div style={{fontSize: 10, color: '#444', margin: '15px 0 10px 5px'}}>ДОСТУПНЫЕ БИРЖИ:</div>
                  <div style={{opacity: activePos?.isSignal ? 0.2 : 1, pointerEvents: activePos?.isSignal ? 'none' : 'auto'}}>
                    {DEX.map(d => (
                      <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{display:'flex', justifyContent:'space-between', cursor: 'pointer'}}>
                        <b>{d.name}</b><span style={{color:'var(--w)', fontSize:10}}>ONLINE</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} style={{background:'none', border:'none', color:'#444', marginBottom: 15}}>← НАЗАД К СПИСКУ</button>
                  <div className="card">
                    <div style={{display:'flex', gap:10}}>
                      <div style={{flex:1}}><label style={{fontSize:9}}>INVEST $</label><input type="number" value={amount} onChange={(e)=>setAmount(Number(e.target.value))}/></div>
                      <div style={{flex:1}}><label style={{fontSize:9}}>LEVERAGE</label><input type="number" value={leverage} onChange={(e)=>{let v=parseInt(e.target.value)||0; setLeverage(v>maxLev?maxLev:v)}}/></div>
                    </div>
                  </div>

                  {COINS_DATA.map(c => {
                    const lock = c.lvl > level;
                    const isThisActive = activePos?.id === c.id;
                    const isSameDex = activePos?.dex === selectedDex;

                    return (
                      <div key={c.id} className="card" style={{opacity: lock ? 0.2 : 1, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div><b>{c.id}</b><div style={{fontSize:10, color:'var(--n)'}}>${c.base}</div></div>
                        {lock ? <span>LOCKED</span> : (
                          isThisActive ? (
                            <div style={{textAlign: 'right'}}>
                              {isSameDex && <div style={{fontSize: 8, color: 'var(--l)', marginBottom: 5}}>ОДНА БИРЖА! (ШТРАФ)</div>}
                              <button className="btn" style={{background:'var(--l)', width:120, color:'#fff'}} onClick={handleSell}>{netTimer ? `WAIT ${netTimer}s` : 'SELL'}</button>
                            </div>
                          ) : (
                            <button className="btn" style={{background:'var(--w)', width:110, color: '#000'}} disabled={!!activePos} onClick={() => handleOpenPosition(c.id, false)}>BUY</button>
                          )
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
               <div onClick={() => setBalance(b => b + 0.1)} style={{width: 200, height: 200, border: '6px solid var(--n)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50, color: 'var(--n)', fontWeight: '900', cursor: 'pointer'}}>TAP</div>
            </div>
          )}

          {tab === 'opts' && (
            <div style={{padding: 10}}>
              <a href="https://t.me/kriptoalians" style={{textDecoration:'none'}}><div className="card" style={{textAlign:'center', color: 'var(--vip)', border: '1px solid var(--vip)'}}>SUPPORT @KRIPTOALIANS</div></a>
              <button onClick={() => {localStorage.clear(); window.location.reload();}} className="btn" style={{background: '#111', color: 'var(--l)', border: '1px solid var(--l)', marginTop: 20}}>RESET ALL</button>
            </div>
          )}
        </main>

        <nav className="nav">
          <div onClick={() => setTab('mining')} className={`tab ${tab === 'mining' ? 'active' : ''}`}><b>MINING</b></div>
          <div onClick={() => setTab('trade')} className={`tab ${tab === 'trade' ? 'active' : ''}`}><b>TERMINAL</b></div>
          <div onClick={() => setTab('opts')} className={`tab ${tab === 'opts' ? 'active' : ''}`}><b>SYSTEM</b></div>
        </nav>
      </div>
    </div>
  );
}
