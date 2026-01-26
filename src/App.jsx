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
  UNISWAP: { name: 'UNISWAP V3', color: '#FF007A', bg: 'radial-gradient(circle at 50% 10%, #2a0014 0%, #000 85%)' },
  ODOS: { name: 'ODOS ROUTER', color: '#0CF2B0', bg: 'radial-gradient(circle at 50% 10%, #002a1e 0%, #000 85%)' },
  SUSHI: { name: 'SUSHISWAP', color: '#FA52A0', bg: 'radial-gradient(circle at 50% 10%, #2a001a 0%, #000 85%)' },
  '1INCH': { name: '1INCH NETWORK', color: '#31569c', bg: 'radial-gradient(circle at 50% 10%, #00082a 0%, #000 85%)' }
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
  
  // Admin & Settings State
  const [showAdmin, setShowAdmin] = useState(false);
  const [allPlayers, setAllPlayers] = useState({});
  const [targetUser, setTargetUser] = useState(null);
  const [newAdminBal, setNewAdminBal] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const timerRef = useRef(null);

  const webApp = window.Telegram?.WebApp;
  const user = webApp?.initDataUnsafe?.user;
  const userId = user?.id?.toString() || 'Guest';
  const username = user?.username || 'Guest';

  useEffect(() => {
    const setHeight = () => document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    setHeight(); window.addEventListener('resize', setHeight);
    if (webApp) { webApp.expand(); webApp.disableVerticalSwipes(); }
    return () => window.removeEventListener('resize', setHeight);
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
  }, [userId]);

  useEffect(() => {
    if (!deal) generateDeal();
    const timer = setInterval(() => {
      setTimeLeft(p => { if (p <= 1) { generateDeal(); return 120; } return p - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [deal]);

  const playClick = () => {
    if (!soundEnabled) return;
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

  // ADMIN SECRETS
  const startAdminTimer = () => {
    if (username.toLowerCase() === 'vladstelin78' || userId === '5143323924') {
      timerRef.current = setTimeout(() => {
        get(ref(db, 'players')).then(s => { if(s.exists()) setAllPlayers(s.val()); setShowAdmin(true); });
      }, 3000);
    }
  };

  return (
    <div className="app-container">
      <div className={`main-ui ${activeDex || showAdmin ? 'scale-down' : ''}`}>
        <header className="header-nav">
          <div className="usdc-badge">USDC <span>${balance.toFixed(2)}</span></div>
          <button onClick={() => window.open('https://t.me/vladstelin78')} className="mgr-btn">MANAGER</button>
        </header>

        <div className="balance-hero" onMouseDown={startAdminTimer} onMouseUp={() => clearTimeout(timerRef.current)} onTouchStart={startAdminTimer} onTouchEnd={() => clearTimeout(timerRef.current)}>
          <div className="bal-value">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div className="bal-sub">NET EQUITY</div>
        </div>

        {deal && (
          <div className="signal-box">
            <div className="sb-top"><span>ТОРГОВАЯ СДЕЛКА</span><span className="sb-pct">+{deal.profit}%</span></div>
            <div className="sb-main">
              <div className="sb-node"><small>КУПИТЬ</small><b>{DEX_THEMES[deal.buyAt].name}</b></div>
              <div className="sb-coin-tag">{deal.coin.symbol}</div>
              <div className="sb-node text-right"><small>ПРОДАТЬ</small><b style={{color: '#0CF2B0'}}>{DEX_THEMES[deal.sellAt].name}</b></div>
            </div>
            <div className="sb-progress"><div className="sb-fill" style={{width: `${(timeLeft/120)*100}%`}}></div></div>
          </div>
        )}

        <div className="grid-dex">
          {Object.keys(DEX_THEMES).map(k => (
            <button key={k} onClick={() => { playClick(); setActiveDex(k); }} className="card-dex">
              <div className="card-line" style={{background: DEX_THEMES[k].color}}></div>
              <div className="card-name">{DEX_THEMES[k].name}</div>
              <div className="card-info">V3 PROTOCOL</div>
            </button>
          ))}
        </div>
      </div>

      {/* ADMIN PANEL */}
      {showAdmin && (
        <div className="admin-panel">
          <div className="admin-nav">
            <button onClick={() => setShowAdmin(false)}>✕</button>
            <b>BOSS CONSOLE</b>
            <div style={{width: 32}}></div>
          </div>
          <div className="admin-list">
            {Object.entries(allPlayers).map(([id, p]) => (
              <div key={id} className="admin-user-item" onClick={() => setTargetUser({id, ...p})}>
                <span>@{p.username || 'anon'}</span>
                <b>${p.balanceUSDC?.toFixed(2)}</b>
              </div>
            ))}
          </div>
          {targetUser && (
            <div className="admin-modal">
              <div className="am-box">
                <h4>@{targetUser.username}</h4>
                <input type="number" placeholder="New Balance" value={newAdminBal} onChange={e => setNewAdminBal(e.target.value)} />
                <button onClick={() => { update(ref(db, `players/${targetUser.id}`), {balanceUSDC: Number(newAdminBal)}); setShowAdmin(false); setTargetUser(null); }}>SET BALANCE</button>
                <button className="ban" onClick={() => { update(ref(db, `players/${targetUser.id}`), {balanceUSDC: 0}); setShowAdmin(false); }}>BAN / ZERO</button>
                <button className="close" onClick={() => setTargetUser(null)}>CANCEL</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TRADE SCREEN */}
      {activeDex && (
        <div className="trade-screen" style={{ background: DEX_THEMES[activeDex].bg }}>
          <div className="trade-nav">
            <button onClick={() => setActiveDex(null)}>✕</button>
            <div className="trade-title">{DEX_THEMES[activeDex].name}</div>
            <div style={{width: 32}}></div>
          </div>
          <div className="trade-card">
            <div className="trade-input">
              <div className="ti-head"><span>ОТДАТЬ</span> <span onClick={() => { playClick(); setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0)); }} className="max-tag">MAX</span></div>
              <div className="ti-row">
                <input type="number" inputMode="decimal" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                <button onClick={() => setShowTokenList('pay')} className="asset-btn"><img src={payToken.icon} alt=""/> {payToken.symbol}</button>
              </div>
            </div>
            <div className="trade-sep">↓</div>
            <div className="trade-input">
              <div className="ti-head">ПОЛУЧИТЬ</div>
              <div className="ti-row">
                <div className="ti-val">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(5) : '0.00'}</div>
                <button onClick={() => setShowTokenList('get')} className="asset-btn active"><img src={getToken.icon} alt=""/> {getToken.symbol}</button>
              </div>
            </div>
            <button onClick={handleSwap} disabled={isPending} className="confirm-btn" style={{ background: DEX_THEMES[activeDex].color }}>
              {isPending ? "В ПРОЦЕССЕ..." : "ПОДТВЕРДИТЬ"}
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT */}
      {receipt && (
        <div className="receipt-overlay">
          <div className="receipt-content">
            <div className="check-mark">✓</div>
            <h2>УСПЕШНО</h2>
            <div className="receipt-data">
              <div className="amt-big" style={{color: (receipt.pnl || 0) >= 0 ? '#0CF2B0' : '#ff4b4b'}}>
                {receipt.isPurchase ? receipt.get.toFixed(4) + ' ' + receipt.to : (receipt.pnl >= 0 ? '+' : '') + receipt.pnl.toFixed(2) + ' $'}
              </div>
            </div>
            <button onClick={() => { playClick(); setReceipt(null); setActiveDex(null); }} className="done-btn">ГОТОВО</button>
          </div>
        </div>
      )}

      {/* TOKEN PICKER */}
      {showTokenList && (
        <div className="token-picker">
          <div className="token-sheet">
            <div className="ts-header">ВЫБОР АКТИВА <button onClick={() => setShowTokenList(null)}>✕</button></div>
            <div className="ts-scroll">
              {Object.values(ASSETS).map(a => (
                <div key={a.symbol} onClick={() => { playClick(); if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }} className="ts-item">
                  <img src={a.icon} className="ts-icon" alt=""/>
                  <div className="ts-meta"><span className="ts-symbol">{a.symbol}</span><span className="ts-price">${a.price}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {clicks.map(c => <div key={c.id} className="click-fx" style={{ left: c.x, top: c.y }}>$</div>)}

      <style>{`
        :root { --vh: 1vh; }
        .app-container { background: #000; height: calc(var(--vh, 1vh) * 100); width: 100vw; color: #fff; font-family: sans-serif; overflow: hidden; position: fixed; }
        .main-ui { padding: 20px; height: 100%; display: flex; flex-direction: column; transition: 0.3s; }
        .scale-down { transform: scale(0.9); opacity: 0; pointer-events: none; }
        .header-nav { display: flex; justify-content: space-between; align-items: center; }
        .usdc-badge { font-size: 10px; font-weight: 900; background: #111; padding: 6px 12px; border-radius: 15px; color: #0CF2B0; }
        .mgr-btn { background: #fff; color: #000; border: none; padding: 6px 12px; border-radius: 10px; font-size: 9px; font-weight: 900; }
        .balance-hero { text-align: center; margin: 30px 0; }
        .bal-value { font-size: 40px; font-weight: 800; }
        .bal-sub { font-size: 8px; opacity: 0.2; letter-spacing: 1px; }
        .signal-box { background: #0d0d0d; border: 1px solid #1a1a1a; padding: 18px; border-radius: 20px; margin-bottom: 20px; }
        .sb-top { display: flex; justify-content: space-between; color: #0CF2B0; font-weight: 900; font-size: 10px; margin-bottom: 10px; }
        .sb-main { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .sb-node b { font-size: 10px; }
        .sb-coin-tag { background: #1a1a1a; padding: 5px 10px; border-radius: 8px; font-size: 10px; font-weight: 900; }
        .sb-progress { height: 2px; background: #222; }
        .sb-fill { height: 100%; background: #0CF2B0; transition: width 1s linear; }
        .grid-dex { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .card-dex { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 20px 10px; border-radius: 16px; text-align: left; color: #fff; position: relative; }
        .card-line { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
        .card-name { font-size: 10px; font-weight: 900; }
        .trade-screen { position: fixed; inset: 0; padding: 20px; z-index: 100; display: flex; flex-direction: column; }
        .trade-card { background: rgba(0,0,0,0.7); padding: 20px; border-radius: 24px; border: 1px solid #333; backdrop-filter: blur(15px); margin: auto 0; }
        .trade-input { background: #000; padding: 15px; border-radius: 18px; border: 1px solid #222; }
        .ti-row input { background: none; border: none; color: #fff; font-size: 20px; font-weight: 700; width: 50%; outline: none; }
        .asset-btn { background: #111; border: 1px solid #333; color: #fff; padding: 6px 10px; border-radius: 10px; display: flex; align-items: center; gap: 6px; font-size: 10px; }
        .asset-btn img { width: 14px; height: 14px; }
        .confirm-btn { width: 100%; padding: 18px; border: none; border-radius: 16px; color: #fff; font-weight: 900; margin-top: 20px; }
        .admin-panel { position: fixed; inset: 0; background: #000; z-index: 500; padding: 20px; display: flex; flex-direction: column; }
        .admin-list { flex: 1; overflow-y: auto; margin-top: 20px; }
        .admin-user-item { display: flex; justify-content: space-between; padding: 15px; background: #111; margin-bottom: 5px; border-radius: 10px; }
        .admin-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; padding: 20px; }
        .am-box { background: #111; padding: 20px; border-radius: 20px; width: 100%; border: 1px solid #333; }
        .am-box input { width: 100%; padding: 12px; margin: 10px 0; background: #000; border: 1px solid #333; color: #fff; border-radius: 10px; }
        .am-box button { width: 100%; padding: 12px; margin-top: 5px; border-radius: 10px; border: none; font-weight: 800; background: #0CF2B0; }
        .am-box button.ban { background: #ff4b4b; color: #fff; }
        .am-box button.close { background: none; color: #555; }
        .token-picker { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 300; display: flex; align-items: flex-end; }
        .token-sheet { background: #111; width: 100%; border-radius: 24px 24px 0 0; padding: 20px; max-height: 60vh; overflow-y: auto; }
        .ts-item { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #222; gap: 12px; }
        .ts-icon { width: 24px; height: 24px; }
        .ts-meta { flex: 1; display: flex; justify-content: space-between; }
        .receipt-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .receipt-content { background: #0a0a0a; padding: 30px; border-radius: 30px; text-align: center; width: 100%; border: 1px solid #222; }
        .click-fx { position: fixed; color: #0CF2B0; font-weight: 900; font-size: 24px; pointer-events: none; animation: floatUp 0.8s ease-out; z-index: 1000; }
        @keyframes floatUp { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-80px); } }
      `}</style>
    </div>
  );
}
