import React, { useState, useEffect } from 'react';
import './App.css';

// Подключаем Telegram SDK для вибрации
const tg = window.Telegram?.WebApp;

function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('hBal')) || 0);
  const [energy, setEnergy] = useState(() => Number(localStorage.getItem('hEn')) || 1000);
  const [clicks, setClicks] = useState([]); // Для анимации +1

  // Система уровней
  const levels = [
    { name: "Новичок 👶", min: 0 },
    { name: "Трейдер 📈", min: 5000 },
    { name: "Инвестор 💰", min: 25000 },
    { name: "Крипто-Лорд 👑", min: 100000 },
    { name: "Миллиардер 💎", min: 1000000 }
  ];

  const currentLevel = [...levels].reverse().find(l => balance >= l.min) || levels[0];

  // Регенерация энергии
  useEffect(() => {
    const timer = setInterval(() => {
      setEnergy(prev => (prev < 1000 ? prev + 1 : 1000));
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  // Автосохранение
  useEffect(() => {
    localStorage.setItem('hBal', balance);
    localStorage.setItem('hEn', energy);
  }, [balance, energy]);

  const handleTap = (e) => {
    if (energy <= 0) return;

    // Вибрация (Haptic Feedback)
    if (tg) tg.HapticFeedback.impactOccurred('medium');

    setBalance(b => b + 1);
    setEnergy(e => e - 1);

    // Добавляем анимацию +1
    const id = Date.now();
    const x = e.clientX || e.touches[0].clientX;
    const y = e.clientY || e.touches[0].clientY;
    
    setClicks(prev => [...prev, { id, x, y }]);
    
    // Удаляем объект анимации через 1 секунду
    setTimeout(() => {
      setClicks(prev => prev.filter(click => click.id !== id));
    }, 800);
  };

  return (
    <div className="app-container">
      <div className="status-bar">
        <div className="level-badge">{currentLevel.name}</div>
        <div className="energy-text">⚡ {energy}/1000</div>
      </div>

      <div className="balance-display">
        <img src="https://cryptologos.cc/logos/tether-usdt-logo.png" width="30" alt="coin" />
        <h1>{balance.toLocaleString()}</h1>
      </div>

      <div className="clicker-section">
        <div className="circle-outer" onClick={handleTap}>
          <div className="circle-inner">
            <span className="hamster-emoji">🐹</span>
          </div>
        </div>

        {/* Рендерим всплывающие +1 */}
        {clicks.map(click => (
          <div key={click.id} className="tap-animation" style={{ left: click.x, top: click.y }}>
            +1
          </div>
        ))}
      </div>

      <div className="progress-container">
        <div className="progress-label">Энергия</div>
        <div className="progress-bg">
          <div className="progress-fill" style={{ width: `${(energy / 1000) * 100}%` }}></div>
        </div>
      </div>
    </div>
  );
}

export default App;
