

import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const EXCHANGES = [
  { id: '1inch', name: '1inch', color: '#2f8af5' },
  { id: 'uniswap', name: 'Uniswap v3', color: '#ff007a' },
  { id: 'sushiswap', name: 'SushiSwap', color: '#fa52a0' },
  { id: 'pancakeswap', name: 'PancakeSwap', color: '#d1884f' }
];

const ALL_COINS = [
  { id: 'TON', lvl: 1 },
  { id: 'ARB', lvl: 1 },
  { id: 'ETH', lvl: 2 },
  { id: 'SOL', lvl: 3 },
  { id: 'BNB', lvl: 4 },
  { id: 'BTC', lvl: 5 }
];

const translations = {
  RU: {
    mining: 'Майнинг', arbitrage: 'Арбитраж', settings: 'Настройки',
    balance: 'БАЛАНС', lvl: 'УРОВЕНЬ', xp: 'ОПЫТ',
    tap: 'НАЖИМАЙ НА ДОЛЛАР!', buy: 'КУПИТЬ', sell: 'ПРОДАТЬ',
    back: '← ВСЕ РЫНКИ', sound: 'ЗВУК', lang: 'ЯЗЫК',
    join: 'Присоединяйтесь к нам', pendingBuy: 'ПОДКЛЮЧЕНИЕ К УЗЛАМ...',
    pendingSell: 'ПРОВЕРКА СДЕЛКИ...', success: 'УСПЕШНО!',
    profit: 'ПРИБЫЛЬ', loss: 'КОМИССИЯ -5%', unlock: 'Откроется на уровне'
  },
  EN: {
    mining: 'Mining', arbitrage: 'Arbitrage', settings: 'Settings',
    balance: 'BALANCE', lvl: 'LEVEL', xp: 'XP',
    tap: 'TAP THE DOLLAR!', buy: 'BUY', sell: 'SELL',
    back: '← ALL MARKETS', sound: 'SOUND', lang: 'LANGUAGE',
    join: 'Join our community', pendingBuy: 'CONNECTING TO NODES...',
    pendingSell: 'VERIFYING SWAP...', success: 'SUCCESS!',
    profit: 'PROFIT', loss: 'FEE -5%', unlock: 'Unlocks at lvl'
  },
  UK: {
    mining: 'Майнінг', arbitrage: 'Арбітраж', settings: 'Налаштування',
    balance: 'БАЛАНС', lvl: 'РІВЕНЬ', xp: 'ДОСВІД',
    tap: 'ТИСНИ НА ДОЛАР!', buy: 'КУПИТИ', sell: 'ПРОДАТЬ',
    back: '← ВСІ РИНКИ', sound: 'ЗВУК', lang: 'МОВА',
    join: 'Приєднуйтесь до нас', pendingBuy: 'ПІДКЛЮЧЕННЯ ДО ВУЗЛІВ...',
    pendingSell: 'ПЕРЕВІРКА УГОДИ...', success: 'УСПІШНО!',
    profit: 'ПРИБУТОК', loss: 'КОМІСІЯ -5%', unlock: 'Відкриється на рівні'
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

  const tapAudio = useRef(new Audio('https://www.soundjay.com/buttons/sounds/button-37a.mp3'));
  const currentLvl = Math.floor(xp / 100) + 1;
  const t = translations[lang];

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
    localStorage.setItem('k_lang', lang);
    localStorage.setItem('k_snd', soundOn);
  }, [balance, xp, lang, soundOn]);

  useEffect(() => {
    const gen = () => {
      const availableCoins = ALL_COINS.filter(c => c.lvl <= currentLvl);
      const coin = availableCoins[Math.floor(Math.random() * availableCoins.length)];
      const b = EXCHANGES[Math.floor(Math.random() * 4)];
      let s = EXCHANGES[Math.floor(Math.random() * 4)];
      while(b.id === s.id) s = EXCHANGES[Math.floor(Math.random() * 4)];
      setSignal({ coin: coin.id, buy: b.id, sell: s.id, profit: (Math.random() * 3 + 2).toFixed(2) });
    };
    gen();
    const timer = setInterval(gen, 20000);
    return () => clearInterval(timer);
  }, [currentLvl]);

  const handleTap = () => {
    setBalance(b => b + 0.01);
    if (soundOn) {
      tapAudio.current.currentTime = 0;
      tapAudio.current.play().catch(() => {});
    }
  };

  const trade = (coinId, type) => {
    if (isPending) return;
    if (type === 'buy' && balance < 50) return alert("Low balance!");
    if (type === 'sell' && !inventory[coinId]) return alert("No coins!");

    setIsPending(true);
    setStatusText(type === 'buy' ? t.pendingBuy : t.pendingSell);

    setTimeout(() => {
      if (type === 'buy') {
        setBalance(b => b - 50);
        setInventory(prev => ({ ...prev, [coinId]: (prev[coinId] || 0) + 1 }));
      } else {
        const isWin = signal && selectedDex === signal.sell && coinId === signal.coin;
        const prize = isWin ? 50 * (1 + parseFloat(signal.profit)/100) : 50 * 0.95;
        setBalance(b => b + prize);
        setInventory(prev => ({ ...prev, [coinId]: prev[coinId] - 1 }));
        if (isWin) {
          setXp(x => x + 25);
          setStatusText(`${t.profit} +$${(prize-50).toFixed(2)}`);
        } else {
          setStatusText(t.loss);
        }
      }
      setTimeout(() => { setIsPending(false); setStatusText(''); }, 1500);
    }, 2000);
  };

  return (
    <div className="app-container">
      <header className="main-header">
        <div className="lvl-section">
          <div className="lvl-badge">{t.lvl} {currentLvl}</div>
          <div className="xp-track"><div className="xp-bar" style={{width: `${xp % 100}%`}}></div></div>
        </div>
        <div className="bal-section">
          <small>{t.balance}</small>
          <div className="bal-amt">${balance.toFixed(2)}</div>
        </div>
      </header>

      <main className="viewport">
        {tab === 'mining' && (
          <div className="mining-page">
            <div className="coin-click" onClick={handleTap}>$</div>
            <p>{t.tap}</p>
          </div>
        )}

        {tab === 'trade' && (
          <div className="trade-page">
            {signal && (
              <div className="signal-card">
                <div className="dot"></div>
                <span>{signal.coin} | {signal.buy.toUpperCase()} ➔ {signal.sell.toUpperCase()} <b className="grn">+{signal.profit}%</b></span>
              </div>
            )}

            {!selectedDex ? (
              <div className="dex-menu">
                {EXCHANGES.map(dex => (
                  <button key={dex.id} className="dex-item" onClick={() => setSelectedDex(dex.id)} style={{borderLeft: `4px solid ${dex.color}`}}>
                    {dex.name} <span>LIVE</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="terminal">
                <button className="back-btn" onClick={() => setSelectedDex(null)}>{t.back}</button>
                <div className="coin-grid">
                  {ALL_COINS.map(c => {
                    const locked = c.lvl > currentLvl;
                    return (
                      <div key={c.id} className={`coin-row ${locked ? 'locked' : ''}`}>
                        <div className="c-info">
                          <b>{c.id}</b>
                          {locked && <small>{t.unlock} {c.lvl}</small>}
                        </div>
                        {!locked && (
                          <div className="c-btns">
                            <button className="buy-b" onClick={() => trade(c.id, 'buy')}>{t.buy}</button>
                            <button className="sell-b" onClick={() => trade(c.id, 'sell')} disabled={!inventory[c.id]}>{t.sell}({inventory[c.id]||0})</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {isPending && <div className="tx-screen"><div className="spin-loader"></div><p>{statusText}</p></div>}
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="settings-page">
            <h2 className="neon-text">{t.settings}</h2>
            <div className="option-box">
              <div className="option">
                <span>{t.sound}</span>
                <button className={`tgl ${soundOn?'on':''}`} onClick={() => setSoundOn(!soundOn)}>{soundOn?'ON':'OFF'}</button>
              </div>
              <div className="option">
                <span>{t.lang}</span>
                <div className="lang-picks">
                  {['RU','EN','UK'].map(l => (
                    <button key={l} className={lang===l?'active':''} onClick={()=>setLang(l)}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="creators">
              <p>{t.join}</p>
              <a href="https://t.me/kriptoalians" target="_blank">@kriptoalians</a>
            </div>
          </div>
        )}
      </main>

      <nav className="nav-bar">
        <button className={tab==='mining'?'active':''} onClick={()=>{setTab('mining'); setSelectedDex(null)}}>{t.mining}</button>
        <button className={tab==='trade'?'active':''} onClick={()=>setTab('trade')}>{t.arbitrage}</button>
        <button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}>{t.settings}</button>
      </nav>
    </div>
  );
}
