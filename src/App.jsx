import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, query, orderByChild, limitToLast } from "firebase/database";
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';
import './App.css';

// ВСТАВЬТЕ СВОИ ДАННЫЕ ИЗ FIREBASE НИЖЕ
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

function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('hBal')) || 0);
  const [tab, setTab] = useState('home');
  const [orders, setOrders] = useState([]);

  // Данные для графика котировок
  const chartData = useMemo(() => {
    let price = 67000;
    return Array.from({ length: 25 }).map((_, i) => ({
      time: i,
      price: price + (Math.random() * 400 - 200)
    }));
  }, [tab]);

  // Симуляция живого стакана ордеров
  useEffect(() => {
    const interval = setInterval(() => {
      const type = Math.random() > 0.5 ? 'buy' : 'sell';
      const newOrder = {
        id: Date.now(),
        type,
        amount: (Math.random() * 1.5).toFixed(3),
        price: (67000 + Math.random() * 300).toFixed(1)
      };
      setOrders(prev => [newOrder, ...prev].slice(0, 6));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container">
      <header className="stats-header">
        <div className="stat"><span>Баланс</span><b>💰 {Math.floor(balance).toLocaleString()}</b></div>
      </header>

      <main className="main-content">
        {tab === 'home' && (
          <div className="clicker-view">
            <div className="main-target" onClick={() => setBalance(b => b + 1)}>🐹</div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="trade-view">
            <div className="chart-wrapper">
              <div className="chart-label">BTC / USDT <span>• LIVE</span></div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={chartData}>
                  <YAxis hide domain={['auto', 'auto']} />
                  <Line type="monotone" dataKey="price" stroke="#00ff88" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="order-book">
              <div className="order-header">Стакан ордеров</div>
              {orders.map(o => (
                <div key={o.id} className={`order-line ${o.type}`}>
                  <span>{o.amount} BTC</span>
                  <b>{o.price}</b>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="nav-footer">
        <button onClick={() => setTab('home')} className={tab === 'home' ? 'active' : ''}>🏠 Игра</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>📈 Биржа</button>
      </nav>
    </div>
  );
}

export default App;
