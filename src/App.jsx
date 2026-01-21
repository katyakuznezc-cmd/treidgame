import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const EXCHANGES = [
  { id: '1inch', name: '1inch', color: '#00ccff' },
  { id: 'uniswap', name: 'Uniswap v3', color: '#ff007a' },
  { id: 'sushiswap', name: 'SushiSwap', color: '#fa52a0' },
  { id: 'pancakeswap', name: 'PancakeSwap', color: '#d1884f' }
];

const ALL_COINS = [
  { id: 'TON', lvl: 1, base: 5.4 }, { id: 'ARB', lvl: 1, base: 1.1 },
  { id: 'DOGE', lvl: 2, base: 0.15 }, { id: 'MATIC', lvl: 3, base: 0.7 },
  { id: 'ETH', lvl: 4, base: 3400 }, { id: 'SOL', lvl: 5, base: 145 },
  { id: 'BNB', lvl: 8, base: 580 }, { id: 'BTC', lvl: 10, base: 67000 }
];

// Список достижений с возрастающими наградами
const ACHIEVEMENTS = [
  { id: 'first_k', title: 'Первый косарь', desc: 'Баланс $1,000', goal: 1000, type: 'balance', reward: 100 },
  { id: 'tapper_100', title: 'Кликер-про', desc: '100 тапов', goal: 100, type: 'taps', reward: 250 },
  { id: 'lvl_5', title: 'Эксперт', desc: 'Достигни 5 уровня', goal: 5, type: 'level', reward: 1000 },
  { id: 'whale', title: 'КИТ', desc: 'Баланс $100,000', goal: 100000, type: 'balance', reward: 5000 },
  { id: 'millionaire', title: 'Миллионер', desc: 'Баланс $1,000,000', goal: 1000000, type: 'balance', reward: 50000 }
];

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 100);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
  const [taps, setTaps] = useState(() => parseInt(localStorage.getItem('k_taps')) || 0);
  const [claimed, setClaimed] = useState(() => JSON.parse(localStorage.getItem('k_claimed') || '[]'));
  
  const [lang, setLang] = useState(() => localStorage.getItem('k_lang') || 'RU');
  const [soundOn, setSoundOn] = useState(() => JSON.parse(localStorage.getItem('k_snd') ?? 'true'));
  const [tab, setTab] = useState('mining');
  const [selectedDex, setSelectedDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [activePositions, setActivePositions] = useState({});
  const [isPending, setIsPending] = useState(false);
  const [tradeAmount, setTradeAmount] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [tapAnims, setTapAnims] = useState([]);
  const [isShaking, setIsShaking] = useState(false);
  const [livePrices, setLivePrices] = useState({});
  const [orders, setOrders] = useState({ bids: [], asks: [] });

  const tapAudio = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));
  const currentLvl = Math.floor(Math.sqrt(xp / 50)) + 1;
  const progress = ((xp % 100) / 100) * 100;

  // Сохранение данных
  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
    localStorage.setItem('k_taps', taps);
    localStorage.setItem('k_claimed', JSON.stringify(claimed));
    localStorage.setItem('k_lang', lang);
    localStorage.setItem('k_snd', soundOn);
  }, [balance, xp, taps, claimed, lang, soundOn]);

  // Проверка достижений в реальном времени
  useEffect(() => {
    ACHIEVEMENTS.forEach(ach => {
      if (!claimed.includes(ach.id)) {
        let isDone = false;
        if (ach.type === 'balance' && balance >= ach.goal) isDone = true;
        if (ach.type === 'taps' && taps >= ach.goal) isDone = true;
        if (ach.type === 'level' && currentLvl >= ach.goal) isDone = true;

        if (isDone) {
          setClaimed(prev => [...prev, ach.id]);
          setBalance(b => b + ach.reward);
          // Можно добавить уведомление, если захочешь
        }
      }
    });
  }, [balance, taps, currentLvl, claimed]);

  // Живые цены и стакан
  useEffect(() => {
    const interval = setInterval(() => {
      const newPrices = {};
      ALL_COINS.forEach(c => {
        const change = (Math.random() - 0.5) * (c.base * 0.002);
        newPrices[c.id] = (c.base + change).toFixed(c.base < 1 ? 4 : 2);
      });
      setLivePrices(newPrices);
      const genO = () => Array.from({ length: 5 }, () => ({ price: (Math.random() * 1000).toFixed(2), amt: (Math.random() * 2).toFixed(3) }));
      setOrders({ bids: genO(), asks: genO() });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const genS = () => {
      const available = ALL_COINS.filter(c => c.lvl <= currentLvl);
      const coin = available[Math.floor(Math.random() * available.length)];
      setSignal({ coin: coin.id, sell: EXCHANGES[Math.floor(Math.random()*4)].id, profit: (Math.random()*2+4).toFixed(2), expires: Date.now() + 120000 });
    };
    genS();
    const timer = setInterval(genS, 120000);
    return () => clearInterval(timer);
  }, [currentLvl]);

  const handleTap = (e) => {
    setBalance(b => b + 0.1);
    setTaps(t => t + 1);
    if (soundOn) { tapAudio.current.currentTime = 0; tapAudio.current.play().catch(() => {}); }
    const id = Date.now();
    const touch = e.touches ? e.touches[0] : e;
    setTapAnims([...tapAnims, { id, x: touch.clientX, y: touch.clientY }]);
    setTimeout(() => setTapAnims(prev => prev.filter(a => a.id !== id)), 800);
  };

  const openPos = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (!amt || amt > balance) return;
    setIsPending(true);
    setTimeout(() => {
      setBalance(b => b - amt);
      setActivePositions(prev => ({ ...prev, [coinId]: { margin: amt, lev: leverage } }));
      setIsPending(false);
      setTradeAmount('');
    }, 600);
  };

  const closePos = (coinId) => {
    const pos = activePositions[coinId];
    setIsPending(true);
    setTimeout(() => {
      const isWin = signal && coinId === signal.coin && Date.now() < signal.expires;
      const pnl = (pos.margin * pos.lev) * (isWin ? (parseFloat(signal.profit)/100) : -0.15);
      setBalance(b => b + Math.max(0, pos.margin + pnl));
      setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
      if (isWin) { setXp(x => x + 50); setIsShaking(true); setTimeout(() => setIsShaking(false), 500); }
      setIsPending(false);
    }, 600);
  };

  return (
    <div className={`app-container ${isShaking ? 'shake-anim' : ''}`}>
      {tapAnims.map(a => <div key={a.id} className="tap-dollar" style={{left: a.x, top: a.y}}>$</div>)}
      
      <header className="main-header">
        <div className="lvl-info"><span>LVL {currentLvl}</span><div className="xp-mini"><div className="xp-fill" style={{width: `${progress}%`}}></div></div></div>
        <div className="balance-box"><div className="bal-val">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div></div>
      </header>

      <main className="content">
        {tab === 'mining' && (
          <div className="page-mining">
            <div className="tap-circle" onClick={handleTap}>$</div>
            <p className="neon-text">ТАПАЙ И ЗАРАБАТЫВАЙ</p>
          </div>
        )}

        {tab === 'trade' && (
          <div className="page-trade">
            {!selectedDex ? (
              <div className="dex-list">
                {EXCHANGES.map(d => <div key={d.id} className="dex-card" onClick={() => setSelectedDex(d.id)} style={{borderColor: d.color}}>{d.name}</div>)}
              </div>
            ) : (
              <div className="dex-terminal">
                <div className="term-top">
                  <button onClick={() => setSelectedDex(null)} className="back-btn">←</button>
                  <input type="number" placeholder="USD" value={tradeAmount} onChange={e=>setTradeAmount(e.target.value)} />
                  <div className="lev-box">x{leverage}<input type="range" min="1" max="100" value={leverage} onChange={e=>setLeverage(e.target.value)} /></div>
                </div>
                <div className="term-body">
                  <div className="coin-side">
                    {ALL_COINS.map(c => {
                      const pos = activePositions[c.id];
                      return (
                        <div key={c.id} className={`coin-item ${pos ? 'active-pos' : ''}`}>
                          <div className="c-info"><b>{c.id}</b><small>{pos ? `$${pos.margin}` : `$${livePrices[c.id] || c.base}`}</small></div>
                          {c.lvl <= currentLvl ? <button className={pos ? 'btn-sell' : 'btn-buy'} onClick={() => pos ? closePos(c.id) : openPos(c.id)}>{pos ? 'CLOSE' : 'OPEN'}</button> : <div className="lock">LOCKED</div>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="orderbook-side">
                    <div className="asks">{orders.asks.map((o,i)=><div key={i} className="ob-row ask"><span>{o.price}</span></div>)}</div>
                    <div className="ob-mid">{livePrices['BTC'] || '---'}</div>
                    <div className="bids">{orders.bids.map((o,i)=><div key={i} className="ob-row bid"><span>{o.price}</span></div>)}</div>
                  </div>
                </div>
                {signal && <div className="signal-mini">{signal.coin} ➔ {signal.sell} <b className="grn">+{signal.profit}%</b></div>}
              </div>
            )}
          </div>
        )}

        {tab === 'achievements' && (
          <div className="page-achievements">
            <h2 className="neon-text">🏆 ТРОФЕИ</h2>
            <div className="ach-grid">
              {ACHIEVEMENTS.map(ach => {
                const isClaimed = claimed.includes(ach.id);
                return (
                  <div key={ach.id} className={`ach-card ${isClaimed ? 'unlocked' : 'locked'}`}>
                    <div className="ach-icon">{isClaimed ? '✅' : '💎'}</div>
                    <div className="ach-info">
                      <b>{ach.title}</b>
                      <p>{ach.desc}</p>
                      <span className="ach-reward">+{ach.reward}$ Reward</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="page-settings">
            <h3 className="neon-text-blue">ОПЦИИ</h3>
            <div className="set-card">
               <div className="set-row"><span>ЗВУК</span><button onClick={()=>setSoundOn(!soundOn)}>{soundOn?'ON':'OFF'}</button></div>
               <div className="set-row"><span>ЯЗЫК</span><button onClick={()=>setLang(lang==='RU'?'EN':'RU')}>{lang}</button></div>
            </div>
            <div className="footer-links">
               <a href="https://t.me/kriptoalians" target="_blank" className="tg-link">@KRIPTOALIANS</a>
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button className={tab==='mining'?'active':''} onClick={()=>setTab('mining')}>МАЙНИНГ</button>
        <button className={tab==='trade'?'active':''} onClick={()=>setTab('trade')}>БИРЖИ</button>
        <button className={tab==='achievements'?'active':''} onClick={()=>setTab('achievements')}>ТРОФЕИ</button>
        <button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}>ОПЦИИ</button>
      </nav>
    </div>
  );
}
