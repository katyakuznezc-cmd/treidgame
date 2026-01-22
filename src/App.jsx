import React, { useState, useEffect, useRef } from 'react';

const COINS_DATA = [
  { id: 'TON', lvl: 1, base: 5.42, desc: { RU: 'Токен Telegram.', EN: 'Telegram Token.' } },
  { id: 'DOGE', lvl: 1, base: 0.15, desc: { RU: 'Мем-коин.', EN: 'Meme coin.' } },
  { id: 'SOL', lvl: 2, base: 145.3, desc: { RU: 'Скоростной блокчейн.', EN: 'Fast blockchain.' } },
  { id: 'BTC', lvl: 5, base: 95000, desc: { RU: 'Цифровое золото.', EN: 'Digital gold.' } },
];

const EXCHANGES = [
  { id: '1inch', name: '1INCH', color: '#00ccff' },
  { id: 'uniswap', name: 'UNISWAP', color: '#ff007a' },
  { id: 'pancakeswap', name: 'PANCAKE', color: '#d1884f' }
];

// Словарь для смены языка
const STRINGS = {
  RU: {
    mining: 'МАЙНИНГ', trade: 'БИРЖА', opts: 'ОПЦИИ', analysis: 'АНАЛИЗ РЫНКА...', 
    profit_pred: 'ПРОГНОЗ ДОХОДА:', buy: 'КУПИТЬ', sell: 'ПРОДАТЬ', back: '← НАЗАД',
    reset: 'ПЕРЕЗАПУСК ОБУЧЕНИЯ', sound: 'ЗВУК', lang: 'ЯЗЫК', creators: 'СОЗДАТЕЛИ:',
    wait: 'ПОИСК...', amount: 'СУММА', leverage: 'ПЛЕЧО', balance: 'БАЛАНС'
  },
  EN: {
    mining: 'MINING', trade: 'EXCHANGE', opts: 'SETTINGS', analysis: 'MARKET ANALYSIS...', 
    profit_pred: 'PROFIT PREDICTION:', buy: 'BUY', sell: 'SELL', back: '← BACK',
    reset: 'RESTART TUTORIAL', sound: 'SOUND', lang: 'LANG', creators: 'CREATORS:',
    wait: 'SEARCHING...', amount: 'AMOUNT', leverage: 'LEVERAGE', balance: 'BALANCE'
  }
};

export default function App() {
  const [userId] = useState(() => localStorage.getItem('k_uid') || 'ID' + Math.floor(Math.random() * 999999));
  const [balance, setBalance] = useState(() => Number(localStorage.getItem(`k_bal_${userId}`)) || 1000.00);
  const [xp, setXp] = useState(() => Number(localStorage.getItem(`k_xp_${userId}`)) || 0);
  const [lang, setLang] = useState('RU');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const [prices, setPrices] = useState(() => COINS_DATA.reduce((acc, c) => ({ ...acc, [c.id]: c.base }), {}));
  const [tab, setTab] = useState('trade'); 
  const [selectedDex, setSelectedDex] = useState(null);
  const [activePositions, setActivePositions] = useState({});
  const [pendingTime, setPendingTime] = useState({});
  const [tradeAmount, setTradeAmount] = useState(100); 
  const [leverage, setLeverage] = useState(1);
  
  const [signal, setSignal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [signalTimer, setSignalTimer] = useState(0);
  const [toast, setToast] = useState(null);
  const [tutStep, setTutStep] = useState(() => localStorage.getItem('k_tut') ? -1 : 0);

  const lvl = Math.floor(xp / 150) + 1;
  const progress = (xp % 150) / 1.5; 
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : 10;
  const t = STRINGS[lang];

  const sndClick = useRef(new Audio('https://www.fesliyanstudios.com/play-mp3/6510'));
  const sndBell = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  useEffect(() => {
    const itv = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          next[id] = Number((next[id] * (1 + (Math.random() * 0.004 - 0.002))).toFixed(id === 'BTC' ? 1 : 3));
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(itv);
  }, []);

  // Логика сигналов
  useEffect(() => {
    if (tab === 'trade' && !signal && !isAnalyzing) {
      setIsAnalyzing(true);
      const timer = setTimeout(() => {
        const avail = COINS_DATA.filter(c => c.lvl <= lvl);
        const coin = avail[Math.floor(Math.random() * avail.length)];
        const d1 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
        let d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
        while(d2.id === d1.id) d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
        
        setSignal({ 
          coin: coin.id, buyDex: d1.name, sellDexName: d2.name, 
          bonus: (Math.random() * 2 + 1).toFixed(2)
        });
        setSignalTimer(90);
        setIsAnalyzing(false);
        if(soundEnabled) sndBell.current.play().catch(() => {});
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [tab, signal, isAnalyzing, lvl, soundEnabled]);

  useEffect(() => {
    if (signalTimer > 0) {
      const itv = setInterval(() => setSignalTimer(s => s - 1), 1000);
      return () => clearInterval(itv);
    } else { setSignal(null); }
  }, [signalTimer]);

  const handleAction = (coinId) => {
    const pos = activePositions[coinId];
    if (pos) {
      setPendingTime(prev => ({ ...prev, [coinId]: 10 }));
      const timer = setInterval(() => {
        setPendingTime(prev => {
          const newTime = prev[coinId] - 1;
          if (newTime <= 0) {
            clearInterval(timer);
            const isWin = Math.random() > 0.15;
            const rate = isWin ? (Math.random() * 2 + 1) : -(Math.random() * 1 + 0.5);
            const pnl = (Number(pos.amt) * (rate * Number(pos.lev)) / 100);
            setBalance(b => Math.max(0, b + Number(pos.amt) + pnl));
            if(isWin) setXp(x => x + 15);
            setToast({ msg: isWin ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`, type: isWin ? 'win' : 'loss' });
            setTimeout(() => setToast(null), 2000);
            return { ...prev, [coinId]: null };
          }
          return { ...prev, [coinId]: newTime };
        });
      }, 1000);
      setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    } else {
      if(tradeAmount > balance) return;
      setBalance(b => b - tradeAmount);
      setActivePositions(p => ({ ...p, [coinId]: { amt: tradeAmount, lev: leverage, bonus: signal?.bonus || 1.5 } }));
    }
  };

  const startTutorial = () => {
    setTab('trade');
    setSelectedDex(null);
    setTutStep(0);
  };

  const tutContent = [
    { RU: "Твой баланс", EN: "Your Balance", desc: { RU: "Мы дали тебе $1000.", EN: "We gave you $1000." }, ref: "h-bal" },
    { RU: "Сигналы", EN: "Signals", desc: { RU: "Жди 5 сек анализа.", EN: "Wait 5s for analysis." }, ref: "s-box" },
    { RU: "Выбор биржи", EN: "Pick DEX", desc: { RU: "Нажми на биржу ниже.", EN: "Click a DEX below." }, ref: "d-list" },
    { RU: "Майнинг", EN: "Mining", desc: { RU: "Кликай тут для прибыли.", EN: "Click here for profit." }, ref: "n-mine" }
  ];

  return (
    <div className="app-main">
      <style>{`
        :root { --win: #00ff88; --loss: #ff3366; --neon: #00d9ff; --panel: #121214; }
        html, body { height: 100%; width: 100%; margin: 0; background: #000; color: #eee; font-family: sans-serif; overflow: hidden; }
        .app-main { height: 100vh; display: flex; flex-direction: column; position: relative; }
        .header { padding: 15px; background: var(--panel); border-bottom: 1px solid #222; }
        .balance { color: var(--win); font-size: 26px; font-weight: 900; }
        .content { flex: 1; overflow-y: auto; position: relative; }
        .signal-box { background: #00121a; border: 1px solid var(--neon); margin: 10px; padding: 15px; border-radius: 12px; min-height: 80px; display: flex; flex-direction: column; justify-content: center; }
        .dex-item { background: #0a0a0a; border: 1px solid #222; margin: 10px; padding: 18px; border-radius: 12px; }
        .nav { height: 75px; display: flex; background: var(--panel); border-top: 1px solid #222; }
        .nav-btn { flex: 1; background: none; border: none; color: #444; font-size: 11px; font-weight: bold; }
        .nav-btn.active { color: var(--neon); }
        .focus-el { position: relative; z-index: 2000 !important; border: 2px solid #fff !important; box-shadow: 0 0 20px #fff !important; }
        .tut-card { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; background: #1a1a1a; padding: 25px; border-radius: 20px; z-index: 3000; text-align: center; border: 2px solid var(--neon); }
        .toast { position: fixed; top: 40%; left: 50%; transform: translateX(-50%); padding: 20px 40px; border-radius: 15px; font-weight: 900; z-index: 5000; font-size: 30px; }
        @keyframes fly { to { transform: translateY(-70px); opacity: 0; } }
      `}</style>

      {tutStep >= 0 && (
        <div className="tut-card">
          <h2>{tutContent[tutStep][lang]}</h2>
          <p>{tutContent[tutStep].desc[lang]}</p>
          <button onClick={() => {
            if(tutStep < 3) setTutStep(tutStep + 1);
            else { setTutStep(-1); localStorage.setItem('k_tut', '1'); }
          }} style={{width: '100%', padding: '12px', background: 'var(--neon)', border:'none', borderRadius: '10px', marginTop: '15px', fontWeight: 'bold'}}>OK</button>
        </div>
      )}

      {toast && <div className="toast" style={{background: toast.type==='win'?'var(--win)':'var(--loss)', color:'#000'}}>{toast.msg}</div>}

      <header className={`header ${tutStep === 0 ? 'focus-el' : ''}`}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span style={{fontSize: 10, color: '#444'}}>{userId}</span>
          <div className="balance">${balance.toFixed(2)}</div>
        </div>
      </header>

      <div className="content">
        {tab === 'trade' && (
          <>
            {!selectedDex ? (
              <div id="d-list">
                <div className={`signal-box ${tutStep === 1 ? 'focus-el' : ''}`}>
                  {isAnalyzing ? (
                    <div style={{textAlign:'center', color:'var(--neon)', animation:'pulse 1s infinite'}}>{t.analysis}</div>
                  ) : signal ? (
                    <>
                      <div style={{fontSize: 18, fontWeight: 'bold'}}>{signal.coin}: {signal.buyDex} → {signal.sellDexName}</div>
                      <div style={{color: 'var(--win)'}}>+{signal.bonus}% | {signalTimer}s</div>
                    </>
                  ) : <div style={{textAlign:'center', color: '#333'}}>{t.wait}</div>}
                </div>
                {EXCHANGES.map(d => (
                  <div key={d.id} className="dex-item" style={{borderLeft: `5px solid ${d.color}`}} onClick={() => setSelectedDex(d.id)}>
                    <b>{d.name}</b>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{padding: 15}}>
                <button onClick={() => setSelectedDex(null)} style={{background: '#222', color: '#fff', border: 'none', padding: 10, borderRadius: 8}}>{t.back}</button>
                <div style={{margin: '15px 0', padding: 15, background: '#0a0a0a', borderRadius: 12}}>
                  <div style={{fontSize: 12, color: '#555'}}>{t.profit_pred}</div>
                  <div style={{fontSize: 22, color: 'var(--win)', fontWeight: 'bold'}}>+${((tradeAmount * leverage * (signal?.bonus || 1.5))/100).toFixed(2)}</div>
                </div>
                <div style={{marginBottom: 20}}>
                  <div style={{fontSize: 11}}>{t.amount}: ${tradeAmount} | {t.leverage}: x{leverage}</div>
                  <input type="range" min="10" max={balance} value={tradeAmount} onChange={e => setTradeAmount(Number(e.target.value))} style={{width:'100%'}} />
                  <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(Number(e.target.value))} style={{width:'100%', marginTop: 10}} />
                </div>
                {COINS_DATA.map(c => {
                  const p = activePositions[c.id];
                  const wait = pendingTime[c.id];
                  return (
                    <div key={c.id} style={{padding: '12px 0', borderBottom: '1px solid #111', display: 'flex', justifyContent: 'space-between'}}>
                      <div><b>{c.id}</b> <span style={{color: 'var(--neon)', fontSize: 11}}>${prices[c.id]}</span></div>
                      <button onClick={() => handleAction(c.id)} style={{background: wait ? '#333' : (p ? 'var(--loss)' : 'var(--win)'), border:'none', padding: '8px 15px', borderRadius: 6, fontWeight: 'bold', width: 80}}>
                        {wait ? `${wait}s` : (p ? t.sell : t.buy)}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'mining' && (
          <div style={{height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <div onClick={(e) => {
              setBalance(b => b + 0.20);
              if(soundEnabled) { sndClick.current.currentTime = 0; sndClick.current.play().catch(()=>{}); }
              const d = document.createElement('div');
              d.innerText = '$'; d.style.position = 'fixed'; d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px';
              d.style.color = 'var(--win)'; d.style.animation = 'fly 0.5s forwards';
              document.body.appendChild(d); setTimeout(() => d.remove(), 500);
            }} style={{width: 150, height: 150, border: '4px solid var(--neon)', borderRadius: '50%', fontSize: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon)'}}>$</div>
          </div>
        )}

        {tab === 'opts' && (
          <div style={{padding: 20}}>
            <button onClick={startTutorial} style={{width: '100%', padding: 15, background: 'var(--neon)', border: 'none', borderRadius: 10, fontWeight: 'bold', marginBottom: 10}}>{t.reset}</button>
            <button onClick={() => setSoundEnabled(!soundEnabled)} style={{width: '100%', padding: 15, background: '#222', color: '#fff', border: 'none', borderRadius: 10, marginBottom: 10}}>{t.sound}: {soundEnabled ? 'ON' : 'OFF'}</button>
            <button onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')} style={{width: '100%', padding: 15, background: '#222', color: '#fff', border: 'none', borderRadius: 10, marginBottom: 20}}>{t.lang}: {lang}</button>
            <div style={{textAlign: 'center'}}><a href="https://t.me/kriptoalians" style={{color: 'var(--neon)', textDecoration: 'none'}}>@kriptoalians</a></div>
          </div>
        )}
      </div>

      <nav className="nav">
        <button onClick={() => setTab('mining')} className={`nav-btn ${tab === 'mining' ? 'active' : ''} ${tutStep === 3 ? 'focus-el' : ''}`}>{t.mining}</button>
        <button onClick={() => setTab('trade')} className={`nav-btn ${tab === 'trade' ? 'active' : ''}`}>{t.trade}</button>
        <button onClick={() => setTab('opts')} className={`nav-btn ${tab === 'opts' ? 'active' : ''}`}>{t.opts}</button>
      </nav>
    </div>
  );
}
