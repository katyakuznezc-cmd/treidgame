

import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const EXCHANGES = [
  { id: '1inch', name: '1inch', color: '#00ccff' },
  { id: 'uniswap', name: 'Uniswap v3', color: '#ff007a' },
  { id: 'sushiswap', name: 'SushiSwap', color: '#fa52a0' },
  { id: 'pancakeswap', name: 'PancakeSwap', color: '#d1884f' }
];

const ALL_COINS = [
  { id: 'TON', lvl: 1 }, { id: 'ARB', lvl: 1 },
  { id: 'ETH', lvl: 2 }, { id: 'SOL', lvl: 3 },
  { id: 'BNB', lvl: 4 }, { id: 'BTC', lvl: 5 }
];

const translations = {
  RU: {
    mining: 'Майнинг', arbitrage: 'Биржи', settings: 'Опции',
    balance: 'КОШЕЛЕК', lvl: 'УРОВЕНЬ', xp: 'ОПЫТ',
    tap: 'ЖМИ НА МОНЕТУ!', buy: 'КУПИТЬ', sell: 'ПРОДАТЬ',
    back: '← НАЗАД', sound: 'ЗВУК', lang: 'ЯЗЫК',
    amount: 'Сумма:', leverage: 'Плечо:', 
    pendingBuy: 'ОТКРЫТИЕ...', pendingSell: 'ЗАКРЫТИЕ...',
    profit: 'ПРИБЫЛЬ', loss: 'ЛИКВИДАЦИЯ', unlock: 'Нужен уровень'
  },
  EN: {
    mining: 'Mining', arbitrage: 'Exchanges', settings: 'Options',
    balance: 'WALLET', lvl: 'LEVEL', xp: 'XP',
    tap: 'TAP THE COIN!', buy: 'BUY', sell: 'SELL',
    back: '← BACK', sound: 'SOUND', lang: 'LANGUAGE',
    amount: 'Amount:', leverage: 'Leverage:',
    pendingBuy: 'OPENING...', pendingSell: 'CLOSING...',
    profit: 'PROFIT', loss: 'LIQUIDATED', unlock: 'Level required'
  }
};

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 100);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
  const [lang, setLang] = useState(() => localStorage.getItem('k_lang') || 'RU');
  const [soundOn, setSoundOn] = useState(() => JSON.parse(localStorage.getItem('k_snd') ?? 'true'));
  const [tab, setTab] = useState('mining');
  const [selectedDex, setSelectedDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [inventory, setInventory] = useState({});
  const [isPending, setIsPending] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [tradeAmount, setTradeAmount] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [tapAnims, setTapAnims] = useState([]);

  // Звук клика (используем стабильную ссылку)
  const tapAudio = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));
  
  const currentLvl = Math.floor(xp / 100) + 1;
  const t = translations[lang] || translations.EN;

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
    localStorage.setItem('k_lang', lang);
    localStorage.setItem('k_snd', soundOn);
  }, [balance, xp, lang, soundOn]);

  useEffect(() => {
    const gen = () => {
      const available = ALL_COINS.filter(c => c.lvl <= currentLvl);
      const coin = available[Math.floor(Math.random() * available.length)];
      const b = EXCHANGES[Math.floor(Math.random() * 4)];
      let s = EXCHANGES[Math.floor(Math.random() * 4)];
      while(b.id === s.id) s = EXCHANGES[Math.floor(Math.random() * 4)];
      setSignal({ 
        coin: coin.id, buy: b.id, sell: s.id, 
        profit: (Math.random() * 2 + 2).toFixed(2), 
        expires: Date.now() + 120000 
      });
    };
    gen();
    const timer = setInterval(gen, 120000);
    return () => clearInterval(timer);
  }, [currentLvl]);

  const handleTap = (e) => {
    setBalance(b => b + 0.10);
    
    // Воспроизведение звука
    if (soundOn) {
      tapAudio.current.currentTime = 0;
      tapAudio.current.play().catch(err => console.log("Sound block:", err));
    }

    // Анимация доллара
    const id = Date.now();
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    setTapAnims([...tapAnims, { id, x, y }]);
    setTimeout(() => setTapAnims(prev => prev.filter(a => a.id !== id)), 800);
  };

  const trade = (coinId, type) => {
    const amt = parseFloat(tradeAmount);
    if (!amt || amt <= 0 || (type === 'buy' && amt > balance)) return alert("Check amount!");
    if (isPending) return;

    setIsPending(true);
    setStatusText(type === 'buy' ? t.pendingBuy : t.pendingSell);

    setTimeout(() => {
      if (type === 'buy') {
        setBalance(b => b - amt);
        const positionSize = amt * leverage;
        setInventory(prev => ({ ...prev, [coinId]: (prev[coinId] || 0) + positionSize }));
      } else {
        const posSize = inventory[coinId] || 0;
        if (posSize <= 0) { setIsPending(false); return; }
        
        const isWin = signal && selectedDex === signal.sell && coinId === signal.coin && Date.now() < signal.expires;
        const changePercent = isWin ? (parseFloat(signal.profit) / 100) : -0.08;
        const result = (posSize / leverage) + (posSize * changePercent);
        
        const finalPayout = Math.max(0, result);
        setBalance(b => b + finalPayout);
        setInventory(prev => ({ ...prev, [coinId]: 0 }));
        
        if (isWin) {
          setXp(x => x + 50);
          setStatusText(`${t.profit} +$${(finalPayout - (posSize/leverage)).toFixed(2)}`);
        } else {
          setStatusText(finalPayout === 0 ? t.loss : 'FEE PAID');
        }
      }
      setTimeout(() => { setIsPending(false); setStatusText(''); setTradeAmount(''); }, 1200);
    }, 1500);
  };

  return (
    <div className="app-container">
      {tapAnims.map(a => <div key={a.id} className="tap-dollar" style={{left: a.x, top: a.y}}>$</div>)}
      
      <header className="main-header neon-border-bottom">
        <div className="lvl-section">
          <div className="lvl-badge">{t.lvl} {currentLvl}</div>
          <div className="xp-track"><div className="xp-bar" style={{width: `${xp % 100}%`}}></div></div>
        </div>
        <div className="bal-section">
          <small className="neon-text-blue">{t.balance}</small>
          <div className="bal-amt">${balance.toFixed(2)}</div>
        </div>
      </header>

      <main className="viewport">
        {tab === 'mining' && (
          <div className="mining-page">
            <div className="coin-wrapper">
              <div className="main-coin neon-circle-big" onClick={handleTap}>
                <span className="coin-symbol">$</span>
              </div>
            </div>
            <h2 className="neon-text-green">{t.tap}</h2>
          </div>
        )}

        {tab === 'trade' && (
          <div className="trade-page">
            {signal && (
              <div className="signal-card neon-border">
                <div className="signal-timer"></div>
                <span>{signal.coin} | {signal.buy.toUpperCase()} ➔ {signal.sell.toUpperCase()} <b className="grn">+{signal.profit}%</b></span>
              </div>
            )}

            {!selectedDex ? (
              <div className="dex-menu">
                {EXCHANGES.map(dex => (
                  <button key={dex.id} className="dex-item neon-hover" onClick={() => setSelectedDex(dex.id)} style={{borderColor: dex.color}}>
                    <span style={{color: dex.color}}>{dex.name}</span> <small>LIVE</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="terminal">
                <div className="terminal-controls neon-border">
                  <button className="back-btn" onClick={() => setSelectedDex(null)}>{t.back}</button>
                  <div className="trade-inputs">
                    <input type="number" placeholder={t.amount} value={tradeAmount} onChange={(e)=>setTradeAmount(e.target.value)} />
                    <div className="lev-control">
                      <span>x{leverage}</span>
                      <input type="range" min="1" max="100" value={leverage} onChange={(e)=>setLeverage(e.target.value)} />
                    </div>
                  </div>
                </div>
                
                <div className="coin-grid">
                  {ALL_COINS.map(c => {
                    const locked = c.lvl > currentLvl;
                    return (
                      <div key={c.id} className={`coin-row ${locked ? 'locked' : ''}`}>
                        <div className="c-info">
                          <b>{c.id}</b>
                          {locked ? <small>LVL {c.lvl}</small> : <small>${inventory[c.id]?.toFixed(0) || 0}</small>}
                        </div>
                        {!locked && (
                          <div className="c-btns">
                            <button className="buy-b neon-btn-green" onClick={() => trade(c.id, 'buy')}>{t.buy}</button>
                            <button className="sell-b neon-btn-red" onClick={() => trade(c.id, 'sell')}>{t.sell}</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {isPending && <div className="tx-screen"><div className="spin-loader"></div><p className="neon-text-blue">{statusText}</p></div>}
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="settings-page">
            <h2 className="neon-text-blue">{t.settings}</h2>
            <div className="option-box neon-border">
              <div className="option"><span>{t.sound}</span><button className={`tgl ${soundOn?'on':''}`} onClick={()=>setSoundOn(!soundOn)}>{soundOn?'ON':'OFF'}</button></div>
              <div className="option"><span>{t.lang}</span><div className="lang-picks">
                <button onClick={()=>setLang('RU')} className={lang==='RU'?'active':''}>RU</button>
                <button onClick={()=>setLang('EN')} className={lang==='EN'?'active':''}>EN</button>
              </div></div>
            </div>
            <div className="creators">
               <a href="https://t.me/kriptoalians" target="_blank" className="neon-text-green">@KRIPTOALIANS</a>
            </div>
          </div>
        )}
      </main>

      <nav className="nav-bar neon-border-top">
        <button className={tab==='mining'?'active':''} onClick={()=>{setTab('mining'); setSelectedDex(null)}}>{t.mining}</button>
        <button className={tab==='trade'?'active':''} onClick={()=>setTab('trade')}>{t.arbitrage}</button>
        <button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}>{t.settings}</button>
      </nav>
    </div>
  );
}
