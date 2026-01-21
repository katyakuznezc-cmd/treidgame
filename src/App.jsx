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

const translations = {
  RU: {
    mining: 'Майнинг', arbitrage: 'Биржи', settings: 'Опции',
    balance: 'БАЛАНС', lvl: 'УРОВЕНЬ', tap: 'МАЙНИНГ',
    buy: 'OPEN', sell: 'CLOSE', back: '←', amount: 'Сумма:',
    leverage: 'Плечо:', pos: 'В СДЕЛКЕ:', orderbook: 'СТАКАН ОРДЕРОВ'
  },
  EN: {
    mining: 'Mining', arbitrage: 'Exchanges', settings: 'Options',
    balance: 'BALANCE', lvl: 'LEVEL', tap: 'MINING',
    buy: 'OPEN', sell: 'CLOSE', back: '←', amount: 'Amount:',
    leverage: 'Leverage:', pos: 'IN TRADE:', orderbook: 'ORDER BOOK'
  }
};

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 100);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
  const [lang, setLang] = useState(() => localStorage.getItem('k_lang') || 'RU');
  const [soundOn, setSoundOn] = useState(() => JSON.parse(localStorage.getItem('k_snd') ?? 'true'));
  const [tab, setTab] = useState('mining');
  const [selectedDex, setSelectedDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [activePositions, setActivePositions] = useState({});
  const [isPending, setIsPending] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [tradeAmount, setTradeAmount] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [tapAnims, setTapAnims] = useState([]);
  const [isShaking, setIsShaking] = useState(false);
  const [livePrices, setLivePrices] = useState({});
  const [orders, setOrders] = useState({ bids: [], asks: [] });

  const tapAudio = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));
  const currentLvl = Math.floor(Math.sqrt(xp / 50)) + 1;
  const progress = ((xp % 100) / 100) * 100;
  const t = translations[lang] || translations.EN;

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
    localStorage.setItem('k_lang', lang);
    localStorage.setItem('k_snd', soundOn);
  }, [balance, xp, lang, soundOn]);

  // Живые цены + Генерация стакана
  useEffect(() => {
    const interval = setInterval(() => {
      const newPrices = {};
      ALL_COINS.forEach(c => {
        const change = (Math.random() - 0.5) * (c.base * 0.002);
        newPrices[c.id] = (c.base + change).toFixed(c.base < 1 ? 4 : 2);
      });
      setLivePrices(newPrices);

      // Генерация "стакана"
      const genOrders = () => Array.from({ length: 5 }, () => ({
        price: (Math.random() * 1000).toFixed(2),
        amt: (Math.random() * 2).toFixed(3)
      }));
      setOrders({ bids: genOrders(), asks: genOrders() });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const gen = () => {
      const available = ALL_COINS.filter(c => c.lvl <= currentLvl);
      const coin = available[Math.floor(Math.random() * available.length)];
      const b = EXCHANGES[Math.floor(Math.random() * 4)];
      let s = EXCHANGES[Math.floor(Math.random() * 4)];
      while(b.id === s.id) s = EXCHANGES[Math.floor(Math.random() * 4)];
      setSignal({ 
        coin: coin.id, buy: b.id, sell: s.id, 
        profit: (Math.random() * 2 + 4).toFixed(2), 
        expires: Date.now() + 120000 
      });
    };
    gen();
    const timer = setInterval(gen, 120000);
    return () => clearInterval(timer);
  }, [currentLvl]);

  const handleTap = (e) => {
    setBalance(b => b + 0.05);
    if (soundOn) { tapAudio.current.currentTime = 0; tapAudio.current.play().catch(() => {}); }
    const id = Date.now();
    const touch = e.touches ? e.touches[0] : e;
    setTapAnims([...tapAnims, { id, x: touch.clientX, y: touch.clientY }]);
    setTimeout(() => setTapAnims(prev => prev.filter(a => a.id !== id)), 800);
  };

  const openPos = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (!amt || amt <= 0 || amt > balance) return;
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
      const isWin = signal && selectedDex === signal.sell && coinId === signal.coin && Date.now() < signal.expires;
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
        <div className="balance-box"><small>{t.balance}</small><div className="bal-val">${balance.toFixed(2)}</div></div>
      </header>

      <main className="content">
        {tab === 'mining' && (
          <div className="page-mining">
            <div className="tap-circle" onClick={handleTap}>$</div>
            <p className="neon-text">{t.tap}</p>
          </div>
        )}

        {tab === 'trade' && (
          <div className="page-trade">
            {!selectedDex ? (
              <div className="dex-list">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="dex-card" onClick={() => setSelectedDex(d.id)} style={{borderColor: d.color}}>{d.name}</div>
                ))}
              </div>
            ) : (
              <div className="dex-terminal">
                <div className="term-top">
                  <button onClick={() => setSelectedDex(null)} className="back-btn">{t.back}</button>
                  <div className="term-inputs">
                    <input type="number" placeholder="USD" value={tradeAmount} onChange={e=>setTradeAmount(e.target.value)} />
                    <div className="lev-box">x{leverage}<input type="range" min="1" max="100" value={leverage} onChange={e=>setLeverage(e.target.value)} /></div>
                  </div>
                </div>

                <div className="term-body">
                  <div className="coin-side">
                    {ALL_COINS.map(c => {
                      const pos = activePositions[c.id];
                      return (
                        <div key={c.id} className={`coin-item ${pos ? 'active-pos' : ''}`}>
                          <div className="c-info"><b>{c.id}</b><small>{pos ? `$${pos.margin}` : `$${livePrices[c.id] || c.base}`}</small></div>
                          {c.lvl <= currentLvl ? (
                            <button className={pos ? 'btn-sell' : 'btn-buy'} onClick={() => pos ? closePos(c.id) : openPos(c.id)}>
                              {pos ? t.sell : t.buy}
                            </button>
                          ) : <div className="lock">LOCKED</div>}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="orderbook-side">
                    <small className="ob-title">{t.orderbook}</small>
                    <div className="asks">{orders.asks.map((o,i)=><div key={i} className="ob-row ask"><span>{o.price}</span><span>{o.amt}</span></div>)}</div>
                    <div className="ob-mid">{livePrices['BTC'] || '---'}</div>
                    <div className="bids">{orders.bids.map((o,i)=><div key={i} className="ob-row bid"><span>{o.price}</span><span>{o.amt}</span></div>)}</div>
                  </div>
                </div>
                
                {signal && <div className="signal-mini">{signal.coin} ➔ {signal.sell} <b className="grn">+{signal.profit}%</b></div>}
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button className={tab==='mining'?'active':''} onClick={()=>setTab('mining')}>{t.mining}</button>
        <button className={tab==='trade'?'active':''} onClick={()=>setTab('trade')}>{t.arbitrage}</button>
        <button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}>{t.settings}</button>
      </nav>
    </div>
  );
}
