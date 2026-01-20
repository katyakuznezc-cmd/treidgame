import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, query, orderByChild, limitToLast } from "firebase/database";
import Chart from 'react-apexcharts';
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
  const [tradeAmount, setTradeAmount] = useState(100);
  
  // Добавляем стартовые свечи сразу, чтобы график не был пустым
  const [candles, setCandles] = useState([
    { x: new Date().getTime() - 30000, y: [65000, 65050, 64950, 65020] },
    { x: new Date().getTime() - 15000, y: [65020, 65100, 65010, 65080] }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCandles(prev => {
        const last = prev[prev.length - 1];
        const o = last.y[3];
        const c = o + (Math.random() * 100 - 50);
        const h = Math.max(o, c) + 10;
        const l = Math.min(o, c) - 10;
        const newCandle = { x: new Date().getTime(), y: [o, h, l, c] };
        return [...prev.slice(-15), newCandle];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const startTrade = () => {
    if(balance < tradeAmount) return tg?.showAlert("Недостаточно монет!");
    setBalance(b => b - tradeAmount);
    setTimeout(() => {
      if(Math.random() > 0.48) { setBalance(b => b + tradeAmount * 2); tg?.showAlert("Профит! 📈"); }
      else { tg?.showAlert("Минус... 📉"); }
    }, 2000);
  };

  return (
    <div className="app-container">
      <div className="top-stats">
        <b>💰 {Math.floor(balance).toLocaleString()}</b>
      </div>

      <main className="content">
        {tab === 'home' && (
          <div className="home-view">
            <div className="hamster-big" onClick={() => {
              if(energy > 0) { setBalance(b => b + 1); setEnergy(e => e - 1); tg?.HapticFeedback.impactOccurred('light'); }
            }}>🐹</div>
            <div className="en-box">⚡ {energy} / 1000</div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="trade-view">
            <div className="chart-box" style={{ minHeight: '250px' }}>
              <Chart 
                options={{
                  chart: { type: 'candlestick', toolbar: { show: false }, background: '#000' },
                  xaxis: { type: 'datetime', labels: { show: false } },
                  yaxis: { tooltip: { enabled: true }, labels: { style: { colors: '#fff' } } },
                  plotOptions: { candlestick: { colors: { upward: '#00ff88', downward: '#ff4d4d' } } }
                }}
                series={[{ name: 'BTC', data: candles }]}
                type="candlestick"
                height={250}
              />
            </div>
            <div className="trade-ui">
               <div className="trade-btns">
                 <button onClick={() => setTradeAmount(a => Math.max(10, a - 50))}>-</button>
                 <span>{tradeAmount}</span>
                 <button onClick={() => setTradeAmount(a => a + 50)}>+</button>
               </div>
               <button className="main-trade-btn" onClick={startTrade}>ОТКРЫТЬ СДЕЛКУ</button>
            </div>
          </div>
        )}
      </main>

      <nav className="nav">
        <button onClick={()=>setTab('home')} className={tab==='home'?'active':''}>Игра</button>
        <button onClick={()=>setTab('trade')} className={tab==='trade'?'active':''}>Биржа</button>
      </nav>
    </div>
  );
}
export default App;
