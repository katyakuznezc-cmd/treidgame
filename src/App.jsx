import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const EXCHANGES = [
  { id: '1inch', name: '1INCH', color: '#00ccff' },
  { id: 'uniswap', name: 'UNISWAP', color: '#ff007a' },
  { id: 'sushiswap', name: 'SUSHI', color: '#fa52a0' },
  { id: 'pancakeswap', name: 'PANCAKE', color: '#d1884f' }
];

const COINS_DATA = [
  { id: 'BTC', lvl: 10, base: 95000 }, { id: 'ETH', lvl: 5, base: 2800 }, 
  { id: 'SOL', lvl: 3, base: 145 }, { id: 'TON', lvl: 1, base: 5.4 }
];

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 100);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
  const [tab, setTab] = useState('mining');
  const [selectedDex, setSelectedDex] = useState(null);
  
  // Состояния сделок
  const [activePositions, setActivePositions] = useState({}); 
  const [pendingTrades, setPendingTrades] = useState({}); // Сделки в процессе выплаты
  const [tradeAmount, setTradeAmount] = useState('10');
  const [leverage, setLeverage] = useState(1);
  const [signal, setSignal] = useState(null);
  const [history, setHistory] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);
  
  // Настройки и Визуал
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toast, setToast] = useState(null);
  const [prices, setPrices] = useState(COINS_DATA.reduce((acc, c) => ({ ...acc, [c.id]: c.base }), {}));
  const [priceDirs, setPriceDirs] = useState({});

  const lvl = Math.floor(Math.sqrt(xp / 150)) + 1;
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : 10;

  // Звуки
  const sndBell = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));
  const sndClick = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
  }, [balance, xp]);

  // Движок цен и Живой трафик
  useEffect(() => {
    const itv = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        const newDirs = {};
        Object.keys(next).forEach(id => {
          const oldP = parseFloat(next[id]);
          const change = 1 + (Math.random() * 0.004 - 0.002);
          const newP = (oldP * change).toFixed(2);
          newDirs[id] = newP > oldP ? 'up' : 'down';
          next[id] = newP;
        });
        setPriceDirs(newDirs);
        return next;
      });

      // Имитация трафика биржи
      const randomCoin = COINS_DATA[Math.floor(Math.random() * COINS_DATA.length)].id;
      const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
      setLiveFeed(prev => [{ id: Date.now(), txt: `${type} ${randomCoin} $${(Math.random()*1000).toFixed(2)}`, type }, ...prev.slice(0, 5)]);
    }, 1500);
    return () => clearInterval(itv);
  }, []);

  // Генерация сигналов (раз в 45 сек для динамики)
  useEffect(() => {
    const trigger = () => {
      const avail = COINS_DATA.filter(c => c.lvl <= lvl);
      const coin = avail[Math.floor(Math.random() * avail.length)];
      const d1 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      let d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      while(d2.id === d1.id) d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      
      setSignal({ 
        coin: coin.id, buyDex: d1.name, sellDexId: d2.id, sellDexName: d2.name, 
        bonus: (Math.random() * 12 + 4).toFixed(1), id: Date.now() 
      });
      if(soundEnabled) sndBell.current.play().catch(()=>{});
    };
    trigger();
    const itv = setInterval(trigger, 45000);
    return () => clearInterval(itv);
  }, [lvl, soundEnabled]);

  const openTrade = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (amt > balance || amt <= 0) return setToast({msg: "INSUFFICIENT FUNDS", type: "loss"});
    
    setBalance(b => b - amt);
    setActivePositions(p => ({ 
      ...p, 
      [coinId]: { amt, lev: leverage, dex: selectedDex, signalId: signal?.id, start: Date.now() } 
    }));
    setToast({ msg: "POSITION OPENED", type: "info" });
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const isCorrect = signal && p.signalId === signal.id && signal.sellDexId === selectedDex;
    const isWin = isCorrect && Math.random() > 0.2; 
    const pnl = (p.amt * ((isWin ? parseFloat(signal.bonus) : -15) * p.lev) / 100);

    // Переводим в статус PENDING
    setPendingTrades(prev => ({ ...prev, [coinId]: { ...p, pnl, isWin, coin: coinId } }));
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    setToast({ msg: "PROCESSING WITHDRAWAL...", type: "info" });

    // ВЫПЛАТА ЧЕРЕЗ 10 СЕКУНД
    setTimeout(() => {
      setBalance(b => b + p.amt + pnl);
      setXp(x => x + 50);
      setHistory(h => [{ coin: coinId, pnl, win: isWin, date: new Date().toLocaleTimeString() }, ...h.slice(0, 10)]);
      setPendingTrades(prev => { const n = {...prev}; delete n[coinId]; return n; });
      setToast({ msg: isWin ? `PROFIT: +$${pnl.toFixed(2)}` : `LOSS: $${pnl.toFixed(2)}`, type: isWin ? 'win' : 'loss' });
    }, 10000);
  };

  return (
    <div className="app-neon">
      {toast && <div className={`n-toast ${toast.type}`}>{toast.msg}</div>}

      <header className="n-header">
        <div className="n-brand">PRO TERMINAL <span className="n-live-dot"></span></div>
        <div className="n-balance-wrap">
            <small>ESTIMATED BALANCE</small>
            <div className="n-money">${balance.toFixed(2)}</div>
        </div>
      </header>

      <main className="n-viewport">
        {tab === 'trade' && (
          <div className="n-trade-view">
            {signal && (
              <div className="n-signal-widget">
                <div className="n-sig-header">⚡ MARKET ARBITRAGE</div>
                <div className="n-sig-content">
                  <div className="n-sig-route"><b>{signal.buyDex}</b> → <b>{signal.sellDexName}</b></div>
                  <div className="n-sig-coin">{signal.coin} <span className="n-win-text">+{signal.bonus}%</span></div>
                </div>
              </div>
            )}

            {!selectedDex ? (
              <div className="n-dex-list">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="n-dex-card" onClick={() => setSelectedDex(d.id)} style={{'--c': d.color}}>
                    <div className="n-dex-name">{d.name}</div>
                    <div className="n-dex-status">ONLINE</div>
                    {(activePositions[d.id] || Object.values(activePositions).some(p => p.dex === d.id)) && <div className="n-alert-dot"></div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="n-terminal">
                <div className="n-term-bar">
                  <button onClick={() => setSelectedDex(null)} className="n-back">← MARKETS</button>
                  <div className="n-controls">
                    <div className="n-input-box">
                      <small>AMOUNT</small>
                      <input type="number" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} />
                    </div>
                    <div className="n-input-box">
                      <small>LEVERAGE x{leverage}</small>
                      <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(parseInt(e.target.value))} />
                    </div>
                  </div>
                </div>
                <div className="n-pairs">
                  {COINS_DATA.map(c => {
                    const p = activePositions[c.id];
                    const pen = pendingTrades[c.id];
                    const timeLeft = p ? 120 - Math.floor((Date.now() - p.start)/1000) : 0;
                    
                    return (
                      <div key={c.id} className={`n-pair-row ${p ? 'active' : ''}`}>
                        <div className="n-p-meta">
                          <b>{c.id}/USDT</b>
                          <span className={`n-price ${priceDirs[c.id]}`}>${prices[c.id]}</span>
                          {p && <div className="n-liq-timer">LIQ: {timeLeft}s</div>}
                        </div>
                        {c.lvl <= lvl ? (
                          pen ? <div className="n-pending-btn">PENDING...</div> :
                          <button className={`n-p-btn ${p ? 'close' : 'buy'}`} onClick={() => p ? closeTrade(c.id) : openTrade(c.id)}>
                            {p ? 'CLOSE' : 'BUY'}
                          </button>
                        ) : <div className="n-lock-btn">LVL {c.lvl}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'mining' && (
          <div className="n-mining-view">
            <div className="n-sphere" onClick={(e) => {
                setBalance(b => b + 0.1); setXp(x => x + 1);
                if(soundEnabled) { sndClick.current.currentTime = 0; sndClick.current.play(); }
            }}>$</div>
            <div className="n-live-traffic">
                <small>LIVE NETWORK TRAFFIC</small>
                {liveFeed.map(f => (
                    <div key={f.id} className={`n-feed-line ${f.type.toLowerCase()}`}>{f.txt}</div>
                ))}
            </div>
          </div>
        )}

        {tab === 'awards' && (
          <div className="n-history-view">
            <h3 className="n-title">TRADING LOGS</h3>
            {history.map((h, i) => (
              <div key={i} className={`n-history-card ${h.win ? 'win' : 'loss'}`}>
                <div className="n-h-main"><b>{h.coin}</b> <span>{h.win ? '+' : ''}${h.pnl.toFixed(2)}</span></div>
                <small>{h.date}</small>
              </div>
            ))}
          </div>
        )}

        {tab === 'settings' && (
          <div className="n-settings-view">
            <h3 className="n-title">SYSTEM PREFERENCES</h3>
            <div className="n-opt-card">
                <div className="n-opt-row">
                    <span>AUDIO FEEDBACK</span>
                    <button onClick={() => setSoundEnabled(!soundEnabled)} className={soundEnabled ? 'on' : ''}>
                        {soundEnabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                </div>
                <div className="n-opt-row">
                    <span>TERMINAL ACCESS</span>
                    <a href="https://t.me/kriptoalians" target="_blank" rel="noreferrer">@kriptoalians</a>
                </div>
            </div>
          </div>
        )}
      </main>

      <nav className="n-nav">
        <button onClick={() => setTab('mining')} className={tab === 'mining' ? 'active' : ''}>NETWORK</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>EXCHANGE</button>
        <button onClick={() => setTab('awards')} className={tab === 'awards' ? 'active' : ''}>LOGS</button>
        <button onClick={() => setTab('settings')} className={tab === 'settings' ? 'active' : ''}>OPTS</button>
      </nav>
    </div>
  );
}
