import React, { useState, useEffect, useRef } from 'react';

const COINS_DATA = [
  { id: 'TON', base: 5.42, lvl: 1 }, { id: 'DOGE', base: 0.15, lvl: 1 },
  { id: 'NEAR', base: 6.12, lvl: 1 }, { id: 'TRX', base: 0.11, lvl: 2 },
  { id: 'SOL', base: 145.30, lvl: 3 }, { id: 'ETH', base: 2640, lvl: 4 },
  { id: 'XRP', base: 0.62, lvl: 5 }, { id: 'ADA', base: 0.45, lvl: 6 },
  { id: 'AVAX', base: 34.20, lvl: 7 }, { id: 'BNB', base: 590, lvl: 8 },
  { id: 'PEPE', base: 0.000008, lvl: 9 }, { id: 'BTC', base: 96200, lvl: 10 }
];

const DEX_CONFIGS = {
  'UNISWAP': { bg: '#190a24', accent: '#ff007a', card: '#212429', btn: '#ff007a', title: 'Uniswap Interface' },
  'PANCAKE': { bg: '#08060b', accent: '#1fc7d4', card: '#27262c', btn: '#1fc7d4', title: 'PancakeSwap' },
  'RAYDIUM': { bg: '#0c0d21', accent: '#39f2af', card: 'rgba(20,22,46,0.8)', btn: '#39f2af', title: 'Raydium (Solana)' },
  '1INCH': { bg: '#060e17', accent: '#2b6aff', card: '#111d2c', btn: '#2b6aff', title: '1inch Aggregator' }
};

export default function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('st_bal')) || 1000.00);
  const [level, setLevel] = useState(() => Number(localStorage.getItem('st_lvl')) || 1);
  const [totalTrades, setTotalTrades] = useState(() => Number(localStorage.getItem('st_total')) || 0);
  const [tab, setTab] = useState('trade');
  const [selectedDex, setSelectedDex] = useState(null);
  const [amount, setAmount] = useState(100);
  const [leverage, setLeverage] = useState(5);
  const [activeTrade, setActiveTrade] = useState(null); 
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncTimer, setSyncTimer] = useState(0);
  const [signal, setSignal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [result, setResult] = useState(null);
  const [clicks, setClicks] = useState([]);
  const [isShaking, setIsShaking] = useState(false);

  const clickSound = useRef(null);
  const showCrash = signal?.isCrash && !selectedDex && tab === 'trade';

  useEffect(() => {
    localStorage.setItem('st_bal', balance.toFixed(2));
    localStorage.setItem('st_total', totalTrades);
    if (!clickSound.current) {
        clickSound.current = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
        clickSound.current.volume = 0.05;
    }
  }, [balance, totalTrades]);

  useEffect(() => {
    if (tab === 'trade' && !signal && !activeTrade) {
      setIsAnalyzing(true);
      const timer = setTimeout(() => {
        const avail = COINS_DATA.filter(c => c.lvl <= level);
        const coin = avail[Math.floor(Math.random() * avail.length)];
        const bDex = Object.keys(DEX_CONFIGS)[Math.floor(Math.random() * 4)];
        let sDex = Object.keys(DEX_CONFIGS)[Math.floor(Math.random() * 4)];
        while(sDex === bDex) sDex = Object.keys(DEX_CONFIGS)[Math.floor(Math.random() * 4)];
        setSignal({ coin: coin.id, buyDex: bDex, sellDex: sDex, perc: (Math.random() * 5 + 2).toFixed(2), isCrash: Math.random() < 0.15 });
        setIsAnalyzing(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [tab, signal, activeTrade, level]);

  const finalizeTrade = () => {
    const isWin = selectedDex === signal.sellDex && Math.random() < 0.9;
    let pnl = isWin ? (amount * leverage * (parseFloat(signal.perc)/100)) : -(amount * leverage * 0.1);
    if (!isWin) { setIsShaking(true); setTimeout(()=>setIsShaking(false), 500); }
    setBalance(b => b + amount + pnl);
    setTotalTrades(t => t + 1);
    setResult({ win: isWin, val: Math.abs(pnl).toFixed(2) });
    setActiveTrade(null); setSignal(null); setSelectedDex(null); setIsSyncing(false);
  };

  const handleGlobalClick = (e) => {
    if (clickSound.current) { clickSound.current.currentTime = 0; clickSound.current.play().catch(()=>{}); }
    const x = e.clientX || e.touches?.[0].clientX;
    const y = e.clientY || e.touches?.[0].clientY;
    if (x) {
      const id = Date.now();
      setClicks(prev => [...prev, { id, x, y }]);
      setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 600);
    }
  };

  const currentTheme = selectedDex ? DEX_CONFIGS[selectedDex] : { bg: '#000', accent: '#00f2ff' };

  return (
    <div onPointerDown={handleGlobalClick} className={isShaking ? 'shake' : ''} style={{
      width:'100vw', height:'100dvh', background: showCrash ? '#200' : currentTheme.bg, color:'#fff', 
      fontFamily:'sans-serif', overflow:'hidden', display:'flex', flexDirection:'column', transition:'all 0.5s'
    }}>
      <style>{`
        @keyframes pop { 0%{opacity:1; transform:translateY(0)} 100%{opacity:0; transform:translateY(-100px)} }
        .dollar { position:absolute; color:#00ff88; font-weight:900; animation:pop 0.6s forwards; z-index:99; pointer-events:none; }
        .shake { animation: shake 0.5s; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
        .dex-card { background: ${currentTheme.card}; border-radius: 24px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.05); }
        .nav-btn { flex:1; display:flex; flexDirection:column; alignItems:center; fontSize:10px; opacity:0.5; }
        .nav-active { opacity:1; color: ${currentTheme.accent}; }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{left:c.x, top:c.y}}>$</div>)}

      {/* Header */}
      <div style={{padding:20, display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
        <b style={{fontSize:22, color: currentTheme.accent}}>${balance.toLocaleString()}</b>
        <div style={{fontSize:12, opacity:0.6}}>LVL {level}</div>
      </div>

      <div style={{flex:1, overflowY:'auto', padding:20}}>
        {tab === 'trade' && (
          <>
            <div style={{textAlign:'center', marginBottom:20}}>
              <a href="https://t.me/vladstelin78" style={{color:'#ffcc00', fontSize:12, textDecoration:'none'}}>MANAGER SUPPORT</a>
            </div>

            {/* Signal Box */}
            <div className="dex-card" style={{marginBottom:20, textAlign:'center', borderColor: showCrash ? '#f00' : ''}}>
              {isAnalyzing ? "АНАЛИЗ РЫНКА..." : (
                <div>
                    <div style={{fontSize:10, opacity:0.5}}>РЕКОМЕНДАЦИЯ</div>
                    <div style={{fontSize:20, fontWeight:'bold', color: showCrash ? '#f00' : '#00ff88'}}>{signal?.coin} +{signal?.perc}%</div>
                    <div style={{fontSize:11}}>{signal?.buyDex} → {signal?.sellDex}</div>
                </div>
              )}
            </div>

            {/* DEX INTERFACE SELECTOR / WORKSPACE */}
            {!selectedDex ? (
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:15}}>
                {Object.keys(DEX_CONFIGS).map(name => (
                  <div key={name} onClick={()=>setSelectedDex(name)} style={{
                    padding:20, background:DEX_CONFIGS[name].card, borderRadius:16, textAlign:'center', 
                    borderBottom:`4px solid ${DEX_CONFIGS[name].accent}`, cursor:'pointer'
                  }}>
                    <div style={{fontSize:14, fontWeight:'bold'}}>{name}</div>
                    <div style={{fontSize:10, opacity:0.5}}>ОТКРЫТЬ ТЕРМИНАЛ</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dex-workspace">
                <div onClick={()=>setSelectedDex(null)} style={{fontSize:12, marginBottom:15, color:currentTheme.accent}}>← НАЗАД К СПИСКУ</div>
                
                {/* Эмуляция структуры биржи */}
                <div className="dex-card">
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                    <b style={{fontSize:14}}>{DEX_CONFIGS[selectedDex].title}</b>
                    <span style={{fontSize:10, color:currentTheme.accent}}>● Live</span>
                  </div>

                  <div style={{background:'rgba(0,0,0,0.2)', padding:15, borderRadius:12, marginBottom:10}}>
                    <small style={{fontSize:10, opacity:0.5}}>YOU PAY</small>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} 
                             style={{background:'none', border:'none', color:'#fff', fontSize:20, outline:'none', width:'60%'}} />
                      <b>USD</b>
                    </div>
                  </div>

                  <div style={{background:'rgba(0,0,0,0.2)', padding:15, borderRadius:12, marginBottom:20}}>
                    <small style={{fontSize:10, opacity:0.5}}>YOU RECEIVE (x{leverage})</small>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div style={{fontSize:20}}>{signal?.coin || '...'}</div>
                      <div style={{color:'#00ff88'}}>+${(amount*leverage*(parseFloat(signal?.perc||0)/100)).toFixed(2)}</div>
                    </div>
                  </div>

                  {COINS_DATA.map(c => (
                    c.lvl <= level && (
                      <button key={c.id} onClick={()=>buyCoin(c.id)} disabled={activeTrade} style={{
                        width:'100%', padding:15, borderRadius:12, background:currentTheme.btn, 
                        color:'#000', fontWeight:'bold', border:'none', marginBottom:5, opacity: activeTrade ? 0.5 : 1
                      }}>
                        {activeTrade ? `В СДЕЛКЕ: ${c.id}` : `ОБМЕНЯТЬ НА ${c.id}`}
                      </button>
                    )
                  ))}

                  {activeTrade && (
                    <button onClick={sellCoin} style={{
                        width:'100%', padding:15, borderRadius:12, background:'#ff0055', 
                        color:'#fff', fontWeight:'bold', border:'none', marginTop:10
                    }}>
                      {isSyncing ? `ЗАКРЫТИЕ ${syncTimer}s` : "ЗАКРЫТЬ ПОЗИЦИЮ"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'opts' && (
          <div className="dex-card">
            <h3>SETTINGS</h3>
            <div style={{marginBottom:15}}>Сделок всего: {totalTrades}</div>
            <a href="https://t.me/kriptoalians" style={{color:currentTheme.accent, textDecoration:'none', fontWeight:'bold'}}>CREATORS: @KRIPTOALIANS</a>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{height:80, display:'flex', alignItems:'center', background:'rgba(0,0,0,0.8)', borderTop:'1px solid rgba(255,255,255,0.05)'}}>
        <div onClick={()=>setTab('trade')} className={`nav-btn ${tab==='trade'?'nav-active':''}`}><span>📈</span>TRADE</div>
        <div onClick={()=>setTab('opts')} className={`nav-btn ${tab==='opts'?'nav-active':''}`}><span>⚙️</span>OPTS</div>
      </div>

      {/* Result Pop-up */}
      {result && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.9)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:40}}>
          <div className="dex-card" style={{textAlign:'center', width:'100%'}}>
            <h1 style={{color: result.win ? '#00ff88' : '#ff0055'}}>{result.win ? 'SUCCESS' : 'FAIL'}</h1>
            <div style={{fontSize:24, marginBottom:20}}>${result.val}</div>
            <button onClick={()=>setResult(null)} className="btn" style={{background:'#fff', color:'#000'}}>CONTINUE</button>
          </div>
        </div>
      )}
    </div>
  );

  function buyCoin(id) {
    if (balance >= amount) {
      setBalance(b => b - amount);
      setActiveTrade({ id });
    }
  }

  function sellCoin() {
    setIsSyncing(true); setSyncTimer(5);
    const itv = setInterval(() => {
      setSyncTimer(s => {
        if (s <= 1) { clearInterval(itv); finalizeTrade(); return 0; }
        return s - 1;
      });
    }, 1000);
  }
}
