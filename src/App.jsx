import React, { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import './App.css';

function App() {
  const [balance, setBalance] = useState(1000);
  const [tab, setTab] = useState('home');
  
  // Создаем массив данных в формате свечей: [Open, High, Low, Close]
  const [candles, setCandles] = useState([
    { x: new Date().getTime() - 60000, y: [65000, 65080, 64920, 65020] },
    { x: new Date().getTime() - 40000, y: [65020, 65100, 65010, 65070] },
    { x: new Date().getTime() - 20000, y: [65070, 65150, 65050, 65120] }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCandles(prev => {
        const last = prev[prev.length - 1];
        const open = last.y[3]; // Close предыдущей свечи становится Open новой
        const close = open + (Math.random() * 60 - 30);
        const high = Math.max(open, close) + 10;
        const low = Math.min(open, close) - 10;
        
        const newCandle = { x: new Date().getTime(), y: [open, high, low, close] };
        return [...prev.slice(-15), newCandle];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container" style={{ background: '#000', color: '#fff', minHeight: '100vh' }}>
      <div className="header" style={{ padding: '20px', fontSize: '24px', textAlign: 'center' }}>
        💰 {Math.floor(balance)}
      </div>

      <main>
        {tab === 'home' && (
          <div style={{ textAlign: 'center', paddingTop: '50px' }}>
            <div style={{ fontSize: '120px', cursor: 'pointer' }} onClick={() => setBalance(b => b + 1)}>🐹</div>
            <p>Жми на хомяка!</p>
          </div>
        )}

        {tab === 'trade' && (
          <div style={{ padding: '10px' }}>
            <h3 style={{ textAlign: 'center', color: '#00ff88' }}>BTC / USD (Свечной график)</h3>
            <div style={{ background: '#111', borderRadius: '10px', padding: '5px' }}>
              <Chart 
                options={{
                  chart: { type: 'candlestick', toolbar: { show: false }, background: 'transparent' },
                  theme: { mode: 'dark' },
                  xaxis: { type: 'datetime', labels: { show: false } },
                  yaxis: { tooltip: { enabled: true } },
                  plotOptions: { 
                    candlestick: { 
                      colors: { upward: '#00ff88', downward: '#ff4d4d' }, // ТУТ ЗАДАЕМ ЦВЕТА СВЕЧЕЙ
                      wick: { useFillColor: true } 
                    } 
                  }
                }}
                series={[{ name: 'BTC', data: candles }]}
                type="candlestick"
                height={300}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button style={{ flex: 1, padding: '15px', background: '#00ff88', border: 'none', fontWeight: 'bold' }} onClick={() => setBalance(b => b - 100)}>ВВЕРХ</button>
              <button style={{ flex: 1, padding: '15px', background: '#ff4d4d', border: 'none', color: '#fff', fontWeight: 'bold' }} onClick={() => setBalance(b => b - 100)}>ВНИЗ</button>
            </div>
          </div>
        )}
      </main>

      <nav style={{ position: 'fixed', bottom: 0, width: '100%', display: 'flex', background: '#111' }}>
        <button onClick={() => setTab('home')} style={{ flex: 1, padding: '15px', color: tab==='home'?'#f1c40f':'#fff' }}>Игра</button>
        <button onClick={() => setTab('trade')} style={{ flex: 1, padding: '15px', color: tab==='trade'?'#f1c40f':'#fff' }}>БИРЖА</button>
      </nav>
    </div>
  );
}

export default App;
