import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const EXCHANGES = [
  { id: '1inch', name: '1INCH NETWORK', color: '#00ccff' },
  { id: 'uniswap', name: 'UNISWAP V3', color: '#ff007a' },
  { id: 'sushiswap', name: 'SUSHISWAP DEX', color: '#fa52a0' },
  { id: 'pancakeswap', name: 'PANCAKESWAP', color: '#d1884f' }
];

const COINS = [
  { id: 'BTC', minLvl: 10, vol: 'High' }, { id: 'ETH', minLvl: 5, vol: 'High' },
  { id: 'SOL', minLvl: 3, vol: 'Med' }, { id: 'TON', minLvl: 1, vol: 'Low' },
  { id: 'ARB', minLvl: 1, vol: 'Low' }, { id: 'DOGE', minLvl: 2, vol: 'Extreme' }
];

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 500);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
  const [tab, setTab] = useState('mining');
  const [selectedDex, setSelectedDex] = useState(null);
  const [activePositions, setActivePositions] = useState({});
  const [tradeAmount, setTradeAmount] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [signal, setSignal] = useState(null);
  const [isGreed, setIsGreed] = useState(false);
  const [logs, setLogs] = useState([]);
  const [achievements, setAchievements] = useState(() => JSON.parse(localStorage.getItem('k_ach') || '{"tapper":0, "trader":0}'));

  const lvl = Math.floor(Math.sqrt(xp / 100)) + 1;
  const maxLev = lvl >= 5 ? 100 : lvl >= 3 ? 50 : 10;

  // Звуки
  const sndTap = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));
  const sndAlert = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
    localStorage.setItem('k_ach', JSON.stringify(achievements));
  }, [balance, xp, achievements]);

  // Генератор сигналов и Extreme Greed
  useEffect(() => {
    const interval = setInterval(() => {
      const coin = COINS[Math.floor(Math.random() * COINS.length)];
      const dex = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      setSignal({ coin: coin.id, target: dex.id, boost: (Math.random() * 5 + 2).toFixed(1) });
      if (Math.random() > 0.8) {
        setIsGreed(true);
        setTimeout(() => setIsGreed(false), 15000);
      }
      sndAlert.current.play().catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Система Ликвидации (Таймер 120 сек)
  useEffect(() => {
    const timer = setInterval(() => {
      setActivePositions(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          const p = next[id];
          const elapsed = (Date.now() - p.start) / 1000;
          if (elapsed >= 120 && p.status === 'open') {
            // Ликвидация!
            setLogs(l => [{msg: `LIQUIDATED: ${id} -100%`, type: 'loss'}, ...l]);
            delete next[id];
          }
        });
        return { ...next };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTap = () => {
    setBalance(b => b + 0.5);
    setXp(x => x + 1);
    setAchievements(a => ({...a, tapper: a.tapper + 1}));
    sndTap.current.currentTime = 0;
    sndTap.current.play().catch(() => {});
  };

  const openTrade = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (!amt || amt > balance) return;
    setBalance(b => b - amt);
    setActivePositions(p => ({
      ...p,
      [coinId]: { amt, lev: leverage, start: Date.now(), status: 'open', dex: selectedDex }
    }));
    setTradeAmount('');
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const isWin = signal && signal.coin === coinId && signal.target === selectedDex;
    const profitPercent = isWin ? (Math.random() * 10 + 5) : -(Math.random() * 30 + 20);
    const multiplier = isGreed ? 2.5 : 1;
    const result = p.amt + (p.amt * (p.lev * profitPercent) / 100) * multiplier;
    
    setBalance(b => b + result);
    setXp(x => x + 50);
    setLogs(l => [{msg: `${coinId} ${profitPercent > 0 ? '+' : ''}${((result-p.amt)).toFixed(2)}$`, type: profitPercent > 0 ? 'win' : 'loss'}, ...l]);
    setActivePositions(prev => {
      const n = {...prev};
      delete n[coinId];
      return n;
    });
  };

  return (
    <div className={`app-frame ${isGreed ? 'greed-mode' : ''}`}>
      <div className="scanline"></div>
      
      <header className="top-hud">
        <div className="user-info">
          <div className="lvl-box">RANK: {lvl > 8 ? 'WHALE' : lvl > 4 ? 'TRADER' : 'FISH'} [Lvl {lvl}]</div>
          <div className="xp-bar"><div className="xp-progress" style={{width: `${xp%100}%`}}></div></div>
        </div>
        <div className="balance-display">
          <small>AVAILABLE MARGIN</small>
          <div className="amount">${balance.toLocaleString()}</div>
        </div>
      </header>

      <main className="viewport">
        {tab === 'mining' && (
          <div className="mining-view">
            <div className="data-grid"></div>
            <button className="power-btn" onClick={handleTap}>
              <div className="btn-glow"></div>
              <span>EXTRACT</span>
            </button>
            <div className="stat-row">TAPS: {achievements.tapper} | MULTIPLIER: x{lvl}</div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="trade-view">
            {!selectedDex ? (
              <div className="dex-selector">
                {EXCHANGES.map(dex => (
                  <div key={dex.id} className="dex-node" onClick={() => setSelectedDex(dex.id)} style={{'--clr': dex.color}}>
                    <div className="node-info">
                      <span className="node-title">{dex.name}</span>
                      <span className="node-status">ONLINE</span>
                    </div>
                    {Object.values(activePositions).some(p => p.dex === dex.id) && <div className="pos-indicator">POS</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="terminal-ui">
                <div className="term-header">
                  <button onClick={() => setSelectedDex(null)} className="back-cmd">TERMINATE_CONNECTION</button>
                  <div className="inputs">
                    <input type="number" placeholder="QTY" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} />
                    <div className="lev-box">
                      <span>LEVERAGE: X{leverage}</span>
                      <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="term-main">
                  <div className="pair-list">
                    {COINS.map(c => {
                      const p = activePositions[c.id];
                      return (
                        <div key={c.id} className={`pair-card ${p ? 'active' : ''} ${c.minLvl > lvl ? 'locked' : ''}`}>
                          <div className="p-meta">
                            <span className="p-sym">{c.id}/USD</span>
                            {p && <span className="p-timer">LIQ IN: {120 - Math.floor((Date.now()-p.start)/1000)}s</span>}
                          </div>
                          {c.minLvl <= lvl ? (
                            <button className="exec-btn" onClick={() => p ? closeTrade(c.id) : openTrade(c.id)}>
                              {p ? 'CLOSE_POS' : 'EXECUTE_BUY'}
                            </button>
                          ) : <span className="lock-msg">UNLOCK AT LVL {c.minLvl}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="log-sidebar">
                    <div className="log-title">SYSTEM_LOGS</div>
                    {logs.map((l, i) => <div key={i} className={`log-entry ${l.type}`}>{l.msg}</div>)}
                  </div>
                </div>
                {signal && (
                  <div className="signal-ticker">
                    <div className="ticker-content">
                      ::: ALERT ::: INSIDER INFO: {signal.coin} IS PUMPING ON {signal.target} (+{signal.boost}%) :::
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'achievements' && (
          <div className="ach-view">
            <h2 className="glitch-text" data-text="MILESTONES">MILESTONES</h2>
            <div className="ach-grid">
              <div className={`ach-card ${achievements.tapper > 100 ? 'done' : ''}`}>
                <span>TAP MASTER</span>
                <small>100 Taps {achievements.tapper}/100</small>
              </div>
              <div className={`ach-card ${lvl >= 5 ? 'done' : ''}`}>
                <span>HIGH LEVERAGE</span>
                <small>Reach Lvl 5 to unlock x100</small>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="main-nav">
        <button onClick={() => setTab('mining')} className={tab === 'mining' ? 'active' : ''}>MINING</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>TERMINAL</button>
        <button onClick={() => setTab('achievements')} className={tab === 'achievements' ? 'active' : ''}>AWARDS</button>
      </nav>
    </div>
  );
}
