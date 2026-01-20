Держи полный и исправленный код. Я убрал из него всё лишнее, чтобы он весил мало и загружался быстро.

Важно: Перед тем как нажать "Commit changes", убедись, что ты удалил весь старый текст из файла.

Полный код для src/App.jsx
JavaScript

import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";
import Chart from 'react-apexcharts';
import './App.css';

// ВСТАВЬ СВОИ ДАННЫЕ ИЗ FIREBASE НИЖЕ
const firebaseConfig = {
   apiKey: "AIzaSyAR2T3Rz0A9hDllrWmtRRY-4rfPEdJle6g",
  authDomain: "kreptogame.firebaseapp.com",
  databaseURL: "https://kreptogame-default-rtdb.firebaseio.com/",
  projectId: "kreptogame",
  storageBucket: "kreptogame.appspot.com",
  messagingSenderId: "528985774017",
  appId: "1:528985774017:web:50ed5fd68898775e7d8140"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const tg = window.Telegram?.WebApp;

function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('hBal')) || 1000);
  const [tab, setTab] = useState('home');
  const [tradeAmount, setTradeAmount] = useState(100);
  
  // Начальные данные для графика
  const [candles, setCandles] = useState([
    { x: new Date().getTime() - 60000, y: [65000, 65050, 64950, 65010] },
    { x: new Date().getTime() - 30000, y: [65010, 65080, 65000, 65040] }
  ]);

  // Сохранение баланса
  useEffect(() => {
    localStorage.setItem('hBal', balance);
    const userId = tg?.initDataUnsafe?.user?.id || "guest";
    set(ref(db, 'users/' + userId), { 
      username: tg?.initDataUnsafe?.user?.first_name || "Игрок", 
      balance: Math.floor(balance) 
    });
  }, [balance]);

  // Движение графика (каждые 2 секунды)
  useEffect(() => {
    const interval = setInterval(() => {
      setCandles(prev => {
        const last = prev[prev.length - 1];
        const open = last.y[3];
        const close = open + (Math.random() * 60 - 30);
        const high = Math.max(open, close) + 10;
        const low = Math.min(open, close) - 10;
        return [...prev.slice(-15), { x: new Date().getTime(), y: [open, high, low, close] }];
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const startTrade = (type) => {
    if (balance < tradeAmount) return tg?.showAlert("Мало монет!");
    setBalance(b => b - tradeAmount);
    
    // Результат через 2 секунды
    setTimeout(() => {
      const win = Math.random() > 0.5;
      if (win) {
        setBalance(b => b + tradeAmount * 2);
        tg?.showAlert("Победа! + " + tradeAmount);
      } else {
        tg?.showAlert("Проигрыш...");
      }
    }, 2000);
  };

  return (
    <div className="app-container">
      <div className="top-stats">
        <span>Ваш баланс:</span>
        <b>💰 {Math.floor(balance).toLocaleString()}</b>
      </div>

      <main className="content">
        {tab === 'home' && (
          <div className="home-view">
            <div className="hamster-big" onClick={() => {
              setBalance(b => b + 1);
              tg?.HapticFeedback.impactOccurred('light');
            }}>🐹</div>
            <p>Нажимай на хомяка, чтобы копить на сделки!</p>
          </div>
        )}

        {tab === 'trade' && (
          <div className="trade-view">
            <div className="chart-box">
              <Chart 
                options={{
                  chart: { type: 'candlestick', toolbar: { show: false }, background: 'transparent' },
                  xaxis: { type: 'datetime', labels: { show: false } },
                  yaxis: { labels: { style: { colors: '#888' } } },
                  theme: { mode: 'dark' },
                  plotOptions: { candlestick: { colors: { upward: '#00ff88', downward: '#ff4d4d' } } }
                }}
                series={[{ data: candles }]}
                type="candlestick"
                height={250}
              />
            </div>
            
            <div className="trade-ui">
              <div className="amount-step">
                <button onClick={() => setTradeAmount(a => Math.max(10, a - 50))}>-</button>
                <span>Ставка: {tradeAmount}</span>
                <button onClick={() => setTradeAmount(a => a + 50)}>+</button>
              </div>
              <div className="trade-btns">
                <button className="btn-up" onClick={() => startTrade('up')}>ВВЕРХ</button>
                <button className="btn-down" onClick={() => startTrade('down')}>ВНИЗ</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="nav">
        <button onClick={() => setTab('home')} className={tab === 'home' ? 'active' : ''}>Кликать</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>БИРЖА</button>
      </nav>
    </div>
  );
}

export default App;
