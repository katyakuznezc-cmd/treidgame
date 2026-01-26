import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update } from "firebase/database";

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
  UNISWAP: { name: 'Uniswap V3', color: '#FF007A', bg: '#0d0208' },
  ODOS: { name: 'Odos Router', color: '#0CF2B0', bg: '#020d0a' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: '#0d0206' },
  '1INCH': { name: '1inch Network', color: '#31569c', bg: '#02050d' }
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  const [lang, setLang] = useState('RU');
  const [balance, setBalance] = useState(1000);
  const [wallet, setWallet] = useState({});
  const [view, setView] = useState('main'); 
  const [activeDex, setActiveDex] = useState(null);
  const [deal, setDeal] = useState(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [payToken, setPayToken] = useState(ASSETS.USDC);
  const [getToken, setGetToken] = useState(ASSETS.BTC);
  const [payAmount, setPayAmount] = useState('');
  const [showTokenList, setShowTokenList] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const t = {
    RU: { bal: "БАЛАНС", deal: "ТОРГОВАЯ СДЕЛКА", swap: "Обменять", max: "МАКС", settings: "Настройки", manager: "Связаться с менеджером", time: "Обновится через:" },
    EN: { bal: "BALANCE", deal: "TRADE DEAL", swap: "Swap Now", max: "MAX", settings: "Settings", manager: "Contact Manager", time: "Updates in:" }
  }[lang];

  const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || 'Guest';

  // Синхронизация баланса
  useEffect(() => {
    onValue(ref(db, `players/${userId}`), (s) => {
      if (s.exists()) {
        setBalance(s.val().balanceUSDC || 1000);
        setWallet(s.val().wallet || {});
      }
    });
  }, [userId]);

  // Логика Таймера и Сделок
  useEffect(() => {
    if (!deal) generateDeal();
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateDeal();
          return 120;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [deal]);

  const generateDeal = () => {
    const keys = ['BTC', 'ETH', 'LINK', 'AAVE', 'CRV', 'WPOL'];
    const dexs = Object.keys(DEX_THEMES);
    setDeal({
      coin: ASSETS[keys[Math.floor(Math.random()*keys.length)]],
      sellAt: dexs[Math.floor(Math.random()*dexs.length)],
      profit: (Math.random()*0.8 + 2.1).toFixed(2)
    });
    setTimeLeft(120);
  };

  const handleSwap = () => {
    const amount = Number(payAmount);
    if (!amount || (payToken.symbol === 'USDC' ? balance : wallet[payToken.symbol] || 0) < amount) return;
    
    setIsPending(true);
    setTimeout(() => {
      let receiveAmount = (amount * payToken.price) / getToken.price;
      let pnl = 0;
      const isCorrect = getToken.symbol === 'USDC' && payToken.symbol === deal.coin.symbol && activeDex === deal.sellAt;

      if (getToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        receiveAmount *= isCorrect ? (1 + deal.profit/100) : (1 - (Math.random()*0.015));
        pnl = receiveAmount - (amount * payToken.price);
        if (isCorrect) generateDeal();
      }

      const newBalance = payToken.symbol === 'USDC' ? balance - amount : (getToken.symbol === 'USDC' ? balance + receiveAmount : balance);
      const newWallet = { ...wallet };
      if (payToken.symbol !== 'USDC') newWallet[payToken.symbol] = (newWallet[payToken.symbol] || 0) - amount;
      if (getToken.symbol !== 'USDC') newWallet[getToken.symbol] = (newWallet[getToken.symbol] || 0) + receiveAmount;

      update(ref(db, `players/${userId}`), { balanceUSDC: newBalance, wallet: newWallet });
      setReceipt({ pnl, get: receiveAmount, from: payToken.symbol, to: getToken.symbol, amount });
      setIsPending(false); setPayAmount('');
    }, 2500); // Имитация загрузки 2.5 сек
  };

  return (
    <div style={{ backgroundColor: '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* ANIMATED BG */}
      <div className="main-bg">
        <div className="glow-circle"></div>
      </div>

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <header style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#0CF2B0', fontWeight: 'bold', fontSize: '11px' }}>{t.bal}</div>
          <button onClick={() => setView('settings')} className="icon-btn">⚙️</button>
        </header>

        <main style={{ flex: 1, padding: '0 20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '50px', fontWeight: '900', margin: '30px 0' }}>${balance.toFixed(2)}</h1>

          {/* БАНЕР МЕНЕДЖЕРА */}
          <div onClick={() => window.open('https://t.me/kriptoalians')} className="manager-banner">
             <span>🎧 {t.manager}</span>
             <span style={{opacity: 0.5}}>→</span>
          </div>

          {/* ТОРГОВАЯ СДЕЛКА */}
          {deal && (
            <div className="deal-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#0CF2B0', fontWeight: 'bold', marginBottom: '10px' }}>
                <span>{t.deal}</span>
                <span>{t.time} {timeLeft}s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{display:'flex', alignItems:'center', gap: '8px'}}>
                  <img src={deal.coin.icon} width="24"/>
                  <span style={{fontSize: '18px', fontWeight: 'bold'}}>{deal.coin.symbol}</span>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontSize: '12px', opacity: 0.6}}>{deal.sellAt}</div>
                  <div style={{color: '#0CF2B0', fontWeight: 'bold'}}>+{deal.profit}%</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
            {Object.keys(DEX_THEMES).map(k => (
              <button key={k} onClick={() => setActiveDex(k)} className="dex-card">
                <span style={{fontSize:'10px', opacity: 0.5}}>{k}</span><br/>
                {DEX_THEMES[k].name}
              </button>
            ))}
          </div>
        </main>
      </div>

      {/* ЭКРАН БИРЖИ */}
      {activeDex && (
        <div className="dex-overlay" style={{ backgroundColor: DEX_THEMES[activeDex].bg }}>
          <header className="dex-header">
            <button onClick={() => setActiveDex(null)} className="back-btn">←</button>
            <b>{DEX_THEMES[activeDex].name}</b>
            <div style={{width: 30}}></div>
          </header>

          <div style={{ padding: '20px' }}>
            <div className="swap-card">
              <div className="sw-label"><span>{t.give}</span><span onClick={() => setPayAmount((payToken.symbol === 'USDC' ? balance : wallet[payToken.symbol] || 0).toString())} style={{color: DEX_THEMES[activeDex].color}}>{t.max}</span></div>
              <div className="sw-row">
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.0" />
                <button onClick={() => setShowTokenList('pay')} className="token-btn"><img src={payToken.icon} width="18"/> {payToken.symbol}</button>
              </div>
            </div>

            <div className="swap-divider"><div style={{borderColor: DEX_THEMES[activeDex].color}}>↓</div></div>

            <div className="swap-card">
              <div className="sw-label">{t.get}</div>
              <div className="sw-row">
                <div className="sw-val">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(5) : '0.0'}</div>
                <button onClick={() => setShowTokenList('get')} className="token-btn"><img src={getToken.icon} width="18"/> {getToken.symbol}</button>
              </div>
            </div>

            <button onClick={handleSwap} disabled={isPending} className="main-swap-btn" style={{ background: DEX_THEMES[activeDex].color }}>
              {isPending ? <div className="loader"></div> : t.swap}
            </button>
          </div>
        </div>
      )}

      {/* КВИТАНЦИЯ (RECEIPT) */}
      {receipt && (
        <div className="receipt-overlay">
          <div className="receipt">
            <div className="check-icon">{receipt.pnl >= 0 ? '✔️' : '📉'}</div>
            <h3>{receipt.pnl >= 0 ? 'Transaction Success' : 'Transaction Done'}</h3>
            <div className="receipt-details">
              <div className="r-line"><span>Spent:</span> <span>{receipt.amount} {receipt.from}</span></div>
              <div className="r-line"><span>Received:</span> <span>{receipt.get.toFixed(4)} {receipt.to}</span></div>
              <hr style={{opacity: 0.1, margin: '15px 0'}}/>
              <div className="r-line" style={{fontWeight: 'bold'}}>
                <span>Profit/Loss:</span>
                <span style={{color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b'}}>{receipt.pnl.toFixed(2)} USDC</span>
              </div>
            </div>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}} className="receipt-close">CLOSE</button>
          </div>
        </div>
      )}

      {/* НАСТРОЙКИ */}
      {view === 'settings' && (
        <div className="settings-overlay">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 30}}>
            <h2>{t.settings}</h2>
            <button onClick={() => setView('main')} className="icon-btn">✕</button>
          </div>
          <button onClick={() => setLang(l => l === 'RU' ? 'EN' : 'RU')} className="set-row">🌐 {t.lang}: {lang}</button>
          <button onClick={() => window.open('https://t.me/kriptoalians')} className="set-row">👥 {t.creators}: @kriptoalians</button>
        </div>
      )}

      {/* ВЫБОР ТОКЕНА */}
      {showTokenList && (
        <div className="token-list-overlay">
          <button onClick={() => setShowTokenList(null)} className="close-tokens">✕</button>
          {Object.values(ASSETS).map(a => (
            <div key={a.symbol} onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }} className="token-item">
              <img src={a.icon} width="28"/>
              <b>{a.symbol}</b>
              <span style={{marginLeft:'auto', opacity: 0.5}}>${a.price}</span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .main-bg { position: fixed; inset: 0; z-index: 0; background: #000; overflow: hidden; }
        .glow-circle { position: absolute; top: -10%; left: 50%; transform: translateX(-50%); width: 300px; height: 300px; background: radial-gradient(circle, #0CF2B022 0%, transparent 70%); }
        .manager-banner { background: #111; padding: 15px 20px; border-radius: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; font-weight: bold; border: 1px solid #222; }
        .deal-box { background: #0c0c0c; border: 1px solid #0CF2B033; padding: 18px; border-radius: 20px; text-align: left; }
        .dex-card { background: #111; border: 1px solid #222; padding: 20px; border-radius: 18px; color: #fff; font-weight: bold; text-align: left; }
        .dex-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; flexDirection: column; animation: slideUp 0.3s ease; }
        .dex-header { padding: 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #ffffff05; }
        .swap-card { background: #ffffff05; padding: 20px; border-radius: 20px; border: 1px solid #ffffff08; }
        .sw-label { display: flex; justify-content: space-between; font-size: 11px; opacity: 0.5; margin-bottom: 10px; }
        .sw-row { display: flex; justify-content: space-between; align-items: center; }
        .sw-row input { background: none; border: none; color: #fff; font-size: 26px; width: 60%; outline: none; font-weight: bold; }
        .token-btn { background: #222; border: 1px solid #333; color: #fff; padding: 8px 12px; border-radius: 12px; display: flex; align-items: center; gap: 8px; }
        .swap-divider { height: 0; display: flex; align-items: center; justify-content: center; z-index: 5; margin: -10px 0; }
        .swap-divider div { background: #000; width: 32px; height: 32px; border-radius: 10px; border: 1px solid; display: flex; align-items: center; justify-content: center; }
        .main-swap-btn { width: 100%; padding: 20px; border-radius: 20px; border: none; color: #fff; font-weight: 900; margin-top: 20px; }
        .receipt-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 30px; }
        .receipt { background: #111; border: 1px solid #222; width: 100%; padding: 30px; border-radius: 30px; text-align: center; }
        .receipt-details { background: #000; padding: 20px; border-radius: 20px; margin: 20px 0; text-align: left; font-size: 14px; }
        .r-line { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .receipt-close { background: #fff; border: none; padding: 15px 40px; border-radius: 15px; font-weight: bold; width: 100%; }
        .settings-overlay { position: fixed; inset: 0; background: #000; z-index: 3000; padding: 30px; }
        .set-row { width: 100%; padding: 20px; background: #111; border: 1px solid #222; color: #fff; border-radius: 16px; margin-bottom: 12px; text-align: left; }
        .token-list-overlay { position: fixed; inset: 0; background: #000; z-index: 4000; padding: 20px; }
        .token-item { display: flex; align-items: center; gap: 12px; padding: 15px; border-bottom: 1px solid #111; }
        .loader { width: 20px; height: 20px; border: 3px solid #fff; border-bottom-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin: auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .icon-btn { background: #111; border: 1px solid #222; color: #fff; width: 40px; height: 40px; border-radius: 12px; }
      `}</style>
    </div>
  );
}
