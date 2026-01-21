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
  const [soundOn, setSoundOn] = useState(() => JSON.parse(localStorage.getItem('k_snd') ?? 'true'));
  const [tapAnims, setTapAnims] = useState([]);

  const lvl = Math.floor(Math.sqrt(xp / 100)) + 1;
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : lvl >= 3 ? 20 : 10;

  const sndAlert = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));
  const sndTap = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
    localStorage.setItem('k_snd', JSON.stringify(soundOn));
  }, [balance, xp, soundOn]);

  // Сигналы
  useEffect(() => {
    const triggerSignal = () => {
      const coin = COINS[Math.floor(Math.random() * COINS.length)];
      const dex = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      setSignal({ coin: coin.id, dex: dex.name, dexId: dex.id, bonus: (Math.random() * 5 + 3).toFixed(1) });
      if (soundOn) sndAlert.current.play().catch(() => {});
    };
    triggerSignal();
    const itv = setInterval(triggerSignal, 45000);
    return () => clearInterval(itv);
  }, [soundOn]);

  // Ликвидация (120 сек)
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

  const handleTap = (e) => {
    setBalance(b => b + 1);
    setXp(x => x + 1);
    if (soundOn) { sndTap.current.currentTime = 0; sndTap.current.play().catch(()=>{}); }
    const touch = (e.touches && e.touches[0]) || e;
    const id = Date.now();
    setTapAnims(p => [...p, { id, x: touch.clientX, y: touch.clientY }]);
    setTimeout(() => setTapAnims(p => p.filter(a => a.id !== id)), 800);
  };

  const openTrade = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (amt > balance || amt <= 0) return;
    setBalance(b => b - amt);
    setActivePositions(p => ({ ...p, [coinId]: { amt, lev: leverage, start: Date.now(), dex: selectedDex } }));
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const isWin = signal && signal.coin === coinId && signal.dexId === selectedDex;
    const pnlBase = isWin ? (Math.random() * 10 + 5) : -(Math.random() * 20 + 15);
    const finalPnl = (p.amt * (p.lev * pnlBase) / 100);
    
    setBalance(b => b + p.amt + finalPnl);
    setXp(x => x + (isWin ? 100 : 20));
    setLogs(l => [{msg: `${coinId} ${finalPnl > 0 ? '+$' : '$'}${finalPnl.toFixed(2)}`, win: finalPnl > 0}, ...l]);
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
  };

  return (
    <div className={`app-container ${isGreed ? 'greed' : ''}`}>
      <div className="scanline"></div>
      
      {tapAnims.map(a => <div key={a.id} className="tap-dollar" style={{left:a.x, top:a.y}}>$</div>)}

      <header className="hud-header">
        <div className="hud-left">
          <div className="hud-rank">LEVEL {lvl}</div>
          <div className="xp-container"><div className="xp-fill" style={{width: `${xp%100}%`}}></div></div>
        </div>
        <div className="hud-right">
          <div className="hud-bal">${balance.toFixed(2)}</div>
        </div>
      </header>

      <main className="hud-viewport">
        {tab === 'mining' && (
          <div className="view-mining">
            <div className="mining-core" onClick={handleTap}>
              <div className="core-inner">$</div>
            </div>
            <div className="mining-label">EXTRACTING_VAL_ASSETS...</div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="view-trade">
            {!selectedDex ? (
              <div className="dex-grid">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="dex-box" onClick={() => setSelectedDex(d.id)} style={{'--clr': d.color}}>
                    <span className="dex-name">{d.name}</span>
                    {Object.values(activePositions).some(p => p.dex === d.id) && <div className="dex-alert"></div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="terminal-container">
                <div className="term-top">
                  <button onClick={() => setSelectedDex(null)} className="term-back">BACK</button>
                  <div className="term-input-group">
                    <input type="number" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} />
                    <div className="term-lev">
                      <span>LEV: x{leverage}</span>
                      <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="term-main">
                  <div className="term-pairs">
                    {COINS.map(c => {
                      const p = activePositions[c.id];
                      const locked = c.lvl > lvl;
                      return (
                        <div key={c.id} className={`pair-row ${p ? 'active' : ''} ${locked ? 'locked' : ''}`}>
                          <div className="p-info">
                            <div className="p-sym">{c.id}</div>
                            {p && <div className="p-liq">{120 - Math.floor((Date.now()-p.start)/1000)}s</div>}
                          </div>
                          {!locked ? (
                            <button className={`p-btn ${p ? 'close' : 'buy'}`} onClick={() => p ? closeTrade(c.id) : openTrade(c.id)}>
                              {p ? 'CLOSE' : 'BUY'}
                            </button>
                          ) : <div className="p-lock">LVL {c.lvl}</div>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="term-logs">
                    <div className="log-head">HISTORY</div>
                    {logs.slice(0, 10).map((l, i) => <div key={i} className={`log-item ${l.win ? 'up' : 'down'}`}>{l.msg}</div>)}
                  </div>
                </div>
                {signal && (
                  <div className="term-signal">
                    <div className="signal-content">
                      SIGNAL: {signal.coin} ➔ {signal.dex} (+{signal.bonus}%)
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'awards' && (
          <div className="view-awards">
            <h2 className="view-title">ACHIEVEMENTS</h2>
            <div className="ach-card"><span>TAP_MASTER</span> <small>{xp} XP</small></div>
            <div className="ach-card"><span>MAX_LEVERAGE</span> <small>MAX x{maxLev}</small></div>
            <div className="ach-card"><span>BALANCE_PRO</span> <small>${balance.toFixed(0)}</small></div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="view-settings">
            <h2 className="view-title">SYSTEM_SETTINGS</h2>
            <div className="sett-row">
              <span>AUDIO_FEEDBACK</span>
              <button className={`sett-btn ${soundOn ? 'active' : ''}`} onClick={() => setSoundOn(!soundOn)}>
                {soundOn ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
            <div className="sett-link">
              <a href="https://t.me/kriptoalians" target="_blank" rel="noreferrer">CREATORS: @kriptoalians</a>
            </div>
          </div>
        )}
      </main>

      <nav className="hud-nav">
        <button onClick={() => setTab('mining')} className={tab === 'mining' ? 'active' : ''}>CORE</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>DEX</button>
        <button onClick={() => setTab('awards')} className={tab === 'awards' ? 'active' : ''}>AWARDS</button>
        <button onClick={() => setTab('settings')} className={tab === 'settings' ? 'active' : ''}>OPTS</button>
      </nav>
    </div>
  );
}
