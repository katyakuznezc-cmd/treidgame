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
  UNISWAP: { name: 'Uniswap V3', color: '#FF007A', bg: 'radial-gradient(circle at 50% 0%, #2a0014 0%, #000 100%)' },
  ODOS: { name: 'Odos Router', color: '#0CF2B0', bg: 'radial-gradient(circle at 50% 0%, #002a1e 0%, #000 100%)' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: 'radial-gradient(circle at 50% 0%, #2a001a 0%, #000 100%)' },
  '1INCH': { name: '1inch Network', color: '#31569c', bg: 'radial-gradient(circle at 50% 0%, #00082a 0%, #000 100%)' }
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
      profit: (Math.random() * 0.5 + 2.5).toFixed(2) // Макс профит 3%
    });
  };

  const handleSwap = () => {
    const amount = Number(payAmount);
    const currentHoldings = payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0);
    
    if (!amount || amount > currentHoldings) return;

    setIsPending(true);
    setTimeout(() => {
      let receiveAmount = (amount * payToken.price) / getToken.price;
      let pnl = 0;

      // Логика профита/убытка
      if (getToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        const isCorrect = activeDex === deal.sellAt && payToken.symbol === deal.coin.symbol;
        if (isCorrect) {
          receiveAmount *= (1 + Number(deal.profit) / 100);
        } else {
          receiveAmount *= (1 - (Math.random() * 0.015)); // Минус до 1.5%
        }
        pnl = receiveAmount - (amount * payToken.price);
        if (isCorrect) generateDeal();
      }

      // ОБНОВЛЕНИЕ БАЛАНСОВ
      const newBalance = payToken.symbol === 'USDC' ? balance - amount : (getToken.symbol === 'USDC' ? balance + receiveAmount : balance);
      const newWallet = { ...wallet };
      if (payToken.symbol !== 'USDC') newWallet[payToken.symbol] = (newWallet[payToken.symbol] || 0) - amount;
      if (getToken.symbol !== 'USDC') newWallet[getToken.symbol] = (newWallet[getToken.symbol] || 0) + receiveAmount;

      update(ref(db, `players/${userId}`), { balanceUSDC: newBalance, wallet: newWallet });
      setReceipt({ pnl, get: receiveAmount, from: payToken.symbol, to: getToken.symbol, amount, dex: activeDex });
      setIsPending(false); setPayAmount('');
    }, 1500);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="liq-info">LIQUIDITY: <b>${balance.toFixed(2)}</b></div>
        <button onClick={() => window.open('https://t.me/vladstelin78')} className="mgr-link">@vladstelin78</button>
      </header>

      {/* ТЕКСТОВАЯ СДЕЛКА */}
      {deal && (
        <div className="deal-card">
          <div className="deal-head">СИГНАЛ: {deal.coin.symbol} <span className="p-tag">+{deal.profit}%</span></div>
          <div className="route-box">
            <div className="route-item">
              <small>КУПИТЬ НА:</small>
              <div className="dex-name">{DEX_THEMES[deal.buyAt].name}</div>
            </div>
            <div className="route-arrow">→</div>
            <div className="route-item">
              <small>ПРОДАТЬ НА:</small>
              <div className="dex-name" style={{color: '#0CF2B0'}}>{DEX_THEMES[deal.sellAt].name}</div>
            </div>
          </div>
          <div className="timer-bar"><div className="fill" style={{width: `${(timeLeft/120)*100}%`}}></div></div>
        </div>
      )}

      <div className="dex-grid">
        {Object.keys(DEX_THEMES).map(k => (
          <button key={k} onClick={() => setActiveDex(k)} className="dex-btn" style={{borderLeft: `4px solid ${DEX_THEMES[k].color}`}}>
            <div className="dex-btn-title">{DEX_THEMES[k].name}</div>
            <div className="dex-btn-sub">API CONNECTED</div>
          </button>
        ))}
      </div>

      {activeDex && (
        <div className="dex-overlay" style={{ background: DEX_THEMES[activeDex].bg }}>
          <div className="dex-nav">
            <button onClick={() => setActiveDex(null)}>✕ BACK</button>
            <div className="dex-title">{DEX_THEMES[activeDex].name}</div>
            <div style={{width: 50}}></div>
          </div>

          <div className="swap-form">
            <div className="input-box">
              <div className="ib-head">PAY <span onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))} className="max-btn">MAX</span></div>
              <div className="ib-main">
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" />
                <div className="asset-tag"><img src={payToken.icon} width="16"/> {payToken.symbol}</div>
              </div>
            </div>

            <div className="swap-mid">↓</div>

            <div className="input-box">
              <div className="ib-head">RECEIVE</div>
              <div className="ib-main">
                <div className="res-val">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(6) : '0.00'}</div>
                <button onClick={() => setGetToken(getToken.symbol === 'USDC' ? deal.coin : ASSETS.USDC)} className="asset-tag-btn">
                  <img src={getToken.icon} width="16"/> {getToken.symbol} ⇅
                </button>
              </div>
            </div>

            <button onClick={handleSwap} disabled={isPending} className="exe-btn" style={{ background: DEX_THEMES[activeDex].color }}>
              {isPending ? "PROCESSING..." : "SWAP ASSETS"}
            </button>
          </div>
        </div>
      )}

      {receipt && (
        <div className="modal">
          <div className="receipt">
            <h3>TRANSACTION SUCCESS</h3>
            <div className="r-pnl" style={{color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b'}}>
              {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
            </div>
            <p>Exchange: {DEX_THEMES[receipt.dex].name}</p>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}} className="r-btn">OK</button>
          </div>
        </div>
      )}

      <style>{`
        .app { background: #000; height: 100vh; color: #fff; font-family: sans-serif; padding: 20px; overflow: hidden; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .liq-info { font-size: 12px; color: #0CF2B0; }
        .mgr-link { background: #111; border: 1px solid #222; color: #fff; padding: 8px 12px; border-radius: 10px; font-size: 11px; }
        
        .deal-card { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 20px; border-radius: 20px; margin-bottom: 25px; }
        .deal-head { font-size: 12px; font-weight: bold; margin-bottom: 15px; display: flex; justify-content: space-between; }
        .p-tag { background: #0CF2B0; color: #000; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        .route-box { display: flex; align-items: center; justify-content: space-between; text-align: center; }
        .route-item small { font-size: 8px; opacity: 0.5; display: block; margin-bottom: 5px; }
        .dex-name { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; }
        .route-arrow { opacity: 0.2; font-size: 20px; }
        .timer-bar { height: 2px; background: #111; margin-top: 15px; border-radius: 2px; }
        .fill { height: 100%; background: #0CF2B0; transition: width 1s linear; }

        .dex-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .dex-btn { background: #0a0a0a; border: none; padding: 18px; border-radius: 15px; text-align: left; color: #fff; }
        .dex-btn-title { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
        .dex-btn-sub { font-size: 8px; opacity: 0.3; }

        .dex-overlay { position: fixed; inset: 0; z-index: 100; padding: 20px; display: flex; flex-direction: column; }
        .dex-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .dex-nav button { background: none; border: none; color: #fff; font-weight: bold; }
        .dex-title { font-weight: 900; letter-spacing: 1px; }

        .swap-form { background: rgba(0,0,0,0.5); padding: 20px; border-radius: 25px; border: 1px solid rgba(255,255,255,0.05); }
        .input-box { background: #000; padding: 15px; border-radius: 18px; border: 1px solid #222; }
        .ib-head { display: flex; justify-content: space-between; font-size: 10px; opacity: 0.5; margin-bottom: 10px; }
        .max-btn { color: #0CF2B0; font-weight: bold; }
        .ib-main { display: flex; justify-content: space-between; align-items: center; }
        .ib-main input { background: none; border: none; color: #fff; font-size: 24px; width: 60%; outline: none; }
        .asset-tag { display: flex; align-items: center; gap: 8px; font-weight: bold; font-size: 14px; }
        .asset-tag-btn { background: #111; border: 1px solid #333; color: #fff; padding: 8px 12px; border-radius: 10px; display: flex; align-items: center; gap: 8px; }
        .swap-mid { text-align: center; margin: 10px 0; opacity: 0.3; }
        .exe-btn { width: 100%; padding: 20px; border: none; border-radius: 18px; color: #fff; font-weight: 900; margin-top: 20px; }

        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .receipt { background: #111; padding: 30px; border-radius: 30px; text-align: center; width: 100%; border: 1px solid #222; }
        .r-pnl { font-size: 32px; font-weight: 900; margin: 15px 0; }
        .r-btn { background: #fff; color: #000; border: none; width: 100%; padding: 15px; border-radius: 12px; font-weight: bold; }
      `}</style>
    </div>
  );
}
