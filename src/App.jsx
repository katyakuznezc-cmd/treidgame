import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update, get } from "firebase/database";

// Конфиг Firebase оставляем прежним
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
              <span className="live">● LIVE ARBITRAGE</span>
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

      {/* OVERLAY: TOKEN PICKER (ИСПРАВЛЕН СКРОЛЛ) */}
      {showTokenList && (
        <div className="sheet-overlay">
          <div className="sheet-box">
            <div className="sheet-top">
              <span>SELECT TOKEN</span> 
              <button onClick={() => setShowTokenList(null)}>✕</button>
            </div>
            <div className="sheet-list">
              {Object.values(ASSETS).map(a => (
                <div key={a.symbol} className="token-row" onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }}>
                  <img src={a.icon} alt="" /> 
                  <div className="t-meta">
                    <b>{a.symbol}</b>
                    <small>${a.price}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY: SWAP (ИСПРАВЛЕНА ШИРИНА) */}
      {activeDex && (
        <div className="overlay">
          <div className="swap-box">
            <div className="swap-head"><button onClick={() => setActiveDex(null)}>✕</button><b>SWAP</b><div style={{width: 20}}></div></div>
            <div className="input-block">
              <div className="block-top">PAY <span onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))}>MAX</span></div>
              <div className="block-row">
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                <div className="token-btn" onClick={() => setShowTokenList('pay')}><img src={payToken.icon} alt=""/> {payToken.symbol}</div>
              </div>
            </div>
            <div className="arrow-down">↓</div>
            <div className="input-block">
              <div className="block-top">RECEIVE</div>
              <div className="block-row">
                <div className="fake-inp">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(6) : '0.00'}</div>
                <div className="token-btn" onClick={() => setShowTokenList('get')}><img src={getToken.icon} alt=""/> {getToken.symbol}</div>
              </div>
            </div>
            <button className="swap-confirm" onClick={handleSwap} disabled={isPending} style={{background: DEX_LIST.find(d => d.id === activeDex).color}}>
              {isPending ? 'EXECUTING...' : 'CONFIRM SWAP'}
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT & ADMIN */}
      {receipt && (
        <div className="receipt">
          <div className="r-box">
            <div className="r-icon">✓</div>
            <h2>SUCCESS</h2>
            <div className="r-val" style={{color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b'}}>
              {receipt.isPurchase ? receipt.get.toFixed(4) + ' ' + receipt.to : (receipt.pnl >= 0 ? '+$' : '-$') + Math.abs(receipt.pnl).toFixed(2)}
            </div>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}}>CLOSE</button>
          </div>
        </div>
      )}

      {clicks.map(c => <div key={c.id} className="dollar" style={{left: c.x, top: c.y}}>$</div>)}

      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; margin: 0; padding: 0; }
        
        /* Фикс пустоты справа */
        html, body { 
          width: 100%; 
          max-width: 100%; 
          height: 100%; 
          background: #000; 
          color: #fff; 
          overflow: hidden; 
          font-family: -apple-system, sans-serif; 
        }
        
        .app-root { 
          width: 100vw; 
          height: 100vh; 
          position: relative; 
          overflow-x: hidden; /* Жестко режем всё, что вылезает вбок */
        }

        .main-view { 
          width: 100%; 
          height: 100%; 
          overflow-y: auto; 
          padding: 20px; 
          padding-bottom: 100px;
          display: flex;
          flex-direction: column;
        }

        .blurred { filter: blur(20px); pointer-events: none; }

        .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; width: 100%; }
        .usdc-card { background: #111; border: 1px solid #222; padding: 8px 14px; border-radius: 20px; display: flex; align-items: center; gap: 8px; color: #0CF2B0; font-weight: 800; font-size: 14px; }
        .usdc-card img { width: 16px; }
        .mgr-btn { background: #fff; color: #000; border: none; padding: 8px 14px; border-radius: 12px; font-weight: 900; font-size: 10px; }

        .hero { text-align: center; padding: 30px 0; position: relative; }
        .hero-lbl { font-size: 10px; opacity: 0.3; letter-spacing: 2px; }
        .hero-amt { font-size: 44px; font-weight: 900; margin-top: 10px; }
        .hero-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 150px; height: 80px; background: #0CF2B010; filter: blur(50px); z-index: -1; }

        .signal { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 20px; border-radius: 24px; margin-bottom: 25px; width: 100%; }
        .sig-head { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .live { color: #0CF2B0; font-weight: 900; font-size: 9px; }
        .pct { color: #0CF2B0; font-weight: 900; font-size: 14px; }
        .sig-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .node small { display: block; font-size: 8px; opacity: 0.3; margin-bottom: 4px; }
        .node b { font-size: 12px; }
        .coin { background: #1a1a1a; padding: 6px 12px; border-radius: 10px; font-weight: 900; border: 1px solid #222; font-size: 12px; }
        .bar-bg { height: 2px; background: #222; border-radius: 1px; overflow: hidden; }
        .bar-fill { height: 100%; background: #0CF2B0; transition: width 1s linear; }

        .dex-stack { display: flex; flex-direction: column; gap: 10px; width: 100%; }
        .dex-btn { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 18px; border-radius: 20px; display: flex; align-items: center; gap: 15px; width: 100%; position: relative; }
        .dex-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .dex-info h3 { font-size: 14px; margin: 0; }
        .dex-info small { opacity: 0.3; font-weight: 700; font-size: 9px; }

        /* СКРОЛЛ ТОКЕНОВ */
        .sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; display: flex; align-items: flex-end; }
        .sheet-box { 
          width: 100%; 
          background: #0d0d0d; 
          border-radius: 24px 24px 0 0; 
          border-top: 1px solid #222; 
          max-height: 70vh; /* Ограничиваем высоту */
          display: flex; 
          flex-direction: column; 
        }
        .sheet-top { padding: 20px; display: flex; justify-content: space-between; font-weight: 900; border-bottom: 1px solid #1a1a1a; color: #555; font-size: 12px; }
        .sheet-list { 
          overflow-y: auto; /* ВКЛЮЧАЕМ СКРОЛЛ */
          flex: 1; 
          padding: 10px 20px 40px; 
          -webkit-overflow-scrolling: touch; 
        }
        .token-row { display: flex; align-items: center; gap: 15px; padding: 15px 0; border-bottom: 1px solid #151515; }
        .token-row img { width: 32px; height: 32px; }
        .t-meta b { display: block; font-size: 16px; }
        .t-meta small { opacity: 0.4; }

        /* ОВЕРЛЕИ */
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(15px); z-index: 500; display: flex; align-items: center; padding: 20px; }
        .swap-box { width: 100%; background: #0a0a0a; border: 1px solid #222; padding: 20px; border-radius: 24px; }
        .swap-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .input-block { background: #000; padding: 15px; border-radius: 18px; border: 1px solid #1a1a1a; }
        .block-top { font-size: 10px; color: #444; font-weight: 800; margin-bottom: 8px; display: flex; justify-content: space-between; }
        .block-row { display: flex; justify-content: space-between; align-items: center; }
        .block-row input, .fake-inp { background: none; border: none; color: #fff; font-size: 20px; font-weight: 700; outline: none; width: 55%; }
        .token-btn { background: #111; border: 1px solid #222; padding: 6px 10px; border-radius: 10px; display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; }
        .token-btn img { width: 16px; }
        .swap-confirm { width: 100%; padding: 18px; border: none; border-radius: 18px; color: #fff; font-weight: 900; margin-top: 20px; }

        .receipt { position: fixed; inset: 0; background: #000; z-index: 2000; display: flex; align-items: center; padding: 30px; text-align: center; }
        .r-box { width: 100%; }
        .r-icon { width: 70px; height: 70px; background: #0CF2B0; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; margin: 0 auto 20px; }
        .r-val { font-size: 32px; font-weight: 900; margin-bottom: 30px; }
        .receipt button { background: #111; border: 1px solid #222; color: #fff; padding: 15px 40px; border-radius: 15px; font-weight: 800; }

        .dollar { position: fixed; color: #0CF2B0; font-weight: 900; font-size: 30px; pointer-events: none; animation: fly 0.8s ease-out forwards; z-index: 3000; }
        @keyframes fly { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-100px); } }
      `}</style>
    </div>
  );
}
