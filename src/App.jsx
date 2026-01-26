import React, { useState, useEffect, useMemo } from 'react';
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
  USDC: { symbol: 'USDC', price: 1, icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=024' },
  BTC: { symbol: 'BTC', price: 65000, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=024' },
  ETH: { symbol: 'ETH', price: 2600, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=024' },
  LINK: { symbol: 'LINK', price: 18.2, icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg?v=024' },
  AAVE: { symbol: 'AAVE', price: 145.5, icon: 'https://cryptologos.cc/logos/aave-aave-logo.svg?v=024' },
  CRV: { symbol: 'CRV', price: 0.35, icon: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.svg?v=024' },
  WPOL: { symbol: 'WPOL', price: 0.55, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg?v=024' }
};

const DEX_THEMES = {
  UNISWAP: { name: 'Uniswap V3', color: '#FF007A', bg: 'radial-gradient(circle at 50% 0%, rgba(255, 0, 122, 0.2), #0b0b0b 80%)' },
  ODOS: { name: 'Odos Router', color: '#0CF2B0', bg: 'linear-gradient(180deg, rgba(12, 242, 176, 0.1) 0%, #0b0b0b 100%)' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: 'radial-gradient(circle at 0% 0%, rgba(250, 82, 160, 0.15), #0b0b0b 70%)' },
  '1INCH': { name: '1inch Network', color: '#31569c', bg: 'linear-gradient(135deg, rgba(49, 86, 156, 0.2) 0%, #0b0b0b 100%)' }
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  const [lang, setLang] = useState('RU');
  const [balance, setBalance] = useState(1000);
  const [wallet, setWallet] = useState({});
  const [activeDex, setActiveDex] = useState(null);
  const [deal, setDeal] = useState(null);
  const [payToken, setPayToken] = useState(ASSETS.USDC);
  const [getToken, setGetToken] = useState(ASSETS.BTC);
  const [payAmount, setPayAmount] = useState('');
  const [showTokenList, setShowTokenList] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const t = {
    RU: { bal: "БАЛАНС", deal: "ТОРГОВАЯ СДЕЛКА", history: "ЖИВАЯ ЛЕНТА", give: "Вы отдаете", get: "Вы получаете", swap: "Обменять", max: "МАКС", gas: "Газ", route: "Маршрут", creators: "Создатели", settings: "Настройки" },
    EN: { bal: "BALANCE", deal: "TRADE DEAL", history: "LIVE FEED", give: "You give", get: "You receive", swap: "Swap", max: "MAX", gas: "Gas", route: "Route", creators: "Creators", settings: "Settings" }
  }[lang];

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

  useEffect(() => {
    if (!deal) {
      const keys = ['BTC', 'ETH', 'LINK', 'AAVE', 'CRV', 'WPOL'];
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      setDeal({ coin, sellAt: 'ODOS', profit: (Math.random() * 0.8 + 2.1).toFixed(2) });
    }
  }, [deal]);

  const handleSwap = () => {
    const amount = Number(payAmount);
    const hasEnough = payToken.symbol === 'USDC' ? balance >= amount : (wallet[payToken.symbol] || 0) >= amount;
    if (!amount || !hasEnough) return;

    setIsPending(true);
    setTimeout(() => {
      let receiveAmount = (amount * payToken.price) / getToken.price;
      let pnl = 0;
      const isCorrect = getToken.symbol === 'USDC' && payToken.symbol === deal.coin.symbol && activeDex === deal.sellAt;

      if (getToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        receiveAmount *= isCorrect ? (1 + deal.profit / 100) : (1 - (Math.random() * 0.015));
        pnl = receiveAmount - (amount * payToken.price);
        if (isCorrect) setDeal(null);
      }

      const newBalance = payToken.symbol === 'USDC' ? balance - amount : (getToken.symbol === 'USDC' ? balance + receiveAmount : balance);
      const newWallet = { ...wallet };
      if (payToken.symbol !== 'USDC') newWallet[payToken.symbol] = (newWallet[payToken.symbol] || 0) - amount;
      if (getToken.symbol !== 'USDC') newWallet[getToken.symbol] = (newWallet[getToken.symbol] || 0) + receiveAmount;

      update(ref(db, `players/${userId}`), { balanceUSDC: newBalance, wallet: newWallet });
      setReceipt({ pnl, get: receiveAmount, token: getToken.symbol });
      setIsPending(false); setPayAmount('');
    }, 1500);
  };

  return (
    <div style={{ backgroundColor: '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden', position: 'relative' }}>
      
      {/* GLOWING BACKGROUND */}
      <div className="main-bg-glow"></div>

      {/* --- ГЛАВНАЯ СТРАНИЦА --- */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 1 }}>
        <header style={{ padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#0CF2B0', fontWeight: 'bold', fontSize: '12px', letterSpacing: '1px' }}>{t.bal}</div>
          <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #333', color: '#fff', borderRadius: '12px', padding: '10px' }}>⚙️</button>
        </header>

        <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto' }}>
          <div style={{ textAlign: 'center', margin: '40px 0' }}>
            <h1 style={{ fontSize: '54px', fontWeight: '900', margin: 0 }}>${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
            <p style={{ opacity: 0.3, fontSize: '11px', letterSpacing: '2px' }}>USDC WALLET</p>
          </div>

          {deal && (
            <div className="deal-card">
              <div style={{ color: '#0CF2B0', fontSize: '10px', fontWeight: 'bold', marginBottom: 8 }}>{t.deal}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>{deal.coin.symbol} <span style={{opacity: 0.4}}>→</span> {deal.sellAt}</span>
                <span style={{ color: '#0CF2B0' }}>+{deal.profit}%</span>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
            {Object.keys(DEX_THEMES).map(k => (
              <button key={k} onClick={() => setActiveDex(k)} className="dex-btn" style={{ borderColor: `${DEX_THEMES[k].color}44` }}>
                {DEX_THEMES[k].name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- ЭКРАН БИРЖИ --- */}
      {activeDex && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#0b0b0b', backgroundImage: DEX_THEMES[activeDex].bg, zIndex: 100, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '28px' }}>←</button>
            <div style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', color: DEX_THEMES[activeDex].color }}>{DEX_THEMES[activeDex].name}</div>
          </div>

          <div style={{ padding: '20px' }}>
            {/* ПОЛЕ 1 */}
            <div className="swap-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.5, marginBottom: 10 }}>
                <span>{t.give}</span>
                <span onClick={() => setPayAmount((payToken.symbol === 'USDC' ? balance : wallet[payToken.symbol] || 0).toString())} style={{color: DEX_THEMES[activeDex].color}}>{t.max}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.0" className="swap-input" />
                <button onClick={() => setShowTokenList('pay')} className="asset-select">
                  <img src={payToken.icon} width="22" /> {payToken.symbol} ▾
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center', margin: '-15px 0', zIndex: 10 }}>
              <div style={{ backgroundColor: '#000', border: `1px solid ${DEX_THEMES[activeDex].color}`, width: '36px', height: '36px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>↓</div>
            </div>

            {/* ПОЛЕ 2 */}
            <div className="swap-box">
              <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: 10 }}>{t.get}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{payAmount ? ((payAmount * payToken.price) / getToken.price).toFixed(5) : '0.0'}</div>
                <button onClick={() => setShowTokenList('get')} className="asset-select">
                  <img src={getToken.icon} width="22" /> {getToken.symbol} ▾
                </button>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '18px', marginTop: '15px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{opacity: 0.5}}>{t.gas}:</span><span style={{color: '#0CF2B0'}}>$0.11</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{opacity: 0.5}}>{t.route}:</span><span>{payToken.symbol} → {getToken.symbol}</span>
              </div>
            </div>

            <button onClick={handleSwap} disabled={isPending} className="swap-main-btn" style={{ backgroundColor: DEX_THEMES[activeDex].color }}>
              {isPending ? 'Processing...' : t.swap}
            </button>
          </div>
        </div>
      )}

      {/* --- ВЫБОР ТОКЕНА --- */}
      {showTokenList && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 1000, padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 25 }}>
            <h3 style={{ margin: 0 }}>Select Token</h3>
            <button onClick={() => setShowTokenList(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>✕</button>
          </div>
          <div style={{ overflowY: 'auto', height: '80%' }}>
            {Object.values(ASSETS).map(item => (
              <div key={item.symbol} onClick={() => { if(showTokenList === 'pay') setPayToken(item); else setGetToken(item); setShowTokenList(null); }} className="token-item">
                <img src={item.icon} width="32" />
                <div style={{ flex: 1 }}><b>{item.symbol}</b></div>
                <div style={{ opacity: 0.5 }}>${item.price}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ЧЕК --- */}
      {receipt && (
        <div className="receipt-overlay">
          <div className="receipt-card">
            <h2 style={{margin: 0}}>{receipt.pnl >= 0 ? 'Success' : 'Swap Done'}</h2>
            <div style={{ color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b', fontSize: '28px', fontWeight: 'bold', margin: '20px 0' }}>
              {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
            </div>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}} className="close-receipt">OK</button>
          </div>
        </div>
      )}

      <style>{`
        .main-bg-glow { position: absolute; inset: 0; background: radial-gradient(circle at 50% 20%, #111 0%, #000 70%); z-index: 0; }
        .deal-card { background: rgba(12,242,176,0.05); border: 1px solid rgba(12,242,176,0.2); padding: 20px; border-radius: 24px; margin-bottom: 25px; }
        .dex-btn { background: rgba(255,255,255,0.03); border: 1px solid; border-radius: 24px; color: #fff; padding: 25px 0; font-weight: bold; }
        .swap-box { background: rgba(255,255,255,0.05); padding: 20px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.08); }
        .swap-input { background: none; border: none; color: #fff; fontSize: 28px; width: 50%; outline: none; font-weight: bold; }
        .asset-select { background: #222; border: 1px solid #333; color: #fff; padding: 10px 14px; border-radius: 14px; display: flex; align-items: center; gap: 8px; }
        .swap-main-btn { width: 100%; padding: 22px; border: none; border-radius: 24px; color: #fff; font-weight: 900; font-size: 18px; margin-top: 25px; }
        .token-item { display: flex; align-items: center; gap: 15px; padding: 18px; border-bottom: 1px solid #111; }
        .receipt-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justifyContent: center; z-index: 2000; }
        .receipt-card { background: #111; padding: 40px; border-radius: 35px; border: 1px solid #222; text-align: center; width: 80%; }
        .close-receipt { background: #fff; color: #000; border: none; padding: 15px 50px; border-radius: 15px; font-weight: bold; }
      `}</style>

    </div>
  );
}
