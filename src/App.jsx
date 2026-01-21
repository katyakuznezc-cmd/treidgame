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
  
  const [activePositions, setActivePositions] = useState({}); // Открытые сейчас
  const [waitingQueue, setWaitingQueue] = useState([]); // Закрытые, ждут конца таймера
  
  const [tradeAmount, setTradeAmount] = useState('10');
  const [leverage, setLeverage] = useState(1);
  const [signal, setSignal] = useState(null);
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [prices, setPrices] = useState(COINS_DATA.reduce((acc, c) => ({ ...acc, [c.id]: c.base }), {}));
  const [priceDirs, setPriceDirs] = useState({});

  const lvl = Math.floor(Math.sqrt(xp / 150)) + 1;
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : 10;
  const sndAlert = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
  }, [balance, xp]);

  // Живые цены
  useEffect(() => {
    const itv = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        const newDirs = {};
        Object.keys(next).forEach(id => {
          const oldP = parseFloat(next[id]);
          const change = 1 + (Math.random() * 0.004 - 0.002);
          const newP = (oldP * change).toFixed(id === 'BTC' ? 2 : 4);
          newDirs[id] = newP > oldP ? 'up' : 'down';
          next[id] = newP;
        });
        setPriceDirs(newDirs);
        return next;
      });
    }, 1000);
    return () => clearInterval(itv);
  }, []);

  // Логика Сигнала и Выплат по окончанию времени
  useEffect(() => {
    const processEndOfCycle = () => {
      // 1. Рассчитываем всё, что накопилось в очереди ожидания
      if (waitingQueue.length > 0) {
        let totalPayout = 0;
        const newHistory = [];
        
        waitingQueue.forEach(item => {
          totalPayout += item.payout;
          newHistory.push({ coin: item.coin, pnl: item.profit, win: item.win });
        });

        setBalance(b => b + totalPayout);
        setXp(x => x + (waitingQueue.length * 50));
        setHistory(prev => [...newHistory, ...prev].slice(0, 15));
        setToast({ msg: `CYCLE ENDED: ${waitingQueue.length} TRADES PROCESSED`, type: 'info' });
        setWaitingQueue([]); 
      }

      // 2. Новый сигнал на 120 секунд
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

    processEndOfCycle();
    const itv = setInterval(processEndOfCycle, 120000); 
    return () => clearInterval(itv);
  }, [lvl, waitingQueue]);

  const openTrade = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (isNaN(amt) || amt > balance || amt <= 0) return setToast({msg: "INVALID AMOUNT", type: "loss"});
    
    setBalance(b => b - amt);
    setActivePositions(p => ({ ...p, [coinId]: { amt, lev: leverage, dex: selectedDex, signalId: signal?.id, coin: coinId } }));
    setToast({ msg: "TRADE OPENED", type: "info" });
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    
    // Результат считается сейчас, но сохранится в "очередь" до конца таймера
    const isCorrect = signal && p.signalId === signal.id && signal.sellDexId === selectedDex;
    const isWin = isCorrect && Math.random() > 0.2; // 1-2 минуса из 5 (20% шанс)
    const pnlPerc = isWin ? parseFloat(signal.bonus) : -12;
    const profit = (p.amt * (pnlPerc * p.lev) / 100);

    setWaitingQueue(prev => [...prev, { 
      coin: coinId, 
      payout: p.amt + profit, 
      profit: profit, 
      win: isWin 
    }]);

    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    setToast({ msg: "POSITION CLOSED. WAITING FOR RESULTS...", type: "info" });
  };

  return (
    <div className="app-neon">
      {toast && <div className={`n-toast ${toast.type}`} onClick={() => setToast(null)}>{toast.msg}</div>}

      <header className="n-header">
        <div className="n-stats">
          <div className="n-lvl">LVL {lvl}</div>
          <div className="n-money">${balance.toFixed(2)}</div>
        </div>
      </header>

      <main className="n-viewport">
        {tab === 'trade' && (
          <div className="n-trade-view">
            {signal && (
              <div className="n-signal-box">
                <div className="n-sig-header">⚡ ACTIVE SIGNAL (120S)</div>
                <div className="n-sig-body">
                  <b>{signal.coin}</b>: {signal.buyDex} → {signal.sellDexName} <span className="n-perc">+{signal.bonus}%</span>
                </div>
                <div className="n-sig-bar" key={signal.id}></div>
              </div>
            )}

            {!selectedDex ? (
              <div className="n-dex-grid">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="n-dex-card" onClick={() => setSelectedDex(d.id)} style={{'--c': d.color}}>
                    <span>{d.name}</span>
                    {Object.values(activePositions).some(p => p.dex === d.id) && <div className="n-active-dot"></div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="n-terminal">
                <div className="n-term-head">
                  <button onClick={() => setSelectedDex(null)} className="n-back">←</button>
                  <div className="n-inputs">
                    <input type="number" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} placeholder="AMT" />
                    <div className="n-lev-box">
                      <small>x{leverage}</small>
                      <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(parseInt(e.target.value))} />
                    </div>
                  </div>
                </div>
                <div className="n-pair-list">
                  {COINS_DATA.map(c => {
                    const p = activePositions[c.id];
                    return (
                      <div key={c.id} className="n-pair-row">
                        <div className="n-p-info">
                          <b>{c.id}/USDT</b>
                          <span className={`n-price ${priceDirs[c.id]}`}>${prices[c.id]}</span>
                        </div>
                        {c.lvl <= lvl ? (
                          <button className={`n-btn ${p ? 'close' : 'buy'}`} onClick={() => p ? closeTrade(c.id) : openTrade(c.id)}>
                            {p ? 'CLOSE' : 'BUY'}
                          </button>
                        ) : <div className="n-lock">LVL {c.lvl}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'mining' && (
          <div className="n-mine-view">
            <div className="n-sphere" onClick={() => {setBalance(b=>b+0.1); setXp(x=>x+1);}}>$</div>
            {waitingQueue.length > 0 && (
              <div className="n-waiting-badge">PROCESSING TRADES: {waitingQueue.length}...</div>
            )}
          </div>
        )}

        {tab === 'awards' && (
          <div className="n-awards-view">
            <h3 className="n-title">HISTORY / TROPHIES</h3>
            <div className="n-log-list">
              {history.map((h, i) => (
                <div key={i} className={`n-log-item ${h.win ? 'win' : 'loss'}`}>
                  {h.coin} <span>{h.win ? '+' : ''}${h.pnl.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="n-settings-view">
            <h3 className="n-title">SETTINGS</h3>
            <div className="n-set-card">
              <p>CREATORS: <a href="https://t.me/kriptoalians" target="_blank">@kriptoalians</a></p>
              <p>VERSION: 2.0.4 (ARBITRAGE)</p>
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
