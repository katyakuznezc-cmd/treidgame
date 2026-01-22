import React, { useState, useEffect } from 'react';

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

const STRINGS = {
  RU: {
    farm: "ФАРМ", trade: "ТРЕЙД", sets: "ОПЦИИ", 
    scan: "АНАЛИЗ РЫНКА...", terminal: "ВЫБЕРИТЕ ТЕРМИНАЛ:", 
    invest: "СУММА ($)", lev: "ПЛЕЧО", profit: "ПРОФИТ", risk: "РИСК",
    buy: "КУПИТЬ", sell: "ПРОДАТЬ", sync: "СИНХРОНИЗАЦИЯ", 
    lang: "ЯЗЫК", sound: "ЗВУК", fx: "ЭФФЕКТЫ ($)",
    tutorial: ["Добро пожаловать! На вкладке ФАРМ добывай начальный капитал.", "В ТРЕЙДЕ следи за сигналами: покупай на одной бирже, продавай на другой.", "Повышай уровень, чтобы разблокировать новые монеты и плечо!"],
    next: "ДАЛЕЕ", start: "ПОНЯЛ!"
  },
  EN: {
    farm: "FARM", trade: "TRADE", sets: "SETS", 
    scan: "SCANNING...", terminal: "SELECT TERMINAL:", 
    invest: "INVEST ($)", lev: "LEVERAGE", profit: "PROFIT", risk: "RISK",
    buy: "BUY", sell: "SELL", sync: "SYNCING", 
    lang: "LANG", sound: "SOUND", fx: "CLICK FX ($)",
    tutorial: ["Welcome! Use FARM tab to get your starting capital.", "In TRADE follow signals: buy on one exchange, sell on another.", "Level up to unlock new coins and higher leverage!"],
    next: "NEXT", start: "GOT IT!"
  }
};

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('st_lang') || 'RU');
  const T = STRINGS[lang];

  const [balance, setBalance] = useState(() => Number(localStorage.getItem('st_bal')) || 1000.00);
  const [displayBalance, setDisplayBalance] = useState(balance);
  const [level, setLevel] = useState(() => Number(localStorage.getItem('st_lvl')) || 1);
  const [tradesInLevel, setTradesInLevel] = useState(() => Number(localStorage.getItem('st_prog')) || 0);
  const [userId] = useState(() => localStorage.getItem('st_user_id') || `ID-${Math.floor(100000 + Math.random() * 899999)}`);
  
  const [tab, setTab] = useState('trade');
  const [selectedDex, setSelectedDex] = useState(null);
  const [amount, setAmount] = useState(100);
  const [leverage, setLeverage] = useState(5); 
  const [activePos, setActivePos] = useState(null); 
  const [netTimer, setNetTimer] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [signal, setSignal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [result, setResult] = useState(null);
  const [isBurning, setIsBurning] = useState(false);
  const [clicks, setClicks] = useState([]); 
  
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('cfg_snd') !== 'false');
  const [fxEnabled, setFxEnabled] = useState(() => localStorage.getItem('cfg_fx') !== 'false');
  
  // ОБУЧЕНИЕ
  const [showTut, setShowTut] = useState(() => !localStorage.getItem('st_tut_done'));
  const [tutStep, setTutStep] = useState(0);

  const neededTrades = level === 1 ? 15 : level === 2 ? 35 : 75;
  const maxLev = level === 1 ? 5 : level === 2 ? 20 : 100;

  const potentialWin = (amount * leverage * 0.03).toFixed(2);
  const potentialLoss = (amount * leverage * 0.015).toFixed(2);

  useEffect(() => {
    localStorage.setItem('st_bal', balance.toFixed(2));
    localStorage.setItem('st_lvl', level.toString());
    localStorage.setItem('st_prog', tradesInLevel.toString());
    localStorage.setItem('st_lang', lang);
    localStorage.setItem('cfg_snd', soundEnabled);
    localStorage.setItem('cfg_fx', fxEnabled);
  }, [balance, level, tradesInLevel, lang, soundEnabled, fxEnabled]);

  useEffect(() => {
    if (Math.abs(displayBalance - balance) > 0.01) {
      const diff = balance - displayBalance;
      const timer = setTimeout(() => setDisplayBalance(displayBalance + diff / 5), 25);
      return () => clearTimeout(timer);
    } else { setDisplayBalance(balance); }
  }, [balance, displayBalance]);

  useEffect(() => {
    let timer;
    if (tab === 'trade' && !signal && !activePos) {
      setIsAnalyzing(true);
      timer = setTimeout(() => {
        const available = COINS_DATA.filter(c => c.lvl <= level);
        const filtered = available.filter(c => c.id !== signal?.coin);
        const nextCoin = filtered.length > 0 ? filtered[Math.floor(Math.random() * filtered.length)] : available[0];
        const bDex = DEX[Math.floor(Math.random() * DEX.length)].name;
        let sDex = DEX[Math.floor(Math.random() * DEX.length)].name;
        while(sDex === bDex) sDex = DEX[Math.floor(Math.random() * DEX.length)].name;
        setSignal({ coin: nextCoin.id, buyDex: bDex, sellDex: sDex, perc: (Math.random() * 1.5 + 1.5).toFixed(2) });
        setIsAnalyzing(false);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [tab, signal, activePos, level]);

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

  const sellPos = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setNetTimer(8);
    const itv = setInterval(() => {
      setNetTimer(p => {
        if (p <= 1) {
          clearInterval(itv);
          const isCorrect = signal && activePos.id === signal.coin && activePos.buyDex === signal.buyDex && selectedDex === signal.sellDex;
          const win = Math.random() < (isCorrect ? 0.9 : 0.2);
          let pnl;
          if (win) {
            pnl = activePos.amount * activePos.leverage * (Math.random() * 0.015 + 0.015);
            setTradesInLevel(t => (t + 1 >= neededTrades) ? 0 : t + 1);
            if (tradesInLevel + 1 >= neededTrades) setLevel(l => l + 1);
          } else {
            pnl = -(activePos.amount * activePos.leverage * (Math.random() * 0.01 + 0.005));
            setIsBurning(true); setTimeout(() => setIsBurning(false), 800);
            setTradesInLevel(t => Math.max(0, t - 1));
          }
          setBalance(b => Math.max(0, b + activePos.amount + pnl));
          setResult({ win, val: Math.abs(pnl).toFixed(2) });
          setActivePos(null); setSignal(null); setIsProcessing(false);
          return null;
        }
        return p - 1;
      });
    }, 1000);
  };

  return (
    <div className={`app ${isBurning ? 'burn' : ''}`} onMouseDown={handleAction} onTouchStart={handleAction} style={{
      width: '100vw', height: '100dvh', background: '#000', color: '#fff', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column'
    }}>
      <style>{`
        * { box-sizing: border-box; font-family: 'Orbitron', sans-serif; user-select: none; }
        .neon { text-shadow: 0 0 10px #00f2ff; color: #fff; }
        .win { color: #00ff88; text-shadow: 0 0 10px #00ff88; }
        .loss { color: #ff0055; text-shadow: 0 0 10px #ff0055; }
        .card { background: #0a0a0a; border: 1px solid #00f2ff; border-radius: 12px; padding: 15px; margin-bottom: 12px; }
        .btn { width: 100%; padding: 15px; border-radius: 8px; border: none; font-weight: 900; cursor: pointer; text-transform: uppercase; }
        .btn:disabled { opacity: 0.5; }
        .dollar { position: absolute; color: #00ff88; font-weight: 900; pointer-events: none; animation: pop 0.6s ease-out forwards; z-index: 999; font-size: 32px; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-120px); } }
        input { background: #000; border: 1px solid #00f2ff; color: #00f2ff; padding: 10px; border-radius: 8px; width: 100%; text-align: center; font-size: 16px; outline: none; }
        .nav { height: 75px; background: #050505; border-top: 1px solid #222; display: flex; width: 100%; }
        .nav-item { flex:1; display:flex; flex-direction: column; align-items:center; justify-content:center; font-size: 9px; font-weight: 900; cursor: pointer; }
        .burn { animation: flash 0.2s infinite; }
        @keyframes flash { 0% { background: #000; } 50% { background: #200; } 100% { background: #000; } }
        .tut-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.9); z-index:5000; display:flex; align-items:center; justifyContent:center; padding:30px; }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x-15, top: c.y-25}}>$</div>)}

      {/* ОБУЧЕНИЕ */}
      {showTut && (
        <div className="tut-overlay">
          <div className="card" style={{textAlign:'center', width:'100%'}}>
            <h3 className="neon">ARBITRAGE PRO</h3>
            <p style={{fontSize:14, margin:'20px 0', lineHeight:'1.5'}}>{T.tutorial[tutStep]}</p>
            <button className="btn" style={{background:'#00f2ff', color:'#000'}} onClick={() => {
              if (tutStep < T.tutorial.length - 1) setTutStep(s => s + 1);
              else { setShowTut(false); localStorage.setItem('st_tut_done', 'true'); }
            }}>
              {tutStep < T.tutorial.length - 1 ? T.next : T.start}
            </button>
          </div>
        </div>
      )}

      {/* РЕЗУЛЬТАТ СДЕЛКИ */}
      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.95)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20}}>
          <div className="card" style={{borderColor: result.win ? '#00ff88' : '#ff0055', width: '100%', textAlign: 'center'}}>
            <h2 className={result.win ? 'win' : 'loss'}>{result.win ? 'WIN' : 'LOSS'}</h2>
            <h1 className="neon" style={{fontSize: 42}}>{result.win ? '+' : '-'}${result.val}</h1>
            <button className="btn" style={{background: '#fff', color: '#000'}} onClick={() => setResult(null)}>OK</button>
          </div>
        </div>
      )}

      <header style={{padding: '20px', borderBottom: '1px solid #1a1a1a'}}>
        <div style={{fontSize: 9, color: '#444'}}>{userId}</div>
        <div className="neon" style={{fontSize: 32, fontWeight: 900}}>${displayBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
        <div style={{display:'flex', justifyContent:'space-between', marginTop: 10, fontSize: 10}}>
          <span className="win">LVL {level}</span>
          <span>{tradesInLevel}/{neededTrades} EXP</span>
        </div>
        <div style={{width:'100%', height:3, background:'#111', marginTop:5, borderRadius:2, overflow:'hidden'}}>
          <div style={{width:`${(tradesInLevel/neededTrades)*100}%`, height:'100%', background:'#00f2ff'}} />
        </div>
      </header>

      <main style={{flex:1, overflowY:'auto', padding: 20}}>
        {tab === 'trade' && (
          <>
            {!selectedDex ? (
              <div>
                <div className="card" style={{borderColor: '#ffcc00'}}>
                  {isAnalyzing ? <div className="win" style={{textAlign:'center', fontSize: 11}}>{T.scan}</div> : (
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <div className="neon" style={{fontSize: 18}}>{signal.coin}/USDT</div>
                        <div style={{fontSize: 9, color: '#666'}}>{signal.buyDex} → {signal.sellDex}</div>
                      </div>
                      <div className="win" style={{fontSize: 22, fontWeight: 900}}>+{signal.perc}%</div>
                    </div>
                  )}
                </div>
                <div style={{fontSize: 10, color: '#444', marginBottom: 10, fontWeight: 900}}>{T.terminal}</div>
                {DEX.map(d => (
                  <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{cursor:'pointer', display:'flex', justifyContent:'space-between'}}>
                    <b>{d.name}</b>
                    <span className="win" style={{fontSize: 9}}>ONLINE</span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div onClick={() => setSelectedDex(null)} style={{color:'#00f2ff', marginBottom: 15, fontSize: 11, cursor:'pointer'}}>← BACK</div>
                <div className="card" style={{background: '#050505'}}>
                  <div style={{display:'flex', gap:10, marginBottom: 12}}>
                    <div style={{flex:1}}><label style={{fontSize: 8, color: '#444'}}>{T.invest}</label><input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))}/></div>
                    <div style={{flex:1}}><label style={{fontSize: 8, color: '#444'}}>{T.lev} (MAX {maxLev})</label><input type="number" value={leverage} onChange={e=>setLeverage(Math.min(maxLev, Number(e.target.value)))}/></div>
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize: 9, fontWeight: 900}}>
                    <span>{T.profit}: <span className="win">+${potentialWin}</span></span>
                    <span>{T.risk}: <span className="loss">-${potentialLoss}</span></span>
                  </div>
                </div>
                {COINS_DATA.map(c => {
                  const isAct = activePos?.id === c.id;
                  return (
                    <div key={c.id} className="card" style={{opacity: c.lvl > level ? 0.3 : 1}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div><div className="neon">{c.id}</div><div style={{fontSize: 10}}>${c.base}</div></div>
                        {isAct ? (
                          <button className="btn" style={{background:'#ff0055', color:'#fff', width:120}} disabled={isProcessing} onClick={sellPos}>
                            {netTimer ? `${T.sync} ${netTimer}s` : T.sell}
                          </button>
                        ) : (
                          <button className="btn" style={{background:'#00ff88', color:'#000', width:90}} disabled={!!activePos || c.lvl > level} onClick={() => {
                            if (balance >= amount) { setBalance(b => b - amount); setActivePos({ id: c.id, buyDex: selectedDex, amount, leverage }); }
                          }}>{T.buy}</button>
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
          <div style={{height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
             <div onClick={() => setBalance(b => b + 0.15)} style={{width: 220, height: 220, border: '6px solid #111', borderTopColor: '#00f2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#00f2ff', fontWeight: '900', cursor: 'pointer'}}>TAP</div>
             <div className="neon" style={{marginTop: 30, fontSize: 11}}>LIQUIDITY GEN...</div>
          </div>
        )}

        {tab === 'opts' && (
          <div>
            <div className="neon" style={{fontSize: 18, marginBottom: 20, textAlign: 'center', fontWeight: 900}}>{T.sets}</div>
            <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
              <span>{T.lang}</span>
              <button onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')} style={{background: '#00f2ff', border:'none', padding:'8px', borderRadius:6, width: 70, fontWeight: 900}}>{lang}</button>
            </div>
            <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
              <span>{T.sound}</span>
              <button onClick={() => setSoundEnabled(!soundEnabled)} style={{background: soundEnabled ? '#00ff88' : '#333', border:'none', padding:'8px', borderRadius:6, width: 70, fontWeight: 900}}>{soundEnabled ? 'ON' : 'OFF'}</button>
            </div>
            <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
              <span>{T.fx}</span>
              <button onClick={() => setFxEnabled(!fxEnabled)} style={{background: fxEnabled ? '#00ff88' : '#333', border:'none', padding:'8px', borderRadius:6, width: 70, fontWeight: 900}}>{fxEnabled ? 'ON' : 'OFF'}</button>
            </div>
            <a href="https://t.me/kriptoalians" style={{textDecoration:'none'}}>
              <div className="card" style={{textAlign:'center', borderColor: '#ffcc00', color: '#ffcc00', fontSize: 12}}>@kriptoalians</div>
            </a>
          </div>
        )}
      </main>

      <nav className="nav">
        <div onClick={() => setTab('mining')} className="nav-item" style={{color: tab === 'mining' ? '#00f2ff' : '#444'}}>⚡ {T.farm}</div>
        <div onClick={() => setTab('trade')} className="nav-item" style={{color: tab === 'trade' ? '#00f2ff' : '#444'}}>💹 {T.trade}</div>
        <div onClick={() => setTab('opts')} className="nav-item" style={{color: tab === 'opts' ? '#00f2ff' : '#444'}}>⚙️ {T.sets}</div>
      </nav>
    </div>
  );
}
