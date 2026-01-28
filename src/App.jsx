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

  const handleSwap = () => {
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
            {isAdmin && <button onClick={() => setShowAdmin(true)} className="btn-orange">🔧</button>}
            <button onClick={() => setShowRefs(true)} className="btn-white">👥 FRIENDS</button>
            <button onClick={() => window.open('https://t.me/crypto_mngr66')} className="btn-white">👨‍💼 MANAGER</button>
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

      {showRefs && (
        <div className="modal-overlay">
          <div className="modal-header"><button onClick={() => setShowRefs(false)}>✕</button><span>Friends</span><div style={{width:20}}></div></div>
          <div style={{padding:20}}><div className="signal-card"><h3>Invite Friends</h3><p>Get $1,000 for each!</p><code style={{display:'block', background:'#111', padding:10, margin:'10px 0', borderRadius:10}}>https://t.me/Kryptoapp_bot?start={userId}</code></div></div>
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
        body { background: #000; color: #fff; overflow: hidden; }
        .app-shell { width: 100vw; height: 100vh; position: relative; }
        .main-view { padding: 15px; height: 100%; overflow-y: auto; transition: 0.5s; }
        .blurred { filter: blur(25px) brightness(0.4); transform: scale(0.96); }

        .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; gap: 5px; }
        .balance-badge { background: rgba(255,255,255,0.06); padding: 8px 12px; border-radius: 50px; color: #0CF2B0; font-weight: 800; border: 1px solid rgba(255,255,255,0.1); font-size: 13px; }
        .btn-row { display: flex; gap: 5px; }
        .btn-orange { background: #FF9500; border: none; padding: 8px 10px; border-radius: 12px; font-weight: 900; font-size: 10px; color: #000; }
        .btn-white { background: #fff; border: none; padding: 8px 10px; border-radius: 12px; font-weight: 900; font-size: 9px; color: #000; }

        .main-stat { text-align: center; margin-bottom: 25px; }
        .main-stat p { opacity: 0.4; font-size: 11px; text-transform: uppercase; }
        .main-stat h1 { font-size: 44px; font-weight: 900; background: linear-gradient(#fff, #999); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        .signal-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 20px; border-radius: 28px; margin-bottom: 20px; }
        .signal-top { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 10px; font-weight: 900; }
        .profit-tag { background: #0CF2B0; color: #000; padding: 4px 8px; border-radius: 8px; }
        .signal-route { display: flex; justify-content: space-between; align-items: center; }
        .dex-node small { opacity: 0.5; font-size: 9px; }
        .dex-node span { font-weight: 900; font-size: 13px; }
        .coin-node { background: #111; padding: 5px 12px; border-radius: 10px; border: 1px solid #222; font-weight: 900; font-size: 12px; }
        .progress-bg { height: 3px; background: rgba(255,255,255,0.05); border-radius: 10px; margin-top: 15px; overflow: hidden; }
        .progress-fill { height: 100%; background: #0CF2B0; box-shadow: 0 0 10px #0CF2B0; }

        .dex-list { display: flex; flex-direction: column; gap: 10px; }
        .dex-item { position: relative; border-radius: 22px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
        .dex-bg-layer { position: absolute; inset: 0; opacity: 0.25; }
        .dex-content { position: relative; z-index: 2; padding: 22px; display: flex; justify-content: space-between; align-items: center; }
        .dex-info { display: flex; align-items: center; gap: 12px; }
        .dex-ico { font-size: 20px; background: rgba(255,255,255,0.1); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 12px; }
        .dex-info h3 { font-size: 16px; }
        .dex-info p { font-size: 10px; opacity: 0.4; }

        .modal-overlay { position: fixed; inset: 0; background: #000; z-index: 100; display: flex; flex-direction: column; animation: up 0.2s ease-out; }
        @keyframes up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .modal-header { padding: 18px; border-bottom: 1px solid #111; display: flex; justify-content: space-between; font-weight: 900; font-size: 14px; }
        .modal-header button { background: none; border: none; color: #fff; font-size: 18px; }

        .swap-container { padding: 15px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
        .swap-card { background: rgba(255,255,255,0.03); padding: 22px; border-radius: 28px; border: 1px solid rgba(255,255,255,0.07); }
        .swap-label { font-size: 11px; opacity: 0.4; font-weight: 800; margin-bottom: 8px; display: flex; justify-content: space-between; }
        .swap-row input { background: none; border: none; color: #fff; font-size: 34px; font-weight: 900; width: 55%; outline: none; }
        .val-out { font-size: 34px; font-weight: 900; }
        .token-picker { background: rgba(255,255,255,0.07); padding: 6px 12px; border-radius: 14px; display: flex; align-items: center; gap: 8px; font-weight: 800; border: 1px solid rgba(255,255,255,0.08); font-size: 13px; }
        .token-picker img { width: 20px; height: 20px; }
        .swap-arrow-mid { text-align: center; padding: 8px; color: #333; }
        .confirm-btn { width: 100%; padding: 20px; border-radius: 22px; border: none; color: #fff; font-weight: 900; font-size: 16px; margin-top: 25px; }

        .sheet-box { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 200; display: flex; align-items: flex-end; }
        .sheet-content { background: #0d0d0d; width: 100%; border-radius: 30px 30px 0 0; padding: 22px; border-top: 1px solid #222; }
        .sheet-head { display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 15px; }
        .asset-row { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 18px; margin-bottom: 8px; }
        .asset-row img { width: 28px; height: 28px; margin-right: 12px; }
        .a-left { display: flex; align-items: center; font-size: 14px; }

        .stat-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; padding: 15px; }
        .stat-item { background: #0a0a0a; padding: 12px; border-radius: 15px; text-align: center; border: 1px solid #1a1a1a; }
        .stat-item b { font-size: 16px; }
        .stat-item p { font-size: 8px; opacity: 0.4; }
        .admin-scroll { overflow-y: auto; flex: 1; padding: 0 15px 30px; }
        .player-row { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #080808; border-radius: 18px; margin-bottom: 8px; font-size: 13px; }
        .player-row input { background: #111; border: 1px solid #333; color: #0CF2B0; padding: 6px; width: 90px; border-radius: 8px; text-align: right; }

        .receipt-screen { position: fixed; inset: 0; background: #000; z-index: 300; display: flex; align-items: center; justify-content: center; padding: 25px; }
        .receipt-card { text-align: center; width: 100%; }
        .check-icon { width: 60px; height: 60px; background: #0CF2B0; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; margin: 0 auto 15px; }
        .pnl-val { font-size: 32px; font-weight: 900; margin: 12px 0 25px; }
      `}</style>
    </div>
  );
}
