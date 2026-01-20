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

function App() {
  const [balance, setBalance] = useState(1000);
  const [tab, setTab] = useState('home');
  const [candles, setCandles] = useState([
    { x: new Date().getTime(), y: [65000, 65100, 64900, 65050] }
  ]);

  useEffect(() => {
    const i = setInterval(() => {
      setCandles(prev => {
        const last = prev[prev.length - 1];
        const o = last.y[3];
        const c = o + (Math.random() * 40 - 20);
        return [...prev.slice(-15), { x: new Date().getTime(), y: [o, Math.max(o,c)+5, Math.min(o,c)-5, c] }];
      });
    }, 2000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="app-container" style={{background: '#000', color: '#fff', minHeight: '100vh', padding: '20px'}}>
      <h2 style={{color: '#f1c40f'}}>💰 {balance}</h2>
      
      {tab === 'home' && (
        <div style={{textAlign: 'center', marginTop: '50px'}}>
          <div style={{fontSize: '100px', cursor: 'pointer'}} onClick={() => setBalance(b => b + 1)}>🐹</div>
          <p>Нажми на хомяка!</p>
        </div>
      )}

      {tab === 'trade' && (
        <div>
          <div style={{background: '#111', borderRadius: '10px', padding: '10px', border: '2px solid #00ff00'}}>
            <Chart 
              options={{ chart: { type: 'candlestick', toolbar: { show: false } }, theme: { mode: 'dark' }, xaxis: { type: 'datetime', labels: { show: false } } }}
              series={[{ data: candles }]} type="candlestick" height={250}
            />
          </div>
          <button style={{width: '100%', padding: '15px', marginTop: '20px', background: '#00ff00', fontWeight: 'bold'}} onClick={() => setBalance(b => b - 100)}>СТАВКА 100</button>
        </div>
      )}

      <nav style={{position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', background: '#111', padding: '10px'}}>
        <button style={{flex: 1, padding: '10px'}} onClick={() => setTab('home')}>ИГРА</button>
        <button style={{flex: 1, padding: '10px', background: '#f1c40f'}} onClick={() => setTab('trade')}>БИРЖА</button>
      </nav>
    </div>
  );
}
export default App;
