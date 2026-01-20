import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, query, orderByChild, limitToLast } from "firebase/database";
import Chart from 'react-apexcharts';
import './App.css';

// ТВОЙ CONFIG
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
  const [tradeAmount, setTradeAmount] = useState(100);
  const [candles, setCandles] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  const user = tg?.initDataUnsafe?.user;
  const userId = user?.id ? String(user.id) : "guest_1";
  const username = user?.first_name || "Игрок";
  const inviteLink = `https://t.me/ТВОЙ_БОТ?start=${userId}`;

  // Сохранение и данные
  useEffect(() => {
    if (balance > 0) set(ref(db, 'users/' + userId), { username, balance: Math.floor(balance) });
    localStorage.setItem('hBal', balance);
    localStorage.setItem('hEn', energy);
    localStorage.setItem('hPass', passiveIncome);
  }, [balance, energy, passiveIncome, userId]);

  // Генерация живых свечей
  useEffect(() => {
    const interval = setInterval(() => {
      setCandles(prev => {
        const last = prev[prev.length - 1] || { y: [65000, 65100, 64900, 65050] };
        const o = last.y[3];
        const c = o + (Math.random() * 200 - 100);
        return [...prev.slice(-15), { x: new Date().getTime(), y: [o, Math.max(o,c)+20, Math.min(o,c)-20, c] }];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Доход и энергия
  useEffect(() => {
    const i = setInterval(() => {
      setEnergy(e => e < 1000 ? e + 1 : 1000);
      if (passiveIncome > 0) setBalance(b => b + (passiveIncome / 3600));
    }, 1000);
    return () => clearInterval(i);
  }, [passiveIncome]);

  // ТОП
  useEffect(() => {
    onValue(query(ref(db, 'users'), orderByChild('balance'), limitToLast(10)), (s) => {
      const d = s.val();
      if (d) setLeaderboard(Object.values(d).sort((a,b) => b.balance - a.balance));
    });
  }, []);

  const handleTap = () => {
    if (energy <= 0) return;
    tg?.HapticFeedback.impactOccurred('medium');
    setBalance(b => b + 1);
    setEnergy(e => e - 1);
  };

  return (
    <div className="app-container">
      <div className="top-stats">
        <div className="stat"><span>Доход</span><b>+{passiveIncome}</b></div>
        <div className="stat"><span>Баланс</span><b>💰 {Math.floor(balance).toLocaleString()}</b></div>
      </div>

      <main className="content">
        {tab === 'home' && (
          <div className="home-view">
            <div className="hamster-big" onClick={handleTap}>🐹</div>
            <div className="en-box">
              <span>⚡ {energy} / 1000</span>
              <div className="en-bar"><div className="fill" style={{width:`${energy/10}%`}}></div></div>
            </div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="trade-view">
            <div className="chart-box">
              <Chart 
                options={{ chart:{type:'candlestick',toolbar:{show:false}}, theme:{mode:'dark'}, xaxis:{type:'datetime',labels:{show:false}} }}
                series={[{ data: candles }]} type="candlestick" height={220}
              />
            </div>
            <div className="trade-ui">
              <div className="amount-step">
                <button onClick={()=>setTradeAmount(Math.max(10, tradeAmount-50))}>-</button>
                <b>{tradeAmount}</b>
                <button onClick={()=>setTradeAmount(tradeAmount+50)}>+</button>
              </div>
              <button className="btn-trade" onClick={() => {
                if(balance < tradeAmount) return tg.showAlert("Мало монет!");
                setBalance(b => b - tradeAmount);
                setTimeout(() => {
                    const win = Math.random() > 0.5;
                    if(win) { setBalance(b => b + tradeAmount*2); tg.showAlert("Выиграл!"); }
                    else { tg.showAlert("Проиграл..."); }
                }, 2000);
              }}>ОТКРЫТЬ СДЕЛКУ</button>
            </div>
          </div>
        )}

        {tab === 'friends' && (
          <div className="friends-view">
             <h2>Друзья 🤝</h2>
             <p>Приглашай друзей и получай бонусы!</p>
             <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(inviteLink); tg.showAlert("Ссылка скопирована!"); }}>
               Копировать ссылку
             </button>
          </div>
        )}

        {tab === 'top' && (
          <div className="top-view">
            {leaderboard.map((u, i) => (
              <div className="l-row" key={i}><span>{i+1}. {u.username}</span><b>{u.balance}</b></div>
            ))}
          </div>
        )}
      </main>

      <nav className="nav">
        <button onClick={()=>setTab('home')} className={tab==='home'?'active':''}>Игра</button>
        <button onClick={()=>setTab('trade')} className={tab==='trade'?'active':''}>Биржа</button>
        <button onClick={()=>setTab('friends')} className={tab==='friends'?'active':''}>Друзья</button>
        <button onClick={()=>setTab('top')} className={tab==='top'?'active':''}>Топ</button>
      </nav>
    </div>
  );
}
export default App;
