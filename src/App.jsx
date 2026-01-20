import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, query, orderByChild, limitToLast } from "firebase/database";
import { LineChart, Line, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import './App.css';

// ТВОЙ CONFIG (обязательно вставь свои ключи сюда)
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
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('hBal')) || 0);
  const [tab, setTab] = useState('home');
  const [passiveIncome, setPassiveIncome] = useState(() => Number(localStorage.getItem('hPass')) || 0);
  const [orders, setOrders] = useState([]);

  // Генерация данных для графика
  const chartData = useMemo(() => {
    let price = 67200;
    return Array.from({ length: 30 }).map((_, i) => {
      price += Math.random() > 0.5 ? Math.random() * 200 : -Math.random() * 180;
      return { time: i, price: Math.floor(price) };
    });
  }, [tab]);

  // Симуляция "стакана ордеров"
  useEffect(() => {
    const interval = setInterval(() => {
      const newOrder = {
        id: Date.now(),
        type: Math.random() > 0.5 ? 'buy' : 'sell',
        amount: (Math.random() * 2).toFixed(3),
        price: (67000 + Math.random() * 500).toFixed(1)
      };
      setOrders(prev => [newOrder, ...prev].slice(0, 5));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Пассивный доход
  useEffect(() => {
    const interval = setInterval(() => {
      if (passiveIncome > 0) setBalance(b => b + (passiveIncome / 3600));
    }, 1000);
    return () => clearInterval(interval);
  }, [passiveIncome]);

  return (
    <div className="app-container">
      <div className="top-stats">
        <div className="stat-card"><span>Доход/час</span><b>+{passiveIncome}</b></div>
        <div className="stat-card"><span>Баланс</span><b>💰 {Math.floor(balance).toLocaleString()}</b></div>
      </div>

      <main className="content">
        {tab === 'home' && (
          <div className="game-screen">
             <div className="hamster-main" onClick={(e) => setBalance(b => b + 1)}>
                <div className="hamster-face">🐹</div>
             </div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="trade-screen">
            <div className="chart-box">
              <div className="chart-header">BTC / USDT <span>LIVE</span></div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={chartData}>
                  <YAxis hide domain={['auto', 'auto']} />
                  <Line type="monotone" dataKey="price" stroke="#00ff88" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="order-book">
              <h4>Стакан ордеров</h4>
              {orders.map(o => (
                <div key={o.id} className={`order-row ${o.type}`}>
                  <span>{o.amount} BTC</span>
                  <b>{o.price}</b>
                </div>
              ))}
            </div>

            <div className="trade-actions">
              <div className="trade-item" onClick={() => balance >= 1000 && (setBalance(b => b - 1000), setPassiveIncome(p => p + 250))}>
                <span>Бот-скальпер v2</span>
                <button disabled={balance < 1000}>{balance < 1000 ? '1000' : 'КУПИТЬ'}</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="menu">
        <button onClick={() => setTab('home')} className={tab === 'home' ? 'active' : ''}>🏠 Игра</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>📈 Биржа</button>
      </nav>
    </div>
  );
}

export default App;
