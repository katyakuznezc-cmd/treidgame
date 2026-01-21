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
  const [activePositions, setActivePositions] = useState({}); // Открытые
  const [pendingResults, setPendingResults] = useState([]); // Закрытые, но не рассчитанные
  const [signal, setSignal] = useState(null);
  const [toast, setToast] = useState(null);
  const [prices, setPrices] = useState(COINS_DATA.reduce((acc, c) => ({ ...acc, [c.id]: c.base }), {}));
  const [priceDirs, setPriceDirs] = useState({});

  const lvl = Math.floor(Math.sqrt(xp / 150)) + 1;
  const sndAlert = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  // Живые цены
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

  // Логика Сигнала и Расчета
  useEffect(() => {
    const triggerSignal = () => {
      // 1. Сначала рассчитываем все отложенные сделки ПРЕДЫДУЩЕГО сигнала
      setPendingResults(prev => {
        prev.forEach(res => {
          setBalance(b => b + res.payout);
          setXp(x => x + 50);
          setToast({ msg: res.win ? `WIN: +$${res.profit}` : `LOSS: -$${Math.abs(res.profit)}`, type: res.win ? 'win' : 'loss' });
        });
        return []; // Очищаем очередь после выплаты
      });

      // 2. Генерируем новый сигнал
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
    const itv = setInterval(triggerSignal, 120000); // Цикл 120 секунд
    return () => clearInterval(itv);
  }, [lvl]);

  const openTrade = (coinId) => {
    const amt = 10;
    if (balance < amt) return;
    setBalance(b => b - amt);
    setActivePositions(p => ({ ...p, [coinId]: { amt, dex: selectedDex, signalId: signal?.id, coin: coinId } }));
    setToast({ msg: "TRADE OPENED. WAIT FOR SIGNAL END.", type: "info" });
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    
    // Рассчитываем результат заранее, но не показываем его
    const isCorrect = signal && p.signalId === signal.id && signal.sellDexId === selectedDex;
    const isWin = isCorrect && Math.random() > 0.3; // 30% шанс проигрыша даже при верном сигнале
    const pnlPerc = isWin ? parseFloat(signal.bonus) : -15;
    const profit = (p.amt * (pnlPerc * 10) / 100);

    // Отправляем в очередь ожидания
    setPendingResults(prev => [...prev, { payout: p.amt + profit, profit: profit.toFixed(2), win: isWin }]);
    
    // Убираем из активных
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    setToast({ msg: "POSITION CLOSED. PROCESSING...", type: "info" });
  };

  return (
    <div className="app-neon">
      {toast && <div className={`n-toast ${toast.type}`} onClick={() => setToast(null)}>{toast.msg}</div>}

      <header className="n-header">
        <div className="n-money">${balance.toFixed(2)}</div>
        <div className="n-lvl-pill">LVL {lvl}</div>
      </header>

      <main className="n-viewport">
        {tab === 'trade' && (
          <div className="n-trade-view">
            {signal && (
              <div className="n-sig-card">
                <div className="n-sig-info">
                  <span className="n-blink">●</span> SIGNAL LIVE: <b>{signal.coin}</b>
                  <div className="n-sig-dest">BUY: {signal.buyDex} → SELL: {signal.sellDexName}</div>
                </div>
                <div className="n-sig-bar"></div>
              </div>
            )}

            {!selectedDex ? (
              <div className="n-dex-grid">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="n-dex-btn" onClick={() => setSelectedDex(d.id)} style={{'--c': d.color}}>
                    {d.name} {Object.values(activePositions).some(p => p.dex === d.id) && <i className="n-active-dot"></i>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="n-terminal">
                <button className="n-exit" onClick={() => setSelectedDex(null)}>← BACK TO MARKETS</button>
                <div className="n-list">
                  {COINS_DATA.map(c => {
                    const p = activePositions[c.id];
                    return (
                      <div key={c.id} className="n-row">
                        <div className="n-coin-data">
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
          <div className="n-mine-area">
             <div className="n-sphere" onClick={() => {setBalance(b=>b+0.1); setXp(x=>x+1);}}>$</div>
             {pendingResults.length > 0 && <div className="n-pending-info">PENDING TRADES: {pendingResults.length}</div>}
          </div>
        )}
      </main>

      <nav className="n-nav">
        <button onClick={() => setTab('mining')} className={tab === 'mining' ? 'active' : ''}>MINE</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>TRADE</button>
      </nav>
      
      <div className="n-footer-link">
        <a href="https://t.me/kriptoalians" target="_blank">DEVELOPED BY KRIPTOALIANS</a>
      </div>
    </div>
  );
}
