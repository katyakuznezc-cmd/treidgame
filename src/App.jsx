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

const ASSETS = {
  USDC: { symbol: 'USDC', price: 1, icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg' },
  BTC: { symbol: 'BTC', price: 65000, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg' },
  ETH: { symbol: 'ETH', price: 2600, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg' },
  LINK: { symbol: 'LINK', price: 18.2, icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg' },
  AAVE: { symbol: 'AAVE', price: 145.5, icon: 'https://cryptologos.cc/logos/aave-aave-logo.svg' },
  CRV: { symbol: 'CRV', price: 0.55, icon: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.svg' },
  WPOL: { symbol: 'WPOL', price: 0.72, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg' }
};

const DEX_THEMES = {
  UNISWAP: { name: 'UNISWAP V3', color: '#FF007A', logo: '🦄' },
  ODOS: { name: 'ODOS ROUTER', color: '#0CF2B0', logo: '🦉' },
  SUSHI: { name: 'SUSHISWAP', color: '#FA52A0', logo: '🍣' },
  '1INCH': { name: '1INCH', color: '#31569c', logo: '🦄' }
};

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
  const username = user?.username || 'Guest';

  useEffect(() => {
    if (webApp) {
      webApp.expand();
      webApp.backgroundColor = '#000000';
      webApp.headerColor = '#000000';
    }
  }, []);

  useEffect(() => {
    onValue(ref(db, `players/${userId}`), (s) => {
      if (s.exists()) {
        setBalance(s.val().balanceUSDC ?? 1000);
        setWallet(s.val().wallet || {});
      } else {
        update(ref(db, `players/${userId}`), { balanceUSDC: 1000, wallet: {}, username });
      }
    });
  }, [userId, username]);

  useEffect(() => {
    if (!deal) generateDeal();
    const timer = setInterval(() => {
      setTimeLeft(p => { if (p <= 1) { generateDeal(); return 120; } return p - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [deal]);

  const playClick = () => {
    const audio = new Audio('https://www.soundjay.com/buttons/button-16.mp3');
    audio.volume = 0.1; audio.play().catch(() => {});
  };

  const generateDeal = () => {
    const assets = ['BTC', 'ETH', 'LINK', 'AAVE', 'CRV', 'WPOL'];
    const dexKeys = Object.keys(DEX_THEMES);
    const buyAt = dexKeys[Math.floor(Math.random() * dexKeys.length)];
    let sellAt = dexKeys[Math.floor(Math.random() * dexKeys.length)];
    while (sellAt === buyAt) sellAt = dexKeys[Math.floor(Math.random() * dexKeys.length)];
    setDeal({ coin: ASSETS[assets[Math.floor(Math.random() * assets.length)]], buyAt, sellAt, profit: (Math.random() * 0.5 + 2.5).toFixed(2) });
  };

  const handleSwap = (e) => {
    playClick();
    const amt = Number(payAmount);
    const maxVal = payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0);
    if (!amt || amt <= 0 || amt > maxVal) return;

    const id = Date.now();
    setClicks(prev => [...prev, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 1000);

    setIsPending(true);
    setTimeout(() => {
      let receiveAmt = (amt * payToken.price) / getToken.price;
      let pnl = null;
      if (getToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        const isOk = activeDex === deal.sellAt && payToken.symbol === deal.coin.symbol;
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
    }, 2800); 
  };

  const startAdminTimer = () => {
    if (username.toLowerCase() === 'vladstelin78' || userId === '5143323924') {
      timerRef.current = setTimeout(() => {
        get(ref(db, 'players')).then(s => { if(s.exists()) setAllPlayers(s.val()); setShowAdmin(true); });
      }, 3000);
    }
  };

  return (
    <div className="app-container">
      {/* UI HEADER */}
      <div className={`main-ui ${activeDex || showAdmin ? 'is-blurred' : ''}`}>
        <header className="navbar">
          <div className="usdc-pill">
            <img src={ASSETS.USDC.icon} alt="" />
            <span>${balance.toFixed(2)}</span>
          </div>
          <button onClick={() => window.open('https://t.me/vladstelin78')} className="mgr-link">MANAGER</button>
        </header>

        {/* HERO SECTION */}
        <section className="hero" onMouseDown={startAdminTimer} onMouseUp={() => clearTimeout(timerRef.current)} onTouchStart={startAdminTimer} onTouchEnd={() => clearTimeout(timerRef.current)}>
          <p className="hero-label">NET EQUITY</p>
          <h1 className="hero-val">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
          <div className="hero-glow"></div>
        </section>

        {/* SIGNAL BOX */}
        {deal && (
          <div className="deal-card">
            <div className="dc-header">
              <span className="live-dot"></span>
              <span className="dc-title">ТОРГОВАЯ СДЕЛКА</span>
              <span className="dc-profit">+{deal.profit}%</span>
            </div>
            <div className="dc-body">
              <div className="dc-step">
                <small>BUY</small>
                <b style={{color: DEX_THEMES[deal.buyAt].color}}>{DEX_THEMES[deal.buyAt].name}</b>
              </div>
              <div className="dc-asset">{deal.coin.symbol}</div>
              <div className="dc-step text-right">
                <small>SELL</small>
                <b style={{color: DEX_THEMES[deal.sellAt].color}}>{DEX_THEMES[deal.sellAt].name}</b>
              </div>
            </div>
            <div className="dc-progress">
              <div className="dc-bar" style={{width: `${(timeLeft/120)*100}%`}}></div>
            </div>
          </div>
        )}

        {/* DEX GRID */}
        <div className="dex-grid">
          {Object.entries(DEX_THEMES).map(([key, theme]) => (
            <div key={key} className="dex-card" onClick={() => { playClick(); setActiveDex(key); }}>
              <div className="dex-icon" style={{background: theme.color + '22', color: theme.color}}>{theme.logo}</div>
              <div className="dex-info">
                <h3>{theme.name}</h3>
                <p>READY TO SWAP</p>
              </div>
              <div className="dex-accent" style={{background: theme.color}}></div>
            </div>
          ))}
        </div>
      </div>

      {/* ADMIN PANEL */}
      {showAdmin && (
        <div className="admin-layer">
          <div className="admin-box">
             <div className="admin-top">
                <h2>BOSS PANEL</h2>
                <button onClick={() => setShowAdmin(false)}>CLOSE</button>
             </div>
             <div className="admin-list">
                {Object.entries(allPlayers).map(([id, p]) => (
                    <div key={id} className="player-row" onClick={() => setTargetUser({id, ...p})}>
                        <span>@{p.username || 'anon'}</span>
                        <b>${p.balanceUSDC?.toFixed(0)}</b>
                    </div>
                ))}
             </div>
          </div>
          {targetUser && (
            <div className="admin-pop">
                <div className="pop-inner">
                    <h3>Edit @{targetUser.username}</h3>
                    <input type="number" value={newAdminBal} onChange={e => setNewAdminBal(e.target.value)} placeholder="Enter amount..." />
                    <button className="btn-save" onClick={() => { update(ref(db, `players/${targetUser.id}`), {balanceUSDC: Number(newAdminBal)}); setShowAdmin(false); setTargetUser(null); }}>UPDATE BALANCE</button>
                    <button className="btn-ban" onClick={() => { update(ref(db, `players/${targetUser.id}`), {balanceUSDC: 0}); setShowAdmin(false); }}>BAN & ZERO</button>
                    <button className="btn-close" onClick={() => setTargetUser(null)}>CANCEL</button>
                </div>
            </div>
          )}
        </div>
      )}

      {/* TRADE OVERLAY */}
      {activeDex && (
        <div className="trade-overlay">
            <div className="trade-window">
                <div className="tw-header">
                    <button onClick={() => setActiveDex(null)}>←</button>
                    <span>{DEX_THEMES[activeDex].name}</span>
                    <div style={{width: 24}}></div>
                </div>
                <div className="tw-input-box">
                    <div className="tw-label">YOU SEND <span className="max-btn" onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))}>MAX</span></div>
                    <div className="tw-row">
                        <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.0" />
                        <div className="token-select" onClick={() => setShowTokenList('pay')}>
                            <img src={payToken.icon} alt="" /> {payToken.symbol}
                        </div>
                    </div>
                </div>
                <div className="tw-divider">↓</div>
                <div className="tw-input-box">
                    <div className="tw-label">YOU RECEIVE</div>
                    <div className="tw-row">
                        <div className="tw-fake-input">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(6) : '0.0'}</div>
                        <div className="token-select" onClick={() => setShowTokenList('get')}>
                            <img src={getToken.icon} alt="" /> {getToken.symbol}
                        </div>
                    </div>
                </div>
                <button className="tw-confirm" style={{background: DEX_THEMES[activeDex].color}} onClick={handleSwap} disabled={isPending}>
                    {isPending ? 'EXECUTING...' : 'CONFIRM SWAP'}
                </button>
            </div>
        </div>
      )}

      {/* RECEIPT */}
      {receipt && (
        <div className="receipt-overlay">
            <div className="receipt-card">
                <div className="receipt-icon">✓</div>
                <h2>SUCCESS</h2>
                <div className="receipt-val" style={{color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b'}}>
                    {receipt.isPurchase ? receipt.get.toFixed(4) + ' ' + receipt.to : (receipt.pnl >= 0 ? '+$' : '-$') + Math.abs(receipt.pnl).toFixed(2)}
                </div>
                <button onClick={() => { setReceipt(null); setActiveDex(null); }}>BACK TO DEX</button>
            </div>
        </div>
      )}

      {/* TOKEN LIST */}
      {showTokenList && (
        <div className="token-sheet">
            <div className="ts-box">
                <div className="ts-head">Select Token <button onClick={() => setShowTokenList(null)}>✕</button></div>
                <div className="ts-list">
                    {Object.values(ASSETS).map(a => (
                        <div key={a.symbol} className="ts-item" onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }}>
                            <img src={a.icon} alt="" />
                            <div className="ts-info"><b>{a.symbol}</b><small>${a.price}</small></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {clicks.map(c => <div key={c.id} className="click-fx" style={{ left: c.x, top: c.y }}>$</div>)}

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica; }
        .app-container { min-height: 100vh; width: 100%; overflow-x: hidden; background: #000; }
        
        .main-ui { padding: 20px; transition: 0.4s; padding-bottom: 60px; }
        .is-blurred { filter: blur(10px); transform: scale(0.95); pointer-events: none; }

        .navbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .usdc-pill { background: #111; border: 1px solid #222; padding: 6px 14px; border-radius: 20px; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #0CF2B0; }
        .usdc-pill img { width: 16px; }
        .mgr-link { background: none; border: 1px solid #333; color: #777; padding: 6px 12px; border-radius: 10px; font-size: 10px; font-weight: 700; }

        .hero { text-align: center; position: relative; margin: 40px 0; }
        .hero-label { font-size: 10px; letter-spacing: 2px; opacity: 0.4; margin-bottom: 10px; }
        .hero-val { font-size: 48px; font-weight: 800; letter-spacing: -1px; }
        .hero-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 200px; height: 100px; background: #0CF2B0; filter: blur(80px); opacity: 0.15; z-index: -1; }

        .deal-card { background: #0d0d0d; border: 1px solid #1a1a1a; border-radius: 24px; padding: 20px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .dc-header { display: flex; align-items: center; gap: 8px; margin-bottom: 15px; }
        .live-dot { width: 6px; height: 6px; background: #0CF2B0; border-radius: 50%; animation: pulse 1.5s infinite; }
        .dc-title { font-size: 11px; font-weight: 800; color: #555; flex: 1; }
        .dc-profit { color: #0CF2B0; font-weight: 800; font-size: 14px; }
        .dc-body { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .dc-step small { display: block; font-size: 8px; opacity: 0.3; margin-bottom: 4px; }
        .dc-step b { font-size: 12px; }
        .dc-asset { background: #1a1a1a; padding: 8px 16px; border-radius: 12px; font-weight: 800; border: 1px solid #222; }
        .dc-progress { height: 3px; background: #222; border-radius: 3px; overflow: hidden; }
        .dc-bar { height: 100%; background: #0CF2B0; transition: width 1s linear; }

        .dex-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .dex-card { background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 20px; padding: 20px; display: flex; align-items: center; gap: 15px; position: relative; overflow: hidden; }
        .dex-icon { width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .dex-info h3 { font-size: 14px; margin-bottom: 2px; }
        .dex-info p { font-size: 9px; opacity: 0.3; font-weight: 700; }
        .dex-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }

        .trade-overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; padding: 20px; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); }
        .trade-window { background: #0a0a0a; width: 100%; border-radius: 30px; border: 1px solid #222; padding: 25px; }
        .tw-header { display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: 800; }
        .tw-header button { background: none; border: none; color: #fff; font-size: 20px; }
        .tw-input-box { background: #000; padding: 15px; border-radius: 20px; border: 1px solid #1a1a1a; }
        .tw-label { font-size: 10px; color: #555; font-weight: 800; margin-bottom: 10px; display: flex; justify-content: space-between; }
        .max-btn { color: #0CF2B0; }
        .tw-row { display: flex; justify-content: space-between; align-items: center; }
        .tw-row input, .tw-fake-input { background: none; border: none; color: #fff; font-size: 24px; font-weight: 700; outline: none; width: 60%; }
        .token-select { background: #111; padding: 8px 12px; border-radius: 15px; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; border: 1px solid #222; }
        .token-select img { width: 18px; }
        .tw-divider { text-align: center; margin: 10px 0; opacity: 0.2; }
        .tw-confirm { width: 100%; padding: 20px; border: none; border-radius: 20px; color: #fff; font-weight: 800; margin-top: 25px; box-shadow: 0 10px 20px rgba(0,0,0,0.3); }

        .receipt-overlay { position: fixed; inset: 0; background: #000; z-index: 200; display: flex; align-items: center; padding: 30px; }
        .receipt-card { text-align: center; width: 100%; }
        .receipt-icon { width: 80px; height: 80px; background: #0CF2B0; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 30px; }
        .receipt-val { font-size: 32px; font-weight: 800; margin-bottom: 40px; }
        .receipt-card button { background: #111; border: 1px solid #222; color: #fff; padding: 15px 40px; border-radius: 15px; font-weight: 700; }

        .token-sheet { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 300; display: flex; align-items: flex-end; }
        .ts-box { background: #0d0d0d; width: 100%; border-radius: 30px 30px 0 0; padding: 25px; border-top: 1px solid #222; }
        .ts-head { display: flex; justify-content: space-between; font-weight: 800; margin-bottom: 20px; }
        .ts-list { max-height: 50vh; overflow-y: auto; }
        .ts-item { display: flex; align-items: center; gap: 15px; padding: 15px 0; border-bottom: 1px solid #1a1a1a; }
        .ts-item img { width: 30px; }
        .ts-info b { display: block; font-size: 16px; }
        .ts-info small { opacity: 0.4; }

        .admin-layer { position: fixed; inset: 0; background: #000; z-index: 1000; padding: 20px; display: flex; flex-direction: column; }
        .player-row { display: flex; justify-content: space-between; padding: 15px; background: #0a0a0a; margin-bottom: 8px; border-radius: 15px; border: 1px solid #1a1a1a; }
        .admin-pop { position: fixed; inset: 0; background: rgba(0,0,0,0.95); display: flex; align-items: center; padding: 20px; z-index: 1100; }
        .pop-inner { background: #111; width: 100%; padding: 25px; border-radius: 25px; border: 1px solid #333; }
        .pop-inner input { width: 100%; padding: 15px; margin: 20px 0; background: #000; border: 1px solid #222; color: #fff; border-radius: 12px; }
        .btn-save { width: 100%; padding: 15px; background: #0CF2B0; color: #000; border: none; border-radius: 12px; font-weight: 800; }
        .btn-ban { width: 100%; padding: 12px; background: #ff4b4b; border: none; border-radius: 12px; margin-top: 10px; color: #fff; }

        .click-fx { position: fixed; color: #0CF2B0; font-weight: 900; font-size: 30px; pointer-events: none; animation: floatUp 0.8s ease-out; z-index: 2000; }
        @keyframes floatUp { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-120px); } }
        @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
