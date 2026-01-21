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
  { id: 'TON', lvl: 1 }, { id: 'ARB', lvl: 1 }, { id: 'DOGE', lvl: 1 }
];

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 100);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
  const [tab, setTab] = useState('mining');
  const [selectedDex, setSelectedDex] = useState(null);
  const [activePositions, setActivePositions] = useState({});
  const [signal, setSignal] = useState(null);
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [tradeCount, setTradeCount] = useState(0); // Счетчик для контроля винрейта

  const lvl = Math.floor(Math.sqrt(xp / 150)) + 1;
  const sndAlert = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
  }, [balance, xp]);

  // Уведомления (Toasts)
  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Генератор сигналов
  useEffect(() => {
    const triggerSignal = () => {
      const avail = COINS.filter(c => c.lvl <= lvl);
      const coin = avail[Math.floor(Math.random() * avail.length)];
      const d1 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      let d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      while(d2.id === d1.id) d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      
      setSignal({ 
        coin: coin.id, buyDex: d1.name, sellDexId: d2.id, sellDexName: d2.name, 
        bonus: (Math.random() * 10 + 5).toFixed(1),
        id: Date.now() // Уникальный ID сигнала
      });
      sndAlert.current.play().catch(() => {});
    };
    triggerSignal();
    const itv = setInterval(triggerSignal, 30000);
    return () => clearInterval(itv);
  }, [lvl]);

  const openTrade = (coinId) => {
    const amt = 10; // Фикс ставка для примера
    if (amt > balance) return;
    setBalance(b => b - amt);
    setActivePositions(p => ({ 
      ...p, 
      [coinId]: { amt, start: Date.now(), dex: selectedDex, signalId: signal?.id } 
    }));
    showToast(`OPENED ${coinId} POSITION`, 'info');
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    
    // ЛОГИКА ВИНРЕЙТА (1-2 минуса на 5 сделок)
    const currentTradeNum = tradeCount + 1;
    setTradeCount(currentTradeNum >= 5 ? 0 : currentTradeNum);

    // Условие победы: правильный DEX + правильный сигнал + фактор удачи (винрейт)
    const isCorrectSignal = signal && p.signalId === signal.id && signal.sellDexId === selectedDex;
    const isFakeMarketMove = currentTradeNum === 3 || currentTradeNum === 5; // Имитация просадки на 3-й и 5-й сделке
    
    const isWin = isCorrectSignal && !isFakeMarketMove;
    const pnlPerc = isWin ? parseFloat(signal.bonus) : -(Math.random() * 15 + 10);
    const profit = (p.amt * (pnlPerc / 100)) * 10; // Добавил плечо x10 скрыто

    setBalance(b => b + p.amt + profit);
    setXp(x => x + 40);
    setHistory(h => [{ coin: coinId, pnl: profit, win: isWin }, ...h.slice(0, 10)]);
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    
    showToast(isWin ? `PROFIT: +$${profit.toFixed(2)}` : `LOSS: $${profit.toFixed(2)}`, isWin ? 'win' : 'loss');
  };

  return (
    <div className="app-neon">
      {/* Анимация уведомлений */}
      {toast && <div className={`n-toast ${toast.type}`}>{toast.msg}</div>}

      <header className="n-header">
        <div className="n-bal-box">
          <small>ACCOUNT BALANCE</small>
          <div className="n-money">${balance.toFixed(2)}</div>
        </div>
        <div className="n-lvl-badge">LVL {lvl}</div>
      </header>

      <main className="n-main">
        {tab === 'trade' && (
          <div className="n-trade-area">
            {signal && (
              <div className="n-sig-card">
                <div className="n-sig-timer"></div>
                <div className="n-sig-content">
                  <span className="n-tag buy">BUY</span> <b>{signal.coin}</b> @ {signal.buyDex} <br/>
                  <span className="n-tag sell">SELL</span> @ {signal.sellDexName} <span className="n-win-tag">+{signal.bonus}%</span>
                </div>
              </div>
            )}

            {!selectedDex ? (
              <div className="n-dex-list">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="n-dex-item" onClick={() => setSelectedDex(d.id)} style={{borderLeftColor: d.color}}>
                    {d.name} <span>MARKET LIVE</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="n-terminal">
                <button className="n-back" onClick={() => setSelectedDex(null)}>← TERMINAL EXIT</button>
                <div className="n-pairs">
                  {COINS.map(c => {
                    const p = activePositions[c.id];
                    return (
                      <div key={c.id} className="n-pair-row">
                        <div><b>{c.id}/USDT</b></div>
                        {c.lvl <= lvl ? (
                          <button className={`n-trade-btn ${p ? 'close' : 'buy'}`} onClick={() => p ? closeTrade(c.id) : openTrade(c.id)}>
                            {p ? 'CLOSE POS' : 'OPEN POS'}
                          </button>
                        ) : <div className="n-locked">LOCKED</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'mining' && (
          <div className="n-mining-center">
            <div className="n-main-btn" onClick={() => setBalance(b => b + 0.1)}>$</div>
            <div className="n-hint">TAP TO GENERATE LIQUIDITY</div>
          </div>
        )}

        {tab === 'awards' && (
          <div className="n-history">
            <h3>TRADE LOGS</h3>
            {history.map((h, i) => (
              <div key={i} className={`n-hist-item ${h.win ? 'win' : 'loss'}`}>
                {h.coin} <span>{h.win ? '+' : ''}${h.pnl.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </main>

      <nav className="n-nav">
        <button onClick={() => setTab('mining')} className={tab === 'mining' ? 'active' : ''}>MAIN</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>MARKETS</button>
        <button onClick={() => setTab('awards')} className={tab === 'awards' ? 'active' : ''}>LOGS</button>
      </nav>
    </div>
  );
}
