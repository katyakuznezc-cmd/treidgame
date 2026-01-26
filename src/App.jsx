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

const DEX_LIST = [
  { id: 'UNISWAP', name: 'UNISWAP V3', color: '#FF007A', logo: '🦄' },
  { id: 'ODOS', name: 'ODOS ROUTER', color: '#0CF2B0', logo: '🦉' },
  { id: 'SUSHI', name: 'SUSHISWAP', color: '#FA52A0', logo: '🍣' },
  { id: '1INCH', name: '1INCH NET', color: '#31569c', logo: '⚔️' }
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
      webApp.enableClosingConfirmation();
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
    const buyIdx = Math.floor(Math.random() * DEX_LIST.length);
    let sellIdx = Math.floor(Math.random() * DEX_LIST.length);
    while (sellIdx === buyIdx) sellIdx = Math.floor(Math.random() * DEX_LIST.length);
    setDeal({ coin: ASSETS[assets[Math.floor(Math.random() * assets.length)]], buyAt: DEX_LIST[buyIdx], sellAt: DEX_LIST[sellIdx], profit: (Math.random() * 0.5 + 2.5).toFixed(2) });
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
        const isOk = activeDex === deal.sellAt.id && payToken.symbol === deal.coin.symbol;
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
    <div className="app-root">
      <div className={`main-view ${activeDex || showAdmin ? 'blurred' : ''}`}>
        
        <div className="top-bar">
          <div className="usdc-card">
            <img src={ASSETS.USDC.icon} alt="" />
            <span>${balance.toFixed(2)}</span>
          </div>
          <button onClick={() => window.open('https://t.me/vladstelin78')} className="mgr-btn">MANAGER</button>
        </div>

        <div className="hero" onTouchStart={startAdminTimer} onTouchEnd={() => clearTimeout(timerRef.current)}>
          <div className="hero-lbl">PORTFOLIO VALUE</div>
          <div className="hero-amt">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div className="hero-glow"></div>
        </div>

        {deal && (
          <div className="signal">
            <div className="sig-head">
              <span className="live">● LIVE</span>
              <span className="pct">+{deal.profit}%</span>
            </div>
            <div className="sig-row">
              <div className="node"><small>BUY</small><b style={{color: deal.buyAt.color}}>{deal.buyAt.name}</b></div>
              <div className="coin">{deal.coin.symbol}</div>
              <div className="node text-right"><small>SELL</small><b style={{color: deal.sellAt.color}}>{deal.sellAt.name}</b></div>
            </div>
            <div className="bar-bg"><div className="bar-fill" style={{width: `${(timeLeft/120)*100}%`}}></div></div>
          </div>
        )}

        <div className="dex-section">
          <p className="section-title">CHOOSE PROTOCOL</p>
          <div className="dex-stack">
            {DEX_LIST.map(dex => (
              <div key={dex.id} className="dex-btn" onClick={() => setActiveDex(dex.id)}>
                <div className="dex-icon" style={{background: dex.color + '15', color: dex.color}}>{dex.logo}</div>
                <div className="dex-info">
                  <h3>{dex.name}</h3>
                  <small>LIQUIDITY V3 ACTIVE</small>
                </div>
                <div className="dex-line" style={{background: dex.color}}></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODALS & OVERLAYS */}
      {activeDex && (
        <div className="overlay">
          <div className="swap-box">
            <div className="swap-head"><button onClick={() => setActiveDex(null)}>✕</button><b>{activeDex}</b><div style={{width: 20}}></div></div>
            <div className="input-block">
              <div className="block-top">FROM <span onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))}>MAX</span></div>
              <div className="block-row">
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                <div className="token-btn" onClick={() => setShowTokenList('pay')}><img src={payToken.icon} alt=""/> {payToken.symbol}</div>
              </div>
            </div>
            <div className="arrow-down">↓</div>
            <div className="input-block">
              <div className="block-top">TO</div>
              <div className="block-row">
                <div className="fake-inp">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(6) : '0.00'}</div>
                <div className="token-btn" onClick={() => setShowTokenList('get')}><img src={getToken.icon} alt=""/> {getToken.symbol}</div>
              </div>
            </div>
            <button className="swap-confirm" onClick={handleSwap} disabled={isPending} style={{background: DEX_LIST.find(d => d.id === activeDex).color}}>
              {isPending ? 'ROUTING...' : 'SWAP ASSETS'}
            </button>
          </div>
        </div>
      )}

      {showAdmin && (
        <div className="admin-layer">
          <div className="admin-head"><button onClick={() => setShowAdmin(false)}>✕</button><h3>ADMIN</h3><div style={{width: 20}}></div></div>
          <div className="player-list">
            {Object.entries(allPlayers).map(([id, p]) => (
              <div key={id} className="p-item" onClick={() => setTargetUser({id, ...p})}>
                <span>@{p.username || id}</span><b>${p.balanceUSDC?.toFixed(2)}</b>
              </div>
            ))}
          </div>
          {targetUser && (
            <div className="pop-overlay">
              <div className="pop-box">
                <h4>Edit @{targetUser.username}</h4>
                <input type="number" value={newAdminBal} onChange={e => setNewAdminBal(e.target.value)} />
                <button className="save" onClick={() => { update(ref(db, `players/${targetUser.id}`), {balanceUSDC: Number(newAdminBal)}); setShowAdmin(false); setTargetUser(null); }}>SAVE</button>
                <button className="ban" onClick={() => { update(ref(db, `players/${targetUser.id}`), {balanceUSDC: 0}); setShowAdmin(false); }}>BAN</button>
                <button onClick={() => setTargetUser(null)}>EXIT</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showTokenList && (
        <div className="sheet">
          <div className="sheet-box">
            <div className="sheet-top">TOKENS <button onClick={() => setShowTokenList(null)}>✕</button></div>
            {Object.values(ASSETS).map(a => (
              <div key={a.symbol} className="token-row" onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }}>
                <img src={a.icon} alt="" /> <div><b>{a.symbol}</b><br/><small>${a.price}</small></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {receipt && (
        <div className="receipt">
          <div className="r-box">
            <div className="r-icon">✓</div>
            <h2>DONE</h2>
            <div className="r-val" style={{color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b'}}>
              {receipt.isPurchase ? receipt.get.toFixed(4) + ' ' + receipt.to : (receipt.pnl >= 0 ? '+$' : '-$') + Math.abs(receipt.pnl).toFixed(2)}
            </div>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}}>CLOSE</button>
          </div>
        </div>
      )}

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x, top: c.y}}>$</div>)}

      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html, body { margin: 0; padding: 0; background: #000; color: #fff; width: 100%; height: 100%; overflow: hidden; font-family: -apple-system, sans-serif; }
        
        .app-root { width: 100%; height: 100vh; position: relative; overflow-x: hidden; }
        .main-view { width: 100%; height: 100%; overflow-y: auto; padding: 20px; padding-bottom: 80px; transition: 0.3s; }
        .blurred { filter: blur(20px); transform: scale(0.95); pointer-events: none; }

        .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .usdc-card { background: #111; border: 1px solid #222; padding: 8px 16px; border-radius: 20px; display: flex; align-items: center; gap: 8px; color: #0CF2B0; font-weight: 800; }
        .usdc-card img { width: 18px; }
        .mgr-btn { background: #fff; color: #000; border: none; padding: 8px 16px; border-radius: 12px; font-weight: 900; font-size: 11px; }

        .hero { text-align: center; padding: 40px 0; position: relative; }
        .hero-lbl { font-size: 10px; opacity: 0.3; letter-spacing: 2px; }
        .hero-amt { font-size: 46px; font-weight: 900; margin-top: 10px; }
        .hero-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 200px; height: 100px; background: #0CF2B015; filter: blur(60px); z-index: -1; }

        .signal { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 20px; border-radius: 24px; margin-bottom: 30px; }
        .sig-head { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .live { color: #0CF2B0; font-weight: 900; font-size: 10px; }
        .pct { color: #0CF2B0; font-weight: 900; }
        .sig-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .node small { display: block; font-size: 9px; opacity: 0.3; margin-bottom: 4px; }
        .node b { font-size: 13px; }
        .coin { background: #1a1a1a; padding: 8px 14px; border-radius: 12px; font-weight: 900; border: 1px solid #222; }
        .bar-bg { height: 3px; background: #222; border-radius: 2px; overflow: hidden; }
        .bar-fill { height: 100%; background: #0CF2B0; transition: width 1s linear; }

        .dex-section { width: 100%; }
        .section-title { font-size: 11px; opacity: 0.3; font-weight: 800; margin-bottom: 15px; }
        .dex-stack { display: flex; flex-direction: column; gap: 10px; }
        .dex-btn { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 20px; border-radius: 20px; display: flex; align-items: center; gap: 15px; position: relative; overflow: hidden; }
        .dex-icon { width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
        .dex-info h3 { font-size: 15px; margin: 0; }
        .dex-info small { opacity: 0.3; font-weight: 700; font-size: 10px; }
        .dex-line { position: absolute; right: 0; top: 0; bottom: 0; width: 4px; opacity: 0.5; }

        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(20px); z-index: 100; display: flex; align-items: center; padding: 20px; }
        .swap-box { width: 100%; background: #0a0a0a; border: 1px solid #222; padding: 20px; border-radius: 28px; }
        .swap-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .swap-head button { background: none; border: none; color: #fff; font-size: 20px; }
        .input-block { background: #000; padding: 15px; border-radius: 18px; border: 1px solid #1a1a1a; }
        .block-top { font-size: 10px; color: #444; font-weight: 800; margin-bottom: 10px; display: flex; justify-content: space-between; }
        .block-top span { color: #0CF2B0; }
        .block-row { display: flex; justify-content: space-between; align-items: center; }
        .block-row input, .fake-inp { background: none; border: none; color: #fff; font-size: 22px; font-weight: 700; outline: none; width: 60%; }
        .token-btn { background: #111; border: 1px solid #222; padding: 6px 12px; border-radius: 12px; display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 800; }
        .token-btn img { width: 16px; }
        .arrow-down { text-align: center; padding: 5px; opacity: 0.1; }
        .swap-confirm { width: 100%; padding: 20px; border: none; border-radius: 18px; color: #fff; font-weight: 900; margin-top: 20px; }

        .sheet { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 200; display: flex; align-items: flex-end; }
        .sheet-box { width: 100%; background: #0d0d0d; border-radius: 24px 24px 0 0; padding: 20px; border-top: 1px solid #222; max-height: 60vh; overflow-y: auto; }
        .sheet-top { display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 20px; }
        .token-row { display: flex; align-items: center; gap: 15px; padding: 15px 0; border-bottom: 1px solid #1a1a1a; }
        .token-row img { width: 30px; }

        .receipt { position: fixed; inset: 0; background: #000; z-index: 300; display: flex; align-items: center; padding: 30px; text-align: center; }
        .r-box { width: 100%; }
        .r-icon { width: 80px; height: 80px; background: #0CF2B0; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 30px; }
        .r-val { font-size: 36px; font-weight: 900; margin-bottom: 40px; }
        .receipt button { background: #111; border: 1px solid #222; color: #fff; padding: 15px 40px; border-radius: 15px; font-weight: 800; }

        .dollar { position: fixed; color: #0CF2B0; font-weight: 900; font-size: 30px; pointer-events: none; animation: fly 0.8s ease-out forwards; z-index: 1000; }
        @keyframes fly { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-120px); } }

        .admin-layer { position: fixed; inset: 0; background: #000; z-index: 500; padding: 20px; overflow-y: auto; }
        .p-item { display: flex; justify-content: space-between; padding: 15px; background: #0a0a0a; margin-bottom: 8px; border-radius: 12px; border: 1px solid #1a1a1a; }
        .pop-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; padding: 20px; }
        .pop-box { background: #111; width: 100%; padding: 20px; border-radius: 20px; border: 1px solid #333; }
        .pop-box input { width: 100%; padding: 12px; margin: 15px 0; background: #000; color: #fff; border: 1px solid #222; border-radius: 10px; }
        .pop-box button { width: 100%; padding: 12px; margin-bottom: 8px; border-radius: 10px; border: none; font-weight: 800; }
        .save { background: #0CF2B0; }
        .ban { background: #ff4b4b; color: #fff; }
      `}</style>
    </div>
  );
}
