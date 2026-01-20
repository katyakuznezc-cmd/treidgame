
imimport React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, query, orderByChild, limitToLast } from "firebase/database";
import Chart from 'react-apexcharts';
import './App.css';

// ТВОЙ CONFIG (Вставь свои ключи из Firebase)
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
  // Состояния игры
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('hBal')) || 0);
  const [energy, setEnergy] = useState(() => Number(localStorage.getItem('hEn')) || 1000);
  const [passiveIncome, setPassiveIncome] = useState(() => Number(localStorage.getItem('hPass')) || 0);
  const [tab, setTab] = useState('home');
  
  // Состояния биржи
  const [tradeAmount, setTradeAmount] = useState(100);
  const [candles, setCandles] = useState([]);
  
  // Настройки и прочее
  const [isVibro, setIsVibro] = useState(() => localStorage.getItem('hVib') !== 'false');
  const [leaderboard, setLeaderboard] = useState([]);

  const user = tg?.initDataUnsafe?.user;
  const userId = user?.id ? String(user.id) : "guest_1";
  const username = user?.first_name || "Игрок";
  const inviteLink = `https://t.me/ТВОЙ_БОТ?start=${userId}`;

  // 1. Логика Firebase и сохранения
  useEffect(() => {
    if (balance > 0) set(ref(db, 'users/' + userId), { username, balance: Math.floor(balance) });
    localStorage.setItem('hBal', balance);
    localStorage.setItem('hEn', energy);
    localStorage.setItem('hPass', passiveIncome);
    localStorage.setItem('hVib', isVibro);
  }, [balance, energy, passiveIncome, isVibro, userId, username]);

  // 2. Генерация свечей для графика (каждые 3 сек)
  useEffect(() => {
    const interval = setInterval(() => {
      setCandles(prev => {
        const lastCandle = prev[prev.length - 1] || { y: [65000, 65100, 64900, 65050] };
        const open = lastCandle.y[3];
        const close = open + (Math.random() * 200 - 100);
        const newCandle = { 
          x: new Date().getTime(), 
          y: [open, Math.max(open, close) + 20, Math.min(open, close) - 20, close] 
        };
        return [...prev.slice(-15), newCandle];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // 3. Регенерация энергии и пассивный доход
  useEffect(() => {
    const eI = setInterval(() => setEnergy(e => e < 1000 ? e + 1 : 1000), 1500);
    const pI = setInterval(() => { if (passiveIncome > 0) setBalance(b => b + (passiveIncome / 3600)); }, 1000);
    return () => { clearInterval(eI); clearInterval(pI); };
  }, [passiveIncome]);

  // 4. Загрузка ТОПа
  useEffect(() => {
    onValue(query(ref(db, 'users'), orderByChild('balance'), limitToLast(10)), (s) => {
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

  const startTrade = (type) => {
    if (balance < tradeAmount) return tg?.showAlert("Мало монет!");
    setBalance(b => b - tradeAmount);
    tg?.showConfirm(`Сделка ${type === 'up' ? 'ВВЕРХ' : 'ВНИЗ'} открыта. Ждем результат...`, (ok) => {
      setTimeout(() => {
        const win = Math.random() > 0.5;
        if (win) {
          setBalance(b => b + tradeAmount * 2);
          tg?.showAlert("Профит! + " + tradeAmount);
        } else {
          tg?.showAlert("Сделка в минус...");
        }
      }, 2000);
    });
  };

  return (
    <div className="app-container">
      <div className="top-stats">
        <div className="stat"><span>В час</span><b>+{passiveIncome}</b></div>
        <div className="stat"><span>Баланс</span><b>💰 {Math.floor(balance).toLocaleString()}</b></div>
      </div>

      <main className="content">
        {tab === 'home' && (
          <div className="home-view">
            <div className="hamster-big" onClick={handleTap}>🐹</div>
            <div className="en-box">
              <span>⚡ {energy} / 1000</span>
              <div className="en-bar"><div className="fill" style={{width: `${energy/10}%`}}></div></div>
            </div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="trade-view">
            <div className="chart-box">
              <Chart 
                options={{ 
                    chart: { type: 'candlestick', toolbar: {show:false}, background: 'transparent' },
                    theme: { mode: 'dark' },
                    xaxis: { type: 'datetime', labels: {show:false} },
                    grid: { borderColor: '#222' }
                }}
                series={[{ data: candles }]}
                type="candlestick" height={220}
              />
            </div>
            <div className="trade-ui">
              <div className="amount-step">
                <button onClick={() => setTradeAmount(Math.max(10, tradeAmount - 50))}>-</button>
                <b>{tradeAmount}</b>
                <button onClick={() => setTradeAmount(tradeAmount + 50)}>+</button>
              </div>
              <div className="trade-btns">
                <button className="btn-up" onClick={() => startTrade('up')}>ВВЕРХ</button>
                <button className="btn-down" onClick={() => startTrade('down')}>ВНИЗ</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'friends' && (
          <div className="friends-view">
            <h2>Друзья</h2>
            <div className="invite-card">
              <p>Твой ID: {userId}</p>
              <button onClick={() => { navigator.clipboard.writeText(inviteLink); tg?.showAlert("Ссылка скопирована!"); }}>
                Копировать реф-ссылку
              </button>
            </div>
          </div>
        )}

        {tab === 'top' && (
          <div className="top-view">
            {leaderboard.map((u, i) => (
              <div className="l-row" key={i}><span>{i+1}. {u.username}</span><b>{u.balance}</b></div>
            ))}
          </div>
        )}

        {tab === 'settings' && (
          <div className="settings-view">
            <div className="s-row">
              <span>Вибрация</span>
              <button onClick={() => setIsVibro(!isVibro)}>{isVibro ? 'ВКЛ' : 'ВЫКЛ'}</button>
            </div>
            <p>Создатель: @ТвойНик</p>
          </div>
        )}
      </main>

      <nav className="nav">
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
