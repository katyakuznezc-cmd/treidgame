import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, query, orderByChild, limitToLast } from "firebase/database";
import './App.css';

// ТВОИ КЛЮЧИ (не забудь проверить, что они на месте)
const firebaseConfig = {
  apiKey: "ТВОЙ_API_KEY",
  authDomain: "kreptogame.firebaseapp.com",
  databaseURL: "https://kreptogame-default-rtdb.firebaseio.com/",
  projectId: "kreptogame",
  storageBucket: "kreptogame.appspot.com",
  messagingSenderId: "ТВОЙ_SENDER_ID",
  appId: "ТВОЙ_APP_ID"
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

  const username = tg?.initDataUnsafe?.user?.first_name || "Игрок";
  const userId = tg?.initDataUnsafe?.user?.id || "guest_" + Math.floor(Math.random() * 1000);

  // Сохранение в Firebase
  useEffect(() => {
    if (balance > 0) {
      set(ref(db, 'users/' + userId), { username, balance });
    }
    localStorage.setItem('hBal', balance);
    localStorage.setItem('hEn', energy);
  }, [balance, energy, userId, username]);

  // Загрузка ТОПа
  useEffect(() => {
    const topQuery = query(ref(db, 'users'), orderByChild('balance'), limitToLast(10));
    onValue(topQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sorted = Object.values(data).sort((a, b) => b.balance - a.balance);
        setLeaderboard(sorted);
      }
    });
  }, []);

  // Регенерация энергии
  useEffect(() => {
    const timer = setInterval(() => {
      setEnergy(prev => (prev < 1000 ? prev + 1 : 1000));
    }, 1500);
    return () => clearInterval(timer);
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
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 800);
  };

  const getMedal = (index) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  return (
    <div className="app-container">
      <div className="header">
        <div className="user-info">👤 {username}</div>
        <div className="balance-main">
            <img src="https://cryptologos.cc/logos/tether-usdt-logo.png" width="30" alt="coin" />
            <h1>{balance.toLocaleString()}</h1>
        </div>
      </div>

      <main className="content">
        {tab === 'home' && (
          <div className="clicker-view">
            <div className="hamster-target" onClick={handleTap}>
              <div className="hamster-inner">🐹</div>
              {clicks.map(c => (
                <div key={c.id} className="tap-pop" style={{ left: c.x, top: c.y }}>+1</div>
              ))}
            </div>
            
            <div className="energy-section">
              <div className="energy-label">⚡ {energy} / 1000</div>
              <div className="energy-bar"><div className="fill" style={{width: `${energy/10}%`}}></div></div>
            </div>
          </div>
        )}

        {tab === 'top' && (
          <div className="leaderboard-view">
            <h2 className="title">Лидеры KRYPTO 🏆</h2>
            <div className="list">
              {leaderboard.map((user, i) => (
                <div className={`list-item ${i < 3 ? 'top-three' : ''}`} key={i}>
                  <span className="rank">{getMedal(i)}</span>
                  <span className="name">{user.username}</span>
                  <span className="val">{user.balance.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="nav-bar">
        <button onClick={() => setTab('home')} className={tab === 'home' ? 'active' : ''}>🐹 Играть</button>
        <button onClick={() => setTab('top')} className={tab === 'top' ? 'active' : ''}>🏆 Топ</button>
      </nav>
    </div>
  );
}

export default App;
