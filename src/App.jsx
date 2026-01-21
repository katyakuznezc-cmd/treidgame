import React, { useState, useEffect, useRef } from 'react';
import './App.css';
// Добавь эти стейты в начало компонента App
const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('k_tut_done'));
const [tutStep, setTutStep] = useState(0);

const tutSteps = [
  { title: "СИГНАЛЫ", text: "Следи за плашкой сверху. Она говорит, какую монету КУПИТЬ и на какой бирже ПРОДАТЬ для профита." },
  { title: "АРБИТРАЖ", text: "Чтобы получить профит из сигнала, нужно зайти именно на ту биржу, которая указана в цели." },
  { title: "РИСК-МЕНЕДЖМЕНТ", text: "Вводи сумму и выбирай плечо. Большое плечо (x100) дает огромную прибыль, но требует скорости!" },
  { title: "ЛИКВИДАЦИЯ (2 МИН)", text: "У тебя есть 120 секунд. Если не нажмешь CLOSE до конца таймера — потеряешь всё!" },
  { title: "ВЕРОЯТНОСТЬ 80/20", text: "Рынок коварен. Даже по сигналу 1 из 5 сделок может быть в минус. Проверяй успехи в Дневнике." }
];

const finishTut = () => {
  setShowTutorial(false);
  localStorage.setItem('k_tut_done', 'true');
};

// Вставь этот блок в начало рендера внутри tab === 'trade'
{tab === 'trade' && showTutorial && (
  <div className="tut-overlay">
    <div className="tut-card">
      <div className="tut-badge">{tutStep + 1} / {tutSteps.length}</div>
      <h3>{tutSteps[tutStep].title}</h3>
      <p>{tutSteps[tutStep].text}</p>
      <div className="tut-btns">
        {tutStep < tutSteps.length - 1 ? (
          <button onClick={() => setTutStep(s => s + 1)}>ДАЛЕЕ</button>
        ) : (
          <button onClick={finishTut} className="finish-btn">ПОНЯТНО!</button>
        )}
      </div>
    </div>
  </div>
)}
// ... (EXCHANGES и ALL_COINS остаются прежними)

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 100);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
  const [activePositions, setActivePositions] = useState({});
  const [tradeLogs, setTradeLogs] = useState(() => JSON.parse(localStorage.getItem('k_logs') || '[]')); // Дневник
  const [tab, setTab] = useState('trade');
  // ... (остальные стейты: signal, livePrices, etc.)

  useEffect(() => {
    localStorage.setItem('k_logs', JSON.stringify(tradeLogs));
  }, [tradeLogs]);

  // ЛОГИКА ТАЙМЕРА И ДНЕВНИКА
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setActivePositions(prev => {
        const next = { ...prev };
        let changed = false;

        Object.keys(next).forEach(id => {
          const pos = next[id];
          if ((now - pos.startTime) / 1000 >= 120) {
            if (pos.status === 'closed') {
              // Начисляем деньги
              setBalance(b => b + pos.finalAmount);
              // Добавляем запись в дневник
              const pnl = pos.finalAmount - pos.margin;
              const logEntry = {
                id: Date.now(),
                coin: id,
                pnl: pnl.toFixed(2),
                isWin: pnl > 0,
                time: new Date().toLocaleTimeString().slice(0, 5)
              };
              setTradeLogs(prevLogs => [logEntry, ...prevLogs].slice(0, 10));
            } else {
              // Ликвидация в дневник
              setTradeLogs(prevLogs => [{
                id: Date.now(),
                coin: id,
                pnl: `-${pos.margin}`,
                isWin: false,
                time: 'LIQ'
              }, ...prevLogs].slice(0, 10));
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

  const closePos = (coinId) => {
    const pos = activePositions[coinId];
    if (!pos || pos.status === 'closed') return;

    // НОВАЯ СТАТИСТИКА: 1 из 5 сделок по сигналу — минусовая (80% успеха)
    const isSignalMatch = signal && coinId === signal.coin && Date.now() < signal.expires;
    const randomFactor = Math.random(); // от 0 до 1
    
    let isWin = false;
    if (isSignalMatch) {
      // Если по сигналу: выигрыш только если случайное число > 0.2 (80% шанс)
      isWin = randomFactor > 0.2;
    } else {
      // Если без сигнала: шанс на удачу всего 15%
      isWin = randomFactor > 0.85;
    }

    const pnlPercent = isWin ? (parseFloat(signal?.profit || 5) / 100) : -0.30;
    const resultAmount = pos.margin + (pos.margin * pos.lev * pnlPercent);

    setActivePositions(prev => ({
      ...prev,
      [coinId]: { 
        ...pos, 
        status: 'closed',
        finalAmount: Math.max(0, resultAmount),
        isWin: isWin
      }
    }));
  };

  return (
    <div className="app-container">
      {/* ... Header ... */}
      <main className="content">
        {tab === 'trade' && (
          <div className="dex-terminal">
            {/* ... Terminal Top (Input & Leverage) ... */}
            
            <div className="term-body">
              <div className="coin-side">
                {/* Список монет с таймерами (как в прошлом коде) */}
              </div>
              
              <div className="orderbook-side">
                {/* Стакан ордеров сверху */}
                <div className="ob-section">
                   <small className="ob-title">ORDER BOOK</small>
                   {/* ... logic ... */}
                </div>

                {/* ДНЕВНИК ТРЕЙДЕРА СНИЗУ */}
                <div className="diary-section">
                  <small className="ob-title">ДНЕВНИК СДЕЛОК</small>
                  <div className="logs-list">
                    {tradeLogs.length === 0 && <span className="empty-txt">Нет записей</span>}
                    {tradeLogs.map(log => (
                      <div key={log.id} className="log-row">
                        <span className="log-time">{log.time}</span>
                        <span className="log-coin">{log.coin}</span>
                        <span className={`log-pnl ${log.isWin ? 'grn' : 'red'}`}>
                          {log.isWin ? '+' : ''}{log.pnl}$
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      {/* ... Nav ... */}
    </div>
  );
}
