

import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const EXCHANGES = [
  { id: '1inch', name: '1inch', color: '#2f8af5' },
  { id: 'uniswap', name: 'Uniswap v3', color: '#ff007a' },
  { id: 'sushiswap', name: 'SushiSwap', color: '#fa52a0' },
  { id: 'pancakeswap', name: 'PancakeSwap', color: '#d1884f' }
];

const COINS = ['TON', 'ETH', 'SOL', 'BNB', 'ARB'];

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 100);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
  const [lang, setLang] = useState('RU');
  const [tab, setTab] = useState('mining');
  const [selectedDex, setSelectedDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [inventory, setInventory] = useState({});
  const [isPending, setIsPending] = useState(false);
  const [statusText, setStatusText] = useState('');

  // Сохранение данных
  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
  }, [balance, xp]);

  // Генератор сигналов
  useEffect(() => {
    const gen = () => {
      const b = EXCHANGES[Math.floor(Math.random() * 4)];
      let s = EXCHANGES[Math.floor(Math.random() * 4)];
      while(b.id === s.id) s = EXCHANGES[Math.floor(Math.random() * 4)];
      setSignal({ coin: COINS[Math.floor(Math.random() * 5)], buy: b.id, sell: s.id, profit: (Math.random() * 3 + 1.5).toFixed(2) });
    };
    gen();
    const timer = setInterval(gen, 20000);
    return () => clearInterval(timer);
  }, []);

  const trade = (coin, type) => {
    if (isPending) return;
    if (type === 'buy' && balance < 50) return alert("Low balance! Need $50");
    if (type === 'sell' && !inventory[coin]) return alert("No coins to sell!");

    setIsPending(true);
    setStatusText(type === 'buy' ? 'CONNECTING TO NODES...' : 'VERIFYING SWAP...');

    setTimeout(() => {
      if (type === 'buy') {
        setBalance(b => b - 50);
        setInventory(prev => ({ ...prev, [coin]: (prev[coin] || 0) + 1 }));
        setStatusText('SUCCESSFULLY BOUGHT!');
      } else {
        let isProfitable = signal && selectedDex === signal.sell && coin === signal.coin;
        let final = isProfitable ? 50 * (1 + parseFloat(signal.profit)/100) : 50 * 0.95;
        setBalance(b => b + final);
        setInventory(prev => ({ ...prev, [coin]: prev[coin] - 1 }));
        if(isProfitable) setXp(x => x + 20);
        setStatusText(isProfitable ? `PROFIT: +$${(final-50).toFixed(2)}` : 'COMMISSION TAKEN -5%');
      }
      setTimeout(() => { setIsPending(false); setStatusText(''); }, 1200);
    }, 2500);
  };

  return (
    <div className="app-container">
      <header className="main-header">
        <div className="user-info">
          <span className="lvl">LVL {Math.floor(xp/100) + 1}</span>
          <div className="xp-bar"><div className="xp-fill" style={{width: `${xp % 100}%`}}></div></div>
        </div>
        <div className="wallet-info">
          <small>MAINNET BALANCE</small>
          <div className="balance-val">${balance.toFixed(2)}</div>
        </div>
      </header>

      <main className="viewport">
        {tab === 'mining' && (
          <div className="mining-page">
            <div className="coin-glow" onClick={() => setBalance(b => b + 0.01)}>$</div>
            <p>TAP TO GENERATE LIQUIDITY</p>
          </div>
        )}

        {tab === 'trade' && (
          <div className="trade-page">
            {signal && (
              <div className="signal-box">
                <div className="pulse-red"></div>
                <span>BUY <b>{signal.coin}</b>: {signal.buy.toUpperCase()} ➔ SELL: {signal.sell.toUpperCase()} (+{signal.profit}%)</span>
              </div>
            )}

            {!selectedDex ? (
              <div className="dex-list">
                {EXCHANGES.map(dex => (
                  <button key={dex.id} className="dex-btn" onClick={() => setSelectedDex(dex.id)} style={{borderLeft: `4px solid ${dex.color}`}}>
                    {dex.name.toUpperCase()} <small>ONLINE</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="terminal-view">
                <button className="back-link" onClick={() => setSelectedDex(null)}>← ALL MARKETS</button>
                <div className="terminal-box">
                   {COINS.map(c => (
                     <div key={c} className="pair-row">
                       <div className="pair-name"><b>{c}</b>/USDT</div>
                       <div className="pair-actions">
                         <button className="buy-sm" onClick={() => trade(c, 'buy')}>BUY</button>
                         <button className="sell-sm" onClick={() => trade(c, 'sell')} disabled={!inventory[c]}>SELL({inventory[c]||0})</button>
                       </div>
                     </div>
                   ))}
                </div>
                {isPending && (
                  <div className="tx-modal">
                    <div className="blockchain-loader"></div>
                    <div className="status-msg">{statusText}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="settings-page">
            <h2>SETTINGS</h2>
            <div className="set-card">
              <div className="set-item"><span>LANGUAGE</span> <div className="lang-sw"><button onClick={()=>setLang('RU')} className={lang==='RU'?'active':''}>RU</button><button onClick={()=>setLang('EN')} className={lang==='EN'?'active':''}>EN</button></div></div>
              <div className="set-item"><span>SOUND</span> <button className="tgl-btn">ON</button></div>
            </div>
            <div className="footer-link">
              <p>Join our community</p>
              <a href="https://t.me/kriptoalians" target="_blank">@kriptoalians</a>
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-bar">
        <button className={tab==='mining'?'active':''} onClick={()=>{setTab('mining'); setSelectedDex(null)}}>MINING</button>
        <button className={tab==='trade'?'active':''} onClick={()=>setTab('trade')}>ARBITRAGE</button>
        <button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}>SETTINGS</button>
      </nav>
    </div>
  );
}
