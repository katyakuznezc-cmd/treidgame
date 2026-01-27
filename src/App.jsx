import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update, get } from "firebase/database";

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
  const [assets, setAssets] = useState({
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
  const [isPending, setIsPending] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [clicks, setClicks] = useState([]);

  const webApp = window.Telegram?.WebApp;
  const user = webApp?.initDataUnsafe?.user;
  const userId = user?.id?.toString() || 'Guest';

  useEffect(() => {
    setPayToken(assets.USDC);
    setGetToken(assets.BTC);
    webApp?.expand();
  }, []);

  // Синхронизация данных с Firebase
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
    // Загрузка рефералов
    onValue(ref(db, `referrals/${userId}`), (s) => {
      if (s.exists()) setReferrals(Object.values(s.val()));
    });
  }, [userId]);

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

    // Звук и клик
    new Audio('https://www.soundjay.com/buttons/button-16.mp3').play().catch(()=>{});
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
    }, 2000);
  };

  return (
    <div className="app-container">
      <div className={`viewport ${activeDex || showRefs || receipt || showTokenList ? 'is-modal-open' : ''}`}>
        <header className="main-nav">
          <div className="wallet-pill"><span>${balance.toFixed(2)}</span></div>
          <div className="nav-btns">
            <button onClick={() => setShowRefs(true)} className="ref-btn">👥 FRIENDS</button>
            <button onClick={() => window.open('https://t.me/vladstelin78')} className="mgr-btn">MANAGER</button>
          </div>
        </header>

        <div className="hero-block">
          <div className="hero-sub">Live Balance</div>
          <div className="hero-main">${balance.toLocaleString()}</div>
        </div>

        {deal && (
          <div className="arbitrage-card">
            <div className="arb-header">
              <span className="live-tag">● SIGNAL LIVE</span>
              <span className="yield">+{deal.profit}%</span>
            </div>
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
              <div className="dex-inner">
                <span className="dex-logo">{dex.logo}</span>
                <div><h3>{dex.name}</h3><small>{dex.status}</small></div>
                <span className="dex-arr">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeDex && (
        <div className="full-modal">
          <div className="modal-top">
            <button onClick={() => setActiveDex(null)}>✕</button>
            <span>{activeDex.name}</span>
            <div style={{width:30}}></div>
          </div>
          <div className="swap-box">
             <div className="input-group">
                <label>PAY <span onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))}>MAX</span></label>
                <div className="row">
                  <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                  <div className="token" onClick={() => setShowTokenList('pay')}><img src={payToken.icon} /> {payToken.symbol}</div>
                </div>
             </div>
             <div className="divider">↓</div>
             <div className="input-group">
                <label>RECEIVE</label>
                <div className="row">
                  <div className="val">{(payAmount * payToken.price / getToken.price).toFixed(6)}</div>
                  <div className="token" onClick={() => setShowTokenList('get')}><img src={getToken.icon} /> {getToken.symbol}</div>
                </div>
             </div>
             <button className="swap-btn" style={{background: activeDex.bg}} onClick={handleSwap} disabled={isPending}>
               {isPending ? 'PROCESSING...' : 'CONFIRM SWAP'}
             </button>
          </div>
        </div>
      )}

      {showRefs && (
        <div className="full-modal">
          <div className="modal-top"><button onClick={() => setShowRefs(false)}>✕</button><span>Friends</span><div style={{width:30}}></div></div>
          <div className="ref-body">
            <div className="ref-promo">
              <h3>Invite & Earn</h3>
              <p>Get $1,000 for every friend!</p>
              <div className="ref-link">
                <code>t.me/ТУТ_ИМЯ_ТВОЕГО_БОТА?start={userId}</code>
                <button onClick={() => {
                  navigator.clipboard.writeText(`https://t.me/ТУТ_ИМЯ_ТВОЕГО_БОТА?start=${userId}`);
                  alert("Copied!");
                }}>COPY</button>
              </div>
            </div>
            <div className="ref-list">
               <label>YOUR FRIENDS ({referrals.length})</label>
               {referrals.map((r, i) => (
                 <div key={i} className="ref-row"><span>@{r.username}</span><b style={{color: '#0CF2B0'}}>+$1,000</b></div>
               ))}
               {referrals.length === 0 && <div className="empty">No friends yet</div>}
            </div>
          </div>
        </div>
      )}

      {showTokenList && (
        <div className="sheet-box">
           <div className="sheet-content">
             <div className="sheet-h">Select Token <button onClick={() => setShowTokenList(null)}>✕</button></div>
             {Object.values(assets).map(a => (
               <div key={a.symbol} className="t-item" onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }}>
                 <img src={a.icon} /> <span>{a.symbol}</span>
                 <div className="t-bal">{a.symbol === 'USDC' ? balance.toFixed(2) : (wallet[a.symbol] || 0).toFixed(4)}</div>
               </div>
             ))}
           </div>
        </div>
      )}

      {receipt && (
        <div className="receipt">
          <div className="r-card">
            <div className="r-icon">✓</div>
            <h2>Transaction Done</h2>
            <div className="r-amt" style={{color: receipt.pnl < 0 ? '#ff4b4b' : '#0CF2B0'}}>
              {receipt.isPurchase ? `+${receipt.get.toFixed(4)} ${receipt.to}` : (receipt.pnl >= 0 ? `+$${receipt.pnl.toFixed(2)}` : `-$${Math.abs(receipt.pnl).toFixed(2)}`)}
            </div>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}}>BACK TO TERMINAL</button>
          </div>
        </div>
      )}

      {clicks.map(c => <div key={c.id} className="click-pop" style={{left: c.x, top: c.y}}>$</div>)}

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, sans-serif; }
        body { background: #000; color: #fff; overflow: hidden; }
        .app-container { width: 100vw; height: 100vh; position: relative; }
        .viewport { padding: 20px; transition: 0.3s; height: 100%; overflow-y: auto; }
        .is-modal-open { filter: blur(15px) scale(0.95); pointer-events: none; }
        .main-nav { display: flex; justify-content: space-between; align-items: center; }
        .wallet-pill { background: #111; padding: 10px 20px; border-radius: 20px; font-weight: 900; color: #0CF2B0; border: 1px solid #222; }
        .nav-btns { display: flex; gap: 8px; }
        .ref-btn, .mgr-btn { background: #fff; color: #000; border: none; padding: 8px 12px; border-radius: 10px; font-weight: 900; font-size: 10px; }
        .hero-block { text-align: center; padding: 40px 0; }
        .hero-sub { opacity: 0.4; font-size: 12px; font-weight: 800; text-transform: uppercase; }
        .hero-main { font-size: 45px; font-weight: 900; margin-top: 5px; }
        .arbitrage-card { background: #080808; border: 1px solid #1a1a1a; padding: 20px; border-radius: 24px; margin-bottom: 25px; }
        .arb-header { display: flex; justify-content: space-between; font-size: 11px; font-weight: 900; margin-bottom: 15px; }
        .live-tag { color: #0CF2B0; }
        .arb-route { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .node small { display: block; opacity: 0.3; margin-bottom: 4px; }
        .asset { background: #1a1a1a; padding: 8px 15px; border-radius: 12px; font-weight: 900; border: 1px solid #333; }
        .timer-bar { height: 4px; background: #111; border-radius: 2px; overflow: hidden; }
        .progress { height: 100%; background: #0CF2B0; transition: width 1s linear; }
        .dex-grid { display: flex; flex-direction: column; gap: 10px; }
        .dex-card { position: relative; padding: 20px; border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
        .dex-bg { position: absolute; inset: 0; opacity: 0.8; z-index: 1; }
        .dex-inner { position: relative; z-index: 2; display: flex; align-items: center; gap: 15px; }
        .dex-logo { font-size: 24px; }
        .dex-inner h3 { font-size: 16px; font-weight: 900; }
        .dex-arr { margin-left: auto; opacity: 0.3; }
        .full-modal { position: fixed; inset: 0; background: #000; z-index: 100; display: flex; flex-direction: column; }
        .modal-top { padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #111; font-weight: 900; }
        .modal-top button { background: none; border: none; color: #fff; font-size: 20px; }
        .swap-box { padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
        .input-group { background: #080808; padding: 20px; border-radius: 20px; border: 1px solid #111; }
        .input-group label { font-size: 10px; font-weight: 900; color: #444; display: flex; justify-content: space-between; margin-bottom: 10px; }
        .row { display: flex; justify-content: space-between; align-items: center; }
        .row input, .val { background: none; border: none; color: #fff; font-size: 24px; font-weight: 900; outline: none; width: 60%; }
        .token { background: #1a1a1a; padding: 8px 12px; border-radius: 12px; display: flex; align-items: center; gap: 8px; font-weight: 900; font-size: 14px; }
        .token img { width: 18px; }
        .divider { text-align: center; padding: 10px; opacity: 0.2; }
        .swap-btn { width: 100%; padding: 20px; border: none; border-radius: 20px; color: #fff; font-weight: 900; margin-top: 30px; }
        .ref-body { padding: 20px; }
        .ref-promo { background: linear-gradient(135deg, #111, #000); padding: 25px; border-radius: 24px; text-align: center; border: 1px solid #0CF2B033; margin-bottom: 20px; }
        .ref-promo h3 { color: #0CF2B0; font-size: 20px; margin-bottom: 10px; }
        .ref-link { background: #000; padding: 10px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 15px; border: 1px dashed #333; }
        .ref-link code { font-size: 9px; opacity: 0.5; overflow: hidden; width: 70%; text-overflow: ellipsis; }
        .ref-link button { background: #0CF2B0; color: #000; border: none; padding: 5px 10px; border-radius: 8px; font-weight: 900; font-size: 10px; }
        .ref-row { display: flex; justify-content: space-between; background: #080808; padding: 15px; border-radius: 15px; margin-bottom: 8px; }
        .sheet-box { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 200; display: flex; align-items: flex-end; }
        .sheet-content { background: #0a0a0a; width: 100%; border-radius: 25px 25px 0 0; padding: 20px; }
        .sheet-h { display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 20px; }
        .t-item { display: flex; align-items: center; gap: 15px; padding: 15px 0; border-bottom: 1px solid #111; }
        .t-item img { width: 30px; }
        .t-bal { margin-left: auto; color: #0CF2B0; font-weight: 800; }
        .receipt { position: fixed; inset: 0; background: #000; z-index: 300; display: flex; align-items: center; padding: 30px; text-align: center; }
        .r-card { width: 100%; }
        .r-icon { width: 70px; height: 70px; background: #0CF2B0; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; margin: 0 auto 20px; }
        .r-amt { font-size: 35px; font-weight: 900; margin-bottom: 30px; }
        .receipt button { width: 100%; padding: 20px; background: #111; border: 1px solid #333; color: #fff; border-radius: 20px; font-weight: 900; }
        .click-pop { position: fixed; color: #0CF2B0; font-weight: 900; font-size: 30px; pointer-events: none; animation: pop 0.8s ease-out forwards; z-index: 1000; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-120px); } }
      `}</style>
    </div>
  );
}
