

import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const EXCHANGES = [
  { id: '1inch', name: '1inch', color: '#2f8af5' },
  { id: 'uniswap', name: 'Uniswap v3', color: '#ff007a' },
  { id: 'sushiswap', name: 'SushiSwap', color: '#fa52a0' },
  { id: 'pancakeswap', name: 'PancakeSwap', color: '#d1884f' }
];

const COIN_LIST = ['TON', 'ETH', 'SOL', 'BNB', 'ARB'];

function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 100);
  const [activeTab, setActiveTab] = useState('mining'); 
  const [selectedDex, setSelectedDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [inventory, setInventory] = useState({});
  const [tapAnims, setTapAnims] = useState([]);

  // Звук
  const tapSound = useRef(new Audio('https://www.soundjay.com/buttons/sounds/button-37a.mp3'));

  useEffect(() => { localStorage.setItem('k_bal', balance); }, [balance]);

  // Сигналы
  useEffect(() => {
    const generate = () => {
      const b = EXCHANGES[Math.floor(Math.random()*4)];
      let s = EXCHANGES[Math.floor(Math.random()*4)];
      while(b.id === s.id) s = EXCHANGES[Math.floor(Math.random()*4)];
      setSignal({ coin: COIN_LIST[Math.floor(Math.random()*5)], buy: b.id, sell: s.id, profit: (Math.random()*3 + 1.2).toFixed(2) });
    };
    generate();
    const timer = setInterval(generate, 25000);
    return () => clearInterval(timer);
  }, []);

  const handleTap = (e) => {
    setBalance(b => b + 0.01);
    tapSound.current.currentTime = 0;
    tapSound.current.play().catch(()=>{});
    const id = Date.now();
    setTapAnims([...tapAnims, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setTapAnims(prev => prev.filter(a => a.id !== id)), 800);
  };

  const trade = (coin, type) => {
    if (type === 'buy') {
      if (balance >= 50) {
        setBalance(b => b - 50);
        setInventory(prev => ({ ...prev, [coin]: (prev[coin] || 0) + 1 }));
      }
    } else {
      if (inventory[coin] > 0) {
        let price = 50;
        if (signal && selectedDex === signal.sell && coin === signal.coin) {
          price = 50 * (1 + parseFloat(signal.profit)/100);
        } else { price = 50 * 0.96; }
        setBalance(b => b + price);
        setInventory(prev => ({ ...prev, [coin]: prev[coin] - 1 }));
      }
    }
  };

  return (
    <div className="app-wrapper">
      <header className="header">
        <div className="logo-text">Kross-DEX</div>
        <div className="balance-box">
          <small>Balance</small><br/>
          <b>${balance.toFixed(2)}</b>
        </div>
      </header>

      <main className="main-viewport">
        {activeTab === 'mining' && (
          <div className="mining-zone">
            <div className="tap-circle" onClick={handleTap}>
              $
              {tapAnims.map(a => <span key={a.id} className="tap-particle" style={{left: a.x, top: a.y}}>+$0.01</span>)}
            </div>
          </div>
        )}

        {activeTab === 'kross' && (
          <div className="kross-view">
            {signal && (
              <div className="signal-alert">
                ⚡ <b>SIGNAL:</b> Buy <b>{signal.coin}</b> on <span style={{color:'#00ccff'}}>{signal.buy}</span> ➔ Sell on <span style={{color:'#ff9900'}}>{signal.sell}</span> (+{signal.profit}%)
              </div>
            )}

            {!selectedDex ? (
              <div className="dex-grid-list">
                {EXCHANGES.map(dex => (
                  <div key={dex.id} className="dex-card-item" style={{borderLeftColor: dex.color}} onClick={() => setSelectedDex(dex.id)}>
                    <b>{dex.name}</b> <span>➔</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="terminal">
                <div className="terminal-header">
                  <button className="btn-back" onClick={() => setSelectedDex(null)}>←</button>
                  <h3 style={{margin:0, textTransform:'uppercase'}}>{selectedDex}</h3>
                </div>
                <div className="market-table">
                  {COIN_LIST.map(c => (
                    <div key={c} className="market-row">
                      <span>{c}/USDT</span>
                      <div className="btns">
                        <button className="btn-buy" onClick={() => trade(c, 'buy')}>BUY</button>
                        <button className="btn-sell" onClick={() => trade(c, 'sell')} disabled={!inventory[c]}>SELL ({inventory[c]||0})</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button className={`nav-item ${activeTab==='mining'?'active':''}`} onClick={()=>{setActiveTab('mining'); setSelectedDex(null)}}>Mining</button>
        <button className={`nav-item ${activeTab==='kross'?'active':''}`} onClick={()=>setActiveTab('kross')}>Kross-DEX</button>
        <button className={`nav-item ${activeTab==='settings'?'active':''}`} onClick={()=>setActiveTab('settings')}>Settings</button>
      </nav>
    </div>
  );
}
export default App;
