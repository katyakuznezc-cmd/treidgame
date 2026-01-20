import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // Состояния баланса, энергии и вкладок
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('hBal')) || 2541);
  const [energy, setEnergy] = useState(() => Number(localStorage.getItem('hEn')) || 1000);
  const [tab, setTab] = useState('home');
  const [activeSkin, setActiveSkin] = useState('🐹');
  const [lastBonus, setLastBonus] = useState(() => localStorage.getItem('hLastBonus') || 0);

  // Состояния трейдинга
  const [chart, setChart] = useState([40, 55, 45, 70, 60, 85, 75]);
  const [leverage, setLeverage] = useState(1);
  const [bet, setBet] = useState(100);
  const [isTrading, setIsTrading] = useState(false);

  const skins = [
    { id: 'h1', name: 'Хомяк', img: '🐹', req: 0 },
    { id: 'h2', name: 'Кролик', img: '🐰', req: 50000 },
    { id: 'h3', name: 'Лис', img: '🦊', req: 200000 },
    { id: 'h4', name: 'Волк', img: '🐺', req: 1000000 },
    { id: 'h5', name: 'Кит', img: '🐳', req: 5000000 }
  ];

  // Регенерация энергии + Автосохранение
  useEffect(() => {
    const timer = setInterval(() => {
      setEnergy(prev => (prev < 1000 ? prev + 1 : 1000));
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('hBal', balance);
    localStorage.setItem('hEn', energy);
    localStorage.setItem('hLastBonus', lastBonus);
  }, [balance, energy, lastBonus]);

  const handleTap = () => {
    if (energy >= 1) {
      setBalance(b => b + 1);
      setEnergy(e => e - 1);
    }
  };

  const claimBonus = () => {
    const now = Date.now();
    if (now - lastBonus > 86400000) {
      setBalance(b => b + 5000);
      setLastBonus(now);
      alert('🎁 +5,000 монет!');
    } else {
      alert('⏳ Бонус доступен раз в 24 часа');
    }
  };

  const startTrade = (dir) => {
    if (balance < bet || isTrading) return;
    setIsTrading(true);
    setBalance(b => b - bet);
    
    setTimeout(() => {
      const last = chart[chart.length - 1];
      const win = Math.random() > 0.5;
      const diff = 15;
      const next = win ? (dir === 'up' ? last + diff : last - diff) : (dir === 'up' ? last - diff : last + diff);
      
      setChart([...chart.slice(1), Math.max(10, Math.min(90, next))]);
      if (win) setBalance(b => b + (bet * (1 + leverage * 0.5)));
      setIsTrading(false);
    }, 1000);
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="brand-group">
          <h1 className="logo">KRYPTOALIANS</h1>
          <div className="energy-pill">⚡ {energy}/1000</div>
        </div>
        <div className="balance-card">🪙 {Math.floor(balance).toLocaleString()}</div>
      </header>

      <main className="content">
        {tab === 'home' && (
          <div className="view-home animate-in">
            <div className="main-clicker" onClick={handleTap}>
              <div className="ring-outer">
                <div className="ring-inner">{activeSkin}</div>
              </div>
            </div>
            <button className="bonus-btn" onClick={claimBonus}>🎁 DAILY REWARD</button>
            <div className="energy-system">
              <div className="progress-bg"><div className="progress-fill" style={{width: `${energy/10}%`}}></div></div>
              <span>Recovery Active</span>
            </div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="view-trade animate-in">
            <div className="chart-container">
              <div className="chart-header">BTC/USD · 1m</div>
              <div className="candles-area">
                {chart.map((h, i) => (
                  <div key={i} className="candle-col">
                    <div className={`candle-bar ${h > (chart[i-1] || 0) ? 'up' : 'down'}`} style={{height: `${h}%`}}></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="trade-ui">
              <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} className="bet-field" />
              <div className="lev-grid">
                {[1, 10, 50, 100].map(x => (
                  <button key={x} className={leverage === x ? 'active' : ''} onClick={() => setLeverage(x)}>x{x}</button>
                ))}
              </div>
              <div className="action-grid">
                <button className="buy" onClick={() => startTrade('up')} disabled={isTrading}>LONG</button>
                <button className="sell" onClick={() => startTrade('down')} disabled={isTrading}>SHORT</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'inventory' && (
          <div className="view-list animate-in">
            <h2 className="section-title">SKINS</h2>
            <div className="items-grid">
              {skins.map(s => (
                <div key={s.id} className={`item-card ${balance < s.req ? 'lock' : ''} ${activeSkin === s.img ? 'select' : ''}`}
                     onClick={() => balance >= s.req && setActiveSkin(s.img)}>
                  <span className="item-emoji">{s.img}</span>
                  <div className="item-meta">
                    <b>{s.name}</b>
                    <p>{balance < s.req ? `Cost: ${s.req/1000}k` : 'Unlocked'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'menu' && (
          <div className="view-menu animate-in">
            <h2 className="section-title">SETTINGS</h2>
            <div className="menu-row"><span>Language</span> <button className="mini-btn">RU</button></div>
            <div className="menu-row"><span>Haptic Feedback</span> <button className="mini-btn">ON</button></div>
            <div className="credits-area">
              <p>Developed by</p>
              <h3 className="glow-text">KRYPTOALIANS</h3>
            </div>
          </div>
        )}
      </main>

      <nav className="navbar">
        <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>🏠<span>HOME</span></button>
        <button className={tab === 'trade' ? 'active' : ''} onClick={() => setTab('trade')}>📊<span>TRADE</span></button>
        <button className={tab === 'inventory' ? 'active' : ''} onClick={() => setTab('inventory')}>🦊<span>SKINS</span></button>
        <button className={tab === 'menu' ? 'active' : ''} onClick={() => setTab('menu')}>⚙️<span>MENU</span></button>
      </nav>
    </div>
  );
}
export default App;
