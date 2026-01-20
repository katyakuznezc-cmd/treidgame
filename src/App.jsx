import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, query, orderByChild, limitToLast } from "firebase/database";
import './App.css';

https://kreptogame-default-rtdb.firebaseio.com/
null
const firebaseConfig = {
  apiKey: "AIzaSyAR2T3Rz0A9hDllrWmtRRY-4rfPEdJle6g",
  authDomain: "твой-проект.firebaseapp.com",
  databaseURL: "https://твой-проект.firebaseio.com",
  projectId: "твой-проект",
  storageBucket: "твой-проект.appspot.com",
  messagingSenderId: "528985774017",
  appId: "1:528985774017:web:50ed5fd68898775e7d8140"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const tg = window.Telegram?.WebApp;

function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('hBal')) || 0);
  const [tab, setTab] = useState('home');
  const [leaderboard, setLeaderboard] = useState([]);
  
  // Имя пользователя из Telegram
  const username = tg?.initDataUnsafe?.user?.first_name || "Аноним";
  const userId = tg?.initDataUnsafe?.user?.id || "guest";

  // Сохранение баланса в базу данных
  useEffect(() => {
    if (balance > 0) {
      set(ref(db, 'users/' + userId), {
        username: username,
        balance: balance
      });
    }
    localStorage.setItem('hBal', balance);
  }, [balance, userId, username]);

  // Загрузка ТОП-10
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

  const handleTap = () => {
    setBalance(prev => prev + 1);
    if (tg) tg.HapticFeedback.impactOccurred('light');
  };

  return (
    <div className="app-container">
      <div className="balance-header">
        <h1>💰 {Math.floor(balance).toLocaleString()}</h1>
      </div>

      <main className="main-content">
        {tab === 'home' && (
          <div className="home-view" onClick={handleTap}>
            <div className="hamster-circle">🐹</div>
            <p>Нажимай на хомяка!</p>
          </div>
        )}

        {tab === 'top' && (
          <div className="shop-view">
            <h2>Топ Игроков 🏆</h2>
            {leaderboard.map((user, index) => (
              <div className="shop-item" key={index}>
                <div>{index + 1}. {user.username}</div>
                <div style={{color: '#f1c40f'}}>{user.balance.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </main>

      <nav className="bottom-menu">
        <button onClick={() => setTab('home')} className={tab === 'home' ? 'active' : ''}>🐹 Игра</button>
        <button onClick={() => setTab('top')} className={tab === 'top' ? 'active' : ''}>🏆 Топ</button>
      </nav>
    </div>
  );
}

export default App;
