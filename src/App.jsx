
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
  const [prices, setPrices] = useState({});
  const [sound, setSound] = useState(true);

  const tapSound = useRef(new Audio('https://www.soundjay.com/buttons/sounds/button-37a.mp3'));

  useEffect(() => { localStorage.setItem('k_bal', balance); }, [balance]);

  // Имитация живых цен
  useEffect(() => {
    const interval = setInterval(() => {
      const newPrices = {};
      COIN_LIST.forEach(c => {
        newPrices[c] = (Math.random() * 100 + 5).toFixed(2);
      });
      setPrices(newPrices);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Генератор сигналов
  useEffect(() => {
    const generate = () => {
      const b = EXCHANGES[Math.floor(Math.random()*4)];
      let s = EXCHANGES[Math.floor(Math.random()*4)];
      while(b.id === s.id) s = EXCHANGES[Math.floor(Math.random()*4)];
      setSignal({ coin: COIN_LIST[Math.floor(Math.random()*5)], buy: b.id, sell: s.id, profit: (Math.random()*4 + 1.5).toFixed(2) });
    };
    generate();
    setInterval(generate, 20000);
  }, []);

  const handleTap = (e) => {
    setBalance(b => b + 0.01);
    if(sound) { tapSound.current.currentTime = 0; tapSound.current.play().catch(()=>{}); }
    const id = Date.now();
    setTapAnims([...tapAnims, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setTapAnims(prev => prev.filter(a => a.id !== id)), 700);
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
          document.body.classList.add('profit-flash');
          setTimeout(() => document.body.classList.remove('profit-flash'), 500);
        } else { price = 50 * 0.95; }
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
          <small>AVAILABLE</small><br/>
          <b>${balance.toFixed(2)}</b>
        </div>
      </header>

      <main className="main-viewport">
        {activeTab === 'mining' && (
          <div className="mining-zone">
            <div className="tap-circle" onClick={handleTap}>
              <span className="dollar-main">$</span>
              {tapAnims.map(a => <span key={a.id} className="tap-particle" style={{left: a.x, top: a.y}}>+$0.01</span>)}
            </div>
            <p className="hint">Tap to mine liquidity</p>
          </div>
        )}

        {activeTab === 'kross' && (
          <div className="kross-view">
            {signal && (
              <div className="signal-alert">
                <div className="live-dot"></div>
                <span>HINT: Buy <b>{signal.coin}</b> @ {signal.buy} ➔ Sell @ {signal.sell} <b className="grn">+{signal.profit}%</b></span>
              </div>
            )}

            {!selectedDex ? (
              <div className="dex-grid-list">
                {EXCHANGES.map(dex => (
                  <div key={dex.id} className="dex-card-item" onClick={() => setSelectedDex(dex.id)}>
                    <div className="dex-info">
                      <div className="dex-icon-mini" style={{background: dex.color}}></div>
                      <b>{dex.name}</b>
                    </div>
                    <span className="dex-status">LIVE</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="terminal">
                <div className="terminal-header">
                  <button className="btn-back" onClick={() => setSelectedDex(null)}>← TERMINALS</button>
                  <div className="dex-title" style={{color: EXCHANGES.find(d=>d.id===selectedDex).color}}>{selectedDex}</div>
                </div>
                <div className="market-table">
                  {COIN_LIST.map(c => (
                    <div key={c} className="market-row">
                      <div className="coin-info">
                        <b>{c}/USDT</b>
                        <small className="price-tag">${prices[c] || '0.00'}</small>
                      </div>
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

        {activeTab === 'settings' && (
          <div className="settings-view">
            <h2 className="title">Settings</h2>
            <div className="s-card">
              <div className="s-row">
                <span>Sound Effects</span>
                <button className={`toggle ${sound?'on':''}`} onClick={()=>setSound(!sound)}>{sound?'ON':'OFF'}</button>
              </div>
              <div className="s-row">
                <span>Language</span>
                <div className="lang-group">
                  <button className="active">RU</button><button>EN</button>
                </div>
              </div>
            </div>
            <div className="creators-box">
               <p>Powered by</p>
               <a href="https://t.me/kriptoalians" target="_blank">@kriptoalians</a>
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button className={`nav-item ${activeTab==='mining'?'active':''}`} onClick={()=>{setActiveTab('mining'); setSelectedDex(null)}}>MINING</button>
        <button className={`nav-item ${activeTab==='kross'?'active':''}`} onClick={()=>setActiveTab('kross')}>MARKETS</button>
        <button className={`nav-item ${activeTab==='settings'?'active':''}`} onClick={()=>setActiveTab('settings')}>SETTINGS</button>
      </nav>
    </div>
  );
}
// Добавь эти состояния в основной компонент App
const [isPending, setIsPending] = useState(false); // Состояние ожидания транзакции
const [txStatus, setTxStatus] = useState(''); // Текст статуса

const trade = (coin, type) => {
  if (isPending) return; // Нельзя спамить кнопки во время транзакции

  if (type === 'buy' && balance < 50) {
    alert("Not enough funds!");
    return;
  }
  if (type === 'sell' && (inventory[coin] || 0) <= 0) {
    alert("No coins to sell!");
    return;
  }

  setIsPending(true);
  setTxStatus(type === 'buy' ? 'Purchasing...' : 'Selling...');

  // Имитация работы блокчейна (2.5 секунды)
  setTimeout(() => {
    if (type === 'buy') {
      setBalance(b => b - 50);
      setInventory(prev => ({ ...prev, [coin]: (prev[coin] || 0) + 1 }));
    } else {
      let price = 50;
      // Проверка сигнала
      if (signal && selectedDex === signal.sell && coin === signal.coin) {
        price = 50 * (1 + parseFloat(signal.profit) / 100);
        setTxStatus('PROFIT! +$' + (price - 50).toFixed(2));
      } else {
        price = 50 * 0.94; // Убыток при продаже без сигнала
        setTxStatus('Sold with commission');
      }
      setBalance(b => b + price);
      setInventory(prev => ({ ...prev, [coin]: prev[coin] - 1 }));
    }
    
    // Оставляем сообщение о результате на секунду и закрываем лоадер
    setTimeout(() => {
      setIsPending(false);
      setTxStatus('');
    }, 1000);
  }, 2500);
};

// Вставь этот блок в рендер внутри терминала биржи
{isPending && (
  <div className="tx-overlay">
    <div className="tx-modal">
      <div className="loader-line"></div>
      <p>{txStatus}</p>
    </div>
  </div>
)}
export default App;
