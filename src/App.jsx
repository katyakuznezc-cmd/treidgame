

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

  // Анимация баланса
  useEffect(() => {
    if (Math.abs(displayBalance - balance) > 0.1) {
      const diff = balance - displayBalance;
      const timer = setTimeout(() => setDisplayBalance(displayBalance + diff / 12), 25);
      return () => clearTimeout(timer);
    } else { setDisplayBalance(balance); }
  }, [balance, displayBalance]);

  useEffect(() => {
    localStorage.setItem('bal', balance.toString());
    localStorage.setItem('lvl', level.toString());
    localStorage.setItem('trades', tradesInLevel.toString());
  }, [balance, level, tradesInLevel]);

  // Генерация сигналов (теперь это просто текст-подсказка)
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

        setSignal({ coin: coin.id, buyDex: bDex, sellDex: sDex, perc: (Math.random() * 1 + 2).toFixed(2) });
        setIsAnalyzing(false);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [tab, signal, activePos, level]);

  const handleOpenPosition = (coinId) => {
    if (balance >= amount) {
      setBalance(b => b - amount);
      setActivePos({ id: coinId, buyDex: selectedDex, startTime: Date.now() });
    }
  };

  const handleSell = () => {
    const isSameDex = selectedDex === activePos.buyDex;
    const timePassed = (Date.now() - activePos.startTime) / 1000;

    // ШТРАФ: Если продаем там же, где купили, и прошло меньше 90 сек
    if (isSameDex && timePassed < 90) {
      setNetTimer(3);
      const itv = setInterval(() => {
        setNetTimer(p => {
          if (p <= 1) {
            clearInterval(itv);
            const loss = amount * 0.85; 
            setBalance(b => b + (amount - loss));
            setResult({ win: false, val: loss.toFixed(2), msg: "ANTI-FARM PENALTY!" });
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

    // УСПЕШНЫЙ АРБИТРАЖ: Разные биржи
    setNetTimer(8);
    const itv = setInterval(() => {
      setNetTimer(p => {
        if (p <= 1) {
          clearInterval(itv);
          const isCorrectPair = signal && activePos.id === signal.coin && activePos.buyDex === signal.buyDex && selectedDex === signal.sellDex;
          const win = isCorrectPair ? (Math.random() > 0.05) : (Math.random() > 0.5); // По сигналу шанс 95%, без - 50%
          
          let pnl;
          if (win) {
            const pRange = isCorrectPair ? (Math.random() * 1 + 2) : 1; 
            pnl = amount * leverage * (pRange / 100);
          } else {
            pnl = -(amount * leverage * 0.015);
            setIsBurning(true);
            setTimeout(() => setIsBurning(false), 1200);
          }
          setBalance(b => Math.max(0, b + amount + pnl));
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
        .burn-active::after { content: ''; position: absolute; inset: 0; background: rgba(255, 0, 0, 0.4); z-index: 20000; pointer-events: none; }
        @keyframes shake { 0% { transform: translate(4px, 4px); } 50% { transform: translate(-4px, -4px); } 100% { transform: translate(0,0); } }
        .ticker { background: #1a1500; color: var(--vip); font-size: 10px; padding: 6px; white-space: nowrap; border-bottom: 1px solid var(--vip); overflow: hidden; }
        .card { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 15px; border-radius: 12px; margin-bottom: 12px; position: relative; }
        .btn { width: 100%; padding: 15px; border-radius: 10px; border: none; font-weight: 900; cursor: pointer; text-transform: uppercase; }
        .btn:disabled { opacity: 0.1; }
        .dollar { position: absolute; color: var(--w); font-weight: 900; pointer-events: none; animation: pop 0.8s ease-out forwards; z-index: 9999; font-size: 28px; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-140px); } }
        .nav { position: absolute; bottom: 0; width: 100%; height: 75px; background: #050505; border-top: 1px solid #1a1a1a; display: flex; }
        .tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; color: #444; }
        .tab.active { color: var(--n); }
        .lock-bar { position: absolute; top: 0; left: 0; height: 3px; background: var(--l); transition: linear; }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-10, top: c.y-20}}>$</div>)}

      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.98)', zIndex:15000, display:'flex', alignItems:'center', justifyContent:'center', padding:25}}>
          <div className="card" style={{borderColor: result.win ? 'var(--w)' : 'var(--l)', textAlign: 'center', width: '100%'}}>
            <h2 style={{color: result.win ? 'var(--w)' : 'var(--l)'}}>{result.msg || (result.win ? 'SUCCESS' : 'LOSS')}</h2>
            <h1 style={{fontSize: 48, margin: '20px 0'}}>${Number(result.val).toLocaleString()}</h1>
            <button className="btn" style={{background: '#fff', color: '#000'}} onClick={() => setResult(null)}>OK</button>
          </div>
        </div>
      )}

      <div className="app">
        <div className="ticker">VIP: User_88 +$2,400 • VIP: User_12 +$1,100 • VIP: Арбитраж BTC/TON активен</div>
        
        <header style={{padding: '20px 15px', background: '#050505'}}>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <div style={{fontSize: 32, fontWeight: 900}}>${displayBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
            <div style={{color: 'var(--n)', fontWeight: 'bold'}}>LVL {level}</div>
          </div>
        </header>

        <main style={{flex:1, overflowY:'auto', padding:15, paddingBottom:90}}>
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  {/* БЛОК СИГНАЛА - ТЕПЕРЬ ПРОСТО ИНФО */}
                  <div className="card" style={{border: '1px solid var(--vip)', background: '#0a0a00'}}>
                    {isAnalyzing ? <div style={{textAlign:'center', color:'var(--vip)'}}>АНАЛИЗ РЫНКА...</div> : 
                    <div>
                      <div style={{display:'flex', justifyContent:'space-between'}}><b style={{color:'var(--vip)'}}>СИГНАЛ: {signal.coin}</b><b style={{color:'var(--w)'}}>+{signal.perc}%</b></div>
                      <div style={{fontSize: 11, color: '#aaa', marginTop: 10}}>
                        1. КУПИ НА: <span style={{color: '#fff'}}>{signal.buyDex}</span><br/>
                        2. ПРОДАЙ НА: <span style={{color: '#fff'}}>{signal.sellDex}</span>
                      </div>
                    </div>}
                  </div>
                  
                  <div style={{fontSize: 10, color: '#444', margin: '20px 5px 10px'}}>ВЫБЕРИТЕ БИРЖУ ДЛЯ ВХОДА:</div>
                  {DEX.map(d => (
                    <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{display:'flex', justifyContent:'space-between', cursor:'pointer'}}>
                      <b>{d.name}</b><span style={{color:'var(--w)', fontSize:10}}>ONLINE</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} style={{background:'none', border:'none', color:'var(--n)', marginBottom: 15, fontWeight:'bold'}}>← НАЗАД К БИРЖАМ</button>
                  <div className="card" style={{background: '#111'}}>Текущая биржа: <b style={{color: 'var(--n)'}}>{selectedDex}</b></div>
                  
                  {COINS_DATA.map(c => {
                    const isThisActive = activePos?.id === c.id;
                    const isSameDex = activePos?.buyDex === selectedDex;
                    const timePassed = isThisActive ? (Date.now() - activePos.startTime) / 1000 : 0;

                    return (
                      <div key={c.id} className="card" style={{opacity: (c.lvl > level) ? 0.2 : 1}}>
                        {isThisActive && isSameDex && timePassed < 90 && <div className="lock-bar" style={{width: `${100 - (timePassed/90)*100}%`}} />}
                        
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <div><b>{c.id}</b><div style={{fontSize:10, color:'var(--n)'}}>${c.base}</div></div>
                          {isThisActive ? (
                            <div style={{textAlign: 'right'}}>
                              {isSameDex && timePassed < 90 && <div style={{fontSize:8, color:'var(--l)', marginBottom:4}}>SAME DEX! (WAIT {Math.ceil(90-timePassed)}s)</div>}
                              <button className="btn" 
                                      style={{background: isSameDex && timePassed < 90 ? '#300' : 'var(--l)', width: 140, color: '#fff'}} 
                                      onClick={handleSell}>
                                {netTimer ? `WAIT ${netTimer}s` : (isSameDex && timePassed < 90 ? 'FORCE CLOSE' : 'SELL')}
                              </button>
                            </div>
                          ) : (
                            <button className="btn" style={{background:'var(--w)', width:110, color: '#000'}} disabled={!!activePos} onClick={() => handleOpenPosition(c.id)}>BUY</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
          {/* Другие табы здесь (майнинг и тд) */}
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
