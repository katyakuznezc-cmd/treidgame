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

const OrderBook = ({ price }) => {
  const [orders, setOrders] = useState({ bids: [], asks: [] });
  useEffect(() => {
    const gen = () => {
      const p = parseFloat(price);
      const asks = [], bids = [];
      for (let i = 0; i < 6; i++) {
        asks.push({ p: (p + (i * 0.001 * p)).toFixed(2), v: (Math.random() * 1.5).toFixed(3) });
        bids.push({ p: (p - (i * 0.001 * p)).toFixed(2), v: (Math.random() * 1.5).toFixed(3) });
      }
      setOrders({ asks: asks.reverse(), bids });
    };
    gen();
    const itv = setInterval(gen, 1500);
    return () => clearInterval(itv);
  }, [price]);

  return (
    <div className="n-orderbook">
      <div className="n-ob-asks">{orders.asks.map((o, i) => <div key={i} className="n-ob-row ask"><span>{o.p}</span><span>{o.v}</span></div>)}</div>
      <div className="n-ob-mid">{price}</div>
      <div className="n-ob-bids">{orders.bids.map((o, i) => <div key={i} className="n-ob-row bid"><span>{o.p}</span><span>{o.v}</span></div>)}</div>
    </div>
  );
};

export default function App() {
  const [userId] = useState(() => localStorage.getItem('k_uid') || 'ID' + Math.floor(Math.random() * 999999));
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem(`k_bal_${userId}`)) || 500.00);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem(`k_xp_${userId}`)) || 0);
  const [tab, setTab] = useState('mining');
  const [selectedDex, setSelectedDex] = useState(null);
  const [activePositions, setActivePositions] = useState({}); 
  const [pendingTrades, setPendingTrades] = useState({}); 
  const [tradeAmount, setTradeAmount] = useState('50');
  const [leverage, setLeverage] = useState(1);
  const [signal, setSignal] = useState(null);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem(`k_hist_${userId}`)) || []);
  const [liveFeed, setLiveFeed] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toast, setToast] = useState(null);
  const [showAd, setShowAd] = useState(false);

  const [prices, setPrices] = useState(COINS_DATA.reduce((acc, c) => ({ ...acc, [c.id]: c.base }), {}));
  const [priceDirs, setPriceDirs] = useState({});

  const lvl = Math.floor(Math.sqrt(xp / 150)) + 1;
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : 10;

  const sndBell = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));
  const sndClick = useRef(new Audio('https://www.fesliyanstudios.com/play-mp3/6510'));

  const prevLvl = useRef(lvl);
  useEffect(() => {
    localStorage.setItem('k_uid', userId);
    localStorage.setItem(`k_bal_${userId}`, balance);
    localStorage.setItem(`k_xp_${userId}`, xp);
    localStorage.setItem(`k_hist_${userId}`, JSON.stringify(history));
    if (lvl > prevLvl.current) { setShowAd(true); prevLvl.current = lvl; }
  }, [balance, xp, history, userId, lvl]);

  useEffect(() => {
    const itv = setInterval(() => setShowAd(true), 180000);
    return () => clearInterval(itv);
  }, []);

  useEffect(() => {
    const itv = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        const newDirs = {};
        Object.keys(next).forEach(id => {
          const oldP = parseFloat(next[id]);
          const change = 1 + (Math.random() * 0.003 - 0.0015);
          const newP = (oldP * change).toFixed(2);
          newDirs[id] = newP > oldP ? 'up' : 'down';
          next[id] = newP;
        });
        setPriceDirs(newDirs);
        return next;
      });
      const types = ['BUY','SELL'];
      setLiveFeed(prev => [{ id: Date.now(), txt: `${types[Math.floor(Math.random()*2)]} ${COINS_DATA[Math.floor(Math.random()*4)].id} $${(Math.random()*200).toFixed(2)}` }, ...prev.slice(0, 4)]);
    }, 1500);
    return () => clearInterval(itv);
  }, []);

  useEffect(() => {
    const trigger = () => {
      const avail = COINS_DATA.filter(c => c.lvl <= lvl);
      const coin = avail[Math.floor(Math.random() * avail.length)];
      const d1 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      let d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      while(d2.id === d1.id) d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      setSignal({ coin: coin.id, buyDex: d1.name, sellDexId: d2.id, sellDexName: d2.name, bonus: (Math.random() * 10 + 5).toFixed(1), id: Date.now() });
      if(soundEnabled) { sndBell.current.currentTime = 0; sndBell.current.play().catch(() => {}); }
    };
    trigger();
    const itv = setInterval(trigger, 45000);
    return () => clearInterval(itv);
  }, [lvl, soundEnabled]);

  const openTrade = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (amt > balance || amt <= 0) return setToast({msg: "МАЛО СРЕДСТВ", type: "loss"});
    setBalance(b => b - amt);
    setActivePositions(p => ({ ...p, [coinId]: { amt, lev: leverage, dex: selectedDex, signalId: signal?.id, start: Date.now() } }));
    setToast({ msg: "СДЕЛКА ОТКРЫТА", type: "info" });
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const isWin = signal && p.signalId === signal.id && signal.sellDexId === selectedDex && Math.random() > 0.15;
    const pnl = (p.amt * ((isWin ? parseFloat(signal.bonus) : -18) * p.lev) / 100);
    setPendingTrades(prev => ({ ...prev, [coinId]: true }));
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    setToast({ msg: "ОБРАБОТКА ВЫВОДА (10с)...", type: "info" });
    setTimeout(() => {
      setBalance(b => b + p.amt + pnl);
      setXp(x => x + 50);
      setHistory(h => [{ coin: coinId, pnl, win: isWin, date: new Date().toLocaleTimeString() }, ...h.slice(0, 10)]);
      setPendingTrades(prev => { const n = {...prev}; delete n[coinId]; return n; });
      setToast({ msg: isWin ? `ПРОФИТ: +$${pnl.toFixed(2)}` : `УБЫТОК: $${pnl.toFixed(2)}`, type: isWin ? 'win' : 'loss' });
    }, 10000);
  };

  return (
    <div className="app-neon">
      {showAd && (
        <div className="n-modal-overlay">
          <div className="n-ad-card">
            <h2>ЗАРАБАТЫВАЙ РЕАЛЬНО! 🚀</h2>
            <p>Ты уже освоил демо-торговлю. Пора выходить на настоящий рынок с профитами от $500 в день!</p>
            <p className="n-ad-sub">Менеджер поможет с настройкой.</p>
            <a href="https://t.me/vladstelin78" target="_blank" rel="noreferrer" className="n-ad-btn">СВЯЗАТЬСЯ С @vladstelin78</a>
            <button className="n-ad-close" onClick={() => setShowAd(false)}>ПОЗЖЕ</button>
          </div>
        </div>
      )}

      {toast && <div className={`n-toast ${toast.type}`} onClick={() => setToast(null)}>{toast.msg}</div>}
      
      <header className="n-header">
        <div className="n-user-info"><span className="n-uid">{userId}</span><span className="n-lvl-pill">LVL {lvl}</span></div>
        <div className="n-money">${balance.toFixed(2)}</div>
      </header>

      <main className="n-viewport">
        {tab === 'trade' && (
          <div className="n-trade-view">
            {signal && (
              <div className="n-signal-widget">
                <div className="n-sig-content">⚡ {signal.buyDex} → {signal.sellDexName} | {signal.coin} <span className="n-win-text">+{signal.bonus}%</span></div>
                <div className="n-sig-timer" key={signal.id}></div>
              </div>
            )}
            {!selectedDex ? (
              <div className="n-dex-list">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="n-dex-card" onClick={() => setSelectedDex(d.id)} style={{'--c': d.color}}>
                    <span>{d.name}</span>
                    {Object.values(activePositions).some(p => p.dex === d.id) && <div className="n-active-dot"></div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="n-terminal-layout">
                <div className="n-term-sidebar"><OrderBook price={prices[COINS_DATA[0].id]} /></div>
                <div className="n-term-main">
                  <div className="n-term-header">
                    <button onClick={() => setSelectedDex(null)} className="n-back-btn">← EXIT</button>
                    <div className="n-trade-controls">
                      <div className="n-input-group"><small>AMT</small><input type="number" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} /></div>
                      <div className="n-input-group"><small>x{leverage}</small><input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(parseInt(e.target.value))} /></div>
                    </div>
                  </div>
                  <div className="n-pairs">
                    {COINS_DATA.map(c => {
                      const p = activePositions[c.id];
                      const pen = pendingTrades[c.id];
                      const timeLeft = p ? 120 - Math.floor((Date.now() - p.start)/1000) : 0;
                      return (
                        <div key={c.id} className="n-pair-row">
                          <div className="n-p-meta">
                            <b>{c.id}</b> <span className={`n-price ${priceDirs[c.id]}`}>${prices[c.id]}</span>
                            {p && <div className="n-liq-timer">LIQ: {timeLeft}s</div>}
                          </div>
                          {c.lvl <= lvl ? (
                            pen ? <div className="n-pending-status">WAIT...</div> :
                            <button className={`n-p-btn ${p ? 'close' : 'buy'}`} onClick={() => p ? closeTrade(c.id) : openTrade(c.id)}>{p ? 'CLOSE' : 'BUY'}</button>
                          ) : <div className="n-lock-status">LVL {c.lvl}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'mining' && (
          <div className="n-mining-view">
            <div className="n-sphere" onClick={() => {
              setBalance(b => b + 0.1); setXp(x => x + 1);
              if(soundEnabled) { sndClick.current.currentTime = 0; sndClick.current.play().catch(()=>{}); }
            }}>$</div>
            <div className="n-traffic-box">
              {liveFeed.map(f => <div key={f.id} className="n-feed-line">{f.txt}</div>)}
            </div>
          </div>
        )}

        {tab === 'awards' && (
          <div className="n-history-view">
            <h3 className="n-title">TRADING LOGS</h3>
            {history.map((h, i) => (
              <div key={i} className={`n-history-card ${h.win ? 'win' : 'loss'}`}>
                <b>{h.coin}</b> <span>{h.win ? '+' : ''}${h.pnl.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'settings' && (
          <div className="n-settings-view">
            <h3 className="n-title">SYSTEM OPTS</h3>
            <div className="n-opt-card">
                <div className="n-opt-row"><span>AUDIO</span><button onClick={() => setSoundEnabled(!soundEnabled)} className={soundEnabled ? 'on' : ''}>{soundEnabled ? 'ON' : 'OFF'}</button></div>
                <div className="n-opt-row"><span>ID</span><span className="n-val">{userId}</span></div>
            </div>
          </div>
        )}
      </main>

      <nav className="n-nav">
        <button onClick={() => setTab('mining')} className={tab === 'mining' ? 'active' : ''}>MINE</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>TRADE</button>
        <button onClick={() => setTab('awards')} className={tab === 'awards' ? 'active' : ''}>LOGS</button>
        <button onClick={() => setTab('settings')} className={tab === 'settings' ? 'active' : ''}>OPTS</button>
      </nav>
    </div>
  );
}
