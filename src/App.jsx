import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// ... (Константы EXCHANGES и ALL_COINS остаются прежними)

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 100);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
  const [activePositions, setActivePositions] = useState({}); // Храним сделки
  const [tab, setTab] = useState('trade');
  // ... (остальные стейты из прошлых шагов: signals, livePrices, и т.д.)

  // ОСНОВНАЯ ЛОГИКА ТАЙМЕРА И ВЫПЛАТ
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setActivePositions(prev => {
        const next = { ...prev };
        let changed = false;

        Object.keys(next).forEach(id => {
          const pos = next[id];
          const elapsed = (now - pos.startTime) / 1000;
          
          // Если 120 секунд прошло
          if (elapsed >= 120) {
            if (pos.status === 'closed') {
              // Если игрок успел закрыть — начисляем зафиксированный профит
              setBalance(b => b + pos.finalAmount);
              if (pos.isWin) setXp(x => x + 50);
            } else {
              // Если не успел нажать CLOSE — ЛИКВИДАЦИЯ (0)
              setIsShaking(true);
              setTimeout(() => setIsShaking(false), 500);
            }
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [signal]);

  const openPos = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (!amt || amt > balance) return;
    
    setBalance(b => b - amt);
    setActivePositions(prev => ({
      ...prev,
      [coinId]: {
        margin: amt,
        lev: leverage,
        startTime: Date.now(),
        status: 'open', // открыта
        finalAmount: 0,
        isWin: false,
        predictedPnl: 0
      }
    }));
    setTradeAmount('');
  };

  const closePos = (coinId) => {
    const pos = activePositions[coinId];
    if (!pos || pos.status === 'closed') return;

    // Рассчитываем результат в момент нажатия, но НЕ отдаем деньги
    const isWin = signal && coinId === signal.coin && Date.now() < signal.expires;
    const pnlPercent = isWin ? (parseFloat(signal.profit) / 100) : -0.25;
    const resultAmount = pos.margin + (pos.margin * pos.lev * pnlPercent);

    setActivePositions(prev => ({
      ...prev,
      [coinId]: { 
        ...pos, 
        status: 'closed', // зафиксирована
        finalAmount: Math.max(0, resultAmount),
        isWin: isWin
      }
    }));
  };

  return (
    <div className={`app-container ${isShaking ? 'shake-anim' : ''}`}>
      {/* ... Header ... */}

      <main className="content">
        {tab === 'trade' && (
          <div className="dex-terminal">
            {/* ... Terminal Top ... */}
            
            <div className="term-body">
              <div className="coin-side">
                {ALL_COINS.map(c => {
                  const pos = activePositions[c.id];
                  const timeLeft = pos ? Math.max(0, 120 - Math.floor((Date.now() - pos.startTime)/1000)) : null;
                  
                  return (
                    <div key={c.id} className={`coin-item ${pos ? 'active-pos' : ''}`}>
                      <div className="c-info">
                        <b>{c.id}</b>
                        {pos ? (
                          <div className="pos-details">
                            <span className="timer-txt">⏳ {timeLeft}s</span>
                            {pos.status === 'closed' ? (
                              <span className="status-fixed">ФИКСАЦИЯ: ${(pos.finalAmount - pos.margin).toFixed(2)}</span>
                            ) : (
                              <span className="status-live">В РАБОТЕ...</span>
                            )}
                          </div>
                        ) : (
                          <small>${livePrices[c.id] || c.base}</small>
                        )}
                      </div>

                      {pos ? (
                        <button 
                          className={`btn-state ${pos.status}`} 
                          onClick={() => closePos(c.id)}
                          disabled={pos.status === 'closed'}
                        >
                          {pos.status === 'closed' ? 'ЖДЕМ...' : 'CLOSE'}
                        </button>
                      ) : (
                        <button className="btn-buy" onClick={() => openPos(c.id)}>OPEN</button>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* ... Orderbook Side ... */}
            </div>
          </div>
        )}
      </main>
      {/* ... Nav ... */}
    </div>
  );
}
