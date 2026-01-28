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
  const isAdmin = user?.username === 'crypto_mngr66';

  useEffect(() => {
    setPayToken(assets.USDC);
    setGetToken(assets.BTC);
    webApp?.expand();
  }, [assets]);

  useEffect(() => {
    if (userId === 'Guest') return;
    const userRef = ref(db, `players/${userId}`);
    onValue(userRef, (s) => {
      if (s.exists()) {
        setBalance(s.val().balanceUSDC ?? 1000);
        setWallet(s.val().wallet || {});
        update(userRef, { lastSeen: Date.now() });
      } else {
        update(userRef, { balanceUSDC: 1000, wallet: {}, username: user?.username || 'Guest', createdAt: Date.now(), lastSeen: Date.now() });
      }
    });
    onValue(ref(db, `referrals/${userId}`), (s) => { if (s.exists()) setReferrals(Object.values(s.val())); });
  }, [userId]);

  useEffect(() => {
    if (isAdmin && showAdmin) {
      onValue(ref(db, `players`), (s) => { if (s.exists()) setAllPlayers(s.val()); });
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

    new Audio('https://www.soundjay.com/buttons/button-16.mp3').play().catch(()=>{});
    const touch = e.touches ? e.touches[0] : e;
    const clickId = Date.now();
    setClicks(p => [...p, { id: clickId, x: touch.clientX, y: touch.clientY }]);
    setTimeout(() => setClicks(p => p.filter(c => c.id !== clickId)), 800);

    setIsPending(true);
    setTimeout(() => {
      let receiveAmt = (amt * payToken.price) / getToken.price;
      let pnl = null;
      if (getToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        const isOk = activeDex.id === deal.sellAt.id && payToken.symbol === deal.coin.symbol;
        receiveAmt *= isOk ? (1 + (Math.min(Number(deal.profit), 3) / 100)) : (1 - (Math.random() * 0.015));
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

  const getStats = () => {
    const players = Object.values(allPlayers);
    const now = Date.now();
    const online = players.filter(p => now - (p.lastSeen || 0) < 60000).length;
    const newToday = players.filter(p => now - (p.createdAt || 0) < 86400000).length;
    return { total: players.length, online, newToday };
  };

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
          <div className="hero-sub">Live Account</div>
          <div className="hero-main">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
        </div>

        {deal && (
          <div className="arbitrage-card">
            <div className="arb-header"><span className="live-tag">● SIGNAL LIVE</span><span className="yield">+{deal.profit}%</span></div>
            <div className="arb-route">
              <div className="node"><small>BUY</small><b style={{color: deal.buyAt.color}}>{deal.buyAt.name}</b></div>
              <div className="asset-tag">{deal.coin.symbol}</div>
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

      {showAdmin && (
        <div className="full-modal">
          <div className="modal-top"><button onClick={() => setShowAdmin(false)}>✕</button><span>ADMIN DASHBOARD</span><div style={{width:30}}></div></div>
          <div className="admin-body">
            <div className="stats-grid">
              <div className="stat-card"><h3>{getStats().total}</h3><p>TOTAL</p></div>
              <div className="stat-card"><h3>{getStats().newToday}</h3><p>NEW 24H</p></div>
              <div className="stat-card" style={{borderColor: '#0CF2B0'}}><h3 style={{color: '#0CF2B0'}}>{getStats().online}</h3><p>ONLINE</p></div>
            </div>
            <div className="player-scroll">
              {Object.entries(allPlayers).map(([pId, pData]) => (
                <div key={pId} className="admin-player-card">
                  <div className="p-meta"><b>@{pData.username}</b><br/><small>{Date.now() - (pData.lastSeen || 0) < 60000 ? '🟢 Online' : '⚪ Offline'}</small></div>
                  <div className="p-edit"><input type="number" defaultValue={pData.balanceUSDC?.toFixed(2)} onBlur={(e) => update(ref(db, `players/${pId}`), { balanceUSDC: Number(e.target.value) })} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeDex && (
        <div className="full-modal">
          <div className="modal-top"><button onClick={() => setActiveDex(null)}>✕</button><span>{activeDex.name}</span><div style={{width:30}}></div></div>
          <div className="swap-box">
             <div className="input-group">
                <div className="group-label">PAY <span className="max-btn" onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))}>MAX</span></div>
                <div className="row">
                  <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                  <div className="token-select" onClick={() => setShowTokenList('pay')}><img src={payToken.icon} alt="" /> {payToken.symbol}</div>
                </div>
             </div>
             <div className="divider-icon">↓</div>
             <div className="input-group">
                <div className="group-label">RECEIVE</div>
                <div className="row">
                  <div className="val">{(payAmount * payToken.price / getToken.price).toFixed(6)}</div>
                  <div className="token-select" onClick={() => setShowTokenList('get')}><img src={getToken.icon} alt="" /> {getToken.symbol}</div>
                </div>
             </div>
             <button className="swap-btn" style={{background: activeDex.bg}} onClick={handleSwap} disabled={isPending}>{isPending ? 'PROCESSING...' : 'SWAP'}</button>
          </div>
        </div>
      )}

      {showTokenList && (
        <div className="sheet-overlay" onClick={() => setShowTokenList(null)}>
           <div className="sheet-container">
             <div className="sheet-header">Select Asset <button onClick={() => setShowTokenList(null)}>✕</button></div>
             <div className="token-list-scroll">
               {Object.values(assets).map(a => (
                 <div key={a.symbol} className="token-option" onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }}>
                   <div className="t-left"><img src={a.icon} alt="" /><div><b>{a.symbol}</b><br/><small>${a.price}</small></div></div>
                   <div className="t-right">{a.symbol === 'USDC' ? balance.toFixed(2) : (wallet[a.symbol] || 0).toFixed(4)}</div>
                 </div>
               ))}
             </div>
           </div>
        </div>
      )}

      {showRefs && (
        <div className="full-modal">
          <div className="modal-top"><button onClick={() => setShowRefs(false)}>✕</button><span>Referral Hub</span><div style={{width:30}}></div></div>
          <div className="ref-content"><div className="ref-card"><h3>Пригласи друга</h3><p>Бонус $1,000 за каждого!</p><code className="ref-link">https://t.me/Kryptoapp_bot?start={userId}</code><button className="copy-btn" onClick={() => { navigator.clipboard.writeText(`https://t.me/Kryptoapp_bot?start=${userId}`); alert("Скопировано!"); }}>COPY LINK</button></div></div>
        </div>
      )}

      {receipt && (
        <div className="receipt-overlay">
          <div className="receipt-card"><div className="r-check">✓</div><h2>Success</h2><div className="r-value" style={{color: receipt.pnl < 0 ? '#ff4b4b' : '#0CF2B0'}}>{receipt.isPurchase ? `+${receipt.get.toFixed(4)} ${receipt.to}` : (receipt.pnl >= 0 ? `+$${receipt.pnl.toFixed(2)}` : `-$${Math.abs(receipt.pnl).toFixed(2)}`)}</div><button onClick={() => setReceipt(null)}>DONE</button></div>
        </div>
      )}

      {clicks.map(c => <div key={c.id} className="click-pop" style={{left: c.x, top: c.y}}>$</div>)}

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background: #000; color: #fff; overflow: hidden; }
        .viewport { padding: 20px; transition: 0.6s cubic-bezier(0.1, 0.9, 0.2, 1); height: 100vh; overflow-y: auto; }
        .is-modal-open { filter: blur(25px) brightness(0.4); }
        .wallet-pill { background: rgba(255,255,255,0.05); padding: 10px 20px; border-radius: 100px; color: #0CF2B0; font-weight: 800; border: 1px solid rgba(255,255,255,0.1); }
        .nav-btns { display: flex; gap: 8px; }
        .admin-btn { background: #FF9500; color: #000; border: none; padding: 8px 12px; border-radius: 12px; font-weight: 900; font-size: 10px; }
        .ref-btn, .mgr-btn { background: #fff; color: #000; border: none; padding: 8px 12px; border-radius: 12px; font-weight: 900; font-size: 10px; }
        .hero-block { text-align: center; padding: 40px 0; }
        .hero-main { font-size: 52px; font-weight: 900; background: linear-gradient(#fff, #888); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .arbitrage-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 25px; border-radius: 35px; margin-bottom: 25px; backdrop-filter: blur(10px); }
        .live-tag { color: #0CF2B0; font-weight: 900; font-size: 10px; animation: blink 1.5s infinite; }
        .yield { background: #0CF2B0; color: #000; padding: 5px 12px; border-radius: 10px; font-weight: 900; font-size: 12px; }
        .asset-tag { background: #111; padding: 8px 16px; border-radius: 15px; font-weight: 900; border: 1px solid #222; }
        .timer-bar { height: 4px; background: rgba(255,255,255,0.05); margin-top: 20px; border-radius: 10px; overflow: hidden; }
        .progress { height: 100%; background: #0CF2B0; box-shadow: 0 0 10px #0CF2B0; }
        .dex-card { position: relative; padding: 30px; border-radius: 30px; overflow: hidden; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.1); }
        .dex-bg { position: absolute; inset: 0; opacity: 0.4; z-index: 1; }
        .dex-inner { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; }
        .full-modal { position: fixed; inset: 0; background: #000; z-index: 100; display: flex; flex-direction: column; animation: slide 0.3s ease-out; }
        .swap-box { padding: 25px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
        .input-group { background: rgba(255,255,255,0.04); padding: 25px; border-radius: 35px; border: 1px solid rgba(255,255,255,0.07); }
        .row input { background: none; border: none; color: #fff; font-size: 40px; font-weight: 800; width: 50%; outline: none; }
        .token-select { background: rgba(255,255,255,0.08); padding: 10px 18px; border-radius: 20px; display: flex; align-items: center; gap: 10px; font-weight: 800; border: 1px solid rgba(255,255,255,0.1); }
        .token-select img { width: 24px; height: 24px; }
        .swap-btn { width: 100%; padding: 25px; border: none; border-radius: 30px; color: #fff; font-weight: 900; margin-top: 35px; font-size: 18px; }
        .sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 200; display: flex; align-items: flex-end; }
        .sheet-container { background: #0d0d0d; width: 100%; border-radius: 40px 40px 0 0; padding: 30px; border-top: 1px solid #222; max-height: 80vh; display: flex; flex-direction: column; }
        .sheet-header { display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 20px; font-size: 20px; }
        .token-list-scroll { overflow-y: auto; }
        .token-option { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-radius: 20px; margin-bottom: 10px; background: rgba(255,255,255,0.03); }
        .token-option img { width: 32px; height: 32px; margin-right: 15px; }
        .t-left { display: flex; align-items: center; }
        .click-pop { position: fixed; color: #0CF2B0; font-weight: 900; font-size: 45px; pointer-events: none; animation: pop 0.8s forwards; z-index: 1000; }
        @keyframes pop { to { opacity: 0; transform: translateY(-200px) scale(1.5); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
