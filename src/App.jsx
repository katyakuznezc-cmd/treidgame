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
  const [liveFeed, setLiveFeed] = useState([]);
  const [toast, setToast] = useState(null);
  const [tradeCount, setTradeCount] = useState(0);
  const [tapAnims, setTapAnims] = useState([]);
  
  // Состояние для живых цен
  const [prices, setPrices] = useState(
    COINS_DATA.reduce((acc, c) => ({ ...acc, [c.id]: c.base }), {})
  );

  const lvl = Math.floor(Math.sqrt(xp / 150)) + 1;
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : 10;

  const sndAlert = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));
  const sndTap = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
  }, [balance, xp]);

  // ДВИЖОК ЖИВЫХ ЦЕН
  useEffect(() => {
    const itv = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          const change = 1 + (Math.random() * 0.004 - 0.002); // Колебание +/- 0.2%
          next[id] = (next[id] * change).toFixed(id === 'DOGE' || id === 'ARB' ? 4 : 2);
        });
        return { ...next };
      });
    }, 1000);
    return () => clearInterval(itv);
  }, []);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Живая лента трафика
  useEffect(() => {
    const itv = setInterval(() => {
      const coin = COINS_DATA[Math.floor(Math.random() * COINS_DATA.length)].id;
      const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
      const amt = (Math.random() * 500).toFixed(2);
      setLiveFeed(prev => [{ id: Date.now(), text: `${type} ${coin} $${amt}`, type }, ...prev.slice(0, 4)]);
    }, 4000);
    return () => clearInterval(itv);
  }, []);

  // Арбитражный Сигнал
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
    const itv = setInterval(triggerSignal, 30000);
    return () => clearInterval(itv);
  }, [lvl]);

  const handleTap = (e) => {
    setBalance(b => b + 0.1);
    setXp(x => x + 1);
    sndTap.current.currentTime = 0;
    sndTap.current.play().catch(() => {});
    const id = Date.now();
    setTapAnims(p => [...p, { id, x: e.clientX || e.touches[0].clientX, y: e.clientY || e.touches[0].clientY }]);
    setTimeout(() => setTapAnims(p => p.filter(a => a.id !== id)), 800);
  };

  const openTrade = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (isNaN(amt) || amt > balance || amt <= 0) {
      showToast("INVALID AMOUNT", "loss");
      return;
    }
    setBalance(b => b - amt);
    setActivePositions(p => ({ 
      ...p, 
      [coinId]: { amt, lev: leverage, entryPrice: prices[coinId], start: Date.now(), dex: selectedDex, signalId: signal?.id } 
    }));
    showToast(`OPENED ${coinId} x${leverage}`, 'info');
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const currentTradeNum = tradeCount + 1;
    setTradeCount(currentTradeNum >= 5 ? 0 : currentTradeNum);

    const isCorrect = signal && p.signalId === signal.id && signal.sellDexId === selectedDex;
    const isWin = isCorrect && currentTradeNum !== 3 && currentTradeNum !== 5;
    
    const pnlPerc = isWin ? parseFloat(signal.bonus) : -(Math.random() * 10 + 5);
    const profit = (p.amt * (pnlPerc * p.lev) / 100);

    setBalance(b => b + p.amt + profit);
    setXp(x => x + 50);
    setHistory(h => [{ coin: coinId, pnl: profit, win: isWin }, ...h.slice(0, 10)]);
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    
    showToast(isWin ? `PROFIT: +$${profit.toFixed(2)}` : `LOSS: $${profit.toFixed(2)}`, isWin ? 'win' : 'loss');
  };

  return (
    <div className="app-neon">
      {tapAnims.map(a => <div key={a.id} className="tap-dollar" style={{left:a.x, top:a.y}}>$</div>)}
      {toast && <div className={`n-toast ${toast.type}`}>{toast.msg}</div>}

      <header className="n-header">
        <div className="n-stats">
          <div className="n-lvl">LVL {lvl}</div>
          <div className="n-xp-w"><div className="n-xp-f" style={{width: `${(xp % 150)/1.5}%`}}></div></div>
        </div>
        <div className="n-balance">
          <small>ACCOUNT BALANCE</small>
          <div className="n-money">${balance.toFixed(2)}</div>
        </div>
      </header>

      <main className="n-viewport">
        {tab === 'mining' && (
          <div className="n-mining-view">
            <div className="n-sphere" onClick={handleTap}>$</div>
            <div className="n-live-feed">
              <div className="n-feed-title">LIVE MARKET ACTIVITY</div>
              {liveFeed.map(f => (
                <div key={f.id} className={`n-feed-item ${f.type.toLowerCase()}`}>{f.text}</div>
              ))}
            </div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="n-trade-view">
            {signal && (
              <div className="n-signal-box">
                <div className="n-sig-header">⚡ ARBITRAGE SIGNAL</div>
                <div className="n-sig-body">
                  <span className="n-tag buy">BUY</span> <b>{signal.coin}</b> @ {signal.buyDex} <br/>
                  <span className="n-tag sell">SELL</span> @ <b>{signal.sellDexName}</b> <span className="n-sig-win">+{signal.bonus}%</span>
                </div>
                <div className="n-sig-progress"></div>
              </div>
            )}

            {!selectedDex ? (
              <div className="n-dex-grid">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="n-dex-card" onClick={() => setSelectedDex(d.id)} style={{'--c': d.color}}>
                    <div className="n-dex-info">
                        <span className="n-dex-n">{d.name}</span>
                        <small>MARKET DEPTH: ${(Math.random()*20).toFixed(1)}M</small>
                    </div>
                    {Object.values(activePositions).some(p => p.dex === d.id) && <div className="n-dot"></div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="n-terminal">
                <div className="n-term-head">
                  <button onClick={() => setSelectedDex(null)} className="n-back-btn">← EXIT</button>
                  <div className="n-term-inputs">
                      <div className="n-input-group">
                          <small>AMOUNT</small>
                          <input type="number" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} />
                      </div>
                      <div className="n-input-group">
                          <small>LEVERAGE x{leverage}</small>
                          <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(parseInt(e.target.value))} />
                      </div>
                  </div>
                </div>
                <div className="n-pair-list">
                  {COINS_DATA.map(c => {
                    const p = activePositions[c.id];
                    const currentPrice = prices[c.id];
                    return (
                      <div key={c.id} className={`n-pair-row ${p ? 'active' : ''}`}>
                        <div className="n-p-info">
                          <div className="n-p-name">
                            <b>{c.id}/USDT</b>
                            <span className="n-p-price">${currentPrice}</span>
                          </div>
                          {p && <span className="n-p-timer">LIQ IN: {120 - Math.floor((Date.now()-p.start)/1000)}s</span>}
                        </div>
                        {c.lvl <= lvl ? (
                          <button className={`n-p-btn ${p ? 'close' : 'buy'}`} onClick={() => p ? closeTrade(c.id) : openTrade(c.id)}>
                            {p ? 'CLOSE' : 'BUY'}
                          </button>
                        ) : <div className="n-p-lock">LVL {c.lvl}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'awards' && (
          <div className="n-awards-view">
            <h2 className="n-title">HISTORY</h2>
            <div className="n-log-list">
              {history.map((h, i) => (
                <div key={i} className={`n-log-item ${h.win ? 'win' : 'loss'}`}>
                  {h.coin} <span>{h.win ? '+' : ''}{h.pnl.toFixed(2)}$</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="n-settings-view">
             <h2 className="n-title">OPTIONS</h2>
             <div className="n-set-row"><span>CREATORS</span> <a href="https://t.me/kriptoalians" target="_blank">@kriptoalians</a></div>
             <div className="n-set-row"><span>SOUNDS</span> <button>ON</button></div>
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
