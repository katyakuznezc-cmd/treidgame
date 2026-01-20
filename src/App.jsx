Понял тебя! Мы слишком увлеклись графиком и случайно «вырезали» всё остальное. Давай вернем всё на место: и магазин, и таблицу лидеров, и энергию, и сделаем биржу по-настоящему рабочей.

Сейчас мы сделаем полный и финальный код, где будет всё сразу.

1. Полностью замени код в src/App.jsx
Не забудь вставить свои ключи Firebase в конфиг!

JavaScript

import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, query, orderByChild, limitToLast } from "firebase/database";
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';
import './App.css';

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
  const [energy, setEnergy] = useState(() => Number(localStorage.getItem('hEn')) || 1000);
  const [passiveIncome, setPassiveIncome] = useState(() => Number(localStorage.getItem('hPass')) || 0);
  const [tab, setTab] = useState('home');
  const [leaderboard, setLeaderboard] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [orders, setOrders] = useState([]);

  const username = tg?.initDataUnsafe?.user?.first_name || "Игрок";
  const userId = tg?.initDataUnsafe?.user?.id || "guest_" + Math.floor(Math.random() * 1000);

  // Сохранение данных
  useEffect(() => {
    set(ref(db, 'users/' + userId), { username, balance: Math.floor(balance) });
    localStorage.setItem('hBal', balance);
    localStorage.setItem('hEn', energy);
    localStorage.setItem('hPass', passiveIncome);
  }, [balance, energy, passiveIncome]);

  // Регенерация энергии
  useEffect(() => {
    const timer = setInterval(() => setEnergy(e => e < 1000 ? e + 1 : 1000), 1500);
    return () => clearInterval(timer);
  }, []);

  // Пассивный доход
  useEffect(() => {
    const interval = setInterval(() => {
      if (passiveIncome > 0) setBalance(b => b + (passiveIncome / 3600));
    }, 1000);
    return () => clearInterval(interval);
  }, [passiveIncome]);

  // Загрузка ТОПа
  useEffect(() => {
    const topQuery = query(ref(db, 'users'), orderByChild('balance'), limitToLast(10));
    onValue(topQuery, (s) => {
      const data = s.val();
      if (data) setLeaderboard(Object.values(data).sort((a, b) => b.balance - a.balance));
    });
  }, []);

  // Симуляция ордеров на бирже
  useEffect(() => {
    const interval = setInterval(() => {
      const newOrder = { id: Date.now(), type: Math.random() > 0.5 ? 'buy' : 'sell', amount: (Math.random()*2).toFixed(3), price: (67000 + Math.random()*500).toFixed(1) };
      setOrders(prev => [newOrder, ...prev].slice(0, 4));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const chartData = useMemo(() => Array.from({ length: 20 }).map((_, i) => ({ price: 67000 + Math.random()*500 })), [tab]);

  const handleTap = (e) => {
    if (energy <= 0) return;
    setBalance(b => b + 1);
    setEnergy(en => en - 1);
    const id = Date.now();
    const x = e.clientX || e.touches[0].clientX;
    const y = e.clientY || e.touches[0].clientY;
    setClicks(prev => [...prev, { id, x, y }]);
    setTimeout(() => setClicks(p => p.filter(c => c.id !== id)), 600);
  };

  const buyUpgrade = (cost, income) => {
    if (balance >= cost) {
      setBalance(b => b - cost);
      setPassiveIncome(p => p + income);
    }
  };

  return (
    <div className="app-container">
      <div className="header-stats">
        <div className="stat-box"><span>Доход в час</span><b>+{passiveIncome}</b></div>
        <div className="stat-box"><span>Баланс</span><b>💰 {Math.floor(balance).toLocaleString()}</b></div>
      </div>

      <main className="main-content">
        {tab === 'home' && (
          <div className="clicker-view">
            <div className="hamster-circle" onClick={handleTap}>
              <span>🐹</span>
              {clicks.map(c => <div key={c.id} className="floating-text" style={{left: c.x, top: c.y}}>+1</div>)}
            </div>
            <div className="energy-container">
              <p>⚡ {energy} / 1000</p>
              <div className="energy-bar"><div className="fill" style={{width: `${energy/10}%`}}></div></div>
            </div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="trade-view">
            <div className="chart-card">
              <p>BTC/USDT LIVE</p>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData}><YAxis hide domain={['auto', 'auto']}/><Line type="monotone" dataKey="price" stroke="#00ff88" dot={false} strokeWidth={2}/></LineChart>
              </ResponsiveContainer>
            </div>
            <div className="orders-list">
              {orders.map(o => <div key={o.id} className={`order-item ${o.type}`}><span>{o.amount} BTC</span><b>{o.price}</b></div>)}
            </div>
            <div className="shop-section">
              <div className="upgrade-card" onClick={() => buyUpgrade(500, 100)}>
                <div><h3>Бот-скальпер</h3><p>+100/час</p></div>
                <button className={balance >= 500 ? 'can-buy' : ''}>500 💰</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'top' && (
          <div className="top-view">
            <h2>Лидеры 🏆</h2>
            {leaderboard.map((u, i) => (
              <div className="leader-item" key={i}><span>{i+1}. {u.username}</span><b>{u.balance.toLocaleString()}</b></div>
            ))}
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button onClick={() => setTab('home')} className={tab === 'home' ? 'active' : ''}>🏠 Игра</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>📈 Биржа</button>
        <button onClick={() => setTab('top')} className={tab === 'top' ? 'active' : ''}>🏆 Топ</button>
      </nav>
    </div>
  );
}
export default App;
