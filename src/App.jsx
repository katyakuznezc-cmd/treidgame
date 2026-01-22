

import React, { useState, useEffect, useRef } from 'react';

// РАСШИРЕННЫЙ СПИСОК МОНЕТ
const COINS_DATA = [
  { id: 'TON', lvl: 1, base: 5.4 },
  { id: 'DOGE', lvl: 2, base: 0.15 },
  { id: 'TRX', lvl: 3, base: 0.12 },
  { id: 'SOL', lvl: 4, base: 145 },
  { id: 'ETH', lvl: 5, base: 2800 },
  { id: 'ADA', lvl: 7, base: 0.45 },
  { id: 'XRP', lvl: 8, base: 0.62 },
  { id: 'BTC', lvl: 10, base: 95000 },
];

const EXCHANGES = [
  { id: '1inch', name: '1INCH', color: '#00ccff' },
  { id: 'uniswap', name: 'UNISWAP', color: '#ff007a' },
  { id: 'sushiswap', name: 'SUSHI', color: '#fa52a0' },
  { id: 'pancakeswap', name: 'PANCAKE', color: '#d1884f' }
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toast, setToast] = useState(null);
  const [prices, setPrices] = useState(COINS_DATA.reduce((acc, c) => ({ ...acc, [c.id]: c.base }), {}));
  const [priceDirs, setPriceDirs] = useState({});

  // Расчет уровня и прогресса
  const lvl = Math.floor(Math.sqrt(xp / 150)) + 1;
  const nextLvlXp = Math.pow(lvl, 2) * 150;
  const currentLvlBaseXp = Math.pow(lvl - 1, 2) * 150;
  const progress = ((xp - currentLvlBaseXp) / (nextLvlXp - currentLvlBaseXp)) * 100;
  
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : 10;

  const sndClick = useRef(new Audio('https://www.fesliyanstudios.com/play-mp3/6510'));
  const sndBell = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  useEffect(() => {
    localStorage.setItem('k_uid', userId);
    localStorage.setItem(`k_bal_${userId}`, balance);
    localStorage.setItem(`k_xp_${userId}`, xp);
    localStorage.setItem(`k_hist_${userId}`, JSON.stringify(history));
  }, [balance, xp, history, userId]);

  useEffect(() => {
    const itv = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        const newDirs = {};
        Object.keys(next).forEach(id => {
          const oldP = parseFloat(next[id]);
          const newP = (oldP * (1 + (Math.random() * 0.0015 - 0.00075))).toFixed(4);
          newDirs[id] = newP > oldP ? 'up' : 'down';
          next[id] = newP;
        });
        setPriceDirs(newDirs);
        return next;
      });
    }, 1500);
    return () => clearInterval(itv);
  }, []);

  const openTrade = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (amt > balance) return setToast({msg: "INS. FUNDS", type: "loss"});
    setBalance(b => b - amt);
    setActivePositions(p => ({ ...p, [coinId]: { amt, lev: leverage, dex: selectedDex, start: Date.now() } }));
    setToast({ msg: "ORDER PLACED", type: "info" });
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const win = Math.random() > 0.4;
    const pnl = (p.amt * (win ? 0.15 : -0.12) * p.lev);
    setPendingTrades(prev => ({ ...prev, [coinId]: true }));
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    setTimeout(() => {
      setBalance(b => b + p.amt + pnl);
      setXp(x => x + 80);
      setHistory(h => [{ coin: coinId, pnl, win, date: new Date().toLocaleTimeString() }, ...h.slice(0, 10)]);
      setPendingTrades(prev => { const n = {...prev}; delete n[coinId]; return n; });
      setToast({ msg: win ? "PROFIT RECEIVED" : "LOSS RECOGNIZED", type: win ? 'win' : 'loss' });
    }, 5000);
  };

  return (
    <div className="app-neon">
      <style>{`
        :root { --win: #00ff88; --loss: #ff3366; --neon: #00d9ff; --panel: #121214; }
        body { background: #080808; color: #eee; font-family: 'Roboto Mono', monospace; margin: 0; overflow: hidden; }
        .app-neon { height: 100vh; display: flex; flex-direction: column; }
        
        /* HEADER & XP BAR */
        .n-header { padding: 10px 15px; background: var(--panel); border-bottom: 1px solid #222; }
        .n-top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .n-money { color: var(--win); font-size: 20px; font-weight: bold; }
        .n-xp-container { height: 4px; background: #222; border-radius: 2px; overflow: hidden; }
        .n-xp-bar { height: 100%; background: var(--neon); box-shadow: 0 0 10px var(--neon); transition: width 0.3s; }

        /* EXIT BUTTON */
        .n-exit-btn { 
          background: #ff3366; color: #fff; border: none; 
          padding: 8px 12px; border-radius: 4px; font-weight: bold; font-size: 10px;
          box-shadow: 0 0 10px rgba(255,51,102,0.4); cursor: pointer;
        }

        /* PAIR ROW */
        .n-pair-row { display: flex; justify-content: space-between; padding: 12px 15px; border-bottom: 1px solid #1a1a1d; align-items: center; }
        .n-pair-info b { font-size: 14px; }
        .n-pair-info .n-price { font-size: 12px; display: block; }
        .n-price.up { color: var(--win); } .n-price.down { color: var(--loss); }

        /* LOCK STATE */
        .n-lock-box { text-align: right; color: #444; font-size: 10px; font-weight: bold; }
        .n-lock-icon { font-size: 14px; margin-bottom: 2px; display: block; }

        /* BUTTONS */
        .n-p-btn { border: none; padding: 10px 16px; border-radius: 6px; font-weight: 900; min-width: 85px; text-transform: uppercase; }
        .n-p-btn.buy { background: linear-gradient(135deg, #00ff88 0%, #00bd65 100%); color: #000; }
        .n-p-btn.close { background: linear-gradient(135deg, #ff3366 0%, #c21a44 100%); color: #fff; }

        /* LAYOUT */
        .n-term-layout { display: flex; flex: 1; overflow: hidden; }
        .n-term-sidebar { width: 85px; border-right: 1px solid #222; background: #0a0a0a; font-size: 8px; }
        .n-term-main { flex: 1; display: flex; flex-direction: column; overflow-y: auto; }

        .n-nav { height: 70px; display: flex; background: var(--panel); border-top: 1px solid #222; padding-bottom: env(safe-area-inset-bottom); }
        .n-nav button { flex: 1; background: none; border: none; color: #444; font-size: 10px; font-weight: bold; }
        .n-nav button.active { color: var(--neon); background: rgba(0,217,255,0.05); border-top: 2px solid var(--neon); }

        .n-sphere { width: 140px; height: 140px; border: 2px solid var(--neon); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 50px; color: var(--neon); margin: 60px auto; cursor: pointer; box-shadow: 0 0 20px rgba(0,217,255,0.2); }
        .n-ob-row { display: flex; justify-content: space-between; padding: 2px 5px; opacity: 0.5; }
        .n-ob-row.ask { color: var(--loss); } .n-ob-row.bid { color: var(--win); }
        .n-ob-mid { text-align: center; font-weight: bold; margin: 10px 0; font-size: 10px; }

        .n-toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); padding: 12px 25px; border-radius: 8px; z-index: 9999; font-weight: bold; font-size: 12px; }
        .n-toast.win { background: var(--win); color: #000; } .n-toast.loss { background: var(--loss); color: #fff; } .n-toast.info { background: var(--neon); color: #000; }
      `}</style>

      {toast && <div className={`n-toast ${toast.type}`} onClick={() => setToast(null)}>{toast.msg}</div>}

      <header className="n-header">
        <div className="n-top-row">
          <div style={{fontSize: '10px', color: 'var(--neon)'}}>LVL {lvl} <span style={{color: '#444'}}>| {userId}</span></div>
          <div className="n-money">${balance.toFixed(2)}</div>
        </div>
        <div className="n-xp-container">
          <div className="n-xp-bar" style={{width: `${progress}%`}}></div>
        </div>
      </header>

      <main style={{flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
        {tab === 'trade' && (
          <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
            {!selectedDex ? (
              <div style={{padding: '15px', display: 'grid', gap: '10px'}}>
                {EXCHANGES.map(d => (
                  <div key={d.id} onClick={() => setSelectedDex(d.id)} style={{background: 'var(--panel)', padding: '20px', borderRadius: '10px', borderLeft: `5px solid ${d.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span style={{fontWeight: 'bold', fontSize: '16px'}}>{d.name}</span>
                    <span style={{fontSize: '9px', color: '#555'}}>{Object.values(activePositions).some(p => p.dex === d.id) ? '● TRADING' : 'ENTER'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="n-terminal-layout">
                <div className="n-term-sidebar"><OrderBook price={prices['TON']} /></div>
                <div className="n-term-main">
                  <div style={{padding: '10px', background: '#000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222'}}>
                    <button className="n-exit-btn" onClick={() => setSelectedDex(null)}>✖ EXIT</button>
                    <div style={{textAlign: 'right'}}>
                        <div style={{fontSize: '9px', color: '#555'}}>LEV x{leverage} (MAX x{maxLev})</div>
                        <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(parseInt(e.target.value))} style={{width: '70px'}} />
                    </div>
                  </div>
                  <div className="n-pairs">
                    {COINS_DATA.map(c => {
                      const p = activePositions[c.id];
                      const isLocked = c.lvl > lvl;
                      return (
                        <div key={c.id} className="n-pair-row" style={{opacity: isLocked ? 0.4 : 1}}>
                          <div className="n-pair-info">
                            <b>{c.id}/USDT</b>
                            <span className={`n-price ${priceDirs[c.id]}`}>${prices[c.id]}</span>
                          </div>
                          
                          {isLocked ? (
                            <div className="n-lock-box">
                              <span className="n-lock-icon">🔒</span>
                              LVL {c.lvl}
                            </div>
                          ) : (
                            pendingTrades[c.id] ? <div style={{fontSize: '10px', color: '#555'}}>PENDING...</div> :
                            <button className={`n-p-btn ${p ? 'close' : 'buy'}`} onClick={() => p ? closeTrade(c.id) : openTrade(c.id)}>{p ? 'CLOSE' : 'BUY'}</button>
                          )}
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
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
            <div className="n-sphere" onClick={() => {
              setBalance(b => b + 0.05); setXp(x => x + 2);
              if(soundEnabled) { sndClick.current.currentTime = 0; sndClick.current.play().catch(()=>{}); }
            }}>$</div>
            <div style={{textAlign: 'center', color: '#444', fontSize: '11px'}}>TAP TO MINE EXPERIENCE</div>
          </div>
        )}

        {tab === 'awards' && (
          <div style={{padding: '20px'}}>
            <h3 style={{fontSize: '14px', color: 'var(--neon)', borderBottom: '1px solid #222', paddingBottom: '10px'}}>HISTORY</h3>
            {history.map((h, i) => (
              <div key={i} style={{display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #111', fontSize: '12px'}}>
                <span>{h.coin}</span>
                <span style={{color: h.win ? 'var(--win)' : 'var(--loss)'}}>{h.win?'+':''}${h.pnl.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'settings' && (
          <div style={{padding: '20px'}}>
            <div style={{background: '#111', padding: '15px', borderRadius: '10px', fontSize: '12px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                    <span>SOUND</span>
                    <button onClick={() => setSoundEnabled(!soundEnabled)} style={{background: soundEnabled ? 'var(--win)' : '#333', border: 'none', borderRadius: '4px', padding: '4px 12px'}}>{soundEnabled ? 'ON' : 'OFF'}</button>
                </div>
                <div style={{color: '#555'}}>ID: {userId}</div>
                <div style={{marginTop: '15px'}}><a href="https://t.me/kriptoalians" target="_blank" rel="noreferrer" style={{color: 'var(--neon)', textDecoration: 'none'}}>ADMIN: @kriptoalians</a></div>
            </div>
          </div>
        )}
      </main>

      <nav className="n-nav">
        <button onClick={() => setTab('mining')} className={tab === 'mining' ? 'active' : ''}>MINE</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>EXCHANGE</button>
        <button onClick={() => setTab('awards')} className={tab === 'awards' ? 'active' : ''}>HISTORY</button>
        <button onClick={() => setTab('settings')} className={tab === 'settings' ? 'active' : ''}>OPTS</button>
      </nav>
    </div>
  );
}
