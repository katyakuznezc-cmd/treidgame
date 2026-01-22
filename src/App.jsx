import React, { useState, useEffect, useRef } from 'react';

const COINS_DATA = [
  { id: 'TON', lvl: 1, base: 5.42, desc: 'Токен Telegram.' },
  { id: 'DOGE', lvl: 1, base: 0.15, desc: 'Мем-коин.' },
  { id: 'TRX', lvl: 1, base: 0.12, desc: 'Сеть Tron.' },
  { id: 'SOL', lvl: 2, base: 145.3, desc: 'Скоростной блокчейн.' },
  { id: 'ETH', lvl: 3, base: 2800, desc: 'Смарт-контракты.' },
  { id: 'BTC', lvl: 5, base: 95000, desc: 'Цифровое золото.' },
];

const EXCHANGES = [
  { id: '1inch', name: '1INCH', color: '#00ccff' },
  { id: 'uniswap', name: 'UNISWAP', color: '#ff007a' },
  { id: 'sushiswap', name: 'SUSHI', color: '#fa52a0' },
  { id: 'pancakeswap', name: 'PANCAKE', color: '#d1884f' }
];

export default function App() {
  const [userId] = useState(() => localStorage.getItem('k_uid') || 'ID' + Math.floor(Math.random() * 999999));
  const [balance, setBalance] = useState(() => Number(localStorage.getItem(`k_bal_${userId}`)) || 1000.00);
  const [xp, setXp] = useState(() => Number(localStorage.getItem(`k_xp_${userId}`)) || 0);
  const [winCount, setWinCount] = useState(() => Number(localStorage.getItem(`k_wins_${userId}`)) || 0);
  
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

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lang, setLang] = useState('RU');
  const [toast, setToast] = useState(null);
  const [tutStep, setTutStep] = useState(() => localStorage.getItem('k_tut') ? -1 : 0);

  // Исправленная переменная maxLev
  const lvl = Math.floor(xp / 150) + 1;
  const progress = (xp % 150) / 1.5; 
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : 10;

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

  useEffect(() => {
    localStorage.setItem(`k_bal_${userId}`, balance);
    localStorage.setItem(`k_xp_${userId}`, xp);
    localStorage.setItem(`k_wins_${userId}`, winCount);
    localStorage.setItem('k_uid', userId);
  }, [balance, xp, winCount, userId]);

  useEffect(() => {
    if (tab === 'trade' && !signal && !isAnalyzing) {
      setIsAnalyzing(true);
      const t = setTimeout(() => {
        generateSignal();
        setIsAnalyzing(false);
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [tab, signal, isAnalyzing]);

  useEffect(() => {
    if (signalTimer > 0) {
      const t = setInterval(() => setSignalTimer(s => s - 1), 1000);
      return () => clearInterval(t);
    } else { setSignal(null); }
  }, [signalTimer]);

  const generateSignal = () => {
    const avail = COINS_DATA.filter(c => c.lvl <= lvl);
    const coin = avail[Math.floor(Math.random() * avail.length)];
    const d1 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    let d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    while(d2.id === d1.id) d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    setSignal({ 
      coin: coin.id, buyDex: d1.name, sellDexId: d2.id, sellDexName: d2.name, 
      bonus: (Math.random() * 2 + 1).toFixed(2), id: Date.now() 
    });
    setSignalTimer(90);
    if(soundEnabled) { sndBell.current.play().catch(() => {}); }
  };

  const startTutorial = () => {
    setTab('trade');
    setSelectedDex(null);
    setTutStep(0);
  };

  const tutConfig = [
    { t: "Баланс", c: "Тут твои деньги. Начни с $1000!", ref: "h-bal" },
    { t: "Сигналы", c: "Появляются после анализа. Жди надписи!", ref: "s-box" },
    { t: "Биржи", c: "Выбери площадку для торговли.", ref: "d-list" },
    { t: "Майнинг", c: "Кликай тут, если деньги кончились.", ref: "n-mine" }
  ];

  const handleAction = (coinId) => {
    const pos = activePositions[coinId];
    if (pos) {
      setPendingTime(prev => ({ ...prev, [coinId]: 10 }));
      const timer = setInterval(() => {
        setPendingTime(prev => {
          const newTime = prev[coinId] - 1;
          if (newTime <= 0) {
            clearInterval(timer);
            completeTrade(coinId, pos);
            return { ...prev, [coinId]: null };
          }
          return { ...prev, [coinId]: newTime };
        });
      }, 1000);
      setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    } else {
      if(tradeAmount > balance) return setToast({msg: 'LOW BALANCE', type:'loss'});
      setBalance(b => b - tradeAmount);
      setActivePositions(p => ({ ...p, [coinId]: { amt: tradeAmount, lev: leverage, dex: selectedDex, bonus: signal?.bonus || 1.5 } }));
    }
  };

  const completeTrade = (coinId, pos) => {
    const isWin = Math.random() > 0.15;
    const rate = isWin ? (Math.random() * 2 + 1) : -(Math.random() * 1 + 0.5);
    const pnl = (Number(pos.amt) * (rate * Number(pos.lev)) / 100);
    setBalance(b => Math.max(0, b + Number(pos.amt) + pnl));
    if(isWin) { setXp(x => x + 15); setWinCount(w => w + 1); }
    setToast({ msg: isWin ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`, type: isWin ? 'win' : 'loss' });
  };

  return (
    <div className="app-main">
      <style>{`
        :root { --win: #00ff88; --loss: #ff3366; --neon: #00d9ff; --panel: #121214; }
        html, body { height: 100%; width: 100%; margin: 0; background: #000; overflow: hidden; color: #eee; font-family: sans-serif; }
        .app-main { height: 100vh; width: 100vw; display: flex; flex-direction: column; position: relative; }
        .tut-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000; }
        .tut-card { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 85%; max-width: 350px; background: #1a1a1a; border: 2px solid var(--neon); border-radius: 20px; padding: 25px; z-index: 1100; text-align: center; }
        .focus-el { position: relative; z-index: 1005 !important; border: 2px solid #fff !important; box-shadow: 0 0 20px #fff !important; pointer-events: none; }
        .header { padding: 15px; background: var(--panel); border-bottom: 1px solid #222; }
        .balance { color: var(--win); font-size: 26px; font-weight: 900; }
        .content { flex: 1; overflow-y: auto; }
        .signal-box { background: #00121a; border: 1px solid var(--neon); margin: 10px; padding: 15px; border-radius: 12px; position: relative; min-height: 80px; display: flex; flex-direction: column; justify-content: center; }
        .dex-item { background: #0a0a0a; border: 1px solid #222; margin: 10px; padding: 18px; border-radius: 12px; cursor: pointer; }
        .nav { height: 75px; display: flex; background: var(--panel); border-top: 1px solid #222; }
        .nav-btn { flex: 1; background: none; border: none; color: #444; font-size: 11px; font-weight: bold; }
        .nav-btn.active { color: var(--neon); }
        .center-toast { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 40px; border-radius: 30px; z-index: 5000; text-align: center; color: #000; font-weight: 900; font-size: 32px; box-shadow: 0 0 100px rgba(0,0,0,1); }
        @keyframes fly { to { transform: translateY(-70px); opacity: 0; } }
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
      `}</style>

      {tutStep >= 0 && (
        <>
          <div className="tut-overlay"></div>
          <div className="tut-card">
            <h2 style={{color: 'var(--neon)', margin: '0 0 10px 0'}}>{tutConfig[tutStep].t}</h2>
            <p style={{fontSize: '15px', color: '#ccc'}}>{tutConfig[tutStep].c}</p>
            <button onClick={() => {
                if(tutStep < tutConfig.length - 1) setTutStep(tutStep + 1);
                else { setTutStep(-1); localStorage.setItem('k_tut', 'done'); }
              }} style={{marginTop: '20px', width: '100%', padding: '12px', background: 'var(--neon)', border: 'none', borderRadius: '10px', fontWeight: 'bold'}}>ДАЛЕЕ</button>
          </div>
        </>
      )}

      {toast && <div className
