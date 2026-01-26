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
  UNISWAP: { name: 'Uniswap V3', color: '#FF007A', bg: 'radial-gradient(circle at 50% -20%, #4a0024 0%, #000 80%)', icon: '🦄' },
  ODOS: { name: 'Odos Router', color: '#0CF2B0', bg: 'radial-gradient(circle at 50% -20%, #004a35 0%, #000 80%)', icon: '🌀' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: 'radial-gradient(circle at 50% -20%, #4a002b 0%, #000 80%)', icon: '🍣' },
  '1INCH': { name: '1inch Net', color: '#31569c', bg: 'radial-gradient(circle at 50% -20%, #001a4a 0%, #000 80%)', icon: '🛡️' }
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
    setDeal({
      coin: ASSETS[assets[Math.floor(Math.random() * assets.length)]],
      buyAt, sellAt,
      profit: (Math.random() * 0.4 + 2.7).toFixed(2)
    });
  };

  const handleSwap = () => {
    const amount = Number(payAmount);
    const currentMax = payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0);
    if (!amount || amount > currentMax) return;

    setIsPending(true);
    setTimeout(() => {
      let receiveAmount = (amount * payToken.price) / getToken.price;
      let pnl = 0;

      if (getToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        const isCorrect = activeDex === deal.sellAt && payToken.symbol === deal.coin.symbol;
        if (isCorrect) {
          receiveAmount *= (1 + Number(deal.profit) / 100);
          generateDeal();
        } else {
          receiveAmount *= (1 - (Math.random() * 0.015));
        }
        pnl = receiveAmount - (amount * payToken.price);
      }

      const newBalance = payToken.symbol === 'USDC' ? balance - amount : (getToken.symbol === 'USDC' ? balance + receiveAmount : balance);
      const newWallet = { ...wallet };
      if (payToken.symbol !== 'USDC') newWallet[payToken.symbol] = (newWallet[payToken.symbol] || 0) - amount;
      if (getToken.symbol !== 'USDC') newWallet[getToken.symbol] = (newWallet[getToken.symbol] || 0) + receiveAmount;

      update(ref(db, `players/${userId}`), { balanceUSDC: newBalance, wallet: newWallet });
      setReceipt({ pnl, get: receiveAmount, from: payToken.symbol, to: getToken.symbol, amount, dex: activeDex });
      setIsPending(false); setPayAmount('');
    }, 2000);
  };

  return (
    <div className="app-shell">
      <div className="glass-blob"></div>
      
      <div className="main-content">
        <header className="top-bar">
          <div className="status-chip"><span className="online-dot"></span> NETWORK ONLINE</div>
          <button onClick={() => window.open('https://t.me/vladstelin78')} className="manager-chip">MANAGER</button>
        </header>

        <section className="balance-hero">
          <div className="total-label">AVAILABLE LIQUIDITY</div>
          <div className="main-amount">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
        </section>

        {/* ДЕТАЛИЗИРОВАННАЯ ТЕКСТОВАЯ СДЕЛКА */}
        {deal && (
          <div className="signal-card">
            <div className="signal-header">
              <span className="signal-tag">LIVE SIGNAL</span>
              <span className="signal-profit">+{deal.profit}%</span>
            </div>
            
            <div className="signal-route">
              <div className="route-step">
                <small>КУПИТЬ НА</small>
                <div className="step-name">{DEX_THEMES[deal.buyAt].name.toUpperCase()}</div>
              </div>
              
              <div className="route-coin">
                <img src={deal.coin.icon} alt="coin" />
                <span>{deal.coin.symbol}</span>
              </div>

              <div className="route-step">
                <small>ПРОДАТЬ НА</small>
                <div className="step-name" style={{color: '#0CF2B0'}}>{DEX_THEMES[deal.sellAt].name.toUpperCase()}</div>
              </div>
            </div>

            <div className="signal-timer">
              <div className="timer-track"><div className="timer-fill" style={{width: `${(timeLeft/120)*100}%`}}></div></div>
              <span>REFRESH IN {timeLeft}s</span>
            </div>
          </div>
        )}

        <div className="dex-menu">
          {Object.keys(DEX_THEMES).map(k => (
            <button key={k} onClick={() => setActiveDex(k)} className="dex-tile">
              <div className="tile-glow" style={{background: DEX_THEMES[k].color}}></div>
              <div className="tile-content">
                <div className="tile-icon">{DEX_THEMES[k].icon}</div>
                <div className="tile-name">{DEX_THEMES[k].name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ДЕТАЛИЗИРОВАННАЯ БИРЖА */}
      {activeDex && (
        <div className="dex-view" style={{ background: DEX_THEMES[activeDex].bg }}>
          <header className="dex-nav">
            <button onClick={() => setActiveDex(null)} className="back-btn">←</button>
            <div className="dex-info-title">{DEX_THEMES[activeDex].name}</div>
            <div className="dex-icon-top">{DEX_THEMES[activeDex].icon}</div>
          </header>

          <div className="swap-interface">
            <div className="glass-panel">
              <div className="panel-sub"><span>YOU PAY</span> <span onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))} className="max-tag">MAX</span></div>
              <div className="panel-row">
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                <button className="asset-select"><img src={payToken.icon} /> {payToken.symbol}</button>
              </div>
            </div>

            <div className="swap-divider">
               <div className="divider-circle" style={{borderColor: DEX_THEMES[activeDex].color}}>↓</div>
            </div>

            <div className="glass-panel">
              <div className="panel-sub">YOU RECEIVE</div>
              <div className="panel-row">
                <div className="receive-val">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(6) : '0.00'}</div>
                <button onClick={() => {
                  setGetToken(getToken.symbol === 'USDC' ? deal.coin : ASSETS.USDC);
                  setPayToken(payToken.symbol === 'USDC' ? ASSETS.USDC : deal.coin);
                }} className="asset-select-active">
                  <img src={getToken.icon} /> {getToken.symbol} ⇅
                </button>
              </div>
            </div>

            <div className="details-box">
              <div className="det-row"><span>Exchange Fee</span> <span>$0.12</span></div>
              <div className="det-row"><span>Slippage Tolerance</span> <span>0.5%</span></div>
            </div>

            <button onClick={handleSwap} disabled={isPending} className="main-swap-btn" style={{ background: DEX_THEMES[activeDex].color }}>
              {isPending ? <div className="loader"></div> : "CONFIRM SWAP"}
            </button>
          </div>
        </div>
      )}

      {/* КВИТАНЦИЯ */}
      {receipt && (
        <div className="receipt-overlay">
          <div className="receipt-check">
            <div className="check-status">TRANSACTION EXECUTED</div>
            <div className="check-pnl" style={{color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b'}}>
              {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
            </div>
            <div className="check-list">
              <div className="check-li"><span>DEX</span> <span>{DEX_THEMES[receipt.dex].name}</span></div>
              <div className="check-li"><span>Asset</span> <span>{receipt.to}</span></div>
              <div className="check-li"><span>Status</span> <span style={{color: '#0CF2B0'}}>Success</span></div>
            </div>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}} className="check-close">DONE</button>
          </div>
        </div>
      )}

      <style>{`
        .app-shell { background: #000; height: 100vh; color: #fff; font-family: 'Inter', sans-serif; overflow: hidden; position: relative; }
        .glass-blob { position: absolute; top: -100px; left: 50%; transform: translateX(-50%); width: 400px; height: 400px; background: radial-gradient(circle, #0CF2B015 0%, transparent 70%); filter: blur(40px); }
        .main-content { position: relative; z-index: 10; padding: 20px; display: flex; flex-direction: column; height: 100%; }

        .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .status-chip { background: rgba(255,255,255,0.05); padding: 6px 12px; border-radius: 20px; font-size: 9px; font-weight: 900; letter-spacing: 1px; display: flex; align-items: center; gap: 6px; }
        .online-dot { width: 5px; height: 5px; background: #0CF2B0; border-radius: 50%; box-shadow: 0 0 10px #0CF2B0; }
        .manager-chip { background: #fff; color: #000; border: none; padding: 6px 12px; border-radius: 20px; font-size: 9px; font-weight: 900; }

        .balance-hero { text-align: center; margin-bottom: 30px; }
        .total-label { font-size: 10px; opacity: 0.3; letter-spacing: 2px; margin-bottom: 5px; }
        .main-amount { font-size: 52px; font-weight: 900; letter-spacing: -2px; }

        /* SIGNAL CARD */
        .signal-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 28px; padding: 20px; margin-bottom: 25px; backdrop-filter: blur(10px); }
        .signal-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .signal-tag { font-size: 9px; font-weight: 900; color: #0CF2B0; background: rgba(12, 242, 176, 0.1); padding: 4px 8px; border-radius: 6px; }
        .signal-profit { font-weight: 900; color: #0CF2B0; font-size: 18px; }
        .signal-route { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .route-step { display: flex; flex-direction: column; gap: 4px; }
        .route-step small { font-size: 8px; opacity: 0.4; }
        .step-name { font-size: 13px; font-weight: 900; }
        .route-coin { display: flex; flex-direction: column; align-items: center; gap: 5px; background: #fff; color: #000; padding: 10px; border-radius: 15px; min-width: 60px; }
        .route-coin img { width: 22px; height: 22px; }
        .route-coin span { font-size: 10px; font-weight: 900; }
        .signal-timer { font-size: 9px; text-align: center; opacity: 0.4; }
        .timer-track { height: 3px; background: rgba(255,255,255,0.05); border-radius: 3px; margin-bottom: 8px; overflow: hidden; }
        .timer-fill { height: 100%; background: #0CF2B0; transition: width 1s linear; }

        /* DEX MENU */
        .dex-menu { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .dex-tile { background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 24px; padding: 25px; position: relative; overflow: hidden; }
        .tile-glow { position: absolute; top: -50%; left: -50%; width: 100%; height: 100%; filter: blur(40px); opacity: 0.1; }
        .tile-content { position: relative; z-index: 2; text-align: center; }
        .tile-icon { font-size: 24px; margin-bottom: 10px; }
        .tile-name { font-size: 12px; font-weight: 800; }

        /* DEX VIEW */
        .dex-view { position: fixed; inset: 0; z-index: 1000; display: flex; flex-direction: column; animation: slideUp 0.4s cubic-bezier(0,0,0.2,1); }
        .dex-nav { padding: 20px; display: flex; justify-content: space-between; align-items: center; }
        .back-btn { background: rgba(255,255,255,0.1); border: none; color: #fff; width: 40px; height: 40px; border-radius: 50%; font-size: 20px; }
        .dex-info-title { font-weight: 900; font-size: 16px; letter-spacing: 1px; }
        .swap-interface { padding: 20px; }
        .glass-panel { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 20px; border-radius: 24px; }
        .panel-sub { display: flex; justify-content: space-between; font-size: 10px; font-weight: 800; opacity: 0.4; margin-bottom: 15px; }
        .max-tag { color: #0CF2B0; cursor: pointer; }
        .panel-row { display: flex; justify-content: space-between; align-items: center; }
        .panel-row input { background: none; border: none; color: #fff; font-size: 32px; font-weight: 700; width: 60%; outline: none; }
        .asset-select, .asset-select-active { background: #000; border: 1px solid #222; color: #fff; padding: 8px 12px; border-radius: 14px; display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 12px; }
        .asset-select img, .asset-select-active img { width: 18px; height: 18px; }
        .swap-divider { display: flex; justify-content: center; margin: -15px 0; position: relative; z-index: 5; }
        .divider-circle { background: #000; width: 40px; height: 40px; border-radius: 50%; border: 2px solid; display: flex; align-items: center; justify-content: center; }
        .details-box { margin: 20px 0; padding: 0 10px; }
        .det-row { display: flex; justify-content: space-between; font-size: 11px; opacity: 0.4; margin-bottom: 8px; }
        .main-swap-btn { width: 100%; padding: 22px; border-radius: 24px; border: none; color: #fff; font-weight: 900; font-size: 18px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); }

        .receipt-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 30px; }
        .receipt-check { background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 35px; padding: 30px; width: 100%; text-align: center; }
        .check-pnl { font-size: 42px; font-weight: 900; margin: 20px 0; }
        .check-list { background: #000; padding: 20px; border-radius: 20px; text-align: left; }
        .check-li { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 10px; opacity: 0.6; }
        .check-close { background: #fff; color: #000; width: 100%; padding: 18px; border-radius: 18px; border: none; font-weight: 900; margin-top: 30px; }

        .loader { width: 24px; height: 24px; border: 3px solid #fff; border-bottom-color: transparent; border-radius: 50%; animation: rot 0.8s linear infinite; margin: auto; }
        @keyframes rot { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}
