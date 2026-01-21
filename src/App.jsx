import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const EXCHANGES = [
  { id: '1inch', name: '1INCH', color: '#00ccff' },
  { id: 'uniswap', name: 'UNISWAP', color: '#ff007a' },
  { id: 'sushiswap', name: 'SUSHI', color: '#fa52a0' },
  { id: 'pancakeswap', name: 'PANCAKE', color: '#d1884f' }
];

const COINS = [
  { id: 'BTC', lvl: 10 }, { id: 'ETH', lvl: 5 }, { id: 'SOL', lvl: 3 },
  { id: 'TON', lvl: 1 }, { id: 'ARB', lvl: 1 }, { id: 'DOGE', lvl: 2 }
];

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 1000);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
  const [tab, setTab] = useState('mining');
  const [selectedDex, setSelectedDex] = useState(null);
  const [activePositions, setActivePositions] = useState({});
  const [tradeAmount, setTradeAmount] = useState('10');
  const [leverage, setLeverage] = useState(1);
  const [signal, setSignal] = useState(null);
  const [isGreed, setIsGreed] = useState(false);
  const [logs, setLogs] = useState([]);
  const [soundOn, setSoundOn] = useState(true);

  const lvl = Math.floor(Math.sqrt(xp / 100)) + 1;
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : lvl >= 3 ? 20 : 10;

  const sndAlert = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
  }, [balance, xp]);

  // Генератор сигналов (Всегда активен)
  useEffect(() => {
    const triggerSignal = () => {
      const coin = COINS[Math.floor(Math.random() * COINS.length)];
      const dex = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      setSignal({ coin: coin.id, dex: dex.name, dexId: dex.id, bonus: (Math.random() * 5 + 3).toFixed(1) });
      if (soundOn) sndAlert.current.play().catch(() => {});
    };
    triggerSignal();
    const itv = setInterval(triggerSignal, 40000);
    return () => clearInterval(itv);
  }, [soundOn]);

  // Extreme Greed
  useEffect(() => {
    const itv = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsGreed(true);
        setTimeout(() => setIsGreed(false), 15000);
      }
    }, 60000);
    return () => clearInterval(itv);
  }, []);

  // Ликвидация
  useEffect(() => {
    const timer = setInterval(() => {
      setActivePositions(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          const p = next[id];
          const left = 120 - Math.floor((Date.now() - p.start) / 1000);
          if (left <= 0) {
            setLogs(l => [{msg: `LIQ: ${id} -100%`, win: false}, ...l]);
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const openTrade = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (amt > balance) return;
    setBalance(b => b - amt);
    setActivePositions(p => ({ ...p, [coinId]: { amt, lev: leverage, start: Date.now(), dex: selectedDex } }));
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const isWin = signal && signal.coin === coinId && signal.dexId === selectedDex;
    const pnlBase = isWin ? (Math.random() * 8 + 4) : -(Math.random() * 15 + 10);
    const multiplier = isGreed ? 2.5 : 1;
    const finalPnl = (p.amt * (p.lev * pnlBase) / 100) * multiplier;
    
    setBalance(b => b + p.amt + finalPnl);
    setXp(x => x + (isWin ? 60 : 10));
    setLogs(l => [{msg: `${coinId} ${finalPnl > 0 ? '+$' : '$'}${finalPnl.toFixed(2)}`, win: finalPnl > 0}, ...l]);
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
  };

  return (
    <div className={`app-container ${isGreed ? 'greed-active' : ''}`}>
      <div className="overlay-scan"></div>
      
      <header className="hud-top">
        <div className="status-group">
          <div className="rank">OPERATOR_LVL_{lvl}</div>
          <div className="xp-track"><div className="xp-fill" style={{width: `${xp%100}%`}}></div></div>
        </div>
        <div className="balance-box">
          <small>CREDITS</small>
          <div className="val">${balance.toLocaleString()}</div>
        </div>
      </header>

      <main className="content-area">
        {tab === 'mining' && (
          <div className="mining-wrap">
            <button className="main-tap-btn" onClick={() => { setBalance(b => b + 0.2 * lvl); setXp(x => x + 1); }}>
              <div className="btn-inner">$</div>
            </button>
            <div className="mining-info">TAP TO EXTRACT DATA_CREDITS</div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="trade-wrap">
            {!selectedDex ? (
              <div className="dex-list">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="dex-item" onClick={() => setSelectedDex(d.id)} style={{'--accent': d.color}}>
                    <div className="dex-info">
                      <span className="dex-n">{d.name}</span>
                      <span className="dex-s">PROTOCOL_ACTIVE</span>
                    </div>
                    {Object.values(activePositions).some(p => p.dex === d.id) && <div className="dot-active"></div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="terminal-shell">
                <div className="term-header">
                  <button onClick={() => setSelectedDex(null)} className="btn-back">EXIT_DEX</button>
                  <div className="term-controls">
                    <input type="number" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} />
                    <div className="lev-slider">
                      <span>LEV: x{leverage}</span>
                      <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="term-body">
                  <div className="market-column">
                    {COINS.map(c => {
                      const p = activePositions[c.id];
                      const locked = c.lvl > lvl;
                      return (
                        <div key={c.id} className={`coin-row ${p ? 'active' : ''} ${locked ? 'locked' : ''}`}>
                          <div className="c-info">
                            <span className="c-id">{c.id}</span>
                            {p && <span className="c-liq">{120 - Math.floor((Date.now()-p.start)/1000)}s</span>}
                          </div>
                          {!locked ? (
                            <button className={`btn-action ${p ? 'close' : 'open'}`} onClick={() => p ? closeTrade(c.id) : openTrade(c.id)}>
                              {p ? 'CLOSE' : 'BUY'}
                            </button>
                          ) : <span className="c-lock">LVL {c.lvl}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="history-column">
                    <small>HISTORY</small>
                    {logs.slice(0, 8).map((l, i) => <div key={i} className={`log-row ${l.win ? 'up' : 'down'}`}>{l.msg}</div>)}
                  </div>
                </div>
                {signal && (
                  <div className="signal-footer">
                    <div className="signal-content">
                      <span className="blink">●</span> SIGNAL: {signal.coin} PUMP ON {signal.dex} (+{signal.bonus}%)
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'awards' && (
          <div className="awards-wrap">
            <h2 className="title-glitch">ACHIEVEMENTS</h2>
            <div className="ach-item"><span>WHALE STATUS</span> <div className="bar"><div style={{width: lvl >= 10 ? '100%' : '20%'}}></div></div></div>
            <div className="ach-item"><span>LEVERAGE KING</span> <div className="bar"><div style={{width: leverage >= 100 ? '100%' : '10%'}}></div></div></div>
          </div>
        )}
      </main>

      <nav className="nav-bottom">
        <button onClick={() => setTab('mining')} className={tab === 'mining' ? 'active' : ''}>CORE</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>TERMINAL</button>
        <button onClick={() => setTab('awards')} className={tab === 'awards' ? 'active' : ''}>AWARDS</button>
      </nav>
    </div>
  );
}
