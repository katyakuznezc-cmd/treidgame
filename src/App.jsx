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
    balance: 'БАЛАНС', lvl: 'УРОВЕНЬ', tap: 'МАЙНИНГ',
    buy: 'ОТКРЫТЬ', sell: 'ЗАКРЫТЬ', back: '← НАЗАД', amount: 'Сумма:',
    leverage: 'Плечо:', profit: 'ПРОФИТ', loss: 'УБЫТОК', pos: 'В СДЕЛКЕ:'
  },
  EN: {
    mining: 'Mining', arbitrage: 'Exchanges', settings: 'Options',
    balance: 'BALANCE', lvl: 'LEVEL', tap: 'MINING',
    buy: 'OPEN', sell: 'CLOSE', back: '← BACK', amount: 'Amount:',
    leverage: 'Leverage:', profit: 'PROFIT', loss: 'LOSS', pos: 'IN TRADE:'
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
  const [activePositions, setActivePositions] = useState({}); // Храним залог сделки
  const [isPending, setIsPending] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [tradeAmount, setTradeAmount] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [tapAnims, setTapAnims] = useState([]);
  const [isShaking, setIsShaking] = useState(false);
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
        profit: (Math.random() * 2 + 3).toFixed(2), 
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

  const openPosition = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (!amt || amt <= 0) return alert("Введите сумму");
    if (amt > balance) return alert("Недостаточно баланса");
    if (activePositions[coinId]) return alert("Сделка уже открыта");

    setIsPending(true);
    setStatusText('OPENING...');

    setTimeout(() => {
      setBalance(b => b - amt);
      setActivePositions(prev => ({ 
        ...prev, 
        [coinId]: { margin: amt, lev: leverage, entryDex: selectedDex } 
      }));
      setIsPending(false);
      setTradeAmount('');
    }, 800);
  };

  const closePosition = (coinId) => {
    const pos = activePositions[coinId];
    if (!pos) return;

    setIsPending(true);
    setStatusText('CLOSING...');

    setTimeout(() => {
      const isWin = signal && selectedDex === signal.sell && coinId === signal.coin && Date.now() < signal.expires;
      const pnlFactor = isWin ? (parseFloat(signal.profit) / 100) : -0.12;
      
      // Прибыль = (Маржа * Плечо) * % изменения
      const pnl = (pos.margin * pos.lev) * pnlFactor;
      const finalReturn = Math.max(0, pos.margin + pnl);
      
      setBalance(b => b + finalReturn);
      setActivePositions(prev => {
        const next = {...prev};
        delete next[coinId];
        return next;
      });

      if (isWin) {
        setXp(x => x + 50);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      }
      setIsPending(false);
    }, 800);
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
          <small>{t.balance}</small>
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
                <span>{signal.coin} ➔ {signal.sell} <b className="grn">+{signal.profit}%</b></span>
              </div>
            )}

            {!selectedDex ? (
              <div className="dex-list">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="dex-card" onClick={() => setSelectedDex(d.id)} style={{borderColor: d.color}}>
                    <span style={{color: d.color}}>{d.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dex-terminal">
                <div className="term-header">
                  <button onClick={() => setSelectedDex(null)} className="back-btn">{t.back}</button>
                  <div className="term-inputs">
                    <input type="number" placeholder="USD" value={tradeAmount} onChange={e=>setTradeAmount(e.target.value)} />
                    <div className="lev-row">
                      <span>x{leverage}</span>
                      <input type="range" min="1" max="100" value={leverage} onChange={e=>setLeverage(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="coin-list">
                  {ALL_COINS.map(c => {
                    const locked = c.lvl > currentLvl;
                    const pos = activePositions[c.id];
                    return (
                      <div key={c.id} className={`coin-item ${locked ? 'is-locked' : ''} ${pos ? 'active-pos' : ''}`}>
                        <div className="c-name">
                          <b>{c.id}</b>
                          {pos ? <span className="pos-info">{t.pos} ${pos.margin}</span> : <span className="live-price">${livePrices[c.id] || c.base}</span>}
                        </div>
                        {!locked ? (
                          <div className="c-actions">
                            {!pos ? 
                              <button className="btn-buy" onClick={() => openPosition(c.id)}>{t.buy}</button> :
                              <button className="btn-sell" onClick={() => closePosition(c.id)}>{t.sell}</button>
                            }
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
