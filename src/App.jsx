


import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const DEX_LIST = [
  { id: '1inch', color: '#2f8af5' },
  { id: 'Uniswap', color: '#ff007a' },
  { id: 'SushiSwap', color: '#fa52a0' },
  { id: 'PancakeSwap', color: '#d1884f' }
];

const TOKENS = ['TON', 'ETH', 'SOL', 'BNB', 'ARB'];

function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('kross_bal')) || 100);
  const [tab, setTab] = useState('mining');
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Настройки
  const [soundEnabled, setSoundEnabled] = useState(() => JSON.parse(localStorage.getItem('kross_sound')) ?? true);
  const [clicks, setClicks] = useState([]); // Для анимации вылетающих долларов
  
  const audioRef = useRef(new Audio('https://www.soundjay.com/buttons/sounds/button-37a.mp3'));

  useEffect(() => {
    localStorage.setItem('kross_bal', balance);
    localStorage.setItem('kross_sound', JSON.stringify(soundEnabled));
  }, [balance, soundEnabled]);

  // Генератор сигналов
  useEffect(() => {
    const generateSignal = () => {
      if (tab !== 'kross') return;
      const token = TOKENS[Math.floor(Math.random() * TOKENS.length)];
      const buyDex = DEX_LIST[Math.floor(Math.random() * DEX_LIST.length)];
      let sellDex = DEX_LIST[Math.floor(Math.random() * DEX_LIST.length)];
      while (buyDex.id === sellDex.id) sellDex = DEX_LIST[Math.floor(Math.random() * DEX_LIST.length)];
      setSignal({ token, buyFrom: buyDex.id, sellTo: sellDex.id, spread: (Math.random() * 3 + 0.5).toFixed(2), timeLeft: 15 });
    };
    generateSignal();
    const interval = setInterval(generateSignal, 15000);
    return () => clearInterval(interval);
  }, [tab]);

  const handleTap = (e) => {
    setBalance(prev => prev + 0.01);
    
    // Звук
    if (soundEnabled) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }

    // Анимация доллара
    const id = Date.now();
    const newClick = { id, x: e.clientX, y: e.clientY };
    setClicks(prev => [...prev, newClick]);
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 800);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">Kross-DEX</div>
        <div className="balance-display">
          <small>AVAILABLE USD</small>
          <h2>${balance.toFixed(2)}</h2>
        </div>
      </header>

      <main className="main-content">
        {tab === 'mining' && (
          <div className="mining-tab">
            <div className="tap-area" onClick={handleTap}>
              <div className="dollar-icon">$</div>
              {clicks.map(click => (
                <span key={click.id} className="floating-dollar" style={{ left: click.x - 20, top: click.y - 40 }}>+$0.01</span>
              ))}
            </div>
            <p>Нажимай на доллар!</p>
          </div>
        )}

        {tab === 'kross' && (
          <div className="kross-dex-tab">
            {signal ? (
              <div className="signal-box">
                <div className="signal-header"><span>LIVE SIGNAL</span><span>{signal.timeLeft}s</span></div>
                <div className="route">
                  <div className="node"><small>BUY</small><br/>{signal.buyFrom}</div>
                  <div className="arrow">➔</div>
                  <div className="node"><small>SELL</small><br/>{signal.sellTo}</div>
                </div>
                <div className="profit-est">Profit: <span style={{color: '#3fb950'}}>+{signal.spread}%</span></div>
                <button className="trade-btn" onClick={() => {
                  setIsProcessing(true);
                  setTimeout(() => { setBalance(b => b + (100 * (signal.spread/100))); setIsProcessing(false); setSignal(null); }, 2000);
                }} disabled={isProcessing}>{isProcessing ? 'Swapping...' : 'CONFIRM SWAP'}</button>
              </div>
            ) : <div className="searching">Searching...</div>}
          </div>
        )}

        {tab === 'settings' && (
          <div className="settings-tab">
            <h3>Настройки</h3>
            <div className="setting-item">
              <span>Звук клика</span>
              <button className={`toggle ${soundEnabled ? 'on' : ''}`} onClick={() => setSoundEnabled(!soundEnabled)}>
                {soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}
              </button>
            </div>
            <div className="creator-link">
              <p>Создатели проекта:</p>
              <a href="https://t.me/kriptoalians" target="_blank" rel="noreferrer">@kriptoalians</a>
            </div>
          </div>
        )}
      </main>

      <nav className="navbar">
        <button className={tab === 'mining' ? 'active' : ''} onClick={() => setTab('mining')}>Mining</button>
        <button className={tab === 'kross' ? 'active' : ''} onClick={() => setTab('kross')}>Kross-DEX</button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Settings</button>
      </nav>
    </div>
  );
}

export default App;
