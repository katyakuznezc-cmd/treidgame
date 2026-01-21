


import React, { useState, useEffect } from 'react';
import './App.css';

const DEX_LIST = [
  { id: '1inch', color: '#2f8af5' },
  { id: 'Uniswap', color: '#ff007a' },
  { id: 'SushiSwap', color: '#fa52a0' },
  { id: 'PancakeSwap', color: '#d1884f' }
];

const TOKENS = ['TON', 'ETH', 'SOL', 'BNB', 'ARB'];

function App() {
  // Стартовый баланс $100
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('kross_bal')) || 100);
  const [tab, setTab] = useState('mining');
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Сохранение баланса
  useEffect(() => {
    localStorage.setItem('kross_bal', balance);
  }, [balance]);

  // Генератор сигналов Kross-DEX
  useEffect(() => {
    const generateSignal = () => {
      const token = TOKENS[Math.floor(Math.random() * TOKENS.length)];
      const buyDex = DEX_LIST[Math.floor(Math.random() * DEX_LIST.length)];
      let sellDex = DEX_LIST[Math.floor(Math.random() * DEX_LIST.length)];
      while (buyDex.id === sellDex.id) sellDex = DEX_LIST[Math.floor(Math.random() * DEX_LIST.length)];

      const spread = (Math.random() * (3.5 - 0.5) + 0.5).toFixed(2);
      
      setSignal({
        token,
        buyFrom: buyDex.id,
        sellTo: sellDex.id,
        spread: parseFloat(spread),
        timeLeft: 15
      });
    };

    generateSignal();
    const interval = setInterval(generateSignal, 15000);
    return () => clearInterval(interval);
  }, []);

  // Таймер сигнала
  useEffect(() => {
    if (signal && signal.timeLeft > 0) {
      const t = setTimeout(() => setSignal({...signal, timeLeft: signal.timeLeft - 1}), 1000);
      return () => clearTimeout(t);
    }
  }, [signal]);

  const handleTrade = () => {
    if (!signal || balance < 10 || isProcessing) return;
    setIsProcessing(true);
    
    // Имитация кросс-чейн перевода
    setTimeout(() => {
      const profit = 10 * (signal.spread / 100);
      setBalance(prev => prev + profit);
      setIsProcessing(false);
      alert(`Сделка на ${signal.token} завершена! Профит: +$${profit.toFixed(2)}`);
    }, 2000);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">Kross-DEX</div>
        <div className="balance-display">
          <small>AVAILABLE USD</small>
          <h2>${balance.toFixed(2)}</h2>
        </div>
      </header>

      <main className="main-content">
        {tab === 'mining' ? (
          <div className="mining-tab">
            <div className="tap-area" onClick={() => setBalance(b => b + 0.01)}>
              <div className="dollar-icon">$</div>
            </div>
            <p>Нажимай на доллар, чтобы заработать на комиссии!</p>
          </div>
        ) : (
          <div className="kross-dex-tab">
            {signal && signal.timeLeft > 0 ? (
              <div className="signal-box">
                <div className="signal-header">
                  <span className="live-tag">LIVE SIGNAL</span>
                  <span className="timer">{signal.timeLeft}s</span>
                </div>
                <div className="route">
                  <div className="node">
                    <small>BUY</small>
                    <span style={{color: '#58a6ff'}}>{signal.buyFrom}</span>
                  </div>
                  <div className="arrow">➔</div>
                  <div className="node">
                    <small>SELL</small>
                    <span style={{color: '#3fb950'}}>{signal.sellTo}</span>
                  </div>
                </div>
                <div className="profit-est">
                  Profit: <span>+{signal.spread}%</span>
                </div>
                <button className="trade-btn" onClick={handleTrade} disabled={isProcessing}>
                  {isProcessing ? 'Executing Web3...' : `CONFIRM KROSS-SWAP`}
                </button>
              </div>
            ) : (
              <div className="searching">Scanning pools...</div>
            )}

            <div className="dex-grid">
              {DEX_LIST.map(dex => (
                <div key={dex.id} className="dex-card" style={{borderLeft: `4px solid ${dex.color}`}}>
                  <h4>{dex.id}</h4>
                  <small>Status: Online</small>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="navbar">
        <button className={tab === 'mining' ? 'active' : ''} onClick={() => setTab('mining')}>Mining</button>
        <button className={tab === 'kross' ? 'active' : ''} onClick={() => setTab('kross')}>Kross-DEX</button>
      </nav>
    </div>
  );
}

export default App;
