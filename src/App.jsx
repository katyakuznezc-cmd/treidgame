

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
  const [orders, setOrders] = useState([]);
  
  // Настройки
  const [isMusic, setIsMusic] = useState(() => localStorage.getItem('hMus') === 'true');
  const [isVibro, setIsVibro] = useState(() => localStorage.getItem('hVib') !== 'false');

  const user = tg?.initDataUnsafe?.user;
  const userId = user?.id ? String(user.id) : "guest_1";
  const username = user?.first_name || "Игрок";
  const inviteLink = `https://t.me/ТВОЙ_БОТ?start=${userId}`;

  useEffect(() => {
    if (balance > 0) set(ref(db, 'users/' + userId), { username, balance: Math.floor(balance) });
    localStorage.setItem('hBal', balance);
    localStorage.setItem('hEn', energy);
    localStorage.setItem('hPass', passiveIncome);
    localStorage.setItem('hMus', isMusic);
    localStorage.setItem('hVib', isVibro);
  }, [balance, energy, passiveIncome, isMusic, isVibro, userId, username]);

  useEffect(() => {
    const pI = setInterval(() => { if (passiveIncome > 0) setBalance(b => b + (passiveIncome / 3600)); }, 1000);
    const eI = setInterval(() => setEnergy(e => e < 1000 ? e + 1 : 1000), 2000);
    return () => { clearInterval(pI); clearInterval(eI); };
  }, [passiveIncome]);

  useEffect(() => {
    const qTop = query(ref(db, 'users'), orderByChild('balance'), limitToLast(15));
    onValue(qTop, (s) => {
      const data = s.val();
      if (data) setLeaderboard(Object.values(data).sort((a,b) => b.balance - a.balance));
    });
  }, []);

  const handleTap = () => {
    if (energy <= 0) return;
    if (isVibro && tg) tg.HapticFeedback.impactOccurred('medium');
    setBalance(b => b + 1);
    setEnergy(e => e - 1);
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    if (tg) tg.showAlert("Ссылка скопирована! Отправь её другу.");
  };

  const chartData = useMemo(() => Array.from({ length: 15 }).map(() => ({ p: 60000 + Math.random()*2000 })), [tab]);

  return (
    <div className="app-container">
      <div className="top-stats">
        <div className="stat-card"><span>Прибыль</span><b>+{passiveIncome}</b></div>
        <div className="stat-card"><span>Баланс</span><b>💰 {Math.floor(balance).toLocaleString()}</b></div>
      </div>

      <main className="content-area">
        {tab === 'home' && (
          <div className="home-view">
            <div className="hamster-body" onClick={handleTap}>🐹</div>
            <div className="energy-wrap">
              <div className="en-text">⚡ {energy} / 1000</div>
              <div className="en-bar"><div className="en-fill" style={{width:`${energy/10}%`}}></div></div>
            </div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="trade-view">
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={chartData}><Line type="monotone" dataKey="p" stroke="#00ff88" dot={false} strokeWidth={2}/></LineChart>
              </ResponsiveContainer>
            </div>
            <div className="shop-grid">
              <div className="item-card" onClick={() => balance >= 1000 && (setBalance(b=>b-1000), setPassiveIncome(p=>p+150))}>
                <b>Trading Bot v1</b><p>+150/час</p>
                <button className={balance >= 1000 ? 'ok' : ''}>1,000</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'friends' && (
          <div className="friends-view">
            <h2>Пригласи друзей</h2>
            <div className="invite-box">
              <p>За каждого друга ты получишь 5,000 💰</p>
              <input readOnly value={inviteLink} />
              <button onClick={copyInvite}>Копировать ссылку</button>
            </div>
          </div>
        )}

        {tab === 'top' && (
          <div className="top-view">
            {leaderboard.map((u, i) => (
              <div className="l-item" key={i}><span>{i+1}. {u.username}</span><b>{u.balance}</b></div>
            ))}
          </div>
        )}

        {tab === 'settings' && (
          <div className="settings-view">
            <h2>Настройки</h2>
            <div className="set-row">
              <span>Вибрация</span>
              <button onClick={() => setIsVibro(!isVibro)}>{isVibro ? 'ВКЛ' : 'ВЫКЛ'}</button>
            </div>
            <div className="set-row">
              <span>Музыка</span>
              <button onClick={() => setIsMusic(!isMusic)}>{isMusic ? 'ВКЛ' : 'ВЫКЛ'}</button>
            </div>
            <hr/>
            <div className="creator-info">
              <p>Создатель: <b>@ТВОЙ_НИК</b></p>
              <p>Версия: 1.2.0 Stable</p>
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button onClick={()=>setTab('home')} className={tab==='home'?'active':''}>Игра</button>
        <button onClick={()=>setTab('trade')} className={tab==='trade'?'active':''}>Биржа</button>
        <button onClick={()=>setTab('friends')} className={tab==='friends'?'active':''}>Друзья</button>
        <button onClick={()=>setTab('top')} className={tab==='top'?'active':''}>Топ</button>
        <button onClick={()=>setTab('settings')} className={tab==='settings'?'active':''}>⚙️</button>
      </nav>
    </div>
  );
}
export default App;
