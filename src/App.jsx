import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, push, update } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCKmEa1B4xOdMdNGXBDK2LeOhBQoMqWv40",
  authDomain: "treidgame-b2ae0.firebaseapp.com",
  projectId: "treidgame-b2ae0",
  storageBucket: "treidgame-b2ae0.firebasestorage.app",
  messagingSenderId: "985305772375",
  appId: "1:985305772375:web:08d9b482a6f9d3cd748e12"
};

const ASSETS = {
  USDC: { symbol: 'USDC', price: 1, icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg' },
  BTC: { symbol: 'BTC', price: 65000, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg' },
  ETH: { symbol: 'ETH', price: 2600, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg' },
  LINK: { symbol: 'LINK', price: 18.2, icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg' },
  AAVE: { symbol: 'AAVE', price: 145.5, icon: 'https://cryptologos.cc/logos/aave-aave-logo.svg' },
  CRV: { symbol: 'CRV', price: 0.35, icon: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.svg' },
  WPOL: { symbol: 'WPOL', price: 0.55, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg' }
};

const DEX_THEMES = {
  UNISWAP: { name: 'Uniswap V3', color: '#FF007A' },
  ODOS: { name: 'Odos Router', color: '#0CF2B0' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0' },
  '1INCH': { name: '1inch Network', color: '#31569c' }
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  const [lang, setLang] = useState('RU');
  const [balance, setBalance] = useState(1000);
  const [wallet, setWallet] = useState({});
  const [view, setView] = useState('main'); 
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [payToken, setPayToken] = useState(ASSETS.USDC);
  const [getToken, setGetToken] = useState(ASSETS.BTC);
  const [payAmount, setPayAmount] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [clicks, setClicks] = useState([]); // Для эффекта доллара
  const [soundEnabled, setSoundEnabled] = useState(true);

  const t = {
    RU: { balance: "БАЛАНС", swap: "Обмен", settings: "Настройки", max: "МАКС", buy: "Купить", sell: "Продать", done: "Готово" },
    EN: { balance: "BALANCE", swap: "Swap", settings: "Settings", max: "MAX", buy: "Buy", sell: "Sell", done: "Done" }
  }[lang];

  // Инициализация данных
  const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || 'Guest';
  
  useEffect(() => {
    onValue(ref(db, `players/${userId}`), (s) => {
      if (s.exists()) {
        setBalance(s.val().balanceUSDC);
        setWallet(s.val().wallet || {});
      } else {
        set(ref(db, `players/${userId}`), { balanceUSDC: 1000, wallet: {}, username: 'Trader' });
      }
    });
  }, [userId]);

  // Генерация сигнала
  useEffect(() => {
    if (!signal) {
      const keys = ['BTC', 'ETH', 'LINK', 'AAVE', 'CRV', 'WPOL'];
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      setSignal({ coin, sellAt: 'ODOS', profit: (Math.random() * 1.5 + 1.5).toFixed(2) });
    }
  }, [signal]);

  const playClick = () => {
    if (!soundEnabled) return;
    const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
    audio.play();
  };

  const handleInteraction = (e) => {
    playClick();
    const id = Date.now();
    setClicks([...clicks, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 1000);
  };

  const handleSwap = () => {
    const amount = Number(payAmount);
    const hasEnough = payToken.symbol === 'USDC' ? balance >= amount : (wallet[payToken.symbol] || 0) >= amount;
    if (!amount || !hasEnough) return;

    setIsPending(true);
    setTimeout(() => {
      let receiveAmount = (amount * payToken.price) / getToken.price;
      let pnl = 0;

      // Логика профита по сигналу
      if (getToken.symbol === 'USDC' && payToken.symbol === signal.coin.symbol && activeDex === signal.sellAt) {
        receiveAmount *= (1 + signal.profit / 100);
        pnl = receiveAmount - (amount * payToken.price);
        setSignal(null);
      } else if (getToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        // Рандомный минус до 1.5%
        receiveAmount *= (1 - (Math.random() * 0.015));
        pnl = receiveAmount - (amount * payToken.price);
      }

      const newBalance = payToken.symbol === 'USDC' ? balance - amount : (getToken.symbol === 'USDC' ? balance + receiveAmount : balance);
      const newWallet = { ...wallet };
      if (payToken.symbol !== 'USDC') newWallet[payToken.symbol] = (newWallet[payToken.symbol] || 0) - amount;
      if (getToken.symbol !== 'USDC') newWallet[getToken.symbol] = (newWallet[getToken.symbol] || 0) + receiveAmount;

      update(ref(db, `players/${userId}`), { balanceUSDC: newBalance, wallet: newWallet });
      setReceipt({ pnl, get: receiveAmount, token: getToken.symbol });
      setIsPending(false);
      setPayAmount('');
    }, 1500);
  };

  return (
    <div style={{ background: '#000', height: '100vh', width: '100vw', color: '#fff', overflow: 'hidden', position: 'relative' }} onClick={handleInteraction}>
      
      {/* АНИМИРОВАННЫЙ ФОН ГЛАВНОЙ */}
      <div className="bg-animation"></div>

      {/* ЭФФЕКТ ДОЛЛАРА */}
      {clicks.map(c => <div key={c.id} className="dollar-pop" style={{ left: c.x, top: c.y }}>$</div>)}

      {/* --- ГЛАВНЫЙ ЭКРАН --- */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 10 }}>
        <header style={{ padding: '20px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#0CF2B0', fontWeight: 'bold' }}>{t.balance}</span>
          <button onClick={() => setView('settings')} style={{ background: 'none', border: 'none', fontSize: '20px' }}>⚙️</button>
        </header>

        <main style={{ flex: 1, padding: '0 20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '50px', margin: '20px 0' }}>${balance.toFixed(2)}</h1>
          
          {signal && (
            <div className="signal-box">
              <div style={{ color: '#0CF2B0', fontSize: '12px' }}>LIVE SIGNAL</div>
              <b>{signal.coin.symbol} → {signal.sellAt} (+{signal.profit}%)</b>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '30px' }}>
            {Object.keys(DEX_THEMES).map(k => (
              <button key={k} onClick={() => setActiveDex(k)} className="dex-card" style={{ border: `1px solid ${DEX_THEMES[k].color}55` }}>
                {DEX_THEMES[k].name}
              </button>
            ))}
          </div>
        </main>
      </div>

      {/* --- ЭКРАН ОБМЕНА (DEX) --- */}
      {activeDex && (
        <div style={{ 
          position: 'fixed', inset: 0, backgroundColor: '#0b0b0b', zIndex: 100, 
          display: 'flex', flexDirection: 'column', animation: 'slideIn 0.3s ease' 
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center' }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px' }}>✕</button>
            <div style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', color: DEX_THEMES[activeDex].color }}>{DEX_THEMES[activeDex].name}</div>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* ПОЛЕ ВВОДА 1 */}
            <div className="swap-field">
              <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.0" />
              <div className="token-picker">
                <img src={payToken.icon} width="24" /> {payToken.symbol}
              </div>
            </div>

            <div style={{ textAlign: 'center', margin: '-20px 0', zIndex: 2 }}>
              <div className="swap-icon">↓</div>
            </div>

            {/* ПОЛЕ ВВОДА 2 */}
            <div className="swap-field">
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {payAmount ? ((payAmount * payToken.price) / getToken.price).toFixed(4) : '0.0'}
              </div>
              <div className="token-picker" onClick={() => {/* Тут можно добавить выбор */}}>
                <img src={getToken.icon} width="24" /> {getToken.symbol}
              </div>
            </div>

            <button onClick={handleSwap} disabled={isPending} className="swap-btn" style={{ backgroundColor: DEX_THEMES[activeDex].color }}>
              {isPending ? 'Processing...' : 'Swap'}
            </button>
          </div>
        </div>
      )}

      {/* --- НАСТРОЙКИ --- */}
      {view === 'settings' && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 200, padding: '20px' }}>
          <button onClick={() => setView('main')}>Назад</button>
          <div style={{ marginTop: '30px' }}>
            <div onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')}>Язык: {lang}</div>
            <div onClick={() => setSoundEnabled(!soundEnabled)}>Звук: {soundEnabled ? 'ON' : 'OFF'}</div>
            <a href="https://t.me/kriptoalians" style={{ color: '#0CF2B0' }}>Creators: @kriptoalians</a>
          </div>
        </div>
      )}

      {/* --- ЧЕК --- */}
      {receipt && (
        <div className="receipt-overlay">
          <div className="receipt-card">
            <h2>{receipt.pnl >= 0 ? 'Success!' : 'Trade Done'}</h2>
            <div style={{ color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b', fontSize: '24px' }}>
              {receipt.pnl >= 0 ? `+${receipt.pnl.toFixed(2)}` : receipt.pnl.toFixed(2)} USDC
            </div>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}} className="done-btn">ОК</button>
          </div>
        </div>
      )}

      <style>{`
        .bg-animation {
          position: absolute; width: 200%; height: 200%;
          background: radial-gradient(circle, #1a1a1a 0%, #000 70%);
          animation: rotate 20s linear infinite; z-index: 1;
        }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .dex-card { background: rgba(255,255,255,0.05); padding: 30px; border-radius: 20px; color: #fff; font-weight: bold; }
        .signal-box { background: rgba(12,242,176,0.1); border: 1px solid #0CF2B0; padding: 15px; border-radius: 15px; margin: 20px 0; }
        
        .swap-field { background: #1a1a1a; padding: 25px; border-radius: 20px; display: flex; justify-content: space-between; align-items: center; }
        .swap-field input { background: none; border: none; color: #fff; fontSize: 24px; width: 50%; outline: none; }
        .token-picker { background: #222; padding: 10px 15px; border-radius: 12px; display: flex; align-items: center; gap: 8px; }
        .swap-icon { background: #000; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: auto; border: 2px solid #222; }
        .swap-btn { width: 100%; padding: 20px; border: none; border-radius: 20px; color: #fff; font-weight: bold; font-size: 18px; margin-top: 20px; }
        
        .dollar-pop { position: fixed; pointer-events: none; color: #0CF2B0; font-weight: bold; font-size: 24px; animation: flyUp 1s forwards; z-index: 1000; }
        @keyframes flyUp { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-100px); } }
        
        .receipt-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 500; }
        .receipt-card { background: #111; padding: 40px; border-radius: 30px; text-align: center; border: 1px solid #222; }
        .done-btn { background: #fff; color: #000; border: none; padding: 15px 40px; border-radius: 15px; margin-top: 20px; font-weight: bold; }
        
        @keyframes slideIn { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}
