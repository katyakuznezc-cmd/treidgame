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

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 100);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
  const [taps, setTaps] = useState(() => parseInt(localStorage.getItem('k_taps')) || 0);
  const [claimed, setClaimed] = useState(() => JSON.parse(localStorage.getItem('k_claimed') || '[]'));
  
  const [tab, setTab] = useState('mining');
  const [selectedDex, setSelectedDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [activePositions, setActivePositions] = useState({}); // Сделки
  const [marketHistory, setMarketHistory] = useState([]); // История
  const [isPending, setIsPending] = useState(false);
  const [tradeAmount, setTradeAmount] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [livePrices, setLivePrices] = useState({});
  const [orders, setOrders] = useState({ bids: [], asks: [] });
  const [isShaking, setIsShaking] = useState(false);

  const currentLvl = Math.floor(Math.sqrt(xp / 50)) + 1;
  const progress = ((xp % 100) / 100) * 100;

  // Таймер Ликвидации (50 секунд)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setActivePositions(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          if (now - next[id].startTime > 50000) { // 50 сек
            delete next[id];
            changed = true;
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            alert(`ЛИКВИДАЦИЯ ${id}! Ты не успел закрыть сделку.`);
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Живые цены и история маркета
  useEffect(() => {
    const interval = setInterval(() => {
      const newPrices = {};
      ALL_COINS.forEach(c => {
        newPrices[c.id] = (c.base + (Math.random() - 0.5) * (c.base * 0.01)).toFixed(2);
      });
      setLivePrices(newPrices);

      // Генерируем стакан
      const genO = () => Array.from({ length: 4 }, () => ({ price: (Math.random() * 1000).toFixed(2), amt: (Math.random() * 2).toFixed(3) }));
      setOrders({ bids: genO(), asks: genO() });

      // Генерируем историю ленты
      const newTrade = {
        id: Math.random(),
        text: `${ALL_COINS[Math.floor(Math.random() * 8)].id} ${Math.random() > 0.5 ? 'BUY' : 'SELL'}`,
        amt: (Math.random() * 10).toFixed(1),
        time: new Date().toLocaleTimeString().slice(3, 8)
      };
      setMarketHistory(prev => [newTrade, ...prev].slice(0, 8));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Сигналы
  useEffect(() => {
    const genS = () => {
      const available = ALL_COINS.filter(c => c.lvl <= currentLvl);
      const coin = available[Math.floor(Math.random() * available.length)];
      setSignal({ coin: coin.id, sell: EXCHANGES[Math.floor(Math.random()*4)].id, profit: (Math.random()*2+5).toFixed(2), expires: Date.now() + 120000 });
    };
    genS();
    const timer = setInterval(genS, 120000);
    return () => clearInterval(timer);
  }, [currentLvl]);

  const openPos = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (!amt || amt > balance) return;
    setIsPending(true);
    setTimeout(() => {
      setBalance(b => b - amt);
      setActivePositions(prev => ({ 
        ...prev, 
        [coinId]: { margin: amt, lev: leverage, startTime: Date.now() } 
      }));
      setIsPending(false);
      setTradeAmount('');
    }, 600);
  };

  const closePos = (coinId) => {
    const pos = activePositions[coinId];
    if (!pos) return;
    setIsPending(true);
    setTimeout(() => {
      const isWin = signal && coinId === signal.coin && Date.now() < signal.expires;
      const pnl = (pos.margin * pos.lev) * (isWin ? (parseFloat(signal.profit)/100) : -0.20);
      setBalance(b => b + Math.max(0, pos.margin + pnl));
      setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
      if (isWin) setXp(x => x + 50);
      setIsPending(false);
    }, 600);
  };

  return (
    <div className={`app-container ${isShaking ? 'shake-anim' : ''}`}>
      <header className="main-header">
        <div className="lvl-info"><span>LVL {currentLvl}</span><div className="xp-mini"><div className="xp-fill" style={{width: `${progress}%`}}></div></div></div>
        <div className="balance-box"><div className="bal-val">${balance.toLocaleString()}</div></div>
      </header>

      <main className="content">
        {tab === 'mining' && (
          <div className="page-mining">
            <div className="tap-circle" onClick={() => { setBalance(b => b + 0.1); setTaps(t => t + 1); }}>$</div>
            <p className="neon-text">ТАПАЙ МОНЕТУ</p>
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
                      const timeLeft = pos ? Math.max(0, 50 - Math.floor((Date.now() - pos.startTime)/1000)) : null;
                      return (
                        <div key={c.id} className={`coin-item ${pos ? 'active-pos' : ''}`}>
                          <div className="c-info">
                            <b>{c.id}</b>
                            {pos ? <small className="red-txt">LIQ IN {timeLeft}s</small> : <small>${livePrices[c.id] || c.base}</small>}
                          </div>
                          <button className={pos ? 'btn-sell' : 'btn-buy'} onClick={() => pos ? closePos(c.id) : openPos(c.id)}>
                            {pos ? 'CLOSE' : 'OPEN'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="orderbook-side">
                    <div className="ob-section">
                      <small className="ob-title">ORDER BOOK</small>
                      <div className="asks">{orders.asks.map((o,i)=><div key={i} className="ob-row ask"><span>{o.price}</span></div>)}</div>
                      <div className="ob-mid">{livePrices['BTC'] || '---'}</div>
                      <div className="bids">{orders.bids.map((o,i)=><div key={i} className="ob-row bid"><span>{o.price}</span></div>)}</div>
                    </div>
                    
                    <div className="history-section">
                      <small className="ob-title">MARKET TRADES</small>
                      {marketHistory.map(h => (
                        <div key={h.id} className="hist-row"><span>{h.text}</span><span className="grn">{h.amt}</span></div>
                      ))}
                    </div>
                  </div>
                </div>
                {signal && <div className="signal-mini">{signal.coin} ➔ {signal.sell} <b className="grn">+{signal.profit}%</b></div>}
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button onClick={()=>setTab('mining')} className={tab==='mining'?'active':''}>МАЙНИНГ</button>
        <button onClick={()=>setTab('trade')} className={tab==='trade'?'active':''}>БИРЖИ</button>
        <button onClick={()=>setTab('achievements')} className={tab==='achievements'?'active':''}>ТРОФЕИ</button>
      </nav>
    </div>
  );
}
