import React, { useState, useEffect } from 'react';
import './App.css';

const tg = window.Telegram?.WebApp;

function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('hBal')) || 0);
  const [energy, setEnergy] = useState(() => Number(localStorage.getItem('hEn')) || 1000);
  const [tab, setTab] = useState('home');

  // Улучшения
  const [multiTap, setMultiTap] = useState(() => Number(localStorage.getItem('hMulti')) || 1);
  const [energyRegen, setEnergyRegen] = useState(() => Number(localStorage.getItem('hRegen')) || 1);
  
  // Состояние задания (выполнено или нет)
  const [isSubscribed, setIsSubscribed] = useState(() => localStorage.getItem('hSub') === 'true');

  const [clicks, setClicks] = useState([]);

  // Регенерация
  useEffect(() => {
    const timer = setInterval(() => {
      setEnergy(prev => (prev < 1000 ? prev + energyRegen : 1000));
    }, 1500);
    return () => clearInterval(timer);
  }, [energyRegen]);

  // Сохранение
  useEffect(() => {
    localStorage.setItem('hBal', balance);
    localStorage.setItem('hEn', energy);
    localStorage.setItem('hMulti', multiTap);
    localStorage.setItem('hRegen', energyRegen);
    localStorage.setItem('hSub', isSubscribed);
  }, [balance, energy, multiTap, energyRegen, isSubscribed]);

  const handleTap = (e) => {
    if (energy < multiTap) return;
    if (tg) tg.HapticFeedback.impactOccurred('medium');
    setBalance(b => b + multiTap);
    setEnergy(e => e - multiTap);
    const id = Date.now();
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    setClicks(prev => [...prev, { id, x, y }]);
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 800);
  };

  // Логика задания
  const handleQuest = () => {
    if (isSubscribed) return;
    
    // 1. Открываем ссылку на канал
    window.open('https://t.me/kriptoalians', '_blank'); // ЗАМЕНИ НА СВОЙ КАНАЛ

    // 2. Даем награду (например 50,000 монет)
    setTimeout(() => {
      if (!isSubscribed) {
        setBalance(b => b + 50000);
        setIsSubscribed(true);
        if (tg) tg.showAlert('Награда 50,000 USDT получена!');
      }
    }, 2000);
  };

  return (
    <div className="app-container">
      <div className="balance-header">
        <img src="https://cryptologos.cc/logos/tether-usdt-logo.png" width="25" alt="coin" />
        <h1>{Math.floor(balance).toLocaleString()}</h1>
      </div>

      <main className="main-content">
        {tab === 'home' && (
          <div className="home-view">
            <div className="clicker-area" onClick={handleTap}>
              <div className="hamster-circle">🐹</div>
              {clicks.map(c => (
                <div key={c.id} className="tap-text" style={{ left: c.x, top: c.y }}>+{multiTap}</div>
              ))}
            </div>
            <div className="energy-bar-container">
              <div className="energy-info">⚡ {energy} / 1000</div>
              <div className="energy-bg"><div className="energy-fill" style={{ width: `${energy/10}%` }}></div></div>
            </div>
          </div>
        )}

        {tab === 'shop' && (
          <div className="shop-view">
            <h2>Магазин</h2>
            <button className="shop-item" onClick={() => balance >= multiTap * 1000 && (setBalance(b => b - multiTap * 1000), setMultiTap(m => m + 1))}>
              <div>Мульти-тап (Lvl {multiTap})<br/><span>💰 {multiTap * 1000}</span></div>
            </button>
            <button className="shop-item" onClick={() => balance >= energyRegen * 1500 && (setBalance(b => b - energyRegen * 1500), setEnergyRegen(r => r + 1))}>
              <div>Реген (Lvl {energyRegen})<br/><span>💰 {energyRegen * 1500}</span></div>
            </button>
          </div>
        )}

        {tab === 'tasks' && (
          <div className="shop-view">
            <h2>Задания</h2>
            <div className="shop-item" onClick={handleQuest} style={{ opacity: isSubscribed ? 0.6 : 1 }}>
              <div>
                Подпишись на канал<br/>
                <span style={{color: '#f1c40f'}}>Награда: +50,000</span>
              </div>
              <button disabled={isSubscribed}>{isSubscribed ? 'Выполнено' : 'GO'}</button>
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-menu">
        <button onClick={() => setTab('home')} className={tab === 'home' ? 'active' : ''}>🐹 Игра</button>
        <button onClick={() => setTab('shop')} className={tab === 'shop' ? 'active' : ''}>🛒 Магазин</button>
        <button onClick={() => setTab('tasks')} className={tab === 'tasks' ? 'active' : ''}>📋 Задания</button>
      </nav>
    </div>
  );
}

export default App;
