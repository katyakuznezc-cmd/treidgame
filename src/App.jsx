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
  const [activePos, setActivePos] = useState(null); // { id, buyDex, startTime }
  const [netTimer, setNetTimer] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [result, setResult] = useState(null);
  const [isBurning, setIsBurning] = useState(false);
  const [clicks, setClicks] = useState([]); 
  const [soundEnabled, setSoundEnabled] = useState(true);

  const maxLev = level === 1 ? 5 : level === 2 ? 20 : level === 3 ? 50 : 100;

  // Бегущие цифры
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

  // Генерация сигналов
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
        buyDex: fromSignal ? signal.buyDex : selectedDex, 
        isSignal: fromSignal,
        startTime: Date.now() 
      });
    }
  };

  const handleSell = () => {
    const isSameDex = selectedDex === activePos.buyDex;
    const timePassed = (Date.now() - activePos.startTime) / 1000;

    // Если пытается продать на той же бирже раньше 90 сек
    if (isSameDex && timePassed < 90) {
      setNetTimer(3);
      const itv = setInterval(() => {
        setNetTimer(p => {
          if (p <= 1) {
            clearInterval(itv);
            const loss = amount * 0.9; // Почти полная потеря
            setBalance(b => b + (amount - loss));
            setResult({ win: false, val: loss.toFixed(2), msg: "ANTI-FARM: SAME EXCHANGE PENALTY" });
            setIsBurning(true);
            setTimeout(() => setIsBurning(false), 1500);
            setActivePos(null);
            if (activePos.isSignal) setSignal(null);
            return null;
          }
          return p - 1;
        });
      }, 1000);
      return;
    }

    // Обычный арбитраж (разные биржи или прошло 90с)
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
          if (activePos.isSignal) setSignal(null);
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
        .burn-active::after { content: ''; position: absolute; inset: 0; background: rgba(255, 0, 0, 0.4); z-index: 20000; pointer-events: none; }
        @keyframes shake { 0% { transform: translate(4px, 4px); } 50% { transform: translate(-4px, -4px); } 100% { transform: translate(0,0); } }
        .card { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 15px; border-radius: 12px; margin-bottom: 12px; position: relative; overflow: hidden; }
        .btn { width: 100%; padding: 15px; border-radius: 10px; border: none; font-weight: 900; cursor: pointer; text-transform: uppercase; }
        .btn:disabled { opacity: 0.1; }
        .nav { position: absolute; bottom: 0; width: 100%; height: 75px; background: #050505; border-top: 1px solid #1a1a1a; display: flex; }
        .tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; color: #444; }
        .tab.active { color: var(--n); }
        .warning-text { color: var(--l); font-size: 8px; font-weight: bold; margin-bottom: 4px; display: block; text-align: right; }
        .same-dex-lock { position: absolute; top: 0; left: 0; height: 2px; background: var(--l); transition: linear; }
      `}</style>

      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.95)', zIndex:15000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
          <div className="card" style={{borderColor: result.win ? 'var(--w)' : 'var(--l)', textAlign: 'center', width: '100%'}}>
            <h2 style={{color: result.win ? 'var(--w)' : 'var(--l)'}}>{result.msg || (result.win ? 'SUCCESS' : 'LOSS')}</h2>
            <h1 style={{fontSize: 42, margin: '20px 0'}}>${Number(result.val).toLocaleString()}</h1>
            <button className="btn" style={{background: '#fff', color: '#000'}} onClick={() => setResult(null)}>DONE</button>
          </div>
        </div>
      )}

      <div className="app">
        <header style={{padding: '20px 15px', background: '#050505', borderBottom: '1px solid #111'}}>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <div style={{fontSize: 32, fontWeight: 900}}>${displayBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
            <div style={{textAlign: 'right'}}><div style={{color: 'var(--n)', fontWeight: 'bold'}}>LVL {level}</div></div>
          </div>
        </header>

        <main style={{flex:1, overflowY:'auto', padding:15, paddingBottom:90}}>
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="card" style={{border: '1px solid var(--vip)', opacity: (activePos && !activePos.isSignal) ? 0.3 : 1}}>
                    {isAnalyzing ? <div style={{textAlign:'center', color:'var(--vip)'}}>SCANNING MARKET...</div> : 
                    <div>
                      <div style={{display:'flex', justifyContent:'space-between'}}><b>{signal.coin}/USDT</b><b style={{color:'var(--w)'}}>+{signal.perc}%</b></div>
                      <div style={{fontSize: 10, color: '#666'}}>BUY: {signal.buyDex} → SELL: {signal.sellDex}</div>
                      {activePos?.isSignal ? (
                        <button className="btn" style={{background: 'var(--l)', color: '#fff', marginTop: 15}} onClick={handleSell}>{netTimer ? `SYNCING ${netTimer}s` : 'CLOSE DEAL'}</button>
                      ) : (
                        <button className="btn" style={{background: 'var(--vip)', color: '#000', marginTop: 15}} disabled={!!activePos} onClick={() => handleOpenPosition(signal.coin, true)}>EXECUTE SIGNAL</button>
                      )}
                    </div>}
                  </div>
                  
                  <div style={{fontSize: 10, color: '#444', margin: '15px 5px'}}>MANUAL ARBITRAGE:</div>
                  <div style={{opacity: activePos?.isSignal ? 0.2 : 1}}>
                    {DEX.map(d => (
                      <div key={d.name} className="card" onClick={() => !activePos?.isSignal && setSelectedDex(d.name)} style={{display:'flex', justifyContent:'space-between'}}>
                        <b>{d.name}</b><span style={{color:'var(--w)', fontSize:10}}>ONLINE</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} style={{background:'none', border:'none', color:'#444', marginBottom: 15}}>← TERMINAL</button>
                  
                  {COINS_DATA.map(c => {
                    const isThisActive = activePos?.id === c.id;
                    const isSameDex = activePos?.buyDex === selectedDex;
                    const timePassed = isThisActive ? (Date.now() - activePos.startTime) / 1000 : 0;
                    const lockProgress = Math.min((timePassed / 90) * 100, 100);

                    return (
                      <div key={c.id} className="card" style={{opacity: (c.lvl > level) ? 0.2 : 1}}>
                        {isThisActive && isSameDex && timePassed < 90 && <div className="same-dex-lock" style={{width: `${100 - lockProgress}%`}} />}
                        
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <div><b>{c.id}</b><div style={{fontSize:10, color:'var(--n)'}}>${c.base}</div></div>
                          {isThisActive ? (
                            <div style={{textAlign: 'right'}}>
                              {isSameDex && timePassed < 90 && <span className="warning-text">LOCKED: SAME DEX ({Math.ceil(90 - timePassed)}s)</span>}
                              <button className="btn" 
                                      style={{background: isSameDex && timePassed < 90 ? '#220000' : 'var(--l)', width: 140, color: '#fff'}} 
                                      onClick={handleSell}>
                                {netTimer ? `WAIT ${netTimer}s` : (isSameDex && timePassed < 90 ? 'FORCE SELL' : 'SELL')}
                              </button>
                            </div>
                          ) : (
                            <button className="btn" style={{background:'var(--w)', width:110, color: '#000'}} disabled={!!activePos} onClick={() => handleOpenPosition(c.id, false)}>BUY</button>
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
               <div onClick={() => setBalance(b => b + 0.1)} style={{width: 200, height: 200, border: '6px solid var(--n)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50, color: 'var(--n)', fontWeight: '900', cursor: 'pointer'}}>TAP</div>
            </div>
          )}
        </main>

        <nav className="nav">
          <div onClick={() => setTab('mining')} className={`tab ${tab === 'mining' ? 'active' : ''}`}><b>MINING</b></div>
          <div onClick={() => setTab('trade')} className={`tab ${tab === 'trade' ? 'active' : ''}`}><b>TRADE</b></div>
          <div onClick={() => setTab('opts')} className={`tab ${tab === 'opts' ? 'active' : ''}`}><b>OPTS</b></div>
        </nav>
      </div>
    </div>
  );
}
