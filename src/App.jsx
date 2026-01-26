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
  UNISWAP: { name: 'UNISWAP V3', color: '#FF007A', bg: 'radial-gradient(circle at 50% 10%, #2a0014 0%, #000 80%)' },
  ODOS: { name: 'ODOS ROUTER', color: '#0CF2B0', bg: 'radial-gradient(circle at 50% 10%, #002a1e 0%, #000 80%)' },
  SUSHI: { name: 'SUSHISWAP', color: '#FA52A0', bg: 'radial-gradient(circle at 50% 10%, #2a001a 0%, #000 80%)' },
  '1INCH': { name: '1INCH NETWORK', color: '#31569c', bg: 'radial-gradient(circle at 50% 10%, #00082a 0%, #000 80%)' }
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
    audio.volume = 0.1;
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
    if (!amt || amt <= 0 || amt > maxVal) return;

    const id = Date.now();
    setClicks(prev => [...prev, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 1000);

    setIsPending(true);
    setTimeout(() => {
      let receiveAmt = (amt * payToken.price) / getToken.price;
      let pnl = null;
      
      // Если продаем актив в USDC
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
      
      setReceipt({ 
        pnl, 
        get: receiveAmt, 
        to: getToken.symbol, 
        from: payToken.symbol,
        isPurchase: payToken.symbol === 'USDC' 
      });
      
      setIsPending(false); 
      setPayAmount('');
    }, 3000); 
  };

  return (
    <div className="app-container">
      {/* МЕНЮ */}
      <div className={`main-ui ${activeDex ? 'scale-down' : ''}`}>
        <header className="header-nav">
          <div className="usdc-badge">USDC <span>${balance.toFixed(2)}</span></div>
          <button onClick={() => window.open('https://t.me/vladstelin78')} className="mgr-btn">MANAGER</button>
        </header>

        <div className="balance-hero">
          <div className="bal-value">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div className="bal-sub">NET EQUITY</div>
        </div>

        {deal && (
          <div className="signal-box">
            <div className="sb-top"><span className="sb-live">ARBITRAGE</span><span className="sb-pct">+{deal.profit}%</span></div>
            <div className="sb-main">
              <div className="sb-node"><small>BUY</small><b>{DEX_THEMES[deal.buyAt].name}</b></div>
              <div className="sb-icon-mid"><img src={deal.coin.icon} /><span>{deal.coin.symbol}</span></div>
              <div className="sb-node text-right"><small>SELL</small><b style={{color: '#0CF2B0'}}>{DEX_THEMES[deal.sellAt].name}</b></div>
            </div>
            <div className="sb-progress"><div className="sb-fill" style={{width: `${(timeLeft/120)*100}%`}}></div></div>
          </div>
        )}

        <div className="grid-dex">
          {Object.keys(DEX_THEMES).map(k => (
            <button key={k} onClick={() => { playClick(); setActiveDex(k); }} className="card-dex">
              <div className="card-line" style={{background: DEX_THEMES[k].color}}></div>
              <div className="card-name">{DEX_THEMES[k].name}</div>
              <div className="card-info">V3 ROUTER</div>
            </button>
          ))}
        </div>
      </div>

      {/* ЭКРАН ТРЕЙДА */}
      {activeDex && (
        <div className="trade-screen" style={{ background: DEX_THEMES[activeDex].bg }}>
          <div className="trade-nav">
            <button onClick={() => setActiveDex(null)}>✕</button>
            <div className="trade-title">{DEX_THEMES[activeDex].name}</div>
            <div style={{width: 30}}></div>
          </div>

          <div className="trade-card">
            <div className="trade-input">
              <div className="ti-head"><span>SEND</span> <span onClick={() => { playClick(); setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0)); }} className="max-tag">MAX</span></div>
              <div className="ti-row">
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                <button onClick={() => setShowTokenList('pay')} className="asset-btn"><img src={payToken.icon} /> {payToken.symbol}</button>
              </div>
            </div>
            <div className="trade-sep">↓</div>
            <div className="trade-input">
              <div className="ti-head">RECEIVE</div>
              <div className="ti-row">
                <div className="ti-val">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(5) : '0.00'}</div>
                <button onClick={() => setShowTokenList('get')} className="asset-btn active"><img src={getToken.icon} /> {getToken.symbol}</button>
              </div>
            </div>
            <button onClick={handleSwap} disabled={isPending} className="confirm-btn" style={{ background: DEX_THEMES[activeDex].color }}>
              {isPending ? <div className="loader-dots"><span>.</span><span>.</span><span>.</span></div> : "EXECUTE SWAP"}
            </button>
          </div>
        </div>
      )}

      {/* ЧЕК */}
      {receipt && (
        <div className="receipt-overlay">
          <div className="receipt-content">
            <div className="check-mark">✓</div>
            <h2>{receipt.isPurchase ? 'ASSETS PURCHASED' : 'SWAP COMPLETED'}</h2>
            
            <div className="receipt-data">
              {receipt.isPurchase ? (
                 <div className="purchase-info">
                   <span>Received</span>
                   <div className="amt-big">{receipt.get.toFixed(5)} {receipt.to}</div>
                 </div>
              ) : (
                <div className="pnl-info">
                  <span>Net Profit/Loss</span>
                  <div className="amt-big" style={{color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b'}}>
                    {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => { playClick(); setReceipt(null); setActiveDex(null); }} className="done-btn">RETURN TO TERMINAL</button>
          </div>
        </div>
      )}

      {/* ТОКЕНЫ */}
      {showTokenList && (
        <div className="token-picker">
          <div className="token-sheet">
            <div className="ts-header">Select Asset <button onClick={() => setShowTokenList(null)}>✕</button></div>
            <div className="ts-scroll">
              {Object.values(ASSETS).map(a => (
                <div key={a.symbol} onClick={() => { playClick(); if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }} className="ts-item">
                  <img src={a.icon} />
                  <div className="ts-meta"><b>{a.symbol}</b><small>Verified</small></div>
                  <div className="ts-price">${a.price}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {clicks.map(c => <div key={c.id} className="click-fx" style={{ left: c.x, top: c.y }}>$</div>)}

      <style>{`
        .app-container { background: #000; height: 100vh; color: #fff; font-family: -apple-system, sans-serif; overflow: hidden; position: relative; }
        
        .main-ui { padding: 20px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); height: 100%; overflow-y: auto; }
        .main-ui.scale-down { transform: scale(0.9); opacity: 0; pointer-events: none; }

        .header-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .usdc-badge { font-size: 10px; font-weight: 900; background: #111; padding: 6px 12px; border-radius: 15px; border: 1px solid #222; }
        .usdc-badge span { color: #0CF2B0; }
        .mgr-btn { background: #fff; color: #000; border: none; padding: 6px 12px; border-radius: 10px; font-size: 9px; font-weight: 900; }

        .balance-hero { text-align: center; margin: 30px 0; }
        .bal-value { font-size: 42px; font-weight: 800; }
        .bal-sub { font-size: 9px; opacity: 0.3; letter-spacing: 2px; }

        .signal-box { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 20px; border-radius: 24px; margin-bottom: 25px; }
        .sb-top { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .sb-live { font-size: 9px; color: #0CF2B0; font-weight: 900; }
        .sb-pct { font-size: 16px; color: #0CF2B0; font-weight: 900; }
        .sb-main { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .sb-node small { font-size: 8px; opacity: 0.4; display: block; margin-bottom: 2px; }
        .sb-node b { font-size: 12px; }
        .sb-icon-mid { background: #fff; color: #000; padding: 6px 10px; border-radius: 10px; text-align: center; }
        .sb-icon-mid img { width: 12px; display: block; margin: 0 auto; }
        .sb-icon-mid span { font-size: 9px; font-weight: 900; }
        .sb-progress { height: 2px; background: #1a1a1a; }
        .sb-fill { height: 100%; background: #0CF2B0; transition: width 1s linear; }

        .grid-dex { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .card-dex { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 25px 15px; border-radius: 20px; text-align: left; color: #fff; position: relative; overflow: hidden; }
        .card-line { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
        .card-name { font-size: 11px; font-weight: 900; margin-bottom: 4px; }
        .card-info { font-size: 8px; opacity: 0.2; }

        .trade-screen { position: fixed; inset: 0; z-index: 100; padding: 20px; display: flex; flex-direction: column; animation: flyIn 0.4s ease-out; }
        @keyframes flyIn { from { transform: scale(1.1); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .trade-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .trade-nav button { background: rgba(255,255,255,0.1); border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; font-weight: bold; }
        .trade-title { font-weight: 900; font-size: 14px; letter-spacing: 1px; }

        .trade-card { background: rgba(0,0,0,0.5); padding: 20px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(20px); margin: auto 0; }
        .trade-input { background: #000; padding: 18px; border-radius: 22px; border: 1px solid #1a1a1a; }
        .ti-head { display: flex; justify-content: space-between; font-size: 9px; opacity: 0.4; margin-bottom: 12px; }
        .max-tag { color: #0CF2B0; font-weight: 900; }
        .ti-row { display: flex; justify-content: space-between; align-items: center; }
        .ti-row input { background: none; border: none; color: #fff; font-size: 24px; font-weight: 700; width: 50%; outline: none; }
        .ti-val { font-size: 24px; font-weight: 700; }
        .asset-btn { background: #111; border: 1px solid #222; color: #fff; padding: 8px 12px; border-radius: 12px; display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; }
        .asset-btn img { width: 16px; }
        .trade-sep { text-align: center; padding: 10px; opacity: 0.3; }
        .confirm-btn { width: 100%; padding: 20px; border: none; border-radius: 20px; color: #fff; font-weight: 900; margin-top: 20px; }

        .receipt-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.96); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 30px; }
        .receipt-content { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 40px 25px; border-radius: 35px; width: 100%; text-align: center; animation: popUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes popUp { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        
        .check-mark { width: 60px; height: 60px; background: rgba(12,242,176,0.1); color: #0CF2B0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 24px; }
        .receipt-data { margin: 25px 0 35px; }
        .receipt-data span { font-size: 10px; opacity: 0.4; display: block; margin-bottom: 8px; }
        .amt-big { font-size: 32px; font-weight: 800; }
        .done-btn { background: #fff; color: #000; border: none; width: 100%; padding: 18px; border-radius: 18px; font-weight: 900; }

        .token-picker { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 300; display: flex; align-items: flex-end; }
        .token-sheet { background: #0a0a0a; width: 100%; border-top-left-radius: 30px; border-top-right-radius: 30px; padding: 20px; max-height: 70vh; display: flex; flex-direction: column; }
        .ts-header { display: flex; justify-content: space-between; padding-bottom: 20px; font-weight: 900; }
        .ts-scroll { overflow-y: auto; }
        .ts-item { display: flex; align-items: center; gap: 15px; padding: 15px 0; border-bottom: 1px solid #111; }
        .ts-item img { width: 30px; }
        .ts-meta { flex: 1; }
        .ts-meta b { display: block; font-size: 14px; }
        .ts-meta small { font-size: 9px; opacity: 0.3; }
        .ts-price { font-weight: 700; }

        .click-fx { position: fixed; color: #0CF2B0; font-weight: 900; font-size: 28px; pointer-events: none; animation: floatUp 1s ease-out forwards; z-index: 1000; }
        @keyframes floatUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-100px) scale(1.5); } }

        .loader-dots span { animation: blink 1s infinite; margin: 0 2px; }
        .loader-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loader-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { 0% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }
      `}</style>
    </div>
  );
}
