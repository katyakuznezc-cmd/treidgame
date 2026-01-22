
import React, { useState, useEffect, useRef } from 'react';

// --- КОНСТАНТЫ ---
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

// --- ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ---
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

// --- ОСНОВНОЕ ПРИЛОЖЕНИЕ ---
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

  // Реклама при повышении уровня и по таймеру
  const prevLvl = useRef(lvl);
  useEffect(() => {
    localStorage.setItem('k_uid', userId);
    localStorage.setItem(`k_bal_${userId}`, balance);
    localStorage.setItem(`k_xp_${userId}`, xp);
    localStorage.setItem(`k_hist_${userId}`, JSON.stringify(history));
    if (lvl > prevLvl.current) { setShowAd(true); prevLvl.current = lvl; }
  }, [balance, xp, history, userId, lvl]);

  useEffect(() => {
    const itv = setInterval(() => setShowAd(true), 180000); // 3 минуты
    return () => clearInterval(itv);
  }, []);

  // Эмуляция цен
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
    }, 1500);
    return () => clearInterval(itv);
  }, []);

  // Генерация сигналов
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
      {/* ИНЪЕКЦИЯ СТИЛЕЙ - ЧТОБЫ ДИЗАЙН НЕ СЛЕТАЛ */}
      <style>{`
        :root { --win: #00ff88; --loss: #ff3366; --neon: #00d9ff; --panel: #121214; }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; font-family: 'Roboto Mono', monospace; }
        body, html { margin: 0; padding: 0; background: #080808; color: #eee; width: 100vw; height: 100vh; overflow: hidden; }
        .app-neon { height: 100vh; display: flex; flex-direction: column; }
        .n-header { height: 60px; padding: 15px; display: flex; justify-content: space-between; align-items: center; background: var(--panel); border-bottom: 1px solid #222; }
        .n-money { color: var(--win); font-size: 22px; font-weight: bold; }
        
        /* ГРАДИЕНТНЫЕ КНОПКИ */
        .n-p-btn { border: none; padding: 12px 18px; border-radius: 8px; font-weight: 800; cursor: pointer; min-width: 90px; text-transform: uppercase; transition: 0.2s; }
        .n-p-btn.buy { background: linear-gradient(135deg, #00ff88 0%, #00bd65 100%); color: #000; box-shadow: 0 4px 15px rgba(0, 255, 136, 0.4); }
        .n-p-btn.close { background: linear-gradient(135deg, #ff3366 0%, #c21a44 100%); color: #fff; box-shadow: 0 4px 15px rgba(255, 51, 102, 0.4); }
        .n-p-btn:active { transform: scale(0.92); }

        .n-terminal-layout { display: flex; flex: 1; overflow: hidden; }
        .n-term-sidebar { width: 90px; border-right: 1px solid #222; background: #0a0a0a; font-size: 9px; }
        .n-term-main { flex: 1; display: flex; flex-direction: column; overflow-y: auto; }
        .n-pair-row { display: flex; justify-content: space-between; padding: 15px; border-bottom: 1px solid #1a1a1d; align-items: center; }
        .n-price.up { color: var(--win); } .n-price.down { color: var(--loss); }

        .n-ob-row { display: flex; justify-content: space-between; padding: 2px 5px; }
        .n-ob-row.ask { color: var(--loss); } .n-ob-row.bid { color: var(--win); }
        .n-ob-mid { text-align: center; padding: 5px 0; border: 1px solid #222; margin: 5px 0; font-weight: bold; }

        .n-nav { height: 70px; display: flex; background: var(--panel); border-top: 1px solid #222; }
        .n-nav button { flex: 1; background: none; border: none; color: #555; font-size: 10px; font-weight: bold; }
        .n-nav button.active { color: var(--neon); border-top: 2px solid var(--neon); }

        .n-sphere { width: 150px; height: 150px; border: 2px solid var(--neon); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 50px; color: var(--neon); margin: 60px auto; box-shadow: 0 0 30px rgba(0, 217, 255, 0.2); cursor: pointer; }
        
        .n-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .n-ad-card { background: #1a1a1d; border: 2px solid var(--neon); padding: 30px; border-radius: 20px; text-align: center; box-shadow: 0 0 50px rgba(0,217,255,0.4); }
        .n-ad-btn { display: block; background: var(--win); color: #000; padding: 15px; border-radius: 10px; font-weight: bold; text-decoration: none; margin: 20px 0; }
        
        .n-toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); padding: 15px 25px; border-radius: 10px; z-index: 10000; font-weight: bold; }
        .n-toast.win { background: var(--win); color: #000; } .n-toast.loss { background: var(--loss); color: #fff; } .n-toast.info { background: var(--neon); color: #000; }
      `}</style>

      {showAd && (
        <div className="n-modal-overlay">
          <div className="n-ad-card">
            <h2 style={{color: 'var(--win)'}}>ПОРА ТОРГОВАТЬ РЕАЛЬНО!</h2>
            <p>Твой уровень навыков вырос. Начни зарабатывать настоящие деньги на арбитраже!</p>
            <a href="https://t.me/vladstelin78" target="_blank" rel="noreferrer" className="n-ad-btn">НАПИСАТЬ МЕНЕДЖЕРУ</a>
            <button style={{background: 'none', border: 'none', color: '#555', textDecoration: 'underline'}} onClick={() => setShowAd(false)}>Я ПОКА ПОТРЕНИРУЮСЬ</button>
          </div>
        </div>
      )}

      {toast && <div className={`n-toast ${toast.type}`} onClick={() => setToast(null)}>{toast.msg}</div>}
      
      <header className="n-header">
        <div className="n-user-info">
          <div style={{fontSize: '9px', color: '#555'}}>{userId}</div>
          <div style={{fontSize: '11px', color: 'var(--neon)', border: '1px solid #333', padding: '2px 5px', borderRadius: '4px'}}>LVL {lvl}</div>
        </div>
        <div className="n-money">${balance.toFixed(2)}</div>
      </header>

      <main style={{flex: 1, overflow: 'hidden'}}>
        {tab === 'trade' && (
          <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
            {signal && (
              <div style={{background: '#111', padding: '10px', fontSize: '11px', borderBottom: '1px solid #222'}}>
                ⚡ {signal.buyDex} → {signal.sellDexName} | {signal.coin} <span style={{color: 'var(--win)'}}>+{signal.bonus}%</span>
              </div>
            )}
            {!selectedDex ? (
              <div style={{padding: '15px', display: 'grid', gap: '10px'}}>
                {EXCHANGES.map(d => (
                  <div key={d.id} onClick={() => setSelectedDex(d.id)} style={{background: 'var(--panel)', padding: '20px', borderRadius: '8px', borderLeft: `4px solid ${d.color}`, display: 'flex', justifyContent: 'space-between'}}>
                    {d.name} {Object.values(activePositions).some(p => p.dex === d.id) && '📍'}
                  </div>
                ))}
              </div>
            ) : (
              <div className="n-terminal-layout">
                <div className="n-term-sidebar"><OrderBook price={prices[COINS_DATA[0].id]} /></div>
                <div className="n-term-main">
                  <div style={{padding: '10px', background: '#000', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between'}}>
                    <button style={{background: '#222', border: 'none', color: '#fff', fontSize: '10px', padding: '5px 10px'}} onClick={() => setSelectedDex(null)}>← НАЗАД</button>
                    <div style={{display: 'flex', gap: '5px'}}>
                        <input type="number" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} style={{width: '60px', background: '#111', border: '1px solid #333', color: 'var(--win)', fontSize: '11px'}} />
                        <span style={{fontSize: '10px', alignSelf: 'center'}}>x{leverage}</span>
                    </div>
                  </div>
                  <div className="n-pairs">
                    {COINS_DATA.map(c => {
                      const p = activePositions[c.id];
                      const pen = pendingTrades[c.id];
                      return (
                        <div key={c.id} className="n-pair-row">
                          <div>
                            <b>{c.id}</b> <span className={`n-price ${priceDirs[c.id]}`}>${prices[c.id]}</span>
                            {p && <div style={{fontSize: '8px', color: 'var(--loss)'}}>LIQUIDATING...</div>}
                          </div>
                          {c.lvl <= lvl ? (
                            pen ? <div style={{fontSize: '10px', color: '#555'}}>WAIT...</div> :
                            <button className={`n-p-btn ${p ? 'close' : 'buy'}`} onClick={() => p ? closeTrade(c.id) : openTrade(c.id)}>{p ? 'CLOSE' : 'BUY'}</button>
                          ) : <div style={{fontSize: '10px', color: '#333'}}>LVL {c.lvl}</div>}
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
          <div style={{height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
            <div className="n-sphere" onClick={() => {
              setBalance(b => b + 0.1); setXp(x => x + 1);
              if(soundEnabled) { sndClick.current.currentTime = 0; sndClick.current.play().catch(()=>{}); }
            }}>$</div>
            <div style={{width: '80%', height: '100px', background: '#0a0a0a', margin: '20px auto', padding: '10px', borderRadius: '10px', fontSize: '10px', color: '#444'}}>
              SYSTEM ACTIVE: Scanning DEX liquidity...
            </div>
          </div>
        )}

        {tab === 'awards' && (
          <div style={{padding: '20px'}}>
            <h3 style={{fontSize: '14px', color: 'var(--neon)'}}>EXECUTION HISTORY</h3>
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
            <div style={{background: '#111', padding: '15px', borderRadius: '10px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                    <span>ЗВУК</span>
                    <button onClick={() => setSoundEnabled(!soundEnabled)} style={{background: soundEnabled ? 'var(--win)' : '#333', border: 'none', borderRadius: '4px', padding: '2px 10px'}}>{soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</button>
                </div>
                <div style={{fontSize: '10px', color: '#555'}}>ID: {userId}</div>
                <div style={{marginTop: '10px'}}><a href="https://t.me/kriptoalians" target="_blank" rel="noreferrer" style={{color: 'var(--neon)', textDecoration: 'none'}}>@kriptoalians</a></div>
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
