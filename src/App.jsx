Добавил PancakeSwap в список площадок! Теперь у нас полный набор самых популярных DEX-бирж. Также я немного обновил логику: теперь монеты могут меняться в зависимости от того, на каких сетях они обычно торгуются (например, на PancakeSwap чаще ищут BNB или CAKE, но для простоты игры оставим топовые монеты).

Что нужно сделать прямо сейчас:
Обнови src/App.jsx: Удали всё старое и вставь этот код.

Обнови src/App.css: Я добавил туда стили для «таймера опасности», чтобы он мигал красным, когда связка вот-вот исчезнет.

Код для src/App.jsx
JavaScript

import React, { useState, useEffect } from 'react';
import './App.css';

// Список DEX площадок
const DEX_PLATFORMS = ['1inch', 'Uniswap v3', 'SushiSwap', 'PancakeSwap'];
// Список токенов для арбитража
const TOKENS = [
  { name: 'TON', basePrice: 5.2 },
  { name: 'ETH', basePrice: 3400 },
  { name: 'SOL', basePrice: 145 },
  { name: 'BNB', basePrice: 580 },
  { name: 'CAKE', basePrice: 2.1 }
];

function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('hBal')) || 1000);
  const [tab, setTab] = useState('home');
  const [signal, setSignal] = useState(null);
  const [isSwapping, setIsSwapping] = useState(false);

  // Генератор сигналов между DEX
  useEffect(() => {
    const findArbitrage = () => {
      const token = TOKENS[Math.floor(Math.random() * TOKENS.length)];
      const dex1 = DEX_PLATFORMS[Math.floor(Math.random() * DEX_PLATFORMS.length)];
      let dex2 = DEX_PLATFORMS[Math.floor(Math.random() * DEX_PLATFORMS.length)];
      while (dex1 === dex2) dex2 = DEX_PLATFORMS[Math.floor(Math.random() * DEX_PLATFORMS.length)];

      const spread = (Math.random() * (3.5 - 0.7) + 0.7).toFixed(2); 
      const buyPrice = (token.basePrice * (1 - 0.001)).toFixed(4);
      const sellPrice = (buyPrice * (1 + spread / 100)).toFixed(4);

      setSignal({ 
        token: token.name, 
        source: dex1, 
        target: dex2, 
        spread, 
        buyPrice, 
        sellPrice, 
        timeLeft: 20 // Время жизни связки в секундах
      });
    };

    findArbitrage();
    const interval = setInterval(findArbitrage, 20000); 
    return () => clearInterval(interval);
  }, []);

  // Обратный отсчет таймера
  useEffect(() => {
    if (signal && signal.timeLeft > 0) {
      const timer = setTimeout(() => setSignal({ ...signal, timeLeft: signal.timeLeft - 1 }), 1000);
      return () => clearTimeout(timer);
    }
  }, [signal]);

  const executeSwap = () => {
    if (!signal || isSwapping || balance < 100) return;
    
    setIsSwapping(true);
    const amount = 100; // Сумма одного круга
    setBalance(prev => prev - amount);

    setTimeout(() => {
      // Шанс успеха зависит от времени: если < 5 сек, риск проскальзывания 50/50
      const isLate = signal.timeLeft < 5;
      const success = isLate ? Math.random() > 0.5 : true;

      if (success) {
        const profit = amount * (1 + parseFloat(signal.spread) / 100);
        setBalance(prev => {
          const newBal = prev + profit;
          localStorage.setItem('hBal', newBal);
          return newBal;
        });
        alert(`Успех! Связка ${signal.source} -> ${signal.target} принесла +${(profit - amount).toFixed(2)} USDT`);
      } else {
        const loss = amount * 0.97; // Потеря 3% при неудаче
        setBalance(prev => {
          const newBal = prev + loss;
          localStorage.setItem('hBal', newBal);
          return newBal;
        });
        alert('Ошибка! Цена изменилась (Slippage). Вы потеряли на комиссии пула.');
      }
      setIsSwapping(false);
    }, 2000);
  };

  return (
    <div className="app-container">
      <div className="web3-header">
        <div className="status-dot"></div>
        <span>Mainnet Connected</span>
        <h1>${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
      </div>

      <nav className="bottom-nav">
        <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>Mining</button>
        <button className={tab === 'trade' ? 'active' : ''} onClick={() => setTab('trade')}>Arbitrage</button>
      </nav>

      <main className="content">
        {tab === 'home' && (
          <div className="mining-view">
            <div className="main-gem" onClick={() => setBalance(b => b + 0.1)}>💎</div>
            <p>Нажимай на кристалл, чтобы накопить на первую связку!</p>
          </div>
        )}

        {tab === 'trade' && (
          <div className="dex-view">
            {signal ? (
              <div className="signal-card">
                <div className="signal-top">
                  <div className="pair-info">{signal.token} / USDT</div>
                  <div className={`timer ${signal.timeLeft < 7 ? 'urgent' : ''}`}>
                    {signal.timeLeft}s
                  </div>
                </div>

                <div className="route-container">
                  <div className="node">
                    <span className="node-label">BUY</span>
                    <span className="node-name">{signal.source}</span>
                    <span className="node-price">${signal.buyPrice}</span>
                  </div>
                  <div className="connector">➔</div>
                  <div className="node">
                    <span className="node-label">SELL</span>
                    <span className="node-name">{signal.target}</span>
                    <span className="node-price profit">${signal.sellPrice}</span>
                  </div>
                </div>

                <div className="profit-footer">
                  <span>EST. PROFIT:</span>
                  <span className="green-text">+{signal.spread}%</span>
                </div>

                <button 
                  className={`swap-action-btn ${isSwapping ? 'loading' : ''}`}
                  onClick={executeSwap}
                  disabled={isSwapping || signal.timeLeft === 0 || balance < 100}
                >
                  {isSwapping ? 'Processing Web3...' : `CONFIRM SWAP (100 USDT)`}
                </button>
              </div>
            ) : (
              <div className="searching">Scanning Liquidity Pools...</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
