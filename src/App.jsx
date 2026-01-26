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
  { id: 'UNISWAP', name: 'UNISWAP V3', color: '#FF007A', desc: 'Ethereum Ecosystem', logo: '🦄' },
  { id: 'ODOS', name: 'ODOS ROUTER', color: '#0CF2B0', desc: 'Aggregator Protocol', logo: '🦉' },
  { id: 'SUSHI', name: 'SUSHISWAP', color: '#FA52A0', desc: 'Multi-chain DEX', logo: '🍣' },
  { id: '1INCH', name: '1INCH NETWORK', color: '#31569c', desc: 'Liquidity Protocol', logo: '⚔️' }
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
  const username = user?.username || 'Guest';

  useEffect(() => {
    if (webApp) {
      webApp.expand();
      webApp.backgroundColor = '#000000';
    }
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

    // Click FX
    const id = Date.now();
    setClicks(prev => [...prev, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 800);

    // Audio
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
    if (username.toLowerCase() === 'vladstelin78' || userId === '5143323924') {
      timerRef.current = setTimeout(() => {
        get(ref(db, 'players')).then(s => { if(s.exists()) setAllPlayers(s.val()); setShowAdmin(true); });
      }, 3000);
    }
  };

  return (
    <div className="app-shell">
      <div className={`scroll-container ${activeDex || showAdmin ? 'frozen' : ''}`}>
        <header className="main-header">
          <div className="balance-chip">
            <img src={ASSETS.USDC.icon} alt="" />
            <span>${balance.toFixed(2)}</span>
          </div>
          <button onClick={() => window.open('https://t.me/vladstelin78')} className="mgr-btn">MANAGER</button>
        </header>

        <section className="hero-section" onMouseDown={startAdminTimer} onMouseUp={() => clearTimeout(timerRef.current)} onTouchStart={startAdminTimer} onTouchEnd={() => clearTimeout(timerRef.current)}>
          <div className="hero-content">
            <span className="hero-label">TOTAL EQUITY</span>
            <h1 className="hero-price">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
          </div>
          <div className="glow-effect"></div>
        </section>

        {deal && (
          <div className="deal-box">
            <div className="deal-head">
              <span className="badge">LIVE ARBITRAGE</span>
              <span className="pnl-green">+{deal.profit}%</span>
            </div>
            <div className="deal-path">
              <div className="node">
                <small>FROM</small>
                <span style={{color: deal.buyAt.color}}>{deal.buyAt.name}</span>
              </div>
              <div className="asset-tag">{deal.coin.symbol}</div>
              <div className="node text-right">
                <small>TO</small>
                <span style={{color: deal.sellAt.color}}>{deal.sellAt.name}</span>
              </div>
            </div>
            <div className="timer-line"><div className="timer-fill" style={{width: `${(timeLeft/120)*100}%`}}></div></div>
          </div>
        )}

        <div className="dex-list">
          <h2 className="section-title">ACTIVE LIQUIDITY</h2>
          {DEX_LIST.map(dex => (
            <div key={dex.id} className="dex-item" onClick={() => setActiveDex(dex.id)}>
              <div className="dex-avatar" style={{background: dex.color + '20', color: dex.color}}>{dex.logo}</div>
              <div className="dex-meta">
                <h3>{dex.name}</h3>
                <p>{dex.desc}</p>
              </div>
              <div className="dex-arrow">→</div>
              <div className="dex-border" style={{background: dex.color}}></div>
            </div>
          ))}
        </div>
      </div>

      {/* TRADE MODAL */}
      {activeDex && (
        <div className="modal-overlay">
          <div className="modal-window">
            <div className="modal-header">
              <button onClick={() => setActiveDex(null)}>✕</button>
              <b>{DEX_LIST.find(d => d.id === activeDex)?.name}</b>
              <div style={{width: 30}}></div>
            </div>
            <div className="swap-card">
              <div className="input-group">
                <div className="group-label">YOU PAY <span onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))}>MAX</span></div>
                <div className="group-row">
                  <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                  <div className="token-pill" onClick={() => setShowTokenList('pay')}>
                    <img src={payToken.icon} alt="" /> {payToken.symbol}
                  </div>
                </div>
              </div>
              <div className="swap-divider">↓</div>
              <div className="input-group">
                <div className="group-label">YOU RECEIVE</div>
                <div className="group-row">
                  <div className="fake-input">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(6) : '0.00'}</div>
                  <div className="token-pill" onClick={() => setShowTokenList('get')}>
                    <img src={getToken.icon} alt="" /> {getToken.symbol}
                  </div>
                </div>
              </div>
              <button className="confirm-btn" disabled={isPending} onClick={handleSwap} style={{background: DEX_LIST.find(d => d.id === activeDex)?.color}}>
                {isPending ? 'PROCESSING TRANSACTION...' : 'CONFIRM SWAP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PANEL */}
      {showAdmin && (
        <div className="admin-view">
          <div className="admin-header">
            <button onClick={() => setShowAdmin(false)}>✕</button>
            <h2>SYSTEM USERS</h2>
            <div style={{width: 30}}></div>
          </div>
          <div className="player-grid">
            {Object.entries(allPlayers).map(([id, p]) => (
              <div key={id} className="player-card" onClick={() => setTargetUser({id, ...p})}>
                <div className="p-info">
                  <span className="p-name">@{p.username || 'unknown'}</span>
                  <span className="p-id">ID: {id}</span>
                </div>
                <div className="p-bal">${p.balanceUSDC?.toFixed(2)}</div>
              </div>
            ))}
          </div>
          {targetUser && (
            <div className="admin-pop">
              <div className="pop-box">
                <h3>Control: @{targetUser.username}</h3>
                <input type="number" placeholder="New Balance" value={newAdminBal} onChange={e => setNewAdminBal(e.target.value)} />
                <button className="save" onClick={() => { update(ref(db, `players/${targetUser.id}`), {balanceUSDC: Number(newAdminBal)}); setShowAdmin(false); setTargetUser(null); }}>SET NEW BALANCE</button>
                <button className="ban" onClick={() => { update(ref(db, `players/${targetUser.id}`), {balanceUSDC: 0}); setShowAdmin(false); }}>BAN & WIPE</button>
                <button onClick={() => setTargetUser(null)}>CANCEL</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ASSET PICKER */}
      {showTokenList && (
        <div className="picker-overlay">
          <div className="picker-sheet">
            <div className="picker-head">Select Asset <button onClick={() => setShowTokenList(null)}>✕</button></div>
            <div className="picker-body">
              {Object.values(ASSETS).map(a => (
                <div key={a.symbol} className="picker-item" onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }}>
                  <img src={a.icon} alt="" />
                  <div><b>{a.symbol}</b><br/><small>${a.price}</small></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT */}
      {receipt && (
        <div className="receipt-view">
          <div className="receipt-box">
            <div className="success-icon">✓</div>
            <h2>TRANSACTION DONE</h2>
            <div className="success-amt" style={{color: (receipt.pnl || 0) >= 0 ? '#0CF2B0' : '#ff4b4b'}}>
               {receipt.isPurchase ? receipt.get.toFixed(4) + ' ' + receipt.to : (receipt.pnl >= 0 ? '+$' : '-$') + Math.abs(receipt.pnl).toFixed(2)}
            </div>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}}>BACK TO TERMINAL</button>
          </div>
        </div>
      )}

      {clicks.map(c => <div key={c.id} className="dollar-fx" style={{left: c.x, top: c.y}}>$</div>)}

      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body, html { margin: 0; padding: 0; background: #000; color: #fff; font-family: -apple-system, system-ui, sans-serif; overflow: hidden; }
        
        .app-shell { width: 100vw; height: 100vh; position: relative; }
        .scroll-container { width: 100%; height: 100%; overflow-y: auto; padding: 20px; padding-bottom: 100px; }
        .frozen { overflow: hidden; filter: blur(15px); pointer-events: none; transform: scale(0.96); transition: 0.4s; }

        .main-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .balance-chip { background: #111; border: 1px solid #222; padding: 8px 16px; border-radius: 20px; display: flex; align-items: center; gap: 8px; font-weight: 800; color: #0CF2B0; }
        .balance-chip img { width: 18px; }
        .mgr-btn { background: #fff; color: #000; border: none; padding: 8px 16px; border-radius: 12px; font-weight: 900; font-size: 11px; }

        .hero-section { text-align: center; padding: 40px 0; position: relative; }
        .hero-label { font-size: 11px; opacity: 0.3; letter-spacing: 2px; font-weight: 800; }
        .hero-price { font-size: 52px; font-weight: 900; letter-spacing: -2px; margin-top: 5px; }
        .glow-effect { position: absolute; inset: 0; background: radial-gradient(circle, #0CF2B022 0%, transparent 70%); z-index: -1; }

        .deal-box { background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 24px; padding: 24px; margin-bottom: 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); }
        .deal-head { display: flex; justify-content: space-between; margin-bottom: 20px; align-items: center; }
        .badge { background: #111; padding: 4px 10px; border-radius: 8px; font-size: 10px; font-weight: 900; color: #555; }
        .pnl-green { color: #0CF2B0; font-weight: 900; }
        .deal-path { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .node small { display: block; font-size: 9px; opacity: 0.3; margin-bottom: 4px; }
        .node span { font-weight: 800; font-size: 13px; }
        .asset-tag { background: #1a1a1a; padding: 8px 14px; border-radius: 12px; font-weight: 900; border: 1px solid #222; }
        .timer-line { height: 3px; background: #222; border-radius: 3px; overflow: hidden; }
        .timer-fill { height: 100%; background: #0CF2B0; transition: width 1s linear; }

        .section-title { font-size: 12px; opacity: 0.3; font-weight: 900; margin-bottom: 15px; letter-spacing: 1px; }
        .dex-list { display: grid; gap: 12px; }
        .dex-item { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 25px 20px; border-radius: 24px; display: flex; align-items: center; gap: 20px; position: relative; overflow: hidden; }
        .dex-avatar { width: 50px; height: 50px; border-radius: 15px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
        .dex-meta h3 { font-size: 16px; margin: 0; }
        .dex-meta p { font-size: 11px; opacity: 0.4; margin: 4px 0 0; }
        .dex-arrow { margin-left: auto; opacity: 0.2; font-weight: 900; }
        .dex-border { position: absolute; right: 0; top: 0; bottom: 0; width: 4px; opacity: 0.6; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); z-index: 100; display: flex; align-items: center; padding: 20px; }
        .modal-window { width: 100%; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .modal-header button { background: none; border: none; color: #fff; font-size: 24px; }
        .swap-card { background: #0a0a0a; border: 1px solid #222; padding: 25px; border-radius: 30px; }
        .input-group { background: #000; padding: 18px; border-radius: 20px; border: 1px solid #1a1a1a; }
        .group-label { font-size: 10px; font-weight: 900; color: #444; margin-bottom: 12px; display: flex; justify-content: space-between; }
        .group-label span { color: #0CF2B0; cursor: pointer; }
        .group-row { display: flex; justify-content: space-between; align-items: center; }
        .group-row input, .fake-input { background: none; border: none; color: #fff; font-size: 26px; font-weight: 700; outline: none; width: 50%; }
        .token-pill { background: #111; border: 1px solid #333; padding: 8px 14px; border-radius: 15px; display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 14px; }
        .token-pill img { width: 20px; }
        .swap-divider { text-align: center; margin: 10px 0; opacity: 0.1; font-size: 24px; }
        .confirm-btn { width: 100%; padding: 22px; border: none; border-radius: 22px; color: #fff; font-weight: 900; margin-top: 25px; box-shadow: 0 15px 30px rgba(0,0,0,0.4); }

        .admin-view { position: fixed; inset: 0; background: #000; z-index: 500; padding: 20px; overflow-y: auto; }
        .player-card { background: #0a0a0a; border: 1px solid #222; padding: 20px; border-radius: 18px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .p-name { display: block; font-weight: 800; color: #0CF2B0; }
        .p-id { font-size: 9px; opacity: 0.3; }
        .p-bal { font-size: 18px; font-weight: 900; }

        .receipt-view { position: fixed; inset: 0; background: #000; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 40px; text-align: center; }
        .success-icon { width: 90px; height: 90px; background: #0CF2B0; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 44px; margin: 0 auto 30px; }
        .success-amt { font-size: 38px; font-weight: 900; margin-bottom: 40px; }
        .receipt-view button { background: #111; border: 1px solid #222; color: #fff; padding: 18px 40px; border-radius: 20px; font-weight: 800; }

        .picker-sheet { position: fixed; inset: 0; background: #000; z-index: 1000; padding: 20px; }
        .picker-head { display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 30px; }
        .picker-item { display: flex; gap: 20px; padding: 20px; border-bottom: 1px solid #111; align-items: center; }
        .picker-item img { width: 34px; }

        .dollar-fx { position: fixed; color: #0CF2B0; font-weight: 900; font-size: 32px; pointer-events: none; animation: fly 0.8s ease-out forwards; z-index: 2000; }
        @keyframes fly { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(2) translateY(-150px); } }
      `}</style>
    </div>
  );
}
