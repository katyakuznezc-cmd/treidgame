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

const ASSETS = {
  USDC: { symbol: 'USDC', price: 1, icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg' },
  BTC: { symbol: 'BTC', price: 65000, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg' },
  ETH: { symbol: 'ETH', price: 2600, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg' },
  LINK: { symbol: 'LINK', price: 18.2, icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg' },
  AAVE: { symbol: 'AAVE', price: 145.5, icon: 'https://cryptologos.cc/logos/aave-aave-logo.svg' }
};

const DEX_THEMES = {
  UNISWAP: { name: 'UNISWAP V3', color: '#FF007A', bg: 'radial-gradient(circle at 50% 0%, #2a0014 0%, #000 100%)' },
  ODOS: { name: 'ODOS ROUTER', color: '#0CF2B0', bg: 'radial-gradient(circle at 50% 0%, #002a1e 0%, #000 100%)' },
  SUSHI: { name: 'SUSHISWAP', color: '#FA52A0', bg: 'radial-gradient(circle at 50% 0%, #2a001a 0%, #000 100%)' },
  '1INCH': { name: '1INCH NETWORK', color: '#31569c', bg: 'radial-gradient(circle at 50% 0%, #00082a 0%, #000 100%)' }
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

  const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || 'Guest';

  useEffect(() => {
    onValue(ref(db, `players/${userId}`), (s) => {
      if (s.exists()) {
        setBalance(s.val().balanceUSDC ?? 1000);
        setWallet(s.val().wallet || {});
      }
    });
  }, [userId]);

  useEffect(() => {
    if (!deal) generateDeal();
    const timer = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { generateDeal(); return 120; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [deal]);

  const generateDeal = () => {
    const assets = ['BTC', 'ETH', 'LINK', 'AAVE'];
    const dexKeys = Object.keys(DEX_THEMES);
    const buyAt = dexKeys[Math.floor(Math.random() * dexKeys.length)];
    let sellAt = dexKeys[Math.floor(Math.random() * dexKeys.length)];
    while (sellAt === buyAt) sellAt = dexKeys[Math.floor(Math.random() * dexKeys.length)];
    setDeal({ coin: ASSETS[assets[Math.floor(Math.random() * assets.length)]], buyAt, sellAt, profit: (Math.random() * 0.5 + 2.5).toFixed(2) });
  };

  const handleSwap = () => {
    const amt = Number(payAmount);
    const maxVal = payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0);
    if (!amt || amt > maxVal) return;

    setIsPending(true); // ЗАПУСК ЗАГРУЗКИ

    setTimeout(() => {
      let receiveAmt = (amt * payToken.price) / getToken.price;
      let pnl = 0;
      
      if (getToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        const isOk = activeDex === deal.sellAt && payToken.symbol === deal.coin.symbol;
        receiveAmt *= isOk ? (1 + Number(deal.profit)/100) : (1 - 0.015);
        pnl = receiveAmt - (amt * payToken.price);
        if (isOk) generateDeal();
      }

      const newB = payToken.symbol === 'USDC' ? balance - amt : (getToken.symbol === 'USDC' ? balance + receiveAmt : balance);
      const newW = { ...wallet };
      if (payToken.symbol !== 'USDC') newW[payToken.symbol] = (newW[payToken.symbol] || 0) - amt;
      if (getToken.symbol !== 'USDC') newW[getToken.symbol] = (newW[getToken.symbol] || 0) + receiveAmt;

      update(ref(db, `players/${userId}`), { balanceUSDC: newB, wallet: newW });
      setReceipt({ pnl, get: receiveAmt, to: getToken.symbol, dex: activeDex });
      setIsPending(false); 
      setPayAmount('');
    }, 3000); // 3 СЕКУНДЫ ОЖИДАНИЯ
  };

  return (
    <div className="app">
      <div className="main-scroll">
        <header className="header">
          <div className="liq-badge">NET LIQUIDITY: ${balance.toFixed(2)}</div>
          <button onClick={() => window.open('https://t.me/vladstelin78')} className="mgr-btn">MANAGER</button>
        </header>

        <div className="hero-section">
          <div className="hero-val">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div className="hero-tag">STABLE ASSETS</div>
        </div>

        {/* СДЕЛКА */}
        {deal && (
          <div className="deal-card">
            <div className="deal-row-top">
              <span className="signal-label">ARBITRAGE SIGNAL</span>
              <span className="profit-label">+{deal.profit}%</span>
            </div>
            <div className="deal-path">
              <div className="path-node">
                <small>BUY ON</small>
                <div className="dex-name-big">{DEX_THEMES[deal.buyAt].name}</div>
              </div>
              <div className="path-asset">
                <img src={deal.coin.icon} />
                <b>{deal.coin.symbol}</b>
              </div>
              <div className="path-node text-right">
                <small>SELL ON</small>
                <div className="dex-name-big" style={{color: '#0CF2B0'}}>{DEX_THEMES[deal.sellAt].name}</div>
              </div>
            </div>
            <div className="deal-timer-bar"><div className="fill" style={{width: `${(timeLeft/120)*100}%`}}></div></div>
          </div>
        )}

        {/* СЕТКА БИРЖ (GRID) */}
        <div className="dex-grid">
          {Object.keys(DEX_THEMES).map(k => (
            <button key={k} onClick={() => setActiveDex(k)} className="dex-tile">
              <div className="tile-accent" style={{background: DEX_THEMES[k].color}}></div>
              <div className="tile-name">{DEX_THEMES[k].name}</div>
              <div className="tile-status">ACTIVE API</div>
            </button>
          ))}
        </div>
      </div>

      {/* ЭКРАН ОБМЕНА */}
      {activeDex && (
        <div className="dex-page" style={{ background: DEX_THEMES[activeDex].bg }}>
          <header className="dex-header">
            <button onClick={() => setActiveDex(null)}>✕ CLOSE</button>
            <div className="dex-title-header">{DEX_THEMES[activeDex].name}</div>
            <div style={{width: 50}}></div>
          </header>

          <div className="swap-container">
            <div className="swap-box">
              <div className="sb-label"><span>SEND</span> <span onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))} className="max-trigger">MAX</span></div>
              <div className="sb-row">
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                <button onClick={() => setShowTokenList('pay')} className="token-btn"><img src={payToken.icon} /> {payToken.symbol}</button>
              </div>
            </div>

            <div className="swap-divider">↓</div>

            <div className="swap-box">
              <div className="sb-label">RECEIVE</div>
              <div className="sb-row">
                <div className="sb-out">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(5) : '0.00'}</div>
                <button onClick={() => setShowTokenList('get')} className="token-btn active"><img src={getToken.icon} /> {getToken.symbol}</button>
              </div>
            </div>

            <button onClick={handleSwap} disabled={isPending} className="swap-btn" style={{ background: DEX_THEMES[activeDex].color }}>
              {isPending ? <div className="spinner"></div> : "EXECUTE SWAP"}
            </button>
          </div>
        </div>
      )}

      {/* СПИСОК ТОКЕНОВ */}
      {showTokenList && (
        <div className="token-modal">
          <div className="token-content">
            <div className="token-header">Select Asset <button onClick={() => setShowTokenList(null)}>✕</button></div>
            <div className="token-list">
              {Object.values(ASSETS).map(a => (
                <div key={a.symbol} onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }} className="token-item">
                  <img src={a.icon} />
                  <div className="ti-main"><b>{a.symbol}</b><small>Blockchain Asset</small></div>
                  <div className="ti-price">${a.price}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ЧЕК */}
      {receipt && (
        <div className="receipt-overlay">
          <div className="receipt-card">
            <div className="r-check">✓</div>
            <h3>TRANSACTION SUCCESS</h3>
            <div className="r-pnl" style={{color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b'}}>
              {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
            </div>
            <div className="r-details">
              <div className="rd-row"><span>Exchange</span> <span>{DEX_THEMES[receipt.dex].name}</span></div>
              <div className="rd-row"><span>Asset</span> <span>{receipt.to}</span></div>
            </div>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}} className="r-done">DONE</button>
          </div>
        </div>
      )}

      <style>{`
        .app { background: #000; height: 100vh; color: #fff; font-family: 'Inter', sans-serif; overflow: hidden; }
        .main-scroll { padding: 20px; height: 100%; overflow-y: auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .liq-badge { font-size: 10px; font-weight: 900; color: #0CF2B0; background: rgba(12,242,176,0.1); padding: 6px 14px; border-radius: 20px; }
        .mgr-btn { background: #111; border: 1px solid #222; color: #fff; padding: 6px 12px; border-radius: 10px; font-size: 10px; font-weight: 900; }

        .hero-section { text-align: center; margin-bottom: 30px; }
        .hero-val { font-size: 52px; font-weight: 900; letter-spacing: -2px; }
        .hero-tag { font-size: 9px; opacity: 0.3; letter-spacing: 2px; }

        .deal-card { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 20px; border-radius: 24px; margin-bottom: 25px; }
        .deal-row-top { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .signal-label { font-size: 10px; font-weight: 900; color: #0CF2B0; }
        .profit-label { font-size: 18px; font-weight: 900; color: #0CF2B0; }
        .deal-path { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .path-node small { font-size: 8px; opacity: 0.4; display: block; margin-bottom: 4px; }
        .dex-name-big { font-size: 13px; font-weight: 900; }
        .path-asset { background: #fff; color: #000; padding: 8px 12px; border-radius: 12px; text-align: center; }
        .path-asset img { width: 16px; margin-bottom: 2px; }
        .path-asset b { display: block; font-size: 10px; }
        .deal-timer-bar { height: 2px; background: #1a1a1a; border-radius: 2px; overflow: hidden; }
        .fill { height: 100%; background: #0CF2B0; transition: width 1s linear; }

        /* СЕТКА (GRID) */
        .dex-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .dex-tile { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 25px 15px; border-radius: 20px; text-align: left; color: #fff; position: relative; overflow: hidden; }
        .tile-accent { position: absolute; top: 0; left: 0; width: 4px; height: 100%; }
        .tile-name { font-size: 12px; font-weight: 900; margin-bottom: 5px; }
        .tile-status { font-size: 8px; opacity: 0.3; }

        .dex-page { position: fixed; inset: 0; z-index: 100; padding: 20px; display: flex; flex-direction: column; }
        .dex-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .dex-header button { background: none; border: none; color: #fff; font-size: 12px; font-weight: 900; }
        .dex-title-header { font-weight: 900; font-size: 14px; letter-spacing: 1px; }

        .swap-container { background: rgba(0,0,0,0.6); padding: 20px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(10px); }
        .swap-box { background: #000; padding: 18px; border-radius: 22px; border: 1px solid #1a1a1a; }
        .sb-label { display: flex; justify-content: space-between; font-size: 10px; opacity: 0.4; margin-bottom: 12px; }
        .max-trigger { color: #0CF2B0; font-weight: 900; }
        .sb-row { display: flex; justify-content: space-between; align-items: center; }
        .sb-row input { background: none; border: none; color: #fff; font-size: 28px; font-weight: 700; width: 50%; outline: none; }
        .sb-out { font-size: 28px; font-weight: 700; }
        .token-btn { background: #111; border: 1px solid #222; color: #fff; padding: 8px 12px; border-radius: 12px; display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; }
        .token-btn.active { border-color: #0CF2B0; }
        .token-btn img { width: 18px; }
        .swap-divider { text-align: center; margin: 12px 0; opacity: 0.2; }
        .swap-btn { width: 100%; padding: 20px; border: none; border-radius: 20px; color: #fff; font-weight: 900; margin-top: 20px; display: flex; justify-content: center; }

        .token-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 200; display: flex; align-items: flex-end; }
        .token-content { background: #0a0a0a; width: 100%; border-top-left-radius: 30px; border-top-right-radius: 30px; padding: 25px; }
        .token-header { display: flex; justify-content: space-between; margin-bottom: 25px; font-weight: 900; }
        .token-item { display: flex; align-items: center; gap: 15px; padding: 15px 0; border-bottom: 1px solid #151515; }
        .token-item img { width: 30px; }
        .ti-main { flex: 1; }
        .ti-main b { display: block; font-size: 14px; }
        .ti-main small { font-size: 9px; opacity: 0.3; }
        .ti-price { font-weight: 700; }

        .receipt-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 30px; }
        .receipt-card { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 30px; border-radius: 35px; width: 100%; text-align: center; }
        .r-check { width: 60px; height: 60px; background: #0CF2B015; color: #0CF2B0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 24px; }
        .r-pnl { font-size: 42px; font-weight: 900; margin: 20px 0; }
        .r-details { background: #000; padding: 15px; border-radius: 15px; margin-bottom: 25px; }
        .rd-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; opacity: 0.5; }
        .r-done { background: #fff; color: #000; border: none; width: 100%; padding: 18px; border-radius: 18px; font-weight: 900; }

        .spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
