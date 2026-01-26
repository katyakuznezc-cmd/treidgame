import React, { useState, useEffect, useMemo } from 'react';
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
  const [payToken, setPayToken] = useState(ASSETS.USDC);
  const [getToken, setGetToken] = useState(ASSETS.BTC);
  const [payAmount, setPayAmount] = useState('');
  const [showTokenList, setShowTokenList] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const t = {
    RU: { bal: "БАЛАНС", deal: "ТОРГОВАЯ СДЕЛКА", history: "ЖИВАЯ ЛЕНТА", give: "Вы отдаете", get: "Вы получаете", swap: "Обменять", max: "МАКС", settings: "Настройки", creators: "Создатели", lang: "Язык" },
    EN: { bal: "BALANCE", deal: "TRADE DEAL", history: "LIVE FEED", give: "You give", get: "You receive", swap: "Swap", max: "MAX", settings: "Settings", creators: "Creators", lang: "Language" }
  }[lang];

  const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || 'Guest';

  useEffect(() => {
    onValue(ref(db, `players/${userId}`), (s) => {
      if (s.exists()) {
        setBalance(s.val().balanceUSDC || 1000);
        setWallet(s.val().wallet || {});
      }
    });
  }, [userId]);

  useEffect(() => {
    if (!deal) {
      const keys = ['BTC', 'ETH', 'LINK', 'AAVE', 'CRV', 'WPOL'];
      setDeal({ coin: ASSETS[keys[Math.floor(Math.random()*keys.length)]], sellAt: 'ODOS', profit: (Math.random()*0.8+2.1).toFixed(2) });
    }
  }, [deal]);

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
        if (isCorrect) setDeal(null);
      }
      const newBalance = payToken.symbol === 'USDC' ? balance - amount : (getToken.symbol === 'USDC' ? balance + receiveAmount : balance);
      const newWallet = { ...wallet };
      if (payToken.symbol !== 'USDC') newWallet[payToken.symbol] = (newWallet[payToken.symbol] || 0) - amount;
      if (getToken.symbol !== 'USDC') newWallet[getToken.symbol] = (newWallet[getToken.symbol] || 0) + receiveAmount;
      update(ref(db, `players/${userId}`), { balanceUSDC: newBalance, wallet: newWallet });
      setReceipt({ pnl, get: receiveAmount });
      setIsPending(false); setPayAmount('');
    }, 1500);
  };

  return (
    <div style={{ backgroundColor: '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* ФОНОВЫЕ ЭФФЕКТЫ (НЕОНОВЫЕ ЛИНИИ) */}
      <div className="bg-container">
        <div className="neon-line l1"></div>
        <div className="neon-line l2"></div>
        <div className="noise"></div>
      </div>

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <header style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#0CF2B0', fontWeight: 'bold', fontSize: '12px' }}>{t.bal}</div>
          <button onClick={() => setView('settings')} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid #333', color: '#fff', borderRadius: '12px', padding: '10px 15px', cursor: 'pointer' }}>⚙️</button>
        </header>

        <main style={{ flex: 1, padding: '0 20px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '56px', fontWeight: '900', margin: '40px 0 10px' }}>${balance.toFixed(2)}</h1>
          <p style={{ opacity: 0.3, fontSize: '11px', letterSpacing: '3px', marginBottom: '40px' }}>MAIN ACCOUNT</p>

          {deal && (
            <div className="deal-box">
              <div style={{ color: '#0CF2B0', fontSize: '10px', fontWeight: 'bold' }}>{t.deal}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <b>{deal.coin.symbol} → {deal.sellAt}</b>
                <span style={{ color: '#0CF2B0' }}>+{deal.profit}%</span>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '30px' }}>
            {Object.keys(DEX_THEMES).map(k => (
              <button key={k} onClick={() => setActiveDex(k)} className="dex-card-main">
                <div style={{ color: DEX_THEMES[k].color, fontSize: '10px', marginBottom: '5px' }}>MARKET</div>
                {DEX_THEMES[k].name}
              </button>
            ))}
          </div>
        </main>
      </div>

      {/* --- ЭКРАН БИРЖИ (ПОЛНАЯ ИЗОЛЯЦИЯ) --- */}
      {activeDex && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: DEX_THEMES[activeDex].bg, zIndex: 1000, display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease-out' }}>
          <header style={{ padding: '20px', display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>✕</button>
            <div style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', color: DEX_THEMES[activeDex].color }}>{DEX_THEMES[activeDex].name}</div>
          </header>

          <div style={{ padding: '20px' }}>
            <div className="swap-box-v2">
              <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.5, fontSize: '12px', marginBottom: '10px' }}>
                <span>{t.give}</span>
                <span onClick={() => setPayAmount((payToken.symbol === 'USDC' ? balance : wallet[payToken.symbol] || 0).toString())} style={{color: DEX_THEMES[activeDex].color, fontWeight: 'bold'}}>{t.max}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.0" className="sw-input" />
                <button onClick={() => setShowTokenList('pay')} className="sw-select"><img src={payToken.icon} width="20"/> {payToken.symbol}</button>
              </div>
            </div>

            <div style={{ textAlign: 'center', margin: '-10px 0', position: 'relative', zIndex: 2 }}>
              <div style={{ background: '#000', border: `2px solid ${DEX_THEMES[activeDex].color}`, width: '40px', height: '40px', borderRadius: '50%', margin: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</div>
            </div>

            <div className="swap-box-v2">
              <div style={{ opacity: 0.5, fontSize: '12px', marginBottom: '10px' }}>{t.get}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(5) : '0.0'}</div>
                <button onClick={() => setShowTokenList('get')} className="sw-select"><img src={getToken.icon} width="20"/> {getToken.symbol}</button>
              </div>
            </div>

            <button onClick={handleSwap} disabled={isPending} className="sw-btn" style={{ background: DEX_THEMES[activeDex].color }}>{isPending ? '...' : t.swap}</button>
          </div>
        </div>
      )}

      {/* --- НАСТРОЙКИ (ИСПРАВЛЕНО) --- */}
      {view === 'settings' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 2000, padding: '30px', animation: 'fadeIn 0.2s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <h2 style={{ margin: 0 }}>{t.settings}</h2>
            <button onClick={() => setView('main')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>✕</button>
          </div>
          <button onClick={() => setLang(l => l === 'RU' ? 'EN' : 'RU')} style={sBtn}>🌐 {t.lang}: {lang}</button>
          <button onClick={() => window.open('https://t.me/kriptoalians')} style={sBtn}>👥 {t.creators}: @kriptoalians</button>
        </div>
      )}

      {/* --- ВЫБОР ТОКЕНА (ИСПРАВЛЕНО) --- */}
      {showTokenList && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 3000, padding: '20px' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3>Tokens</h3>
            <button onClick={() => setShowTokenList(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>✕</button>
          </header>
          {Object.values(ASSETS).map(a => (
            <div key={a.symbol} onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }} className="t-row">
              <img src={a.icon} width="30"/>
              <div style={{flex:1, marginLeft: '15px'}}><b>{a.symbol}</b></div>
              <div style={{opacity: 0.5}}>${a.price}</div>
            </div>
          ))}
        </div>
      )}

      {/* --- ЧЕК --- */}
      {receipt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#111', padding: '40px', borderRadius: '30px', textAlign: 'center', border: '1px solid #222' }}>
            <h2>Success</h2>
            <div style={{ color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b', fontSize: '32px', fontWeight: 'bold', margin: '20px 0' }}>{receipt.pnl.toFixed(2)} USDC</div>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}} style={{ background: '#fff', padding: '15px 40px', borderRadius: '12px', border: 'none', fontWeight: 'bold' }}>OK</button>
          </div>
        </div>
      )}

      <style>{`
        .bg-container { position: absolute; inset: 0; overflow: hidden; z-index: 0; }
        .neon-line { position: absolute; background: linear-gradient(90deg, transparent, #0CF2B0, transparent); height: 1px; width: 100%; opacity: 0.1; }
        .l1 { top: 30%; animation: moveLine 8s infinite linear; }
        .l2 { top: 70%; animation: moveLine 12s infinite linear reverse; }
        @keyframes moveLine { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
        .noise { position: absolute; inset: 0; background: url('https://grainy-gradients.vercel.app/noise.svg'); opacity: 0.05; pointer-events: none; }
        
        .deal-box { background: rgba(12,242,176,0.05); border: 1px solid rgba(12,242,176,0.2); padding: 20px; border-radius: 20px; }
        .dex-card-main { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 25px; border-radius: 20px; color: #fff; font-weight: bold; }
        
        .swap-box-v2 { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 20px; border-radius: 24px; margin: 10px 0; }
        .sw-input { background: none; border: none; color: #fff; font-size: 24px; width: 60%; outline: none; font-weight: bold; }
        .sw-select { background: #222; border: 1px solid #333; color: #fff; padding: 8px 12px; border-radius: 12px; display: flex; align-items: center; gap: 8px; }
        .sw-btn { width: 100%; padding: 20px; border-radius: 20px; border: none; color: #fff; font-weight: 900; font-size: 18px; margin-top: 20px; }
        .t-row { display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #111; }
        
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

const sBtn = { width: '100%', padding: '20px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid #333', borderRadius: '15px', marginBottom: '10px', textAlign: 'left', fontWeight: 'bold' };
