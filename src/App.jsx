import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update, set, get } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCKmEa1B4xOdMdNGXBDK2LeOhBQoMqWv40",
  authDomain: "treidgame-b2ae0.firebaseapp.com",
  projectId: "treidgame-b2ae0",
  storageBucket: "treidgame-b2ae0.firebasestorage.app",
  messagingSenderId: "985305772375",
  appId: "1:985305772375:web:08d9b482a6f9d3cd748e12"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  // Конфигурация активов и DEX (без изменений)
  const assets = {
    USDC: { symbol: 'USDC', price: 1, icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg' },
    BTC: { symbol: 'BTC', price: 65000, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg' },
    ETH: { symbol: 'ETH', price: 2600, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg' },
    LINK: { symbol: 'LINK', price: 18.2, icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg' },
    AAVE: { symbol: 'AAVE', price: 145.5, icon: 'https://cryptologos.cc/logos/aave-aave-logo.svg' },
    WPOL: { symbol: 'WPOL', price: 0.72, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg' }
  };

  const DEX_CONFIG = [
    { id: 'UNISWAP', name: 'Uniswap V3', color: '#FF007A', bg: 'linear-gradient(135deg, #FF007A 0%, #4200FF 100%)', logo: '🦄' },
    { id: 'ODOS', name: 'Odos Router', color: '#0CF2B0', bg: 'linear-gradient(135deg, #131A2A 0%, #0CF2B0 200%)', logo: '🦉' },
    { id: 'SUSHI', name: 'SushiSwap', color: '#FA52A0', bg: 'linear-gradient(135deg, #2D264B 0%, #FA52A0 150%)', logo: '🍣' },
    { id: '1INCH', name: '1inch Net', color: '#4C82FB', bg: 'linear-gradient(135deg, #1a2e47 0%, #4C82FB 100%)', logo: '🛡️' }
  ];

  const [balance, setBalance] = useState(1000);
  const [wallet, setWallet] = useState({});
  const [referrals, setReferrals] = useState([]);
  const [activeDex, setActiveDex] = useState(null);
  const [deal, setDeal] = useState(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [payToken, setPayToken] = useState(assets.USDC);
  const [getToken, setGetToken] = useState(assets.BTC);
  const [payAmount, setPayAmount] = useState('');
  const [showTokenList, setShowTokenList] = useState(null);
  const [showRefs, setShowRefs] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [allPlayers, setAllPlayers] = useState({}); // Для админки
  const [isPending, setIsPending] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [clicks, setClicks] = useState([]);

  const webApp = window.Telegram?.WebApp;
  const user = webApp?.initDataUnsafe?.user;
  const userId = user?.id?.toString() || 'Guest';
  const isAdmin = user?.username === 'vladstelin78';

  // Синхронизация своего профиля
  useEffect(() => {
    if (userId === 'Guest') return;
    onValue(ref(db, `players/${userId}`), (s) => {
      if (s.exists()) {
        setBalance(s.val().balanceUSDC ?? 1000);
        setWallet(s.val().wallet || {});
      }
    });
    onValue(ref(db, `referrals/${userId}`), (s) => {
      if (s.exists()) setReferrals(Object.values(s.val()));
    });
  }, [userId]);

  // Загрузка всех игроков для админа
  useEffect(() => {
    if (isAdmin && showAdmin) {
      onValue(ref(db, `players`), (s) => {
        if (s.exists()) setAllPlayers(s.val());
      });
    }
  }, [isAdmin, showAdmin]);

  const generateDeal = () => {
    const keys = ['BTC', 'ETH', 'LINK', 'AAVE', 'WPOL'];
    const bIdx = Math.floor(Math.random() * DEX_CONFIG.length);
    let sIdx = Math.floor(Math.random() * DEX_CONFIG.length);
    while (sIdx === bIdx) sIdx = Math.floor(Math.random() * DEX_CONFIG.length);
    setDeal({ 
      coin: assets[keys[Math.floor(Math.random() * keys.length)]], 
      buyAt: DEX_CONFIG[bIdx], sellAt: DEX_CONFIG[sIdx], 
      profit: (Math.random() * 0.5 + 2.5).toFixed(2) 
    });
    setTimeLeft(120);
  };

  useEffect(() => { if (!deal) generateDeal(); }, []);
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(p => p <= 1 ? (generateDeal() || 120) : p - 1), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSwap = (e) => {
    const amt = Number(payAmount);
    const max = payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0);
    if (!amt || amt <= 0 || amt > max) return;
    setIsPending(true);
    setTimeout(() => {
      let receiveAmt = (amt * payToken.price) / getToken.price;
      let pnl = null;
      if (getToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        const isOk = activeDex.id === deal.sellAt.id && payToken.symbol === deal.coin.symbol;
        receiveAmt *= isOk ? (1 + Number(deal.profit)/100) : (1 - 0.015);
        pnl = receiveAmt - (amt * payToken.price);
        if (isOk) generateDeal();
      }
      const newB = payToken.symbol === 'USDC' ? balance - amt : (getToken.symbol === 'USDC' ? balance + receiveAmt : balance);
      const newW = { ...wallet };
      if (payToken.symbol !== 'USDC') newW[payToken.symbol] = (newW[payToken.symbol] || 0) - amt;
      if (getToken.symbol !== 'USDC') newW[getToken.symbol] = (newW[getToken.symbol] || 0) + receiveAmt;
      update(ref(db, `players/${userId}`), { balanceUSDC: newB, wallet: newW });
      setReceipt({ pnl, get: receiveAmt, to: getToken.symbol, isPurchase: payToken.symbol === 'USDC' });
      setIsPending(false); setPayAmount('');
    }, 1500);
  };

  // Админ-действия
  const updatePlayerBalance = (pId, newBal) => {
    if (!newBal || isNaN(newBal)) return;
    update(ref(db, `players/${pId}`), { balanceUSDC: Number(newBal) });
  };

  return (
    <div className="app-container">
      <div className={`viewport ${activeDex || showRefs || showAdmin || receipt || showTokenList ? 'is-modal-open' : ''}`}>
        <header className="main-nav">
          <div className="wallet-pill"><span>${balance.toFixed(2)}</span></div>
          <div className="nav-btns">
            {isAdmin && <button onClick={() => setShowAdmin(true)} className="admin-btn">🔧 PANEL</button>}
            <button onClick={() => setShowRefs(true)} className="ref-btn">👥 FRIENDS</button>
          </div>
        </header>

        <div className="hero-block">
          <div className="hero-sub">Current Balance</div>
          <div className="hero-main">${balance.toLocaleString()}</div>
        </div>

        {deal && (
          <div className="arbitrage-card">
            <div className="arb-header"><span className="live-tag">● SIGNAL</span><span className="yield">+{deal.profit}%</span></div>
            <div className="arb-route">
              <div className="node"><small>BUY</small><b>{deal.buyAt.name}</b></div>
              <div className="asset">{deal.coin.symbol}</div>
              <div className="node"><small>SELL</small><b>{deal.sellAt.name}</b></div>
            </div>
          </div>
        )}

        <div className="dex-grid">
          {DEX_CONFIG.map(dex => (
            <div key={dex.id} className="dex-card" onClick={() => setActiveDex(dex)}>
              <div className="dex-bg" style={{background: dex.bg}}></div>
              <div className="dex-inner"><span>{dex.logo}</span><h3>{dex.name}</h3></div>
            </div>
          ))}
        </div>
      </div>

      {/* АДМИН ПАНЕЛЬ (ПОЛНАЯ) */}
      {showAdmin && (
        <div className="full-modal admin-screen">
          <div className="modal-top">
            <button onClick={() => setShowAdmin(false)}>✕</button>
            <span>МЕНЕДЖЕР ИГРОКОВ</span>
            <div style={{width:30}}></div>
          </div>
          <div className="admin-content">
            <div className="stats-bar">Всего игроков: {Object.keys(allPlayers).length}</div>
            <div className="player-list">
              {Object.entries(allPlayers).map(([pId, pData]) => (
                <div key={pId} className="player-card">
                  <div className="p-info">
                    <span className="p-user">@{pData.username || 'Unknown'}</span>
                    <span className="p-id">ID: {pId}</span>
                  </div>
                  <div className="p-actions">
                    <input 
                      type="number" 
                      defaultValue={pData.balanceUSDC?.toFixed(0)} 
                      onBlur={(e) => updatePlayerBalance(pId, e.target.value)}
                    />
                    <small>USDC</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* РЕФЕРАЛКА */}
      {showRefs && (
        <div className="full-modal">
          <div className="modal-top"><button onClick={() => setShowRefs(false)}>✕</button><span>Friends</span><div style={{width:30}}></div></div>
          <div className="ref-body">
            <div className="ref-promo">
              <h3>Пригласи друга</h3>
              <code>https://t.me/Kryptoapp_bot?start={userId}</code>
              <button onClick={() => navigator.clipboard.writeText(`https://t.me/Kryptoapp_bot?start=${userId}`)}>COPY LINK</button>
            </div>
            <div className="ref-list">
              {referrals.map((r, i) => <div key={i} className="ref-row">@{r.username} <b>+$1,000</b></div>)}
            </div>
          </div>
        </div>
      )}

      {/* ОСТАЛЬНЫЕ МОДАЛКИ (DEX, TOKEN LIST, RECEIPT) - ОСТАВИТЬ КАК В ПРОШЛОМ КОДЕ */}
      {/* ... Код для activeDex, showTokenList, receipt ... */}

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; }
        body { background: #000; color: #fff; }
        .viewport { padding: 20px; transition: 0.3s; }
        .is-modal-open { filter: blur(10px); pointer-events: none; }
        .main-nav { display: flex; justify-content: space-between; }
        .wallet-pill { background: #111; padding: 8px 15px; border-radius: 20px; color: #0CF2B0; font-weight: bold; border: 1px solid #222; }
        .nav-btns { display: flex; gap: 5px; }
        .admin-btn { background: #ff9500; color: #000; border: none; border-radius: 10px; padding: 5px 10px; font-weight: bold; }
        .ref-btn { background: #fff; color: #000; border: none; border-radius: 10px; padding: 5px 10px; font-weight: bold; }
        .hero-block { text-align: center; padding: 30px 0; }
        .hero-main { font-size: 40px; font-weight: 900; }
        .dex-grid { display: grid; gap: 10px; }
        .dex-card { position: relative; height: 70px; border-radius: 15px; overflow: hidden; display: flex; align-items: center; padding: 0 20px; }
        .dex-inner { position: relative; z-index: 2; display: flex; align-items: center; gap: 10px; }
        .full-modal { position: fixed; inset: 0; background: #000; z-index: 1000; display: flex; flex-direction: column; }
        .modal-top { padding: 20px; display: flex; justify-content: space-between; border-bottom: 1px solid #222; }
        .admin-content { padding: 20px; overflow-y: auto; }
        .stats-bar { background: #111; padding: 15px; border-radius: 10px; margin-bottom: 20px; color: #0CF2B0; font-weight: bold; }
        .player-card { background: #080808; border: 1px solid #222; padding: 15px; border-radius: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .p-user { display: block; font-weight: bold; }
        .p-id { font-size: 10px; opacity: 0.5; }
        .p-actions { display: flex; align-items: center; gap: 5px; }
        .p-actions input { width: 80px; background: #1a1a1a; border: 1px solid #333; color: #0CF2B0; padding: 5px; border-radius: 5px; font-weight: bold; text-align: center; }
        .ref-promo { background: #111; padding: 20px; border-radius: 20px; text-align: center; margin-bottom: 20px; }
        .ref-promo code { display: block; font-size: 9px; margin: 10px 0; opacity: 0.5; }
        .ref-promo button { background: #0CF2B0; border: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; }
      `}</style>
    </div>
  );
}
