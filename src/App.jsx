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
    }, 1200);
  };

  const getStats = () => {
    const players = Object.values(allPlayers);
    const online = players.filter(p => Date.now() - (p.lastSeen || 0) < 60000).length;
    const newToday = players.filter(p => Date.now() - (p.createdAt || 0) < 86400000).length;
    return { total: players.length, online, newToday };
  };

  if (!payToken || !getToken) return null;

  return (
    <div className="app-shell">
      <div className={`main-view ${activeDex || showRefs || showAdmin || receipt || showTokenList ? 'blurred' : ''}`}>
        <div className="top-bar">
          <div className="balance-badge">${balance.toFixed(2)}</div>
          <div className="btn-row">
            {isAdmin && <button onClick={() => setShowAdmin(true)} className="btn-orange">🔧 ADMIN</button>}
            <button onClick={() => setShowRefs(true)} className="btn-white">👥 FRIENDS</button>
          </div>
        </div>

        <div className="main-stat">
          <p>Portfolio Balance</p>
          <h1>${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
        </div>

        {deal && (
          <div className="signal-card">
            <div className="signal-top"><span>● SIGNAL LIVE</span><span className="profit-tag">+{deal.profit}%</span></div>
            <div className="signal-route">
              <div className="dex-node"><small>BUY</small><br/><span style={{color: deal.buyAt.color}}>{deal.buyAt.name}</span></div>
              <div className="coin-node">{deal.coin.symbol}</div>
              <div className="dex-node" style={{textAlign:'right'}}><small>SELL</small><br/><span style={{color: deal.sellAt.color}}>{deal.sellAt.name}</span></div>
            </div>
            <div className="progress-bg"><div className="progress-fill" style={{width:`${(timeLeft/120)*100}%`}}></div></div>
          </div>
        )}

        <div className="dex-list">
          {DEX_CONFIG.map(dex => (
            <div key={dex.id} className="dex-item" onClick={() => setActiveDex(dex)}>
              <div className="dex-bg-layer" style={{background: dex.bg}}></div>
              <div className="dex-content">
                <div className="dex-info">
                  <span className="dex-ico">{dex.logo}</span>
                  <div><h3>{dex.name}</h3><p>{dex.status}</p></div>
                </div>
                <span className="dex-arrow">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAdmin && (
        <div className="modal-overlay">
          <div className="modal-header"><button onClick={() => setShowAdmin(false)}>✕</button><span>ADMIN</span><div style={{width:20}}></div></div>
          <div className="admin-scroll">
            <div className="stat-grid">
              <div className="stat-item"><b>{getStats().total}</b><p>TOTAL</p></div>
              <div className="stat-item"><b>{getStats().newToday}</b><p>NEW</p></div>
              <div className="stat-item" style={{color:'#0CF2B0'}}><b>{getStats().online}</b><p>ONLINE</p></div>
            </div>
            {Object.entries(allPlayers).map(([pId, pData]) => (
              <div key={pId} className="player-row">
                <div className="p-info"><b>@{pData.username}</b><br/><small>{Date.now() - (pData.lastSeen || 0) < 60000 ? '🟢 Online' : '⚪ Offline'}</small></div>
                <input type="number" defaultValue={pData.balanceUSDC?.toFixed(2)} onBlur={(e) => update(ref(db, `players/${pId}`), { balanceUSDC: Number(e.target.value) })} />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeDex && (
        <div className="modal-overlay">
          <div className="modal-header"><button onClick={() => setActiveDex(null)}>✕</button><span>{activeDex.name}</span><div style={{width:20}}></div></div>
          <div className="swap-container">
            <div className="swap-card">
              <div className="swap-label">PAY <span onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))}>MAX</span></div>
              <div className="swap-row">
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                <div className="token-picker" onClick={() => setShowTokenList('pay')}><img src={payToken.icon} alt="" /> {payToken.symbol}</div>
              </div>
            </div>
            <div className="swap-arrow-mid">↓</div>
            <div className="swap-card">
              <div className="swap-label">RECEIVE</div>
              <div className="swap-row">
                <div className="val-out">{(payAmount * payToken.price / getToken.price).toFixed(6)}</div>
                <div className="token-picker" onClick={() => setShowTokenList('get')}><img src={getToken.icon} alt="" /> {getToken.symbol}</div>
              </div>
            </div>
            <button className="confirm-btn" style={{background: activeDex.bg}} onClick={handleSwap} disabled={isPending}>{isPending ? 'WAITING...' : 'CONFIRM SWAP'}</button>
          </div>
        </div>
      )}

      {showTokenList && (
        <div className="sheet-box" onClick={() => setShowTokenList(null)}>
          <div className="sheet-content" onClick={e => e.stopPropagation()}>
            <div className="sheet-head">Select Asset <button onClick={() => setShowTokenList(null)}>✕</button></div>
            <div className="asset-scroll">
              {Object.values(assets).map(a => (
                <div key={a.symbol} className="asset-row" onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }}>
                  <div className="a-left"><img src={a.icon} alt="" /><div><b>{a.symbol}</b><br/><small>${a.price}</small></div></div>
                  <div className="a-right">{a.symbol === 'USDC' ? balance.toFixed(2) : (wallet[a.symbol] || 0).toFixed(4)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="receipt-screen">
          <div className="receipt-card">
            <div className="check-icon">✓</div>
            <h2>Success</h2>
            <div className="pnl-val" style={{color: receipt.pnl < 0 ? '#ff4b4b' : '#0CF2B0'}}>
              {receipt.isPurchase ? `+${receipt.get.toFixed(4)} ${receipt.to}` : (receipt.pnl >= 0 ? `+$${receipt.pnl.toFixed(2)}` : `-$${Math.abs(receipt.pnl).toFixed(2)}`)}
            </div>
            <button className="done-btn" onClick={() => setReceipt(null)}>CLOSE</button>
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
        body { background: #000; color: #fff; }
        .app-shell { width: 100vw; height: 100vh; overflow: hidden; position: relative; }
        .main-view { padding: 20px; height: 100%; overflow-y: auto; transition: 0.5s; }
        .blurred { filter: blur(20px) brightness(0.5); transform: scale(0.96); }

        .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .balance-badge { background: rgba(255,255,255,0.08); padding: 8px 16px; border-radius: 50px; color: #0CF2B0; font-weight: 800; border: 1px solid rgba(255,255,255,0.1); }
        .btn-row { display: flex; gap: 8px; }
        .btn-orange { background: #FF9500; border: none; padding: 8px 12px; border-radius: 12px; font-weight: 900; font-size: 10px; color: #000; }
        .btn-white { background: #fff; border: none; padding: 8px 12px; border-radius: 12px; font-weight: 900; font-size: 10px; color: #000; }

        .main-stat { text-align: center; margin-bottom: 30px; }
        .main-stat p { opacity: 0.4; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
        .main-stat h1 { font-size: 48px; font-weight: 900; background: linear-gradient(#fff, #999); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        .signal-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 20px; border-radius: 28px; margin-bottom: 25px; backdrop-filter: blur(10px); }
        .signal-top { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 10px; font-weight: 900; }
        .profit-tag { background: #0CF2B0; color: #000; padding: 4px 10px; border-radius: 8px; }
        .signal-route { display: flex; justify-content: space-between; align-items: center; }
        .coin-node { background: #111; padding: 6px 15px; border-radius: 12px; border: 1px solid #222; font-weight: 900; }
        .progress-bg { height: 4px; background: rgba(255,255,255,0.05); border-radius: 10px; margin-top: 15px; overflow: hidden; }
        .progress-fill { height: 100%; background: #0CF2B0; box-shadow: 0 0 10px #0CF2B0; }

        .dex-list { display: flex; flex-direction: column; gap: 12px; }
        .dex-item { position: relative; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
        .dex-bg-layer { position: absolute; inset: 0; opacity: 0.3; }
        .dex-content { position: relative; z-index: 2; padding: 25px; display: flex; justify-content: space-between; align-items: center; }
        .dex-info { display: flex; align-items: center; gap: 15px; }
        .dex-ico { font-size: 24px; background: rgba(255,255,255,0.1); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; }
        .dex-info p { font-size: 11px; opacity: 0.5; }

        .modal-overlay { position: fixed; inset: 0; background: #000; z-index: 100; display: flex; flex-direction: column; animation: up 0.3s ease-out; }
        @keyframes up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .modal-header { padding: 20px; border-bottom: 1px solid #111; display: flex; justify-content: space-between; font-weight: 900; }
        .modal-header button { background: none; border: none; color: #fff; font-size: 20px; }

        .swap-container { padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
        .swap-card { background: rgba(255,255,255,0.04); padding: 25px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.08); }
        .swap-label { font-size: 12px; opacity: 0.4; font-weight: 800; margin-bottom: 10px; display: flex; justify-content: space-between; }
        .swap-row { display: flex; justify-content: space-between; align-items: center; }
        .swap-row input { background: none; border: none; color: #fff; font-size: 38px; font-weight: 900; width: 60%; outline: none; }
        .val-out { font-size: 38px; font-weight: 900; }
        .token-picker { background: rgba(255,255,255,0.08); padding: 8px 14px; border-radius: 15px; display: flex; align-items: center; gap: 8px; font-weight: 800; border: 1px solid rgba(255,255,255,0.1); }
        .token-picker img { width: 22px; height: 22px; }
        .swap-arrow-mid { text-align: center; padding: 10px; font-size: 20px; color: #444; }
        .confirm-btn { width: 100%; padding: 22px; border-radius: 25px; border: none; color: #fff; font-weight: 900; font-size: 18px; margin-top: 30px; }

        .sheet-box { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 200; display: flex; align-items: flex-end; }
        .sheet-content { background: #0d0d0d; width: 100%; border-radius: 35px 35px 0 0; padding: 25px; border-top: 1px solid #222; }
        .sheet-head { display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 20px; }
        .asset-row { display: flex; justify-content: space-between; align-items: center; padding: 18px; background: rgba(255,255,255,0.02); border-radius: 20px; margin-bottom: 10px; }
        .asset-row img { width: 30px; height: 30px; margin-right: 12px; }
        .a-left { display: flex; align-items: center; }

        .stat-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; padding: 20px; }
        .stat-item { background: #0a0a0a; padding: 15px; border-radius: 20px; text-align: center; border: 1px solid #1a1a1a; }
        .stat-item p { font-size: 9px; opacity: 0.4; }
        .admin-scroll { overflow-y: auto; flex: 1; padding: 0 20px 40px; }
        .player-row { display: flex; justify-content: space-between; align-items: center; padding: 18px; background: #080808; border-radius: 20px; margin-bottom: 10px; }
        .player-row input { background: #111; border: 1px solid #333; color: #0CF2B0; padding: 8px; width: 100px; border-radius: 10px; text-align: right; }

        .receipt-screen { position: fixed; inset: 0; background: #000; z-index: 300; display: flex; align-items: center; justify-content: center; padding: 30px; }
        .receipt-card { text-align: center; width: 100%; }
        .check-icon { width: 70px; height: 70px; background: #0CF2B0; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 35px; margin: 0 auto 20px; }
        .pnl-val { font-size: 36px; font-weight: 900; margin: 15px 0 30px; }
        .done-btn { width: 100%; padding: 20px; border-radius: 20px; border: none; background: #fff; color: #000; font-weight: 900; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
