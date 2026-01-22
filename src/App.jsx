import React, { useState, useEffect } from 'react';

const COINS_DATA = [
  { id: 'TON', base: 5.42, lvl: 1 },
  { id: 'DOGE', base: 0.15, lvl: 1 },
  { id: 'SOL', base: 145.30, lvl: 2 },
  { id: 'BTC', base: 95400, lvl: 3 },
  { id: 'ETH', base: 2600, lvl: 2 },
  { id: 'XRP', base: 0.58, lvl: 1 },
  { id: 'NEAR', base: 6.12, lvl: 1 }
];

const DEX = [
  { id: '1INCH', name: '1INCH' }, { id: 'UNISWAP', name: 'UNISWAP' }, 
  { id: 'PANCAKE', name: 'PANCAKE' }, { id: 'RAYDIUM', name: 'RAYDIUM' }
];

export default function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('st_bal')) || 1000.00);
  const [displayBalance, setDisplayBalance] = useState(balance);
  const [level, setLevel] = useState(() => Number(localStorage.getItem('st_lvl')) || 1);
  const [tradesInLevel, setTradesInLevel] = useState(() => Number(localStorage.getItem('st_prog')) || 0);
  const [userId] = useState(() => localStorage.getItem('st_user_id') || `ST-ID-${Math.floor(100000 + Math.random() * 899999)}`);
  
  const [tab, setTab] = useState('trade');
  const [selectedDex, setSelectedDex] = useState(null);
  const [amount, setAmount] = useState(100);
  const [leverage, setLeverage] = useState(5); 
  const [activePos, setActivePos] = useState(null); 
  const [netTimer, setNetTimer] = useState(null);
  
  // Сигнал и контроль повторов
  const [signal, setSignal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  
  const [result, setResult] = useState(null);
  const [isBurning, setIsBurning] = useState(false);
  const [clicks, setClicks] = useState([]); 
  
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('cfg_snd') !== 'false');
  const [fxEnabled, setFxEnabled] = useState(() => localStorage.getItem('cfg_fx') !== 'false');

  const getNeededTrades = (lvl) => lvl === 1 ? 15 : lvl === 2 ? 35 : 75;
  const maxLev = level === 1 ? 5 : level === 2 ? 20 : level === 3 ? 50 : 100;
  const neededTrades = getNeededTrades(level);

  // Калькулятор математики (3% профит / 1.5% риск)
  const potentialWin = (amount * leverage * 0.03).toFixed(2);
  const potentialLoss = (amount * leverage * 0.015).toFixed(2);

  useEffect(() => {
    localStorage.setItem('st_bal', balance.toFixed(2));
    localStorage.setItem('st_lvl', level.toString());
    localStorage.setItem('st_prog', tradesInLevel.toString());
    localStorage.setItem('cfg_snd', soundEnabled);
    localStorage.setItem('cfg_fx', fxEnabled);
  }, [balance, level, tradesInLevel, soundEnabled, fxEnabled]);

  // Логика генерации РАЗНЫХ сигналов
  useEffect(() => {
    let timer;
    const generateNewSignal = () => {
      setIsAnalyzing(true);
      timer = setTimeout(() => {
        const available = COINS_DATA.filter(c => c.lvl <= level);
        
        // Фильтруем, чтобы не выбрать ту же монету, что была сейчас
        const currentCoinId = signal?.coin;
        const filtered = available.filter(c => c.id !== currentCoinId);
        
        // Если доступна только одна монета (на 1 лвле), берем её, иначе - новую
        const nextCoin = filtered.length > 0 
          ? filtered[Math.floor(Math.random() * filtered.length)]
          : available[0];

        const bDex = DEX[Math.floor(Math.random() * DEX.length)].name;
        let sDex = DEX[Math.floor(Math.random() * DEX.length)].name;
        while(sDex === bDex) sDex = DEX[Math.floor(Math.random() * DEX.length)].name;

        setSignal({
          coin: nextCoin.id,
          buyDex: bDex,
          sellDex: sDex,
          perc: (Math.random() * (3.0 - 1.5) + 1.5).toFixed(2)
        });
        setIsAnalyzing(false);
      }, 3000);
    };

    if (tab === 'trade' && !signal && !activePos) {
      generateNewSignal();
    }
  }, [tab, signal, activePos, level]);

  const handleOpenPosition = (coinId) => {
    if (balance >= amount) {
      setBalance(b => b - amount);
      setActivePos({ id: coinId, buyDex: selectedDex, amount, leverage, startTime: Date.now() });
    }
  };

  const handleSell = () => {
    setNetTimer(8);
    const itv = setInterval(() => {
      setNetTimer(p => {
        if (p <= 1) {
          clearInterval(itv);
          const isCorrect = signal && activePos.id === signal.coin && activePos.buyDex === signal.buyDex && selectedDex === signal.sellDex;
          const winChance = isCorrect ? 0.85 : 0.20; 
          const win = Math.random() < winChance;
          
          let pnl;
          if (win) {
            const winPerc = (Math.random() * (0.03 - 0.02) + 0.02); // 2-3% профита
            pnl = activePos.amount * activePos.leverage * winPerc;
            setTradesInLevel(t => (t + 1 >= neededTrades) ? 0 : t + 1);
            if (tradesInLevel + 1 >= neededTrades) setLevel(l => l + 1);
          } else {
            const lossPerc = (Math.random() * (0.015 - 0.005) + 0.005); // 0.5-1.5% минуса
            pnl = -(activePos.amount * activePos.leverage * lossPerc);
            setIsBurning(true);
            setTimeout(() => setIsBurning(false), 800);
            setTradesInLevel(t => Math.max(0, t - 1));
          }
          setBalance(b => Math.max(0, b + activePos.amount + pnl));
          setResult({ win, val: Math.abs(pnl).toFixed(2) });
          setActivePos(null);
          setSignal(null); // Сбрасываем сигнал, чтобы сгенерировался НОВЫЙ
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
    if (!fxEnabled) return;
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    if (x && y) {
      const id = Date.now();
      setClicks(prev => [...prev, { id, x, y }]);
      setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 600);
    }
  };

  return (
    <div className={`v ${isBurning ? 'burn' : ''}`} onMouseDown={handleAction} onTouchStart={handleAction} style={{
      width: '100vw', height: '100dvh', background: '#000', color: '#fff', overflow: 'hidden', position: 'relative'
    }}>
      <style>{`
        :root { --neon: #00f2ff; --win: #00ff88; --loss: #ff0055; --gold: #ffcc00; }
        * { box-sizing: border-box; font-family: 'Orbitron', sans-serif; user-select: none; }
        .neon-text { text-shadow: 0 0 10px var(--neon), 0 0 20px var(--neon); color: #fff; }
        .win-text { text-shadow: 0 0 10px var(--win); color: var(--win); }
        .loss-text { text-shadow: 0 0 10px var(--loss); color: var(--loss); }
        .card { background: rgba(15,15,15,0.95); border: 1px solid var(--neon); box-shadow: 0 0 15px rgba(0,242,255,0.15); border-radius: 12px; padding: 15px; margin-bottom: 12px; }
        .btn { width: 100%; padding: 15px; border-radius: 8px; border: none; font-weight: 900; cursor: pointer; text-transform: uppercase; }
        .dollar { position: absolute; color: var(--win); font-weight: 900; pointer-events: none; animation: pop 0.6s ease-out forwards; z-index: 9999; font-size: 32px; text-shadow: 0 0 15px var(--win); }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-130px); } }
        input { background: #000; border: 1px solid var(--neon); color: var(--neon); padding: 12px; border-radius: 8px; width: 100%; text-align: center; font-size: 18px; outline: none; box-shadow: inset 0 0 5px var(--neon); }
        .nav { position: absolute; bottom: 0; width: 100%; height: 75px; background: #050505; border-top: 1px solid #222; display: flex; z-index: 1000; }
        .nav-item { flex:1; display:flex; flex-direction: column; align-items:center; justify-content:center; font-size: 10px; font-weight: 900; cursor: pointer; }
        .st-offer { border: 1px solid var(--gold); background: rgba(255,204,0,0.05); padding: 15px; border-radius: 12px; text-decoration: none; display: block; margin: 10px 0; text-align: center; }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-15, top: c.y-25}}>$</div>)}

      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.98)', zIndex:20000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
          <div className="card" style={{borderColor: result.win ? 'var(--win)' : 'var(--loss)', width: '100%', textAlign: 'center', padding: '40px 20px'}}>
            <h2 className={result.win ? 'win-text' : 'loss-text'}>{result.win ? 'SUCCESS' : 'LOSS'}</h2>
            <h1 style={{fontSize: 48, margin: '20px 0'}} className="neon-text">{result.win ? '+' : '-'}${result.val}</h1>
            <button className="btn" style={{background: '#fff', color: '#000'}} onClick={() => setResult(null)}>CONTINUE</button>
          </div>
        </div>
      )}

      <div style={{maxWidth: 500, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column'}}>
        <header style={{padding: '25px 20px', borderBottom: '1px solid #1a1a1a'}}>
          <div style={{fontSize: 9, color: '#444', marginBottom: 4}}>{userId}</div>
          <div className="neon-text" style={{fontSize: 38, fontWeight: 900}}>${displayBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div style={{display:'flex', justifyContent:'space-between', marginTop: 15}}>
            <span className="win-text" style={{fontSize: 12, fontWeight: 900}}>LVL {level}</span>
            <span style={{color: '#444', fontSize: 11}}>PROGRESS: {tradesInLevel}/{neededTrades}</span>
          </div>
          <div style={{width:'100%', height:4, background:'#111', marginTop:8, borderRadius:4, overflow:'hidden'}}>
            <div style={{width:`${(tradesInLevel/neededTrades)*100}%`, height:'100%', background:'var(--neon)', boxShadow: '0 0 10px var(--neon)'}} />
          </div>
        </header>

        <main style={{flex:1, overflowY:'auto', padding: 20, paddingBottom: 90}}>
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="card" style={{borderColor: 'var(--gold)'}}>
                    {isAnalyzing ? <div className="win-text" style={{textAlign:'center', fontSize: 11}}>SCANNING MARKETS...</div> : (
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div>
                          <div className="neon-text" style={{fontSize: 20}}>{signal.coin}/USDT</div>
                          <div style={{fontSize: 10, color: '#666', marginTop: 4}}>{signal.buyDex} → {signal.sellDex}</div>
                        </div>
                        <div className="win-text" style={{fontSize: 24, fontWeight: 900}}>+{signal.perc}%</div>
                      </div>
                    )}
                  </div>

                  <a href="https://t.me/vladstelin78" className="st-offer">
                    <div style={{color: 'var(--gold)', fontSize: 10, fontWeight: 900, marginBottom: 5}}>VIP ACADEMY</div>
                    <div style={{color: '#fff', fontSize: 12}}>Менеджер: @vladstelin78</div>
                  </a>

                  <div style={{fontSize: 10, color: '#333', marginBottom: 10, fontWeight: 900}}>SELECT TERMINAL:</div>
                  {DEX.map(d => (
                    <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{cursor:'pointer', display:'flex', justifyContent:'space-between'}}>
                      <b style={{fontSize: 16}}>{d.name}</b>
                      <span className="win-text" style={{fontSize: 10}}>ONLINE</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div onClick={() => setSelectedDex(null)} style={{color:'var(--neon)', marginBottom: 20, fontSize: 11, cursor:'pointer', fontWeight: 900}}>← BACK TO HUB</div>
                  
                  {/* КАЛЬКУЛЯТОР ПРОФИТА */}
                  <div className="card" style={{background: '#080808'}}>
                    <div style={{display:'flex', gap:10, marginBottom: 15}}>
                      <div style={{flex:1}}><label style={{fontSize: 9, color: '#444'}}>AMOUNT</label><input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))}/></div>
                      <div style={{flex:1}}><label style={{fontSize: 9, color: '#444'}}>LEVERAGE (MAX {maxLev}x)</label><input type="number" value={leverage} onChange={e=>setLeverage(Math.min(maxLev, Number(e.target.value)))}/></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize: 11, fontWeight: 900}}>
                      <span>WIN ESTIMATE: <span className="win-text">+${potentialWin}</span></span>
                      <span>LOSS ESTIMATE: <span className="loss-text">-${potentialLoss}</span></span>
                    </div>
                  </div>

                  {COINS_DATA.map(c => {
                    const isActive = activePos?.id === c.id;
                    return (
                      <div key={c.id} className="card" style={{opacity: c.lvl > level ? 0.2 : 1}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <div><div className="neon-text" style={{fontSize: 18}}>{c.id}</div><div style={{fontSize: 11, color: '#444'}}>${c.base}</div></div>
                          {isActive ? (
                            <button className="btn" style={{background: 'var(--loss)', color: '#fff', width: 130}} onClick={handleSell}>{netTimer ? `SYNC ${netTimer}s` : 'SELL'}</button>
                          ) : (
                            <button className="btn" style={{background: 'var(--win)', color: '#000', width: 120}} disabled={!!activePos || c.lvl > level} onClick={() => handleOpenPosition(c.id)}>BUY</button>
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
            <div style={{height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
               <div onClick={() => setBalance(b => b + 0.20)} style={{width: 260, height: 260, border: '6px solid #111', borderTopColor: 'var(--neon)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 45, color: 'var(--neon)', fontWeight: '900', cursor: 'pointer', boxShadow: '0 0 40px rgba(0,242,255,0.1)'}}>TAP</div>
               <div className="neon-text" style={{marginTop: 30, fontSize: 12}}>MINING...</div>
            </div>
          )}

          {tab === 'opts' && (
            <div>
              <div className="neon-text" style={{fontSize: 22, marginBottom: 25, textAlign: 'center', fontWeight: 900}}>SETTINGS</div>
              <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                <span style={{fontSize: 14}}>SOUND</span>
                <button onClick={() => setSoundEnabled(!soundEnabled)} style={{background: soundEnabled ? 'var(--win)' : '#333', border:'none', padding:'10px', borderRadius:8, width: 80, fontWeight: 900}}>{soundEnabled ? 'ON' : 'OFF'}</button>
              </div>
              <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                <span style={{fontSize: 14}}>CLICK FX ($)</span>
                <button onClick={() => setFxEnabled(!fxEnabled)} style={{background: fxEnabled ? 'var(--win)' : '#333', border:'none', padding:'10px', borderRadius:8, width: 80, fontWeight: 900}}>{fxEnabled ? 'ON' : 'OFF'}</button>
              </div>
              <a href="https://t.me/kriptoalians" style={{textDecoration:'none'}}>
                <div className="card" style={{textAlign:'center', borderColor: 'var(--gold)', color: 'var(--gold)', fontWeight: 900}}>CREATORS: @kriptoalians</div>
              </a>
            </div>
          )}
        </main>

        <nav className="nav">
          <div onClick={() => setTab('mining')} className="nav-item" style={{color: tab === 'mining' ? 'var(--neon)' : '#444'}}>
             <span style={{fontSize: 22}}>⚡</span><span>FARM</span>
          </div>
          <div onClick={() => setTab('trade')} className="nav-item" style={{color: tab === 'trade' ? 'var(--neon)' : '#444'}}>
             <span style={{fontSize: 22}}>💹</span><span>TRADE</span>
          </div>
          <div onClick={() => setTab('opts')} className="nav-item" style={{color: tab === 'opts' ? 'var(--neon)' : '#444'}}>
             <span style={{fontSize: 22}}>⚙️</span><span>SETTINGS</span>
          </div>
        </nav>
      </div>
    </div>
  );
}
