import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";
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
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('hBal')) || 1000);
  const [tab, setTab] = useState('home');
  const [candles, setCandles] = useState([
    { x: new Date().getTime(), y: [65000, 65100, 64900, 65050] }
  ]);

  useEffect(() => {
    localStorage.setItem('hBal', balance);
  }, [balance]);

  useEffect(() => {
    const i = setInterval(() => {
      setCandles(prev => {
        const last = prev[prev.length - 1];
        const o = last.y[3];
        const c = o + (Math.random() * 40 - 20);
        return [...prev.slice(-10), { x: new Date().getTime(), y: [o, Math.max(o,c)+5, Math.min(o,c)-5, c] }];
      });
    }, 2000);
    return () => clearInterval(i);
  }, []);

  const handleTrade = (win) => {
    if (balance < 100) return tg?.showAlert("Нужно минимум 100 монет!");
    setBalance(b => b - 100);
    setTimeout(() => {
      if (Math.random() > 0.5) {
        setBalance(b => b + 250);
        tg?.showAlert("Профит +150!");
      } else {
        tg?.showAlert("Убыток -100");
      }
    }, 1500);
  };

  return (
    <div className="app-container">
      <div className="balance-header">💰 {Math.floor(balance)}</div>
      
      <main className="main-content">
        {tab === 'home' && (
          <div className="clicker">
            <div className="circle" onClick={() => setBalance(b => b + 1)}>🐹</div>
            <p>Нажми, чтобы заработать на сделку!</p>
          </div>
        )}

        {tab === 'trade' && (
          <div className="trading-area">
            <div className="chart-container">
              <Chart 
                options={{
                  chart: { type: 'candlestick', toolbar: { show: false } },
                  xaxis: { type: 'datetime', labels: { show: false } },
                  theme: { mode: 'dark' }
                }}
                series={[{ data: candles }]}
                type="candlestick"
                height={300}
              />
            </div>
            <div className="trade-buttons">
              <button className="buy" onClick={() => handleTrade(true)}>ВВЕРХ (100)</button>
              <button className="sell" onClick={() => handleTrade(false)}>ВНИЗ (100)</button>
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button onClick={() => setTab('home')}>Кликать</button>
        <button onClick={() => setTab('trade')}>БИРЖА</button>
      </nav>
    </div>
  );
}

export default App;
