import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const EXCHANGES = [
  { id: '1inch', name: '1inch', color: '#00ccff' },
  { id: 'uniswap', name: 'Uniswap v3', color: '#ff007a' },
  { id: 'sushiswap', name: 'SushiSwap', color: '#fa52a0' },
  { id: 'pancakeswap', name: 'PancakeSwap', color: '#d1884f' }
];

const ALL_COINS = [
  { id: 'TON', lvl: 1, base: 5.4 }, { id: 'ARB', lvl: 1, base: 1.1 },
  { id: 'DOGE', lvl: 2, base: 0.15 }, { id: 'MATIC', lvl: 3, base: 0.7 },
  { id: 'ETH', lvl: 4, base: 3400 }, { id: 'SOL', lvl: 5, base: 145 },
  { id: 'BNB', lvl: 8, base: 580 }, { id: 'BTC', lvl: 10, base: 67000 }
];

const translations = {
  RU: {
    mining: 'Майнинг', arbitrage: 'Биржи', settings: 'Опции',
    balance: 'КОШЕЛЕК', lvl: 'УРОВЕНЬ', tap: 'МАЙНИНГ',
    buy: 'BUY', sell: 'SELL', back: '← НАЗАД', amount: 'Сумма:',
    leverage: 'Плечо:', profit: 'ПРОФИТ', loss: 'ЛИКВИДАЦИЯ'
  },
  EN: {
    mining: 'Mining', arbitrage: 'Exchanges', settings: 'Options',
    balance: 'WALLET', lvl: 'LEVEL', tap: 'MINING',
    buy: 'BUY', sell: 'SELL', back: '← BACK', amount: 'Amount:',
    leverage: 'Leverage:', profit: 'PROFIT', loss: 'LOSS'
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
  const [isShaking, setIsShaking] = useState(false);
  
  // Состояние для живых цен
  const [livePrices, setLivePrices] = useState({});

  const tapAudio = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));
  const currentLvl = Math.floor(Math.sqrt(xp / 50)) + 1;
  const progress = ((xp % 100) / 100) * 100;
  const t = translations[lang] || translations.EN;

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
    localStorage.setItem('k_lang', lang);
    localStorage.setItem('k_snd', soundOn);
  }, [balance, xp, lang, soundOn]);

  // Эффект живых цен
  useEffect(() => {
    const interval = setInterval(() => {
      const newPrices = {};
      ALL_COINS.forEach(c => {
        const volatility = c.base * 0.002; 
        const change = (Math.random() - 0.5) * volatility;
        newPrices[c.id] = (c.base + change).toFixed(c.base < 1 ? 4 : 2);
      });
      setLivePrices(newPrices);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const gen = () => {
      const available = ALL_COINS.filter(c => c.lvl <= currentLvl);
      const coin = available[Math.floor(Math.random() * available.length)];
      const b = EXCHANGES[Math.floor(Math.random() * 4)];
      let s = EXCHANGES[Math.floor(Math.random() * 4)];
      while(b.id === s.id) s = EXCHANGES[Math.floor(Math.random() * 4)];
      setSignal({ 
        coin: coin.id, buy: b.id, sell: s.id, 
        profit: (Math.random() * 1.5 + 2.5).toFixed(2), 
        expires: Date.now() + 120000 
      });
    };
    gen();
    const timer = setInterval(gen, 120000);
    return () => clearInterval(timer);
  }, [currentLvl]);

  const enterFull = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
  };

  const handleTap = (e) => {
    enterFull();
    setBalance(b => b + 0.05);
    if (soundOn) {
      tapAudio.current.currentTime = 0;
      tapAudio.current.play().catch(() => {});
    }
    const id = Date.now();
    const touch = e.touches ? e.touches[0] : e;
    setTapAnims([...tapAnims, { id, x: touch.clientX, y: touch.clientY }]);
    setTimeout(() => setTapAnims(prev => prev.filter(a => a.id !== id)), 800);
  };

  const trade = (coinId, type) => {
    const amt = parseFloat(tradeAmount);
    if (!amt || amt <= 0 || (type === 'buy' && amt > balance)) return;

    setIsPending(true);
    setStatusText(type === 'buy' ? 'EXECUTING...' : 'SWAPPING...');

    setTimeout(() => {
      if (type === 'buy') {
        setBalance(b => b - amt);
        setInventory(prev => ({ ...prev, [coinId]: (prev[coinId] || 0) + (amt * leverage) }));
        setIsPending(false);
      } else {
        const posSize = inventory[coinId] || 0;
        const isWin = signal && selectedDex === signal.sell && coinId === signal.coin && Date.now() < signal.expires;
        const change = isWin ? (parseFloat(signal.profit) / 100) : -0.15;
        const final = Math.max(0, (posSize / leverage) + (posSize * change));
        
        setBalance(b => b + final);
        setInventory(prev => ({ ...prev, [coinId]: 0 }));
        
        if (isWin) {
          setXp(x => x + 40);
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);
        }
        setIsPending(false);
        setTradeAmount('');
      }
    }, 1000);
  };

  return (
    <div className={`app-container ${isShaking ? 'shake-anim' : ''}`}>
      {tapAnims.map(a => <div key={a.id} className="tap-dollar" style={{left: a.x, top: a.y}}>$</div>)}
      
      <header className="main-header">
        <div className="lvl-info">
          <span>LVL {currentLvl}</span>
          <div className="xp-mini"><div className="xp-fill" style={{width: `${progress}%`}}></div></div>
        </div>
        <div className="balance-box">
          <div className="bal-val">${balance.toFixed(2)}</div>
        </div>
      </header>

      <main className="content">
        {tab === 'mining' && (
          <div className="page-mining">
            <div className="tap-circle neon-glow" onClick={handleTap}>$</div>
            <p className="neon-text">{t.tap}</p>
          </div>
        )}

        {tab === 'trade' && (
          <div className="page-trade">
            {signal && (
              <div className="signal-box">
                <div className="s-timer"></div>
                <span>{signal.coin} | {signal.buy} ➔ {signal.sell} <b className="grn">+{signal.profit}%</b></span>
              </div>
            )}

            {!selectedDex ? (
              <div className="dex-list">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="dex-card" onClick={() => setSelectedDex(d.id)} style={{borderColor: d.color}}>
                    <span style={{color: d.color}}>{d.name}</span>
                    <small>ONLINE</small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dex-terminal">
                <div className="term-header">
                  <button onClick={() => setSelectedDex(null)} className="back-btn">{t.back}</button>
                  <div className="term-inputs">
                    <input type="number" placeholder="Amt" value={tradeAmount} onChange={e=>setTradeAmount(e.target.value)} />
                    <div className="lev-row">
                      <span>x{leverage}</span>
                      <input type="range" min="1" max="100" value={leverage} onChange={e=>setLeverage(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="coin-list">
                  {ALL_COINS.map(c => {
                    const locked = c.lvl > currentLvl;
                    return (
                      <div key={c.id} className={`coin-item ${locked ? 'is-locked' : ''}`}>
                        <div className="c-name">
                          <b>{c.id}</b>
                          <span className="live-price">${livePrices[c.id] || c.base}</span>
                        </div>
                        {!locked ? (
                          <div className="c-actions">
                            <button className="btn-buy" onClick={() => trade(c.id, 'buy')}>{t.buy}</button>
                            <button className="btn-sell" onClick={() => trade(c.id, 'sell')} disabled={!inventory[c.id]}>{t.sell}</button>
                          </div>
                        ) : <div className="lock-tag">LVL {c.lvl}</div>}
                      </div>
                    );
                  })}
                </div>
                {isPending && <div className="loader-ovl"><div className="spinner"></div><p>{statusText}</p></div>}
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="page-settings">
            <h3 className="neon-text-blue">{t.settings}</h3>
            <div className="set-card">
               <div className="set-row"><span>{t.sound}</span><button onClick={()=>setSoundOn(!soundOn)}>{soundOn?'ON':'OFF'}</button></div>
               <div className="set-row"><span>{t.lang}</span><button onClick={()=>setLang(lang==='RU'?'EN':'RU')}>{lang}</button></div>
            </div>
            <a href="https://t.me/kriptoalians" target="_blank" className="tg-link">@KRIPTOALIANS</a>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button className={tab==='mining'?'active':''} onClick={()=>setTab('mining')}>{t.mining}</button>
        <button className={tab==='trade'?'active':''} onClick={()=>setTab('trade')}>{t.arbitrage}</button>
        <button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}>{t.settings}</button>
      </nav>
    </div>
  );
}
