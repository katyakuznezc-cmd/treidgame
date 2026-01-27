import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update, set } from "firebase/database";

// Твой конфиг Firebase
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
  const isAdmin = user?.username === 'vladstelin78';

  useEffect(() => {
    setPayToken(assets.USDC);
    setGetToken(assets.BTC);
    webApp?.expand();
  }, [assets]);

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
    onValue(ref(db, `referrals/${userId}`), (s) => {
      if (s.exists()) setReferrals(Object.values(s.val()));
    });
  }, [userId, user]);

  useEffect(() => {
    if (isAdmin && showAdmin) {
      onValue(ref(db, `players`), (s) => {
        if (s.exists()) setAllPlayers(s.val());
      });
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

  useEffect(() => { if (!deal) generateDeal(); }, [deal]);
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

  const updatePlayerBalance = (pId, newBal) => {
    if (!newBal || isNaN(newBal)) return;
    update(ref(db, `players/${pId}`), { balanceUSDC: Number(newBal) });
  };

  if (!payToken || !getToken) return null;

  return (
    <div className="app-container">
      <div className={`viewport ${activeDex || showRefs || showAdmin || receipt || showTokenList ? 'is-modal-open' : ''}`}>
        <header className="main-nav">
          <div className="wallet-pill"><span>${balance.toFixed(2)}</span></div>
          <div className="nav-btns">
            {isAdmin && <button onClick={() => setShowAdmin(true)} className="admin-btn">🔧 ADMIN</button>}
            <button onClick={() => setShowRefs(true)} className="ref-btn">👥 FRIENDS</button>
            <button onClick={() => window.open('https://t.me/vladstelin78')} className="mgr-btn">MANAGER</button>
          </div>
        </header>

        <div className="hero-block">
          <div className="hero-sub">Total Assets</div>
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

      {/* АДМИН ПАНЕЛЬ (ПОЛНАЯ) */}
      {showAdmin && (
        <div className="full-modal admin-screen">
          <div className="modal-top">
            <button onClick={() => setShowAdmin(false)}>✕</button>
            <span>УПРАВЛЕНИЕ ИГРОКАМИ</span>
            <div style={{width:30}}></div>
          </div>
          <div className="admin-body">
            <div className="admin-stats">Пользователей в базе: {Object.keys(allPlayers).length}</div>
            <div className="player-scroll">
              {Object.entries(allPlayers).map(([pId, pData]) => (
                <div key={pId} className="admin-player-card">
                  <div className="p-meta">
                    <b>@{pData.username || 'Guest'}</b>
                    <small>ID: {pId}</small>
                  </div>
                  <div className="p-edit">
                    <input 
                      type="number" 
                      defaultValue={pData.balanceUSDC?.toFixed(2)} 
                      onBlur={(e) => updatePlayerBalance(pId, e.target.value)}
                    />
                    <span>$</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ОСТАЛЬНЫЕ МОДАЛКИ */}
      {activeDex && (
        <div className="full-modal">
          <div className="modal-top"><button onClick={() => setActiveDex(null)}>✕</button><span>{activeDex.name} Terminal</span><div style={{width:30}}></div></div>
          <div className="swap-box">
             <div className="input-group">
                <label>PAY <span onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))}>MAX</span></label>
                <div className="row">
                  <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                  <div className="token" onClick={() => setShowTokenList('pay')}><img src={payToken.icon} alt="" /> {payToken.symbol}</div>
                </div>
             </div>
             <div className="divider">↓</div>
             <div className="input-group">
                <label>RECEIVE</label>
                <div className="row">
                  <div className="val">{(payAmount * payToken.price / getToken.price).toFixed(6)}</div>
                  <div className="token" onClick={() => setShowTokenList('get')}><img src={getToken.icon} alt="" /> {getToken.symbol}</div>
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
          <div className="modal-top"><button onClick={() => setShowRefs(false)}>✕</button><span>Friends System</span><div style={{width:30}}></div></div>
          <div className="ref-body">
            <div className="ref-promo">
              <h3>Приглашай и зарабатывай</h3>
              <p>Получай +$1,000 за каждого друга!</p>
              <div className="ref-link">
                <code>https://t.me/Kryptoapp_bot?start={userId}</code>
                <button onClick={() => {
                  navigator.clipboard.writeText(`https://t.me/Kryptoapp_bot?start=${userId}`);
                  alert("Ссылка скопирована!");
                }}>COPY</button>
              </div>
            </div>
            <div className="ref-list">
               <label>ТВОИ ДРУЗЬЯ ({referrals.length})</label>
               {referrals.map((r, i) => (
                 <div key={i} className="ref-row"><span>@{r.username}</span><b style={{color: '#0CF2B0'}}>+$1,000</b></div>
               ))}
               {referrals.length === 0 && <div className="empty">Список пуст</div>}
            </div>
          </div>
        </div>
      )}

      {showTokenList && (
        <div className="sheet-box">
           <div className="sheet-content">
             <div className="sheet-h">Выберите токен <button onClick={() => setShowTokenList(null)}>✕</button></div>
             {Object.values(assets).map(a => (
               <div key={a.symbol} className="t-item" onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }}>
                 <img src={a.icon} alt="" /> <span>{a.symbol}</span>
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
            <h2>Сделка завершена</h2>
            <div className="r-amt" style={{color: receipt.pnl < 0 ? '#ff4b4b' : '#0CF2B0'}}>
              {receipt.isPurchase ? `+${receipt.get.toFixed(4)} ${receipt.to}` : (receipt.pnl >= 0 ? `+$${receipt.pnl.toFixed(2)}` : `-$${Math.abs(receipt.pnl).toFixed(2)}`)}
            </div>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}}>ВЕРНУТЬСЯ</button>
          </div>
        </div>
      )}

      {clicks.map(c => <div key={c.id} className="click-pop" style={{left: c.x, top: c.y}}>$</div>)}

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, sans-serif; }
        body { background: #000; color: #fff; overflow: hidden; }
        .app-container { width: 100vw; height: 100vh; position: relative; background: radial-gradient(circle at top right, #1a1a1a, #000); }
        .viewport { padding: 20px; transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1); height: 100%; overflow-y: auto; }
        .is-modal-open { filter: blur(20px) scale(0.92); opacity: 0.6; pointer-events: none; }
        .main-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .wallet-pill { background: rgba(255,255,255,0.05); padding: 12px 20px; border-radius: 25px; font-weight: 900; color: #0CF2B0; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); }
        .nav-btns { display: flex; gap: 8px; }
        .admin-btn { background: #FF9500; color: #000; border: none; padding: 10px 15px; border-radius: 12px; font-weight: 900; font-size: 10px; }
        .ref-btn, .mgr-btn { background: #fff; color: #000; border: none; padding: 10px 15px; border-radius: 12px; font-weight: 900; font-size: 10px; }
        .hero-block { text-align: center; padding: 30px 0; }
        .hero-sub { opacity: 0.4; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        .hero-main { font-size: 50px; font-weight: 900; margin-top: 5px; background: linear-gradient(to bottom, #fff, #888); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .arbitrage-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 20px; border-radius: 28px; margin-bottom: 25px; backdrop-filter: blur(20px); }
        .arb-header { display: flex; justify-content: space-between; font-size: 11px; font-weight: 900; margin-bottom: 15px; }
        .live-tag { color: #0CF2B0; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .yield { background: #0CF2B0; color: #000; padding: 2px 8px; border-radius: 6px; }
        .arb-route { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .node small { display: block; opacity: 0.3; margin-bottom: 4px; text-transform: uppercase; font-size: 8px; }
        .asset { background: rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 15px; font-weight: 900; border: 1px solid rgba(255,255,255,0.1); }
        .timer-bar { height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
        .progress { height: 100%; background: #0CF2B0; transition: width 1s linear; }
        .dex-grid { display: flex; flex-direction: column; gap: 12px; }
        .dex-card { position: relative; padding: 25px; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); transition: 0.2s; }
        .dex-card:active { transform: scale(0.97); }
        .dex-bg { position: absolute; inset: 0; opacity: 0.6; z-index: 1; }
        .dex-inner { position: relative; z-index: 2; display: flex; align-items: center; gap: 18px; }
        .dex-logo { font-size: 30px; }
        .dex-inner h3 { font-size: 18px; font-weight: 900; }
        .dex-inner small { opacity: 0.6; font-size: 11px; }
        .dex-arr { margin-left: auto; opacity: 0.2; font-size: 20px; }
        .full-modal { position: fixed; inset: 0; background: #000; z-index: 100; display: flex; flex-direction: column; animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .modal-top { padding: 25px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #111; font-weight: 900; letter-spacing: 1px; }
        .modal-top button { background: rgba(255,255,255,0.1); border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; font-size: 14px; }
        .swap-box { padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: center; max-width: 500px; margin: 0 auto; width: 100%; }
        .input-group { background: #0a0a0a; padding: 25px; border-radius: 24px; border: 1px solid #1a1a1a; }
        .input-group label { font-size: 11px; font-weight: 900; color: #444; display: flex; justify-content: space-between; margin-bottom: 15px; }
        .input-group label span { color: #0CF2B0; }
        .row { display: flex; justify-content: space-between; align-items: center; }
        .row input, .val { background: none; border: none; color: #fff; font-size: 32px; font-weight: 900; outline: none; width: 60%; }
        .token { background: #1a1a1a; padding: 10px 15px; border-radius: 16px; display: flex; align-items: center; gap: 10px; font-weight: 900; border: 1px solid #222; }
        .token img { width: 22px; height: 22px; }
        .divider { text-align: center; padding: 15px; opacity: 0.1; font-size: 24px; }
        .swap-btn { width: 100%; padding: 24px; border: none; border-radius: 24px; color: #fff; font-weight: 900; margin-top: 30px; font-size: 16px; letter-spacing: 1px; }
        .admin-body { padding: 20px; flex: 1; overflow-y: auto; }
        .admin-stats { background: #111; padding: 15px; border-radius: 15px; color: #0CF2B0; font-weight: 900; margin-bottom: 20px; text-align: center; border: 1px solid #222; }
        .admin-player-card { background: #080808; padding: 15px; border-radius: 20px; border: 1px solid #111; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .p-meta b { display: block; font-size: 14px; }
        .p-meta small { opacity: 0.4; font-size: 10px; }
        .p-edit { display: flex; align-items: center; gap: 8px; }
        .p-edit input { background: #111; border: 1px solid #222; color: #0CF2B0; padding: 8px; border-radius: 10px; width: 100px; text-align: right; font-weight: 900; }
        .ref-body { padding: 20px; }
        .ref-promo { background: linear-gradient(135deg, #111, #000); padding: 30px; border-radius: 30px; text-align: center; border: 1px solid rgba(12, 242, 176, 0.2); margin-bottom: 25px; }
        .ref-promo h3 { color: #0CF2B0; font-size: 22px; margin-bottom: 12px; }
        .ref-link { background: #000; padding: 12px; border-radius: 15px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; border: 1px dashed #333; }
        .ref-link code { font-size: 10px; opacity: 0.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 70%; }
        .ref-link button { background: #0CF2B0; color: #000; border: none; padding: 8px 15px; border-radius: 10px; font-weight: 900; font-size: 11px; }
        .ref-row { display: flex; justify-content: space-between; background: rgba(255,255,255,0.03); padding: 18px; border-radius: 20px; margin-bottom: 10px; }
        .sheet-box { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 200; display: flex; align-items: flex-end; backdrop-filter: blur(10px); }
        .sheet-content { background: #0a0a0a; width: 100%; border-radius: 35px 35px 0 0; padding: 30px; border-top: 1px solid #222; }
        .sheet-h { display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 25px; font-size: 18px; }
        .t-item { display: flex; align-items: center; gap: 20px; padding: 20px 0; border-bottom: 1px solid #111; }
        .t-item img { width: 35px; height: 35px; }
        .t-bal { margin-left: auto; color: #0CF2B0; font-weight: 900; font-size: 16px; }
        .receipt { position: fixed; inset: 0; background: #000; z-index: 300; display: flex; align-items: center; padding: 40px; text-align: center; }
        .r-card { width: 100%; }
        .r-icon { width: 80px; height: 80px; background: #0CF2B0; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 25px; box-shadow: 0 0 30px rgba(12, 242, 176, 0.4); }
        .r-amt { font-size: 40px; font-weight: 900; margin-bottom: 40px; }
        .receipt button { width: 100%; padding: 22px; background: #111; border: 1px solid #333; color: #fff; border-radius: 24px; font-weight: 900; font-size: 16px; }
        .click-pop { position: fixed; color: #0CF2B0; font-weight: 900; font-size: 35px; pointer-events: none; animation: pop 0.8s ease-out forwards; z-index: 1000; text-shadow: 0 0 10px rgba(12, 242, 176, 0.8); }
        @keyframes pop { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-150px) scale(1.5); } }
      `}</style>
    </div>
  );
}
