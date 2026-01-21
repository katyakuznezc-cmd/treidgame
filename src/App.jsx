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
  { id: 'SOL', lvl: 3, base: 145 }, { id: 'TON', lvl: 1, base: 5.4 }, 
  { id: 'ARB', lvl: 1, base: 0.9 }, { id: 'DOGE', lvl: 1, base: 0.12 }
];

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 100);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
  const [tab, setTab] = useState('mining');
  const [selectedDex, setSelectedDex] = useState(null);
  const [activePositions, setActivePositions] = useState({});
  const [tradeAmount, setTradeAmount] = useState('10');
  const [leverage, setLeverage] = useState(1);
  const [signal, setSignal] = useState(null);
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [tradeCount, setTradeCount] = useState(0);
  
  // Цены и их направления
  const [prices, setPrices] = useState(COINS_DATA.reduce((acc, c) => ({ ...acc, [c.id]: c.base }), {}));
  const [priceDirs, setPriceDirs] = useState({}); 

  const lvl = Math.floor(Math.sqrt(xp / 150)) + 1;
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : 10;
  const sndAlert = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
  }, [balance, xp]);

  // ДВИЖОК ЦЕН С ЦВЕТОМ
  useEffect(() => {
    const itv = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        const newDirs = {};
        Object.keys(next).forEach(id => {
          const oldP = parseFloat(next[id]);
          const change = 1 + (Math.random() * 0.006 - 0.003);
          const newP = (oldP * change).toFixed(id === 'DOGE' || id === 'ARB' ? 4 : 2);
          newDirs[id] = newP > oldP ? 'up' : 'down';
          next[id] = newP;
        });
        setPriceDirs(newDirs);
        return { ...next };
      });
    }, 1000);
    return () => clearInterval(itv);
  }, []);

  // АРБИТРАЖНЫЙ СИГНАЛ НА 120 СЕКУНД
  useEffect(() => {
    const triggerSignal = () => {
      const avail = COINS_DATA.filter(c => c.lvl <= lvl);
      const coin = avail[Math.floor(Math.random() * avail.length)];
      const d1 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      let d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      while(d2.id === d1.id) d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      
      setSignal({ 
        coin: coin.id, buyDex: d1.name, sellDexId: d2.id, sellDexName: d2.name, 
        bonus: (Math.random() * 10 + 5).toFixed(1), id: Date.now() 
      });
      sndAlert.current.play().catch(() => {});
    };
    triggerSignal();
    const itv = setInterval(triggerSignal, 120000); // Сигнал раз в 120 сек
    return () => clearInterval(itv);
  }, [lvl]);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openTrade = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (isNaN(amt) || amt > balance || amt <= 0) return showToast("LOW BALANCE", "loss");
    
    setBalance(b => b - amt);
    setActivePositions(p => ({ 
      ...p, 
      [coinId]: { amt, lev: leverage, start: Date.now(), dex: selectedDex, signalId: signal?.id } 
    }));
    showToast(`TRADE STARTED: 120s WAIT`, 'info');
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const timeLeft = 120 - Math.floor((Date.now() - p.start) / 1000);
    
    if (timeLeft > 0) return showToast(`WAIT ${timeLeft}s`, 'info');

    const currentTradeNum = tradeCount + 1;
    setTradeCount(currentTradeNum >= 5 ? 0 : currentTradeNum);

    const isCorrect = signal && p.signalId === signal.id && signal.sellDexId === selectedDex;
    const isWin = isCorrect && currentTradeNum !== 3 && currentTradeNum !== 5;
    
    const pnlPerc = isWin ? parseFloat(signal.bonus) : -(Math.random() * 12 + 8);
    const profit = (p.amt * (pnlPerc * p.lev) / 100);

    setBalance(b => b + p.amt + profit);
    setXp(x => x + 70);
    setHistory(h => [{ coin: coinId, pnl: profit, win: isWin }, ...h.slice(0, 10)]);
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    
    showToast(isWin ? `RESULT: +$${profit.toFixed(2)}` : `RESULT: $${profit.toFixed(2)}`, isWin ? 'win' : 'loss');
  };

  return (
    <div className="app-neon">
      {toast && <div className={`n-toast ${toast.type}`}>{toast.msg}</div>}

      <header className="n-header">
        <div className="n-stats">
          <div className="n-lvl">LVL {lvl}</div>
          <div className="n-xp-w"><div className="n-xp-f" style={{width: `${(xp % 150)/1.5}%`}}></div></div>
        </div>
        <div className="n-balance">
          <small>BALANCE</small>
          <div className="n-money">${balance.toFixed(2)}</div>
        </div>
      </header>

      <main className="n-viewport">
        {tab === 'trade' && (
          <div className="n-trade-view">
            {signal && (
              <div className="n-signal-box">
                <div className="n-sig-header">⚡ GLOBAL ARBITRAGE (120S)</div>
                <div className="n-sig-body">
                  <span className="n-tag buy">BUY</span> <b>{signal.coin}</b> @ {signal.buyDex} <br/>
                  <span className="n-tag sell">SELL</span> @ <b>{signal.sellDexName}</b> <span className="n-sig-win">+{signal.bonus}%</span>
                </div>
                <div className="n-sig-progress" key={signal.id}></div>
              </div>
            )}

            {!selectedDex ? (
              <div className="n-dex-grid">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="n-dex-card" onClick={() => setSelectedDex(d.id)} style={{'--c': d.color}}>
                    <span className="n-dex-n">{d.name}</span>
                    {Object.values(activePositions).some(p => p.dex === d.id) && <div className="n-dot"></div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="n-terminal">
                <div className="n-term-head">
                  <button onClick={() => setSelectedDex(null)} className="n-back-btn">← EXIT</button>
                  <div className="n-term-inputs">
                      <div className="n-input-group"><small>SUM</small>
                        <input type="number" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} />
                      </div>
                      <div className="n-input-group"><small>X-LEV {leverage}</small>
                        <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(parseInt(e.target.value))} />
                      </div>
                  </div>
                </div>
                <div className="n-pair-list">
                  {COINS_DATA.map(c => {
                    const p = activePositions[c.id];
                    const timeLeft = p ? 120 - Math.floor((Date.now()-p.start)/1000) : 0;
                    return (
                      <div key={c.id} className={`n-pair-row ${p ? 'active' : ''}`}>
                        <div className="n-p-info">
                          <b>{c.id}/USDT</b>
                          <span className={`n-p-price ${priceDirs[c.id]}`}>${prices[c.id]}</span>
                        </div>
                        {c.lvl <= lvl ? (
                          <button 
                            className={`n-p-btn ${p ? (timeLeft > 0 ? 'wait' : 'close') : 'buy'}`} 
                            onClick={() => p ? closeTrade(c.id) : openTrade(c.id)}
                          >
                            {p ? (timeLeft > 0 ? `${timeLeft}s` : 'FINISH') : 'OPEN'}
                          </button>
                        ) : <div className="n-p-lock">LOCKED</div>}
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
            <div className="n-sphere" onClick={() => {setBalance(b => b + 0.1); setXp(x => x + 1);}}>$</div>
            <div className="n-hint">CLICK TO GENERATE FEE</div>
          </div>
        )}

        {tab === 'awards' && (
          <div className="n-awards-view">
            <h2 className="n-title">LAST TRADES</h2>
            {history.map((h, i) => (
              <div key={i} className={`n-log-item ${h.win ? 'win' : 'loss'}`}>
                {h.coin} <span>{h.win ? '+' : ''}{h.pnl.toFixed(2)}$</span>
              </div>
            ))}
          </div>
        )}
      </main>

      <nav className="n-nav">
        <button onClick={() => setTab('mining')} className={tab === 'mining' ? 'active' : ''}>MINE</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>TRADE</button>
        <button onClick={() => setTab('awards')} className={tab === 'awards' ? 'active' : ''}>LOGS</button>
      </nav>
      <div className="n-creator-link">
          <a href="https://t.me/kriptoalians" target="_blank">CREATORS: @kriptoalians</a>
      </div>
    </div>
  );
}
