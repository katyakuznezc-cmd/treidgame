import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update } from "firebase/database";

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
  const [assets] = useState({
    USDC: { symbol: 'USDC', price: 1, icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg' },
    BTC: { symbol: 'BTC', price: 65000, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg' },
    ETH: { symbol: 'ETH', price: 2600, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg' },
    LINK: { symbol: 'LINK', price: 18.2, icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg' },
    AAVE: { symbol: 'AAVE', price: 145.5, icon: 'https://cryptologos.cc/logos/aave-aave-logo.svg' },
    WPOL: { symbol: 'WPOL', price: 0.72, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg' }
  });

  const DEX_CONFIG = [
    { id: 'UNISWAP', name: 'Uniswap V3', color: '#FF007A', bg: 'linear-gradient(135deg, #FF007A 0%, #4200FF 100%)', logo: '🦄', status: 'High Liquidity' },
    { id: 'ODOS', name: 'Odos Router', color: '#0CF2B0', bg: 'linear-gradient(135deg, #131A2A 0%, #0CF2B0 200%)', logo: '🦉', status: 'Optimal Route' },
    { id: 'SUSHI', name: 'SushiSwap', color: '#FA52A0', bg: 'linear-gradient(135deg, #2D264B 0%, #FA52A0 150%)', logo: '🍣', status: 'Multi-chain' },
    { id: '1INCH', name: '1inch Net', color: '#4C82FB', bg: 'linear-gradient(135deg, #1a2e47 0%, #4C82FB 100%)', logo: '🛡️', status: 'Aggregator' }
  ];

  const [balance, setBalance] = useState(1000);
  const [wallet, setWallet] = useState({});
  const [referrals, setReferrals] = useState([]);
  const [activeDex, setActiveDex] = useState(null);
  const [deal, setDeal] = useState(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [payToken, setPayToken] = useState(null);
  const [getToken, setGetToken] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [showTokenList, setShowTokenList] = useState(null);
  const [showRefs, setShowRefs] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [allPlayers, setAllPlayers] = useState({});
  const [isPending, setIsPending] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [clicks, setClicks] = useState([]);

  const webApp = window.Telegram?.WebApp;
  const user = webApp?.initDataUnsafe?.user;
  const userId = user?.id?.toString() || 'Guest';
  
  // ОБНОВЛЕННЫЙ ЮЗЕР ДЛЯ АДМИНКИ
  const isAdmin = user?.username === 'crypto_mngr66';

  useEffect(() => {
    setPayToken(assets.USDC);
    setGetToken(assets.BTC);
    webApp?.expand();
  }, [assets]);

  useEffect(() => {
    if (userId === 'Guest') return;
    onValue(ref(db, `players/${userId}`), (s) => {
      if (s.exists()) {
        setBalance(s.val().balanceUSDC ?? 1000);
        setWallet(s.val().wallet || {});
      } else {
        update(ref(db, `players/${userId}`), { balanceUSDC: 1000, wallet: {}, username: user?.username || 'Guest' });
      }
    });
    onValue(ref(db, `referrals/${userId}`), (s) => {
      if (s.exists()) setReferrals(Object.values(s.val()));
    });
  }, [userId, user]);

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

  useEffect(() => { if (!deal) generateDeal(); }, [deal]);
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(p => p <= 1 ? (generateDeal() || 120) : p - 1), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSwap = (e) => {
    const amt = Number(payAmount);
    const max = payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0);
    if (!amt || amt <= 0 || amt > max) return;

    // Звук клика
    new Audio('https://www.soundjay.com/buttons/button-16.mp3').play().catch(()=>{});
    
    // Эффект доллара
    const touch = e.touches ? e.touches[0] : e;
    const id = Date.now();
    setClicks(p => [...p, { id, x: touch.clientX, y: touch.clientY }]);
    setTimeout(() => setClicks(p => p.filter(c => c.id !== id)), 800);

    setIsPending(true);
    setTimeout(() => {
      let receiveAmt = (amt * payToken.price) / getToken.price;
      let pnl = null;
      if (getToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        const isOk = activeDex.id === deal.sellAt.id && payToken.symbol === deal.coin.symbol;
        receiveAmt *= isOk ? (1 + Number(deal.profit)/100) : (1 - (Math.random() * 0.015));
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
    }, 2000);
  };

  const updatePlayerBalance = (pId, newBal) => {
    if (!newBal || isNaN(newBal)) return;
    update(ref(db, `players/${pId}`), { balanceUSDC: Number(newBal) });
  };

  if (!payToken || !getToken) return null;

  return (
    <div className="app-container">
      <div className={`viewport ${activeDex || showRefs || showAdmin || receipt || showTokenList ? 'is-modal-open' : ''}`}>
        <header className="main-nav">
          <div className="wallet-pill"><span>${balance.toFixed(2)}</span></div>
          <div className="nav-btns">
            {isAdmin && <button onClick={() => setShowAdmin(true)} className="admin-btn">🔧 ADMIN</button>}
            <button onClick={() => setShowRefs(true)} className="ref-btn">👥 FRIENDS</button>
            <button onClick={() => window.open('https://t.me/crypto_mngr66')} className="mgr-btn">MANAGER</button>
          </div>
        </header>

        <div className="hero-block">
          <div className="hero-sub">Live Total Balance</div>
          <div className="hero-main">${balance.toLocaleString()}</div>
        </div>

        {deal && (
          <div className="arbitrage-card">
            <div className="arb-header"><span className="live-tag">● SIGNAL LIVE</span><span className="yield">+{deal.profit}%</span></div>
            <div className="arb-route">
              <div className="node"><small>BUY</small><b style={{color: deal.buyAt.color}}>{deal.buyAt.name}</b></div>
              <div className="asset">{deal.coin.symbol}</div>
              <div className="node"><small>SELL</small><b style={{color: deal.sellAt.color}}>{deal.sellAt.name}</b></div>
            </div>
            <div className="timer-bar"><div className="progress" style={{width: `${(timeLeft/120)*100}%`}}></div></div>
          </div>
        )}

        <div className="dex-grid">
          {DEX_CONFIG.map(dex => (
            <div key={dex.id} className="dex-card" onClick={() => setActiveDex(dex)}>
              <div className="dex-bg" style={{background: dex.bg}}></div>
              <div className="dex-inner"><span className="dex-logo">{dex.logo}</span><div><h3>{dex.name}</h3><small>{dex.status}</small></div><span className="dex-arr">→</span></div>
            </div>
          ))}
        </div>
      </div>

      {showAdmin && (
        <div className="full-modal admin-screen">
          <div className="modal-top"><button onClick={() => setShowAdmin(false)}>✕</button><span>MANAGER PANEL</span><div style={{width:30}}></div></div>
          <div className="admin-body">
            <div className="admin-stats">Active Players: {Object.keys(allPlayers).length}</div>
            <div className="player-scroll">
              {Object.entries(allPlayers).map(([pId, pData]) => (
                <div key={pId} className="admin-player-card">
                  <div className="p-meta"><b>@{pData.username || 'Guest'}</b><small>ID: {pId}</small></div>
                  <div className="p-edit">
                    <input type="number" defaultValue={pData.balanceUSDC?.toFixed(2)} onBlur={(e) => updatePlayerBalance(pId, e.target.value)} />
                    <span>$</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Модалки DEX, Рефералы и прочее остаются без изменений по логике, но с новым дизайном */}
      {activeDex && (
        <div className="full-modal">
          <div className="modal-top"><button onClick={() => setActiveDex(null)}>✕</button><span>{activeDex.name} Swap</span><div style={{width:30}}></div></div>
          <div className="swap-box">
             <div className="input-group">
                <label>PAY <span onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))}>MAX</span></label>
                <div className="row">
                  <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                  <div className="token" onClick={() => setShowTokenList('pay')}><img src={payToken.icon} alt="" /> {payToken.symbol}</div>
                </div>
             </div>
             <div className="divider">↓</div>
             <div className="input-group">
                <label>RECEIVE</label>
                <div className="row">
                  <div className="val">{(payAmount * payToken.price / getToken.price).toFixed(6)}</div>
                  <div className="token" onClick={() => setShowTokenList('get')}><img src={getToken.icon} alt="" /> {getToken.symbol}</div>
                </div>
             </div>
             <button className="swap-btn" style={{background: activeDex.bg}} onClick={handleSwap} disabled={isPending}>{isPending ? 'WAIT...' : 'CONFIRM'}</button>
          </div>
        </div>
      )}

      {/* Отрисовка клика доллара */}
      {clicks.map(c => <div key={c.id} className="click-pop" style={{left: c.x, top: c.y}}>$</div>)}

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, sans-serif; }
        body { background: #000; color: #fff; overflow: hidden; }
        .app-container { width: 100vw; height: 100vh; position: relative; background: #000; }
        .viewport { padding: 20px; transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1); height: 100%; overflow-y: auto; }
        .is-modal-open { filter: blur(20px) scale(0.95); opacity: 0.5; pointer-events: none; }
        .main-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .wallet-pill { background: rgba(255,255,255,0.05); padding: 10px 18px; border-radius: 20px; font-weight: 900; color: #0CF2B0; border: 1px solid rgba(255,255,255,0.1); }
        .nav-btns { display: flex; gap: 8px; }
        .admin-btn { background: #FF9500; color: #000; border: none; padding: 8px 12px; border-radius: 10px; font-weight: 900; font-size: 10px; }
        .ref-btn, .mgr-btn { background: #fff; color: #000; border: none; padding: 8px 12px; border-radius: 10px; font-weight: 900; font-size: 10px; }
        .hero-block { text-align: center; padding: 30px 0; }
        .hero-main { font-size: 48px; font-weight: 900; background: linear-gradient(to bottom, #fff, #777); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .arbitrage-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 20px; border-radius: 28px; margin-bottom: 25px; backdrop-filter: blur(10px); }
        .yield { background: #0CF2B0; color: #000; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 900; }
        .dex-card { position: relative; padding: 25px; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 10px; }
        .dex-bg { position: absolute; inset: 0; opacity: 0.6; z-index: 1; }
        .dex-inner { position: relative; z-index: 2; display: flex; align-items: center; gap: 15px; }
        .full-modal { position: fixed; inset: 0; background: #000; z-index: 100; display: flex; flex-direction: column; }
        .modal-top { padding: 20px; display: flex; justify-content: space-between; border-bottom: 1px solid #111; font-weight: 900; }
        .modal-top button { background: #111; border: none; color: #fff; width: 35px; height: 35px; border-radius: 50%; }
        .swap-box { padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
        .input-group { background: #080808; padding: 20px; border-radius: 24px; border: 1px solid #1a1a1a; }
        .token { background: #1a1a1a; padding: 8px 12px; border-radius: 14px; display: flex; align-items: center; gap: 8px; font-weight: 900; border: 1px solid #333; }
        .token img { width: 20px; }
        .swap-btn { width: 100%; padding: 22px; border: none; border-radius: 22px; color: #fff; font-weight: 900; margin-top: 20px; font-size: 16px; }
        .click-pop { position: fixed; color: #0CF2B0; font-weight: 900; font-size: 35px; pointer-events: none; animation: pop 0.8s ease-out forwards; z-index: 1000; text-shadow: 0 0 10px rgba(12, 242, 176, 0.5); }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-150px); } }
        .admin-player-card { background: #080808; padding: 15px; border-radius: 18px; border: 1px solid #111; display: flex; justify-content: space-between; margin-bottom: 8px; }
        .p-edit input { background: #111; border: 1px solid #333; color: #0CF2B0; padding: 5px; width: 90px; text-align: right; border-radius: 8px; font-weight: 900; }
      `}</style>
    </div>
  );
}
