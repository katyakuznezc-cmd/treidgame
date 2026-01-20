

import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, query, orderByChild, limitToLast } from "firebase/database";
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';
import './App.css';

// ТВОЙ CONFIG (Вставь свои ключи сюда)
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
  const [orders, setOrders] = useState([]);

  // Уникальный ID пользователя
  const user = tg?.initDataUnsafe?.user;
  const userId = user?.id ? String(user.id) : "guest_" + Math.floor(Math.random() * 9999);
  const username = user?.first_name || "Аноним";

  // Сохранение и пассивный доход
  useEffect(() => {
    if (balance > 0) set(ref(db, 'users/' + userId), { username, balance: Math.floor(balance) });
    localStorage.setItem('hBal', balance);
    localStorage.setItem('hEn', energy);
    localStorage.setItem('hPass', passiveIncome);
  }, [balance, energy, passiveIncome, userId, username]);

  useEffect(() => {
    const pInterval = setInterval(() => {
      if (passiveIncome > 0) setBalance(b => b + (passiveIncome / 3600));
    }, 1000);
    const eInterval = setInterval(() => setEnergy(e => e < 1000 ? e + 1 : 1000), 2000);
    return () => { clearInterval(pInterval); clearInterval(eInterval); };
  }, [passiveIncome]);

  // Загрузка ТОПа (сортировка по балансу)
  useEffect(() => {
    const topQuery = query(ref(db, 'users'), orderByChild('balance'), limitToLast(20));
    onValue(topQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sorted = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => b.balance - a.balance);
        setLeaderboard(sorted);
      }
    });
  }, []);

  // График и ордера
  const chartData = useMemo(() => Array.from({ length: 15 }).map(() => ({ p: 60000 + Math.random() * 5000 })), [tab]);
  useEffect(() => {
    const i = setInterval(() => {
      setOrders(prev => [{ id: Date.now(), type: Math.random() > 0.5 ? 'buy' : 'sell', price: (60000 + Math.random() * 1000).toFixed(1) }, ...prev].slice(0, 5));
    }, 2500);
    return () => clearInterval(i);
  }, []);

  const handleTap = () => {
    if (energy <= 0) return;
    if (tg) tg.HapticFeedback.impactOccurred('light');
    setBalance(b => b + 1);
    setEnergy(e => e - 1);
  };

  // ФУНКЦИЯ ТОРГОВЛИ (ПОКУПКИ)
  const buyBot = (cost, income) => {
    if (balance >= cost) {
      setBalance(prev => prev - cost);
      setPassiveIncome(prev => prev + income);
      if (tg) tg.HapticFeedback.notificationOccurred('success');
    } else {
      if (tg) tg.showAlert("Недостаточно монет! Продолжай тапать.");
    }
  };

  return (
    <div className="app-container">
      <div className="top-dashboard">
        <div className="d-item"><span>В час</span><br/><b>+{passiveIncome}</b></div>
        <div className="d-item"><span>Баланс</span><br/><b>💰 {Math.floor(balance).toLocaleString()}</b></div>
      </div>

      <main className="view-content">
        {tab === 'home' && (
          <div className="main-click-area">
            <div className="hamster-btn" onClick={handleTap}>🐹</div>
            <div className="energy-info">
              <span>⚡ {energy} / 1000</span>
              <div className="e-bar"><div className="e-fill" style={{width: `${energy/10}%`}}></div></div>
            </div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="trade-page">
            <div className="terminal">
              <div className="t-head">TRADING TERMINAL <span>LIVE</span></div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData}><Line type="step" dataKey="p" stroke="#00ff88" dot={false} strokeWidth={2}/></LineChart>
              </ResponsiveContainer>
              <div className="order-grid">
                {orders.map(o => <div key={o.id} className={`o-row ${o.type}`}>● {o.type === 'buy' ? 'BUY' : 'SELL'} <span>{o.price}</span></div>)}
              </div>
            </div>
            
            <div className="shop-list">
              <div className="bot-card" onClick={() => buyBot(1000, 200)}>
                <div className="bot-info"><b>AI Bot v.1</b><br/><span>+200 / час</span></div>
                <button className={balance >= 1000 ? 'active' : ''}>1,000</button>
              </div>
              <div className="bot-card" onClick={() => buyBot(5000, 1200)}>
                <div className="bot-info"><b>AI Bot v.2</b><br/><span>+1,200 / час</span></div>
                <button className={balance >= 5000 ? 'active' : ''}>5,000</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'top' && (
          <div className="leader-page">
            <h3>Wall of Fame 🏆</h3>
            <div className="l-list">
              {leaderboard.map((u, i) => (
                <div className={`l-row ${u.id === userId ? 'me' : ''}`} key={u.id}>
                  <span>{i + 1}. {u.username}</span>
                  <b>{u.balance.toLocaleString()}</b>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="nav-menu">
        <button onClick={() => setTab('home')} className={tab === 'home' ? 'active' : ''}>🐹 Игра</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>📈 Биржа</button>
        <button onClick={() => setTab('top')} className={tab === 'top' ? 'active' : ''}>🏆 Топ</button>
      </nav>
    </div>
  );
}
export default App;
