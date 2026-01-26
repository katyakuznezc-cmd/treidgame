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
  UNISWAP: { name: 'UNISWAP V3', color: '#FF007A', bg: 'radial-gradient(circle at 50% 10%, #2a0014 0%, #000 70%)' },
  ODOS: { name: 'ODOS ROUTER', color: '#0CF2B0', bg: 'radial-gradient(circle at 50% 10%, #002a1e 0%, #000 70%)' },
  SUSHI: { name: 'SUSHISWAP', color: '#FA52A0', bg: 'radial-gradient(circle at 50% 10%, #2a001a 0%, #000 70%)' },
  '1INCH': { name: '1INCH NETWORK', color: '#31569c', bg: 'radial-gradient(circle at 50% 10%, #00082a 0%, #000 70%)' }
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

  const playClick = () => {
    const audio = new Audio('https://www.soundjay.com/buttons/button-16.mp3');
    audio.volume = 0.2;
    audio.play().catch(() => {});
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
    if (!amt || amt > maxVal) return;

    // Эффект доллара
    const id = Date.now();
    setClicks(prev => [...prev, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 1000);

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
    <div className="app-main">
      {/* ГЛАВНОЕ МЕНЮ (скрывается если открыта биржа) */}
      <div className={`scroll-container ${activeDex ? 'hidden' : ''}`}>
        <header className="main-header">
          <div className="token-pill">USDC: <span>${balance.toFixed(2)}</span></div>
          <button onClick={() => window.open('https://t.me/vladstelin78')} className="btn-manager">MANAGER</button>
        </header>

        <section className="portfolio-section">
          <div className="portfolio-val">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div className="portfolio-label">TOTAL EQUITY</div>
        </section>

        {deal && (
          <div className="deal-alert">
            <div className="da-header"><span className="da-status">LIVE ARBITRAGE</span><span className="da-profit">+{deal.profit}%</span></div>
            <div className="da-route">
              <div className="da-node"><small>BUY</small><div className="da-dex-name">{DEX_THEMES[deal.buyAt].name}</div></div>
              <div className="da-coin"><img src={deal.coin.icon} /><b>{deal.coin.symbol}</b></div>
              <div className="da-node text-right"><small>SELL</small><div className="da-dex-name highlight">{DEX_THEMES[deal.sellAt].name}</div></div>
            </div>
            <div className="da-progress"><div className="da-bar" style={{width: `${(timeLeft/120)*100}%`}}></div></div>
          </div>
        )}

        <div className="dex-grid">
          {Object.keys(DEX_THEMES).map(k => (
            <button key={k} onClick={() => { playClick(); setActiveDex(k); }} className="dex-card">
              <div className="dex-card-border" style={{background: DEX_THEMES[k].color}}></div>
              <div className="dex-card-title">{DEX_THEMES[k].name}</div>
              <div className="dex-card-status">CONNECTED</div>
            </button>
          ))}
        </div>
      </div>

      {/* ЭКРАН БИРЖИ */}
      {activeDex && (
        <div className="dex-view" style={{ background: DEX_THEMES[activeDex].bg }}>
          <header className="dex-view-header">
            <button className="back-btn" onClick={() => setActiveDex(null)}>✕ CLOSE</button>
            <div className="dex-view-title">{DEX_THEMES[activeDex].name}</div>
            <div style={{width: 50}}></div>
          </header>

          <div className="swap-card-premium">
            <div className="sc-group">
              <div className="sc-label"><span>SEND</span> <span onClick={() => { playClick(); setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0)); }} className="max-action">MAX</span></div>
              <div className="sc-row">
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                <button onClick={() => setShowTokenList('pay')} className="token-selector"><img src={payToken.icon} /> {payToken.symbol}</button>
              </div>
            </div>
            <div className="swap-visual-divider"><div className="sv-icon" style={{color: DEX_THEMES[activeDex].color}}>↓</div></div>
            <div className="sc-group">
              <div className="sc-label">RECEIVE</div>
              <div className="sc-row">
                <div className="sc-read-only">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(5) : '0.00'}</div>
                <button onClick={() => setShowTokenList('get')} className="token-selector active"><img src={getToken.icon} /> {getToken.symbol}</button>
              </div>
            </div>
            <button onClick={handleSwap} disabled={isPending} className="swap-confirm-btn" style={{ background: DEX_THEMES[activeDex].color }}>
              {isPending ? <div className="loading-spinner"></div> : "CONFIRM SWAP"}
            </button>
          </div>
        </div>
      )}

      {/* ЭФФЕКТ ДОЛЛАРА */}
      {clicks.map(c => <div key={c.id} className="dollar-pop" style={{ left: c.x, top: c.y }}>$</div>)}

      {/* СПИСОК ТОКЕНОВ */}
      {showTokenList && (
        <div className="token-modal-overlay">
          <div className="token-modal-sheet">
            <div className="tm-header">Select Asset <button onClick={() => setShowTokenList(null)}>✕</button></div>
            <div className="tm-list">
              {Object.values(ASSETS).map(a => (
                <div key={a.symbol} onClick={() => { playClick(); if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }} className="tm-item">
                  <img src={a.icon} />
                  <div className="tm-info"><b>{a.symbol}</b><small>Standard Protocol</small></div>
                  <div className="tm-price">${a.price}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ЧЕК */}
      {receipt && (
        <div className="receipt-overlay">
          <div className="receipt-modal">
            <div className="rm-icon">✓</div>
            <h3>SUCCESS</h3>
            <div className="rm-pnl" style={{color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b'}}>
              {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
            </div>
            <button onClick={() => { playClick(); setReceipt(null); setActiveDex(null); }} className="rm-btn">DONE</button>
          </div>
        </div>
      )}

      <style>{`
        .app-main { background: #000; height: 100vh; color: #fff; font-family: sans-serif; overflow: hidden; position: relative; }
        .scroll-container { padding: 20px; height: 100%; overflow-y: auto; transition: opacity 0.2s; }
        .scroll-container.hidden { display: none; }
        
        .main-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .token-pill { font-size: 10px; font-weight: 900; background: #0d0d0d; border: 1px solid #1a1a1a; padding: 6px 14px; border-radius: 20px; }
        .token-pill span { color: #0CF2B0; }
        .btn-manager { background: #fff; color: #000; border: none; padding: 6px 12px; border-radius: 10px; font-size: 10px; font-weight: 900; }

        .portfolio-section { text-align: center; margin-bottom: 35px; }
        .portfolio-val { font-size: 42px; font-weight: 800; }
        .portfolio-label { font-size: 9px; opacity: 0.3; letter-spacing: 2px; }

        .deal-alert { background: #0d0d0d; border: 1px solid #1a1a1a; padding: 20px; border-radius: 24px; margin-bottom: 25px; }
        .da-header { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .da-status { font-size: 9px; font-weight: 900; color: #0CF2B0; }
        .da-profit { font-size: 18px; font-weight: 900; color: #0CF2B0; }
        .da-route { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .da-node small { font-size: 8px; opacity: 0.4; display: block; }
        .da-dex-name { font-size: 13px; font-weight: 900; }
        .da-dex-name.highlight { color: #0CF2B0; }
        .da-coin { background: #fff; color: #000; padding: 6px 12px; border-radius: 12px; text-align: center; }
        .da-coin img { width: 14px; }
        .da-coin b { display: block; font-size: 9px; }
        .da-progress { height: 2px; background: #1a1a1a; border-radius: 2px; overflow: hidden; }
        .da-bar { height: 100%; background: #0CF2B0; transition: width 1s linear; }

        .dex-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .dex-card { background: #0d0d0d; border: 1px solid #1a1a1a; padding: 25px 15px; border-radius: 22px; text-align: left; color: #fff; position: relative; }
        .dex-card-border { position: absolute; top: 0; left: 0; width: 4px; height: 100%; border-radius: 4px 0 0 4px; }
        .dex-card-title { font-size: 12px; font-weight: 900; }
        .dex-card-status { font-size: 8px; opacity: 0.2; }

        .dex-view { position: fixed; inset: 0; z-index: 100; padding: 20px; display: flex; flex-direction: column; }
        .dex-view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .back-btn { background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 8px 14px; border-radius: 12px; font-size: 11px; font-weight: 800; }
        .dex-view-title { font-weight: 900; font-size: 14px; }

        .swap-card-premium { background: rgba(0,0,0,0.4); padding: 20px; border-radius: 32px; border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(15px); margin: auto 0; }
        .sc-group { background: #000; padding: 18px; border-radius: 22px; border: 1px solid #1a1a1a; }
        .sc-label { display: flex; justify-content: space-between; font-size: 9px; opacity: 0.4; margin-bottom: 12px; }
        .max-action { color: #0CF2B0; font-weight: 900; }
        .sc-row { display: flex; justify-content: space-between; align-items: center; }
        .sc-row input { background: none; border: none; color: #fff; font-size: 26px; font-weight: 700; width: 50%; outline: none; }
        .sc-read-only { font-size: 26px; font-weight: 700; }
        .token-selector { background: #111; border: 1px solid #222; color: #fff; padding: 8px 12px; border-radius: 14px; display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; }
        .token-selector img { width: 18px; }
        .swap-visual-divider { text-align: center; margin: 10px 0; opacity: 0.3; }
        .swap-confirm-btn { width: 100%; padding: 20px; border: none; border-radius: 22px; color: #fff; font-weight: 900; margin-top: 20px; display: flex; justify-content: center; }

        .dollar-pop { position: fixed; color: #0CF2B0; font-weight: bold; font-size: 24px; pointer-events: none; animation: popUp 1s ease-out forwards; z-index: 1000; }
        @keyframes popUp { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-100px); } }

        .token-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 200; display: flex; align-items: flex-end; }
        .token-modal-sheet { background: #0d0d0d; width: 100%; border-top-left-radius: 30px; border-top-right-radius: 30px; padding: 25px; }
        .tm-header { display: flex; justify-content: space-between; margin-bottom: 25px; font-weight: 900; }
        .tm-item { display: flex; align-items: center; gap: 15px; padding: 15px 0; border-bottom: 1px solid #151515; }
        .tm-item img { width: 32px; }
        .tm-info { flex: 1; }
        .tm-info b { display: block; font-size: 14px; }
        .tm-price { font-weight: 700; }

        .receipt-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 30px; }
        .receipt-modal { background: #0d0d0d; border: 1px solid #1a1a1a; padding: 35px 25px; border-radius: 35px; width: 100%; text-align: center; }
        .rm-icon { width: 60px; height: 60px; background: rgba(12, 242, 176, 0.1); color: #0CF2B0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .rm-pnl { font-size: 38px; font-weight: 800; margin-bottom: 30px; }
        .rm-btn { background: #fff; color: #000; border: none; width: 100%; padding: 18px; border-radius: 18px; font-weight: 900; }

        .loading-spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
