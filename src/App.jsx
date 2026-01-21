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
  
  // Торговые состояния
  const [activePositions, setActivePositions] = useState({}); 
  const [waitingQueue, setWaitingQueue] = useState([]); // Очередь на выплату в конце цикла
  const [tradeAmount, setTradeAmount] = useState('10');
  const [leverage, setLeverage] = useState(1);
  const [signal, setSignal] = useState(null);
  const [history, setHistory] = useState([]);
  
  // Настройки
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toast, setToast] = useState(null);
  
  // Цены
  const [prices, setPrices] = useState(COINS_DATA.reduce((acc, c) => ({ ...acc, [c.id]: c.base }), {}));
  const [priceDirs, setPriceDirs] = useState({});

  const lvl = Math.floor(Math.sqrt(xp / 150)) + 1;
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : 10;

  const sndAlert = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));
  const sndTap = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
  }, [balance, xp]);

  // Движок цен
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
    }, 1000);
    return () => clearInterval(itv);
  }, []);

  // ЦИКЛ СИГНАЛА И ВЫПЛАТ (120 СЕКУНД)
  useEffect(() => {
    const runCycle = () => {
      // 1. Выплачиваем профит за прошлый цикл
      if (waitingQueue.length > 0) {
        let cycleProfit = 0;
        let cyclePayout = 0;
        const results = [];

        waitingQueue.forEach(item => {
          cyclePayout += item.payout;
          cycleProfit += item.profit;
          results.push({ coin: item.coin, pnl: item.profit, win: item.win });
        });

        setBalance(b => b + cyclePayout);
        setXp(x => x + (waitingQueue.length * 50));
        setHistory(prev => [...results, ...prev].slice(0, 10));
        setToast({ 
            msg: `ЦИКЛ ЗАВЕРШЕН. ВЫПЛАТА: $${cycleProfit.toFixed(2)}`, 
            type: cycleProfit >= 0 ? 'win' : 'loss' 
        });
        setWaitingQueue([]);
      }

      // 2. Создаем новый сигнал
      const avail = COINS_DATA.filter(c => c.lvl <= lvl);
      const coin = avail[Math.floor(Math.random() * avail.length)];
      const d1 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      let d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      while(d2.id === d1.id) d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      
      setSignal({ 
        coin: coin.id, buyDex: d1.name, sellDexId: d2.id, sellDexName: d2.name, 
        bonus: (Math.random() * 8 + 4).toFixed(1), id: Date.now() 
      });
      if(soundEnabled) sndAlert.current.play().catch(()=>{});
    };

    runCycle();
    const itv = setInterval(runCycle, 120000); 
    return () => clearInterval(itv);
  }, [lvl, waitingQueue, soundEnabled]);

  const openTrade = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (amt > balance || amt <= 0) return setToast({msg: "НЕДОСТАТОЧНО СРЕДСТВ", type: "loss"});
    
    setBalance(b => b - amt);
    setActivePositions(p => ({ ...p, [coinId]: { amt, lev: leverage, dex: selectedDex, signalId: signal?.id, coin: coinId } }));
    setToast({ msg: "СДЕЛКА ОТКРЫТА. ОЖИДАЙТЕ КОНЦА ТАЙМЕРА.", type: "info" });
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    
    // Расчет результата (но без выплаты!)
    const isCorrect = signal && p.signalId === signal.id && signal.sellDexId === selectedDex;
    // Логика 1-2 минуса: 25% шанс проигрыша даже при верном сигнале
    const isWin = isCorrect && Math.random() > 0.25; 
    const pnlPerc = isWin ? parseFloat(signal.bonus) : -(Math.random() * 10 + 5);
    const profit = (p.amt * (pnlPerc * p.lev) / 100);

    // Уходит в очередь ожидания
    setWaitingQueue(prev => [...prev, { 
      coin: coinId, 
      payout: p.amt + profit, 
      profit: profit, 
      win: isWin 
    }]);

    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    setToast({ msg: "СДЕЛКА ЗАКРЫТА. ОБРАБОТКА В КОНЦЕ ЦИКЛА...", type: "info" });
  };

  const handleTap = (e) => {
    setBalance(b => b + 0.1);
    setXp(x => x + 1);
    if(soundEnabled) {
        sndTap.current.currentTime = 0;
        sndTap.current.play().catch(()=>{});
    }
  };

  return (
    <div className="app-neon">
      {toast && <div className={`n-toast ${toast.type}`}>{toast.msg}</div>}

      <header className="n-header">
        <div className="n-money">${balance.toFixed(2)}</div>
        <div className="n-lvl-box">LVL {lvl}</div>
      </header>

      <main className="n-viewport">
        {tab === 'trade' && (
          <div className="n-trade-view">
            {signal && (
              <div className="n-signal-card">
                <div className="n-sig-info">
                  ⚡ СИГНАЛ: <b>{signal.coin}</b> | {signal.buyDex} → {signal.sellDexName}
                  <span className="n-sig-bonus">+{signal.bonus}%</span>
                </div>
                <div className="n-sig-bar" key={signal.id}></div>
              </div>
            )}

            {!selectedDex ? (
              <div className="n-dex-grid">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="n-dex-btn" onClick={() => setSelectedDex(d.id)} style={{'--c': d.color}}>
                    {d.name} {Object.values(activePositions).some(p => p.dex === d.id) && <span className="n-active-dot"></span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="n-terminal">
                <div className="n-term-head">
                  <button className="n-back" onClick={() => setSelectedDex(null)}>←</button>
                  <div className="n-term-controls">
                    <input type="number" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} />
                    <div className="n-lev-range">
                      <small>x{leverage}</small>
                      <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(parseInt(e.target.value))} />
                    </div>
                  </div>
                </div>
                <div className="n-list">
                  {COINS_DATA.map(c => {
                    const p = activePositions[c.id];
                    return (
                      <div key={c.id} className="n-row">
                        <div className="n-coin">
                          <b>{c.id}/USDT</b>
                          <span className={`n-price ${priceDirs[c.id]}`}>${prices[c.id]}</span>
                        </div>
                        {c.lvl <= lvl ? (
                          <button className={`n-p-btn ${p ? 'close' : 'buy'}`} onClick={() => p ? closeTrade(c.id) : openTrade(c.id)}>
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
            <div className="n-sphere" onClick={handleTap}>$</div>
            {waitingQueue.length > 0 && <div className="n-wait-info">В ОЖИДАНИИ РАСЧЕТА: {waitingQueue.length}</div>}
          </div>
        )}

        {tab === 'awards' && (
          <div className="n-history">
            <h3 className="n-title">ИСТОРИЯ ТРОФЕЕВ</h3>
            {history.map((h, i) => (
              <div key={i} className={`n-log-item ${h.win ? 'win' : 'loss'}`}>
                {h.coin} <span>{h.win ? '+' : ''}${h.pnl.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'settings' && (
          <div className="n-settings">
            <h3 className="n-title">НАСТРОЙКИ</h3>
            <div className="n-set-row">
                <span>ЗВУК</span>
                <button onClick={() => setSoundEnabled(!soundEnabled)} className={soundEnabled ? 'on' : ''}>
                    {soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}
                </button>
            </div>
            <div className="n-set-row">
                <span>СОЗДАТЕЛИ</span>
                <a href="https://t.me/kriptoalians" target="_blank" rel="noreferrer">@kriptoalians</a>
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
