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
  AAVE: { symbol: 'AAVE', price: 145.5, icon: 'https://cryptologos.cc/logos/aave-aave-logo.svg' },
  CRV: { symbol: 'CRV', price: 0.55, icon: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.svg' },
  WPOL: { symbol: 'WPOL', price: 0.72, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg' }
};

const DEX_THEMES = {
  UNISWAP: { name: 'UNISWAP V3', color: '#FF007A', bg: 'radial-gradient(circle at 50% 0%, #1a000a 0%, #000 100%)' },
  ODOS: { name: 'ODOS ROUTER', color: '#0CF2B0', bg: 'radial-gradient(circle at 50% 0%, #001a14 0%, #000 100%)' },
  SUSHI: { name: 'SUSHISWAP', color: '#FA52A0', bg: 'radial-gradient(circle at 50% 0%, #1a000d 0%, #000 100%)' },
  '1INCH': { name: '1INCH NETWORK', color: '#31569c', bg: 'radial-gradient(circle at 50% 0%, #00081a 0%, #000 100%)' }
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
    const assets = ['BTC', 'ETH', 'LINK', 'AAVE', 'CRV', 'WPOL'];
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

    setIsPending(true);
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
      setIsPending(false); setPayAmount('');
    }, 2500); 
  };

  return (
    <div className="app">
      <div className="main-content">
        <header className="top-nav">
          <div className="liq-stat">USDC: <span>${balance.toFixed(2)}</span></div>
          <button onClick={() => window.open('https://t.me/vladstelin78')} className="manager-link">MANAGER</button>
        </header>

        <div className="balance-area">
          <div className="bal-num">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div className="bal-desc">TOTAL PORTFOLIO</div>
        </div>

        {deal && (
          <div className="signal-card">
            <div className="sc-head">
              <span className="sc-tag">ARBITRAGE</span>
              <span className="sc-pct">+{deal.profit}%</span>
            </div>
            <div className="sc-route">
              <div className="sc-node">
                <small>BUY</small>
                <div className="sc-dex">{DEX_THEMES[deal.buyAt].name}</div>
              </div>
              <div className="sc-token">
                <img src={deal.coin.icon} />
                <b>{deal.coin.symbol}</b>
              </div>
              <div className="sc-node text-right">
                <small>SELL</small>
                <div className="sc-dex" style={{color: '#0CF2B0'}}>{DEX_THEMES[deal.sellAt].name}</div>
              </div>
            </div>
            <div className="sc-timer"><div className="sc-fill" style={{width: `${(timeLeft/120)*100}%`}}></div></div>
          </div>
        )}

        <div className="dex-grid">
          {Object.keys(DEX_THEMES).map(k => (
            <button key={k} onClick={() => setActiveDex(k)} className="dex-tile">
              <div className="tile-bar" style={{background: DEX_THEMES[k].color}}></div>
              <div className="tile-title">{DEX_THEMES[k].name}</div>
              <div className="tile-sub">V3 POOL</div>
            </button>
          ))}
        </div>
      </div>

      {activeDex && (
        <div className="dex-overlay" style={{ background: DEX_THEMES[activeDex].bg }}>
          <div className="dex-nav">
            <button onClick={() => setActiveDex(null)}>✕</button>
            <div className="dex-name-nav">{DEX_THEMES[activeDex].name}</div>
            <div style={{width: 20}}></div>
          </div>

          <div className="swap-box-premium">
            <div className="input-group">
              <div className="ig-label"><span>SEND</span> <span onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))} className="max-btn">MAX</span></div>
              <div className="ig-row">
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                <button onClick={() => setShowTokenList('pay')} className="token-pick"><img src={payToken.icon} /> {payToken.symbol}</button>
              </div>
            </div>

            <div className="swap-icon-wrap">↓</div>

            <div className="input-group">
              <div className="ig-label">RECEIVE</div>
              <div className="ig-row">
                <div className="ig-out">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(5) : '0.00'}</div>
                <button onClick={() => setShowTokenList('get')} className="token-pick active"><img src={getToken.icon} /> {getToken.symbol}</button>
              </div>
            </div>

            <button onClick={handleSwap} disabled={isPending} className="swap-main-btn" style={{ background: DEX_THEMES[activeDex].color }}>
              {isPending ? <div className="loader"></div> : "CONFIRM TRANSACTION"}
            </button>
          </div>
        </div>
      )}

      {showTokenList && (
        <div className="token-modal">
          <div className="token-sheet">
            <div className="ts-head">Select Asset <button onClick={() => setShowTokenList(null)}>✕</button></div>
            <div className="ts-list">
              {Object.values(ASSETS).map(a => (
                <div key={a.symbol} onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }} className="ts-row">
                  <img src={a.icon} />
                  <div className="ts-info"><b>{a.symbol}</b><small>Verified Token</small></div>
                  <div className="ts-price">${a.price}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="receipt-overlay">
          <div className="receipt-card">
            <div className="rc-icon">✓</div>
            <h3>SUCCESSFUL</h3>
            <div className="rc-pnl" style={{color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b'}}>
              {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
            </div>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}} className="rc-btn">DONE</button>
          </div>
        </div>
      )}

      <style>{`
        .app { background: #000; height: 100vh; color: #fff; font-family: -apple-system, sans-serif; overflow: hidden; }
        .main-content { padding: 20px; height: 100%; overflow-y: auto; }
        .top-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .liq-stat { font-size: 10px; font-weight: 800; background: #111; padding: 6px 12px; border-radius: 12px; border: 1px solid #222; }
        .liq-stat span { color: #0CF2B0; }
        .manager-link { background: #fff; color: #000; border: none; padding: 6px 12px; border-radius: 12px; font-size: 9px; font-weight: 900; }

        .balance-area { text-align: center; margin-bottom: 30px; }
        .bal-num { font-size: 42px; font-weight: 800; letter-spacing: -1px; }
        .bal-desc { font-size: 9px; opacity: 0.3; letter-spacing: 2px; margin-top: 5px; }

        .signal-card { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 18px; border-radius: 24px; margin-bottom: 25px; }
        .sc-head { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .sc-tag { font-size: 9px; font-weight: 900; color: #0CF2B0; }
        .sc-pct { font-size: 16px; font-weight: 900; color: #0CF2B0; }
        .sc-route { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .sc-node small { font-size: 8px; opacity: 0.3; display: block; margin-bottom: 3px; }
        .sc-dex { font-size: 12px; font-weight: 800; }
        .sc-token { background: #fff; color: #000; padding: 6px 12px; border-radius: 12px; text-align: center; }
        .sc-token img { width: 14px; margin-bottom: 2px; }
        .sc-token b { display: block; font-size: 9px; }
        .sc-timer { height: 2px; background: #1a1a1a; border-radius: 2px; overflow: hidden; }
        .sc-fill { height: 100%; background: #0CF2B0; transition: width 1s linear; }

        .dex-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .dex-tile { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 22px 15px; border-radius: 20px; text-align: left; color: #fff; position: relative; overflow: hidden; }
        .tile-bar { position: absolute; top: 0; left: 0; width: 3px; height: 100%; }
        .tile-title { font-size: 11px; font-weight: 900; margin-bottom: 4px; }
        .tile-sub { font-size: 8px; opacity: 0.2; }

        .dex-overlay { position: fixed; inset: 0; z-index: 100; padding: 20px; display: flex; flex-direction: column; }
        .dex-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .dex-nav button { background: rgba(255,255,255,0.1); border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; font-weight: bold; }
        .dex-name-nav { font-weight: 800; font-size: 14px; }

        .swap-box-premium { background: rgba(0,0,0,0.6); padding: 18px; border-radius: 28px; border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(10px); }
        .input-group { background: #000; padding: 16px; border-radius: 20px; border: 1px solid #1a1a1a; }
        .ig-label { display: flex; justify-content: space-between; font-size: 9px; opacity: 0.4; margin-bottom: 10px; }
        .max-btn { color: #0CF2B0; font-weight: 900; }
        .ig-row { display: flex; justify-content: space-between; align-items: center; }
        .ig-row input { background: none; border: none; color: #fff; font-size: 24px; font-weight: 600; width: 50%; outline: none; }
        .ig-out { font-size: 24px; font-weight: 600; }
        .token-pick { background: #111; border: 1px solid #222; color: #fff; padding: 6px 10px; border-radius: 10px; display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; }
        .token-pick img { width: 16px; }
        .token-pick.active { border-color: #0CF2B033; }
        .swap-icon-wrap { text-align: center; margin: 10px 0; opacity: 0.2; font-size: 14px; }
        .swap-main-btn { width: 100%; padding: 18px; border: none; border-radius: 18px; color: #fff; font-weight: 900; font-size: 14px; margin-top: 15px; display: flex; justify-content: center; }

        .token-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 200; display: flex; align-items: flex-end; }
        .token-sheet { background: #0a0a0a; width: 100%; border-top-left-radius: 25px; border-top-right-radius: 25px; padding: 20px; }
        .ts-head { display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: 800; font-size: 14px; }
        .ts-row { display: flex; align-items: center; gap: 15px; padding: 12px 0; border-bottom: 1px solid #151515; }
        .ts-row img { width: 28px; }
        .ts-info { flex: 1; }
        .ts-info b { display: block; font-size: 13px; }
        .ts-info small { font-size: 9px; opacity: 0.3; }
        .ts-price { font-weight: 700; font-size: 13px; }

        .receipt-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 30px; }
        .receipt-card { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 30px; border-radius: 30px; width: 100%; text-align: center; }
        .rc-icon { width: 50px; height: 50px; background: #0CF2B015; color: #0CF2B0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; }
        .rc-pnl { font-size: 32px; font-weight: 800; margin: 15px 0 25px; }
        .rc-btn { background: #fff; color: #000; border: none; width: 100%; padding: 15px; border-radius: 14px; font-weight: 800; }

        .loader { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
