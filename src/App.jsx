import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update, get } from "firebase/database";

// Твой конфиг Firebase
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
  CRV: { symbol: 'CRV', price: 0.55, icon: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.svg' },
  WPOL: { symbol: 'WPOL', price: 0.72, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg' }
};

const DEX_CONFIG = [
  { id: 'UNISWAP', name: 'Uniswap V3', color: '#FF007A', bg: 'linear-gradient(135deg, #FF007A 0%, #4200FF 100%)', logo: '🦄', status: 'High Liquidity' },
  { id: 'ODOS', name: 'Odos Router', color: '#0CF2B0', bg: 'linear-gradient(135deg, #131A2A 0%, #0CF2B0 200%)', logo: '🦉', status: 'Optimal Route' },
  { id: 'SUSHI', name: 'SushiSwap', color: '#FA52A0', bg: 'linear-gradient(135deg, #2D264B 0%, #FA52A0 150%)', logo: '🍣', status: 'Multi-chain' },
  { id: '1INCH', name: '1inch Net', color: '#4C82FB', bg: 'linear-gradient(135deg, #1a2e47 0%, #4C82FB 100%)', logo: '🛡️', status: 'Aggregator' }
];

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  const [balance, setBalance] = useState(1000);
  const [wallet, setWallet] = useState({});
  const [activeDex, setActiveDex] = useState(null);
  const [deal, setDeal] = useState(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [payToken, setPayToken] = useState(ASSETS.USDC);
  const [getToken, setGetToken] = useState(ASSETS.BTC);
  const [payAmount, setPayAmount] = useState('');
  const [showTokenList, setShowTokenList] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [clicks, setClicks] = useState([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [allPlayers, setAllPlayers] = useState({});
  const [targetUser, setTargetUser] = useState(null);
  const [newAdminBal, setNewAdminBal] = useState('');
  const timerRef = useRef(null);

  const webApp = window.Telegram?.WebApp;
  const user = webApp?.initDataUnsafe?.user;
  const userId = user?.id?.toString() || 'Guest';

  useEffect(() => {
    if (webApp) {
      webApp.expand();
      webApp.ready();
      webApp.headerColor = '#000000';
      webApp.backgroundColor = '#000000';
    }
    onValue(ref(db, `players/${userId}`), (s) => {
      if (s.exists()) {
        setBalance(s.val().balanceUSDC ?? 1000);
        setWallet(s.val().wallet || {});
      } else {
        update(ref(db, `players/${userId}`), { balanceUSDC: 1000, wallet: {}, username: user?.username || 'Guest' });
      }
    });
  }, [userId]);

  useEffect(() => {
    if (!deal) generateDeal();
    const timer = setInterval(() => {
      setTimeLeft(p => { if (p <= 1) { generateDeal(); return 120; } return p - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [deal]);

  const generateDeal = () => {
    const assets = ['BTC', 'ETH', 'LINK', 'AAVE', 'CRV', 'WPOL'];
    const buyIdx = Math.floor(Math.random() * DEX_CONFIG.length);
    let sellIdx = Math.floor(Math.random() * DEX_CONFIG.length);
    while (sellIdx === buyIdx) sellIdx = Math.floor(Math.random() * DEX_CONFIG.length);
    setDeal({ coin: ASSETS[assets[Math.floor(Math.random() * assets.length)]], buyAt: DEX_CONFIG[buyIdx], sellAt: DEX_CONFIG[sellIdx], profit: (Math.random() * 0.5 + 2.5).toFixed(2) });
  };

  const handleSwap = (e) => {
    const amt = Number(payAmount);
    const maxVal = payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0);
    if (!amt || amt <= 0 || amt > maxVal) return;

    const id = Date.now();
    const touch = e.touches ? e.touches[0] : e;
    setClicks(prev => [...prev, { id, x: touch.clientX, y: touch.clientY }]);
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 800);

    new Audio('https://www.soundjay.com/buttons/button-16.mp3').play().catch(() => {});

    setIsPending(true);
    setTimeout(() => {
      let receiveAmt = (amt * payToken.price) / getToken.price;
      let pnl = null;
      if (getToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        const isOk = activeDex.id === deal.sellAt.id && payToken.symbol === deal.coin.symbol;
        const multiplier = isOk ? (1 + Number(deal.profit)/100) : (1 - (Math.random() * 0.015));
        receiveAmt *= multiplier;
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
    }, 2500); 
  };

  const startAdminTimer = () => {
    if (user?.username?.toLowerCase() === 'vladstelin78' || userId === '5143323924') {
      timerRef.current = setTimeout(() => {
        get(ref(db, 'players')).then(s => { if(s.exists()) setAllPlayers(s.val()); setShowAdmin(true); });
      }, 3000);
    }
  };

  return (
    <div className="app-container">
      <div className={`viewport ${activeDex || showAdmin || receipt || showTokenList ? 'is-modal-open' : ''}`}>
        <header className="main-nav">
          <div className="wallet-pill">
            <div className="indicator"></div>
            <span>${balance.toFixed(2)}</span>
          </div>
          <button onClick={() => window.open('https://t.me/vladstelin78')} className="mgr-btn">MANAGER</button>
        </header>

        <div className="hero-block" onTouchStart={startAdminTimer} onTouchEnd={() => clearTimeout(timerRef.current)}>
          <div className="hero-sub">Total Assets</div>
          <div className="hero-main">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div className="hero-blur"></div>
        </div>

        {deal && (
          <div className="arbitrage-card">
            <div className="arb-header">
              <span className="live-tag">● LIVE SIGNAL</span>
              <span className="yield">+{deal.profit}%</span>
            </div>
            <div className="arb-route">
              <div className="route-node">
                <small>BUY</small>
                <div style={{color: deal.buyAt.color, textShadow: `0 0 8px ${deal.buyAt.color}55`}}>{deal.buyAt.name}</div>
              </div>
              <div className="route-asset">{deal.coin.symbol}</div>
              <div className="route-node text-right">
                <small>SELL</small>
                <div style={{color: deal.sellAt.color, textShadow: `0 0 8px ${deal.sellAt.color}55`}}>{deal.sellAt.name}</div>
              </div>
            </div>
            <div className="arb-timer"><div className="arb-progress" style={{width: `${(timeLeft/120)*100}%`}}></div></div>
          </div>
        )}

        <div className="dex-grid">
          <p className="grid-label">LIQUIDITY HUBS</p>
          {DEX_CONFIG.map(dex => (
            <div key={dex.id} className="dex-card-real" onClick={() => setActiveDex(dex)}>
              <div className="dex-glass" style={{background: dex.bg}}></div>
              <div className="dex-content">
                <div className="dex-logo-box">{dex.logo}</div>
                <div className="dex-txt">
                  <h3>{dex.name}</h3>
                  <p>{dex.status}</p>
                </div>
                <div className="dex-chevron">→</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeDex && (
        <div className="full-modal">
          <div className="modal-content">
            <div className="modal-top">
              <button onClick={() => setActiveDex(null)}>✕</button>
              <span>{activeDex.name}</span>
              <div style={{width: 30}}></div>
            </div>
            <div className="swap-ui">
              <div className="swap-box-main">
                <div className="box-top">PAY <span onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))}>MAX</span></div>
                <div className="box-row">
                  <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                  <div className="token-trigger" onClick={() => setShowTokenList('pay')}><img src={payToken.icon} /> {payToken.symbol}</div>
                </div>
              </div>
              <div className="swap-divider">↓</div>
              <div className="swap-box-main">
                <div className="box-top">RECEIVE</div>
                <div className="box-row">
                  <div className="fake-input">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(6) : '0.00'}</div>
                  <div className="token-trigger" onClick={() => setShowTokenList('get')}><img src={getToken.icon} /> {getToken.symbol}</div>
                </div>
              </div>
              <button className="execute-btn" onClick={handleSwap} disabled={isPending} style={{background: activeDex.bg}}>
                {isPending ? 'PROCESSING...' : 'CONFIRM TRANSACTION'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTokenList && (
        <div className="sheet-overlay">
          <div className="sheet-container">
            <div className="sheet-head">Select Token <button onClick={() => setShowTokenList(null)}>✕</button></div>
            <div className="sheet-scroll">
              {Object.values(ASSETS).map(a => (
                <div key={a.symbol} className="token-item" onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }}>
                  <img src={a.icon} />
                  <div className="t-info"><b>{a.symbol}</b><br/><small>${a.price}</small></div>
                  <div className="t-bal">{a.symbol === 'USDC' ? balance.toFixed(2) : (wallet[a.symbol] || 0).toFixed(4)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="receipt-overlay">
          <div className="receipt-card">
            <div className="r-icon">✓</div>
            <h2>Transaction Successful</h2>
            <div className="r-val" style={{color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b'}}>
              {receipt.isPurchase ? receipt.get.toFixed(4) + ' ' + receipt.to : (receipt.pnl >= 0 ? '+$' : '-$') + Math.abs(receipt.pnl).toFixed(2)}
            </div>
            <button className="r-btn" onClick={() => {setReceipt(null); setActiveDex(null);}}>RETURN</button>
          </div>
        </div>
      )}

      {clicks.map(c => <div key={c.id} className="dollar-pop" style={{left: c.x, top: c.y}}>$</div>)}

      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; background: #000; color: #fff; overflow: hidden; font-family: -apple-system, sans-serif; }
        .app-container { width: 100vw; height: 100vh; position: relative; overflow-x: hidden; }
        .viewport { width: 100%; height: 100%; overflow-y: auto; padding: 20px 20px 100px; transition: 0.3s; }
        .is-modal-open { filter: blur(15px); transform: scale(0.98); pointer-events: none; }
        
        .main-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .wallet-pill { background: #0d0d0d; border: 1px solid #1a1a1a; padding: 8px 15px; border-radius: 20px; display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 14px; }
        .indicator { width: 6px; height: 6px; background: #0CF2B0; border-radius: 50%; box-shadow: 0 0 8px #0CF2B0; }
        .mgr-btn { background: #fff; color: #000; border: none; padding: 7px 14px; border-radius: 10px; font-weight: 900; font-size: 10px; }

        .hero-block { text-align: center; padding: 30px 0; position: relative; }
        .hero-sub { font-size: 11px; color: #444; font-weight: 800; letter-spacing: 1px; }
        .hero-main { font-size: 48px; font-weight: 900; margin-top: 5px; }
        .hero-blur { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 120px; height: 120px; background: #4200FF10; filter: blur(40px); z-index: -1; }

        .arbitrage-card { background: #080808; border: 1px solid #151515; padding: 20px; border-radius: 24px; margin-bottom: 30px; }
        .arb-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .live-tag { color: #0CF2B0; font-size: 9px; font-weight: 900; }
        .yield { color: #0CF2B0; font-weight: 900; }
        .arb-route { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .route-node small { display: block; font-size: 8px; opacity: 0.3; margin-bottom: 3px; }
        .route-node div { font-weight: 900; font-size: 13px; }
        .route-asset { background: #111; padding: 6px 12px; border-radius: 10px; font-weight: 900; font-size: 11px; border: 1px solid #222; }
        .arb-timer { height: 2px; background: #111; border-radius: 1px; overflow: hidden; }
        .arb-progress { height: 100%; background: #0CF2B0; transition: width 1s linear; }

        .dex-grid { display: flex; flex-direction: column; gap: 10px; }
        .grid-label { font-size: 10px; font-weight: 900; color: #222; margin-bottom: 10px; }
        .dex-card-real { position: relative; border-radius: 20px; padding: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.03); }
        .dex-glass { position: absolute; inset: 0; opacity: 0.85; z-index: 1; }
        .dex-content { position: relative; z-index: 2; display: flex; align-items: center; gap: 15px; }
        .dex-logo-box { width: 45px; height: 45px; background: rgba(255,255,255,0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
        .dex-txt h3 { font-size: 16px; font-weight: 900; }
        .dex-txt p { font-size: 10px; opacity: 0.5; }
        .dex-chevron { margin-left: auto; opacity: 0.3; }

        .full-modal { position: fixed; inset: 0; background: #000; z-index: 1000; }
        .modal-top { padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #111; }
        .modal-top button { background: none; border: none; color: #fff; font-size: 20px; }
        .swap-ui { padding: 20px; height: 80%; display: flex; flex-direction: column; justify-content: center; }
        .swap-box-main { background: #080808; border: 1px solid #151515; padding: 18px; border-radius: 20px; }
        .box-top { font-size: 10px; font-weight: 800; color: #333; margin-bottom: 12px; display: flex; justify-content: space-between; }
        .box-top span { color: #0CF2B0; }
        .box-row { display: flex; justify-content: space-between; align-items: center; }
        .box-row input, .fake-input { background: none; border: none; color: #fff; font-size: 24px; font-weight: 800; outline: none; width: 60%; }
        .token-trigger { background: #111; padding: 8px 12px; border-radius: 12px; display: flex; align-items: center; gap: 8px; font-weight: 900; font-size: 13px; border: 1px solid #222; }
        .token-trigger img { width: 18px; }
        .swap-divider { text-align: center; padding: 10px; opacity: 0.2; }
        .execute-btn { width: 100%; padding: 20px; border: none; border-radius: 20px; color: #fff; font-weight: 900; margin-top: 30px; }

        .sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; align-items: flex-end; }
        .sheet-container { width: 100%; background: #080808; border-radius: 25px 25px 0 0; border-top: 1px solid #222; max-height: 70vh; display: flex; flex-direction: column; }
        .sheet-head { padding: 20px; display: flex; justify-content: space-between; font-weight: 900; border-bottom: 1px solid #111; }
        .sheet-scroll { overflow-y: auto; flex: 1; padding: 10px 20px 40px; }
        .token-item { display: flex; align-items: center; gap: 15px; padding: 15px 0; border-bottom: 1px solid #111; }
        .token-item img { width: 32px; height: 32px; }
        .t-info b { font-size: 16px; }
        .t-info small { opacity: 0.3; }
        .t-bal { margin-left: auto; font-weight: 800; color: #0CF2B0; }

        .receipt-overlay { position: fixed; inset: 0; background: #000; z-index: 3000; display: flex; align-items: center; padding: 30px; text-align: center; }
        .receipt-card { width: 100%; }
        .r-icon { width: 70px; height: 70px; background: #0CF2B0; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 35px; margin: 0 auto 20px; }
        .r-val { font-size: 36px; font-weight: 900; margin-bottom: 40px; }
        .r-btn { width: 100%; padding: 18px; background: #111; border: 1px solid #222; color: #fff; border-radius: 15px; font-weight: 900; }

        .dollar-pop { position: fixed; color: #0CF2B0; font-weight: 900; font-size: 30px; pointer-events: none; animation: pop 0.8s ease-out forwards; z-index: 5000; }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-120px); } }
      `}</style>
    </div>
  );
}
