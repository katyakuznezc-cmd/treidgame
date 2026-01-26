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
  UNISWAP: { name: 'UNISWAP V3', color: '#FF007A', bg: 'linear-gradient(180deg, #1a000d 0%, #000 100%)' },
  ODOS: { name: 'ODOS ROUTER', color: '#0CF2B0', bg: 'linear-gradient(180deg, #001a14 0%, #000 100%)' },
  SUSHI: { name: 'SUSHISWAP', color: '#FA52A0', bg: 'linear-gradient(180deg, #1a0010 0%, #000 100%)' },
  '1INCH': { name: '1INCH NETWORK', color: '#31569c', bg: 'linear-gradient(180deg, #00081a 0%, #000 100%)' }
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
    setDeal({ coin: ASSETS[assets[Math.floor(Math.random() * assets.length)]], buyAt, sellAt, profit: (Math.random() * 0.4 + 2.6).toFixed(2) });
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
    }, 1200);
  };

  return (
    <div className="app">
      <div className="main-scrollable">
        <header className="header">
          <div className="liq-info">LIQUIDITY: <span>${balance.toFixed(2)}</span></div>
          <button onClick={() => window.open('https://t.me/vladstelin78')} className="mgr-btn">MANAGER</button>
        </header>

        <div className="hero">
          <div className="hero-label">NET WORTH</div>
          <div className="hero-val">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
        </div>

        {/* СДЕЛКА С ПОЛНЫМИ НАЗВАНИЯМИ */}
        {deal && (
          <div className="deal-box">
            <div className="deal-header">
              <span className="signal-tag">SIGNAL</span>
              <span className="profit-tag">+{deal.profit}%</span>
            </div>
            
            <div className="deal-grid">
              <div className="grid-item">
                <small>КУПИТЬ НА</small>
                <div className="dex-name">{DEX_THEMES[deal.buyAt].name}</div>
              </div>
              
              <div className="grid-asset">
                <img src={deal.coin.icon} />
                <b>{deal.coin.symbol}</b>
              </div>

              <div className="grid-item text-right">
                <small>ПРОДАТЬ НА</small>
                <div className="dex-name" style={{color: '#0CF2B0'}}>{DEX_THEMES[deal.sellAt].name}</div>
              </div>
            </div>

            <div className="progress-container">
              <div className="progress-fill" style={{width: `${(timeLeft/120)*100}%`}}></div>
            </div>
          </div>
        )}

        <div className="dex-grid">
          {Object.keys(DEX_THEMES).map(k => (
            <button key={k} onClick={() => setActiveDex(k)} className="dex-btn">
              <div className="dex-accent" style={{background: DEX_THEMES[k].color}}></div>
              <div className="dex-info">
                <div className="dn">{DEX_THEMES[k].name}</div>
                <div className="ds">CONNECTED</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ЭКРАН ОБМЕНА */}
      {activeDex && (
        <div className="dex-overlay" style={{ background: DEX_THEMES[activeDex].bg }}>
          <div className="dex-nav">
            <button onClick={() => setActiveDex(null)}>← BACK</button>
            <div className="dex-title">{DEX_THEMES[activeDex].name}</div>
            <div style={{width: 50}}></div>
          </div>

          <div className="swap-card">
            <div className="swap-field">
              <div className="field-label"><span>PAY</span> <span onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))} className="max-btn">MAX</span></div>
              <div className="field-row">
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                <button onClick={() => setShowTokenList('pay')} className="token-select"><img src={payToken.icon} /> {payToken.symbol}</button>
              </div>
            </div>

            <div className="divider">↓</div>

            <div className="swap-field">
              <div className="field-label">RECEIVE</div>
              <div className="field-row">
                <div className="field-out">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(5) : '0.00'}</div>
                <button onClick={() => setShowTokenList('get')} className="token-select active"><img src={getToken.icon} /> {getToken.symbol}</button>
              </div>
            </div>

            <button onClick={handleSwap} disabled={isPending} className="swap-execute" style={{ background: DEX_THEMES[activeDex].color }}>
              {isPending ? "ROUTING..." : "CONFIRM SWAP"}
            </button>
          </div>
        </div>
      )}

      {/* ПОЛНЫЙ СПИСОК ТОКЕНОВ */}
      {showTokenList && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">Select Token <button onClick={() => setShowTokenList(null)}>✕</button></div>
            <div className="token-list">
              {Object.values(ASSETS).map(a => (
                <div key={a.symbol} onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }} className="token-row">
                  <img src={a.icon} />
                  <div className="tr-info"><b>{a.symbol}</b><small>Asset</small></div>
                  <div className="tr-price">${a.price}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* КВИТАНЦИЯ */}
      {receipt && (
        <div className="modal">
          <div className="receipt">
            <div className="r-icon">✓</div>
            <h3>TRANSACTION SUCCESS</h3>
            <div className="r-pnl" style={{color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b'}}>
              {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
            </div>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}} className="r-btn">DONE</button>
          </div>
        </div>
      )}

      <style>{`
        .app { background: #000; height: 100vh; color: #fff; font-family: sans-serif; overflow: hidden; }
        .main-scrollable { padding: 20px; height: 100%; overflow-y: auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .liq-info { font-size: 10px; font-weight: 800; }
        .liq-info span { color: #0CF2B0; }
        .mgr-btn { background: #111; border: 1px solid #222; color: #fff; padding: 6px 12px; border-radius: 10px; font-size: 10px; }

        .hero { text-align: center; margin-bottom: 35px; }
        .hero-label { font-size: 9px; opacity: 0.3; letter-spacing: 2px; margin-bottom: 5px; }
        .hero-val { font-size: 48px; font-weight: 900; }

        /* DEAL BOX */
        .deal-box { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 20px; border-radius: 24px; margin-bottom: 30px; }
        .deal-header { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .signal-tag { font-size: 10px; font-weight: 900; color: #0CF2B0; background: rgba(12,242,176,0.1); padding: 4px 8px; border-radius: 6px; }
        .profit-tag { font-size: 18px; font-weight: 900; color: #0CF2B0; }
        .deal-grid { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .grid-item small { font-size: 8px; opacity: 0.4; display: block; margin-bottom: 4px; }
        .dex-name { font-size: 14px; font-weight: 900; }
        .grid-asset { background: #fff; color: #000; padding: 6px 12px; border-radius: 12px; text-align: center; }
        .grid-asset img { width: 16px; display: block; margin: 0 auto 2px; }
        .grid-asset b { font-size: 10px; }
        .text-right { text-align: right; }
        .progress-container { height: 2px; background: #1a1a1a; border-radius: 2px; overflow: hidden; }
        .progress-fill { height: 100%; background: #0CF2B0; transition: width 1s linear; }

        /* DEX GRID */
        .dex-grid { display: flex; flex-direction: column; gap: 10px; }
        .dex-btn { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 20px; border-radius: 18px; display: flex; align-items: center; gap: 15px; color: #fff; text-align: left; }
        .dex-accent { width: 3px; height: 25px; border-radius: 10px; }
        .dn { font-size: 14px; font-weight: 900; }
        .ds { font-size: 8px; opacity: 0.3; }

        /* OVERLAY */
        .dex-overlay { position: fixed; inset: 0; z-index: 100; padding: 20px; display: flex; flex-direction: column; }
        .dex-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .dex-nav button { background: none; border: none; color: #fff; font-weight: bold; }
        .dex-title { font-weight: 900; font-size: 15px; }
        .swap-card { background: rgba(0,0,0,0.6); padding: 20px; border-radius: 28px; border: 1px solid rgba(255,255,255,0.05); }
        .swap-field { background: #000; padding: 15px; border-radius: 20px; border: 1px solid #1a1a1a; }
        .field-label { display: flex; justify-content: space-between; font-size: 10px; opacity: 0.4; margin-bottom: 10px; }
        .max-btn { color: #0CF2B0; font-weight: 900; }
        .field-row { display: flex; justify-content: space-between; align-items: center; }
        .field-row input { background: none; border: none; color: #fff; font-size: 26px; font-weight: 700; width: 50%; outline: none; }
        .field-out { font-size: 26px; font-weight: 700; }
        .token-select { background: #111; border: 1px solid #222; color: #fff; padding: 6px 12px; border-radius: 12px; display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; }
        .token-select img { width: 18px; }
        .token-select.active { border-color: #0CF2B0; }
        .divider { text-align: center; margin: 10px 0; opacity: 0.2; }
        .swap-execute { width: 100%; padding: 20px; border: none; border-radius: 20px; color: #fff; font-weight: 900; margin-top: 20px; }

        /* MODAL */
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 200; display: flex; align-items: flex-end; }
        .modal-content { background: #0a0a0a; width: 100%; border-top-left-radius: 30px; border-top-right-radius: 30px; padding: 25px; }
        .modal-header { display: flex; justify-content: space-between; margin-bottom: 25px; font-weight: 900; }
        .token-row { display: flex; align-items: center; gap: 15px; padding: 15px 0; border-bottom: 1px solid #111; }
        .token-row img { width: 30px; }
        .tr-info { flex: 1; }
        .tr-info b { display: block; font-size: 14px; }
        .tr-info small { font-size: 9px; opacity: 0.3; }
        .tr-price { font-weight: 700; }

        .receipt { background: #0a0a0a; padding: 30px; border-radius: 30px; text-align: center; width: 100%; margin: 20px; border: 1px solid #1a1a1a; }
        .r-icon { width: 50px; height: 50px; background: #0CF2B015; color: #0CF2B0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .r-pnl { font-size: 32px; font-weight: 900; margin: 20px 0; }
        .r-btn { background: #fff; color: #000; border: none; width: 100%; padding: 15px; border-radius: 12px; font-weight: 900; }
      `}</style>
    </div>
  );
}
