import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update, get } from "firebase/database";

// Конфигурация Firebase
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

  // Основной таймер
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          generateDeal(); // Генерируем новую сделку, если время вышло
          return 120;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Инициализация первой сделки
  useEffect(() => {
    if (!deal) generateDeal();
  }, [deal]);

  const generateDeal = () => {
    const assets = ['BTC', 'ETH', 'LINK', 'AAVE', 'CRV', 'WPOL'];
    const buyIdx = Math.floor(Math.random() * DEX_CONFIG.length);
    let sellIdx = Math.floor(Math.random() * DEX_CONFIG.length);
    while (sellIdx === buyIdx) sellIdx = Math.floor(Math.random() * DEX_CONFIG.length);
    
    // СБРОС ТАЙМЕРА ПРИ КАЖДОЙ ГЕНЕРАЦИИ
    setTimeLeft(120);

    setDeal({ 
      coin: ASSETS[assets[Math.floor(Math.random() * assets.length)]], 
      buyAt: DEX_CONFIG[buyIdx], 
      sellAt: DEX_CONFIG[sellIdx], 
      profit: (Math.random() * 0.5 + 2.5).toFixed(2) 
    });
  };

  const handleSwap = (e) => {
    const amt = Number(payAmount);
    const maxVal = payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0);
    if (!amt || amt <= 0 || amt > maxVal) return;

    // Визуальный эффект клика
    const id = Date.now();
    const touch = e.touches ? e.touches[0] : e;
    setClicks(prev => [...prev, { id, x: touch.clientX, y: touch.clientY }]);
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 800);

    // Звук клика
    new Audio('https://www.soundjay.com/buttons/button-16.mp3').play().catch(() => {});

    setIsPending(true);

    setTimeout(() => {
      let receiveAmt = (amt * payToken.price) / getToken.price;
      let pnl = null;

      // Логика арбитража при продаже ассета за USDC
      if (getToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        const isOk = activeDex.id === deal.sellAt.id && payToken.symbol === deal.coin.symbol;
        if (isOk) {
          receiveAmt *= (1 + Number(deal.profit) / 100);
          generateDeal(); // Сразу обновляем сделку и таймер после успеха
        } else {
          receiveAmt *= (1 - (Math.random() * 0.015)); // Рандомный минус до 1.5%
        }
        pnl = receiveAmt - (amt * payToken.price);
      }

      // Обновление балансов
      const newB = payToken.symbol === 'USDC' ? balance - amt : (getToken.symbol === 'USDC' ? balance + receiveAmt : balance);
      const newW = { ...wallet };
      if (payToken.symbol !== 'USDC') newW[payToken.symbol] = (newW[payToken.symbol] || 0) - amt;
      if (getToken.symbol !== 'USDC') newW[getToken.symbol] = (newW[getToken.symbol] || 0) + receiveAmt;

      update(ref(db, `players/${userId}`), { balanceUSDC: newB, wallet: newW });

      setReceipt({ pnl, get: receiveAmt, to: getToken.symbol, isPurchase: payToken.symbol === 'USDC' });
      setIsPending(false); 
      setPayAmount('');
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
        
        {/* TOP NAV */}
        <header className="main-nav">
          <div className="wallet-pill">
            <div className="indicator"></div>
            <span>${balance.toFixed(2)}</span>
          </div>
          <button onClick={() => window.open('https://t.me/vladstelin78')} className="mgr-btn">MANAGER</button>
        </header>

        {/* HERO BALANCE */}
        <div className="hero-block" onTouchStart={startAdminTimer} onTouchEnd={() => clearTimeout(timerRef.current)}>
          <div className="hero-sub">Portfolio Value</div>
          <div className="hero-main">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div className="hero-blur"></div>
        </div>

        {/* ARBITRAGE SIGNAL */}
        {deal && (
          <div className="arbitrage-card">
            <div className="arb-header">
              <span className="live-tag">● LIVE ARBITRAGE</span>
              <span className="yield">Yield: +{deal.profit}%</span>
            </div>
            <div className="arb-route">
              <div className="route-node">
                <small>BUY</small>
                <div style={{color: deal.buyAt.color, textShadow: `0 0 10px ${deal.buyAt.color}44`}}>{deal.buyAt.name}</div>
              </div>
              <div className="route-asset">{deal.coin.symbol}</div>
              <div className="route-node text-right">
                <small>SELL</small>
                <div style={{color: deal.sellAt.color, textShadow: `0 0 10px ${deal.sellAt.color}44`}}>{deal.sellAt.name}</div>
              </div>
            </div>
            <div className="arb-timer">
              <div className="arb-progress" style={{width: `${(timeLeft/120)*100}%`}}></div>
            </div>
          </div>
        )}

        {/* DEX SELECTION */}
        <div className="dex-grid">
          <p className="grid-label">LIQUIDITY PROTOCOLS</p>
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

      {/* SWAP MODAL */}
      {activeDex && (
        <div className="full-modal">
          <div className="modal-content">
            <div className="modal-top">
              <button onClick={() => setActiveDex(null)}>✕</button>
              <span>{activeDex.name} Terminal</span>
              <div style={{width: 32}}></div>
            </div>
            
            <div className="swap-ui">
              <div className="swap-box-main">
                <div className="box-header">PAY <span onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))}>MAX</span></div>
                <div className="box-row">
                  <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                  <div className="token-trigger" onClick={() => setShowTokenList('pay')}>
                    <img src={payToken.icon} alt="" /> {payToken.symbol}
                  </div>
                </div>
              </div>
              
              <div className="swap-divider">↓</div>

              <div className="swap-box-main">
                <div className="box-header">RECEIVE</div>
                <div className="box-row">
                  <div className="fake-input">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(6) : '0.00'}</div>
                  <div className="token-trigger" onClick={() => setShowTokenList('get')}>
                    <img src={getToken.icon} alt="" /> {getToken.symbol}
                  </div>
                </div>
              </div>

              <button className="execute-btn" onClick={handleSwap} disabled={isPending} style={{background: activeDex.bg}}>
                {isPending ? 'EXECUTING TRANSACTION...' : `SWAP ON ${activeDex.id}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOKEN LIST MODAL */}
      {showTokenList && (
        <div className="sheet-overlay">
          <div className="sheet-container">
            <div className="sheet-drag-handle"></div>
            <div className="sheet-header">Select Asset <button onClick={() => setShowTokenList(null)}>✕</button></div>
            <div className="sheet-scroll-area">
              {Object.values(ASSETS).map(a => (
                <div key={a.symbol} className="token-item" onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }}>
                  <img src={a.icon} alt="" />
                  <div className="token-meta">
                    <b>{a.symbol}</b>
                    <small>${a.price.toLocaleString()}</small>
                  </div>
                  <div className="token-user-bal">
                    {a.symbol === 'USDC' ? balance.toFixed(2) : (wallet[a.symbol] || 0).toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS RECEIPT */}
      {receipt && (
        <div className="receipt-overlay">
          <div className="receipt-card">
            <div className="r-success-icon">✓</div>
            <h2>Success!</h2>
            <div className="r-amount" style={{color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b'}}>
              {receipt.isPurchase ? receipt.get.toFixed(4) + ' ' + receipt.to : (receipt.pnl >= 0 ? '+$' : '-$') + Math.abs(receipt.pnl).toFixed(2)}
            </div>
            <div className="r-details">
              <div className="r-row"><span>Status</span><span style={{color:'#0CF2B0'}}>Confirmed</span></div>
              <div className="r-row"><span>Network Fee</span><span>Gasless</span></div>
            </div>
            <button className="r-close-btn" onClick={() => {setReceipt(null); setActiveDex(null);}}>BACK TO HUB</button>
          </div>
        </div>
      )}

      {/* POP EFFECTS */}
      {clicks.map(c => <div key={c.id} className="dollar-pop" style={{left: c.x, top: c.y}}>$</div>)}

      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; margin: 0; padding: 0; }
        html, body { 
          width: 100%; height: 100%; background: #000; color: #fff; 
          font-family: -apple-system, sans-serif; overflow: hidden; 
        }

        .app-container { width: 100vw; height: 100vh; position: relative; overflow-x: hidden; }
        .viewport { width: 100%; height: 100%; overflow-y: auto; padding: 20px 20px 120px; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .is-modal-open { filter: blur(20px); transform: scale(0.96); pointer-events: none; }

        .main-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .wallet-pill { background: #0d0d0d; border: 1px solid #1a1a1a; padding: 10px 18px; border-radius: 25px; display: flex; align-items: center; gap: 10px; font-weight: 800; }
        .indicator { width: 7px; height: 7px; background: #0CF2B0; border-radius: 50%; box-shadow: 0 0 10px #0CF2B0; }
        .mgr-btn { background: #fff; color: #000; border: none; padding: 8px 16px; border-radius: 12px; font-weight: 900; font-size: 11px; }

        .hero-block { text-align: center; padding: 35px 0; position: relative; }
        .hero-sub { font-size: 12px; color: #444; font-weight: 800; letter-spacing: 1px; }
        .hero-main { font-size: 50px; font-weight: 900; margin-top: 8px; }
        .hero-blur { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 140px; height: 140px; background: #4200FF10; filter: blur(50px); z-index: -1; }

        .arbitrage-card { background: #080808; border: 1px solid #1a1a1a; padding: 22px; border-radius: 26px; margin-bottom: 30px; }
        .arb-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .live-tag { color: #0CF2B0; font-size: 10px; font-weight: 900; background: #0CF2B015; padding: 4px 10px; border-radius: 8px; }
        .yield { color: #0CF2B0; font-weight: 900; font-size: 15px; }
        .arb-route { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
        .route-node small { display: block; font-size: 9px; opacity: 0.3; margin-bottom: 5px; font-weight: 800; }
        .route-node div { font-weight: 900; font-size: 14px; }
        .route-asset { background: #111; padding: 8px 16px; border-radius: 14px; font-weight: 900; font-size: 12px; border: 1px solid #222; }
        .arb-timer { height: 3px; background: #111; border-radius: 2px; overflow: hidden; }
        .arb-progress { height: 100%; background: #0CF2B0; transition: width 1s linear; }

        .dex-grid { display: flex; flex-direction: column; gap: 12px; }
        .grid-label { font-size: 11px; font-weight: 900; color: #333; margin-bottom: 12px; letter-spacing: 1px; }
        .dex-card-real { position: relative; border-radius: 24px; padding: 22px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
        .dex-glass { position: absolute; inset: 0; opacity: 0.85; z-index: 1; }
        .dex-content { position: relative; z-index: 2; display: flex; align-items: center; gap: 18px; }
        .dex-logo-box { width: 50px; height: 50px; background: rgba(255,255,255,0.1); border-radius: 15px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
        .dex-txt h3 { font-size: 17px; font-weight: 900; }
        .dex-txt p { font-size: 11px; opacity: 0.5; font-weight: 700; }
        .dex-chevron { margin-left: auto; opacity: 0.3; }

        .full-modal { position: fixed; inset: 0; background: #000; z-index: 1000; display: flex; flex-direction: column; }
        .modal-top { padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #111; font-weight: 800; }
        .modal-top button { background: none; border: none; color: #fff; font-size: 22px; }
        .swap-ui { padding: 25px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
        .swap-box-main { background: #080808; border: 1px solid #151515; padding: 20px; border-radius: 24px; }
        .box-header { font-size: 11px; font-weight: 900; color: #444; margin-bottom: 15px; display: flex; justify-content: space-between; }
        .box-header span { color: #0CF2B0; }
        .box-row { display: flex; justify-content: space-between; align-items: center; }
        .box-row input, .fake-input { background: none; border: none; color: #fff; font-size: 26px; font-weight: 800; outline: none; width: 60%; }
        .token-trigger { background: #1a1a1a; padding: 10px 14px; border-radius: 14px; display: flex; align-items: center; gap: 10px; font-weight: 900; font-size: 14px; border: 1px solid #222; }
        .token-trigger img { width: 20px; }
        .swap-divider { text-align: center; padding: 15px; opacity: 0.1; font-size: 20px; }
        .execute-btn { width: 100%; padding: 22px; border: none; border-radius: 24px; color: #fff; font-weight: 900; margin-top: 40px; }

        .sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 2000; display: flex; align-items: flex-end; }
        .sheet-container { width: 100%; background: #0a0a0a; border-radius: 30px 30px 0 0; border-top: 1px solid #222; max-height: 75vh; display: flex; flex-direction: column; }
        .sheet-drag-handle { width: 40px; height: 4px; background: #333; border-radius: 2px; margin: 12px auto; }
        .sheet-header { padding: 10px 25px 20px; display: flex; justify-content: space-between; font-weight: 900; color: #555; font-size: 13px; }
        .sheet-scroll-area { overflow-y: auto; flex: 1; padding: 0 25px 50px; -webkit-overflow-scrolling: touch; }
        .token-item { display: flex; align-items: center; gap: 18px; padding: 18px 0; border-bottom: 1px solid #111; }
        .token-item img { width: 36px; height: 36px; }
        .token-meta b { display: block; font-size: 17px; }
        .token-meta small { color: #444; font-weight: 700; }
        .token-user-bal { margin-left: auto; font-weight: 800; color: #0CF2B0; font-size: 14px; }

        .receipt-overlay { position: fixed; inset: 0; background: #000; z-index: 3000; display: flex; align-items: center; padding: 30px; text-align: center; }
        .receipt-card { width: 100%; }
        .r-success-icon { width: 80px; height: 80px; background: #0CF2B0; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 25px; }
        .r-amount { font-size: 42px; font-weight: 900; margin-bottom: 35px; }
        .r-details { background: #0a0a0a; border-radius: 20px; padding: 20px; margin-bottom: 40px; }
        .r-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; font-weight: 700; }
        .r-row span:first-child { color: #444; }
        .r-close-btn { width: 100%; padding: 20px; background: #111; border: 1px solid #222; color: #fff; border-radius: 20px; font-weight: 900; }

        .dollar-pop { position: fixed; color: #0CF2B0; font-weight: 900; font-size: 32px; pointer-events: none; animation: popUp 0.8s ease-out forwards; z-index: 5000; }
        @keyframes popUp { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-150px); } }
      `}</style>
    </div>
  );
}
