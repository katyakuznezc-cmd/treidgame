import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, query, orderByChild, limitToLast } from "firebase/database";
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
  const [tab, setTab] = useState('home');
  const [leaderboard, setLeaderboard] = useState([]);
  const [clicks, setClicks] = useState([]);
  
  // ПАССИВНЫЙ ДОХОД (Трейдинг)
  const [passiveIncome, setPassiveIncome] = useState(() => Number(localStorage.getItem('hPass')) || 0);

  const username = tg?.initDataUnsafe?.user?.first_name || "Игрок";
  const userId = tg?.initDataUnsafe?.user?.id || "guest_" + Math.floor(Math.random() * 1000);

  // Логика пассивного дохода (начисление каждую секунду)
  useEffect(() => {
    const interval = setInterval(() => {
      if (passiveIncome > 0) {
        setBalance(prev => prev + (passiveIncome / 60)); // Начисляем часть дохода каждую секунду
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [passiveIncome]);

  useEffect(() => {
    if (balance > 0) set(ref(db, 'users/' + userId), { username, balance: Math.floor(balance) });
    localStorage.setItem('hBal', balance);
    localStorage.setItem('hEn', energy);
    localStorage.setItem('hPass', passiveIncome);
  }, [balance, energy, passiveIncome, userId, username]);

  useEffect(() => {
    const topQuery = query(ref(db, 'users'), orderByChild('balance'), limitToLast(10));
    onValue(topQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) setLeaderboard(Object.values(data).sort((a, b) => b.balance - a.balance));
    });
  }, []);

  const handleTap = (e) => {
    if (energy <= 0) return;
    if (tg) tg.HapticFeedback.impactOccurred('medium');
    setBalance(b => b + 1);
    setEnergy(e => e - 1);
    const id = Date.now();
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    setClicks(prev => [...prev, { id, x, y }]);
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 600);
  };

  return (
    <div className="app-container">
      <div className="top-stats">
        <div className="stat-card"><span>Прибыль в час</span><br/><b>+{passiveIncome}</b></div>
        <div className="stat-card"><span>Баланс</span><br/><b>💰 {Math.floor(balance).toLocaleString()}</b></div>
      </div>

      <main className="content">
        {tab === 'home' && (
          <div className="game-screen">
            <div className="hamster-main" onClick={handleTap}>
              <div className="hamster-face">🐹</div>
              {clicks.map(c => <div key={c.id} className="tap-pop" style={{ left: c.x, top: c.y }}>+1</div>)}
            </div>
            <div className="energy-wrap">
              <span>⚡ {energy} / 1000</span>
              <div className="energy-bg"><div className="energy-fill" style={{width: `${energy/10}%`}}></div></div>
            </div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="trade-screen">
            <h2>Трейдинг (Майнинг) 📈</h2>
            <div className="trade-card" onClick={() => balance >= 500 && (setBalance(b => b - 500), setPassiveIncome(p => p + 100))}>
              <h3>Бот-трейдер v1</h3>
              <p>Доход: +100 / час</p>
              <button disabled={balance < 500}>{balance < 500 ? 'Нужно 500' : 'Купить за 500'}</button>
            </div>
          </div>
        )}

        {tab === 'top' && (
          <div className="top-screen">
            <h2>Лидеры 🏆</h2>
            {leaderboard.map((user, i) => (
              <div className="top-item" key={i}>
                <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1} {user.username}</span>
                <b>{user.balance.toLocaleString()}</b>
              </div>
            ))}
          </div>
        )}
      </main>

      <nav className="menu">
        <button onClick={() => setTab('home')} className={tab === 'home' ? 'active' : ''}>🏠 Игра</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>📈 Трейдинг</button>
        <button onClick={() => setTab('top')} className={tab === 'top' ? 'active' : ''}>🏆 Топ</button>
      </nav>
    </div>
  );
}

export default App;

export default App;
