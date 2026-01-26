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
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

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
    const amount = Number(payAmount);
    const maxVal = payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0);
    if (!amount || amount > maxVal) return;
    setIsPending(true);
    setTimeout(() => {
      let receiveAmount = (amount * payToken.price) / getToken.price;
      let pnl = 0;
      if (getToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        const ok = activeDex === deal.sellAt && payToken.symbol === deal.coin.symbol;
        receiveAmount *= ok ? (1 + Number(deal.profit)/100) : (1 - 0.015);
        pnl = receiveAmount - (amount * payToken.price);
        if (ok) generateDeal();
      }
      const newBal = payToken.symbol === 'USDC' ? balance - amount : (getToken.symbol === 'USDC' ? balance + receiveAmount : balance);
      const newWall = { ...wallet };
      if (payToken.symbol !== 'USDC') newWall[payToken.symbol] = (newWall[payToken.symbol] || 0) - amount;
      if (getToken.symbol !== 'USDC') newWall[getToken.symbol] = (newWall[getToken.symbol] || 0) + receiveAmount;
      update(ref(db, `players/${userId}`), { balanceUSDC: newBal, wallet: newWall });
      setReceipt({ pnl, get: receiveAmount, to: getToken.symbol, dex: activeDex });
      setIsPending(false); setPayAmount('');
    }, 1500);
  };

  return (
    <div className="app-container">
      <div className="main-scroll">
        <header className="main-header">
          <div className="liq-tag">BALANCE: ${balance.toFixed(2)}</div>
          <button onClick={() => setShowSettings(true)} className="settings-btn">⚙️</button>
        </header>

        <section className="hero-balance">
          <div className="amount">${balance.toLocaleString()}</div>
          <div className="sub-amount">LIVE LIQUIDITY POOL</div>
        </section>

        {/* СДЕЛКА С НАЗВАНИЯМИ БИРЖ */}
        {deal && (
          <div className="trading-deal-card">
            <div className="td-top">
              <span className="td-signal">SIGNAL ACTIVE</span>
              <span className="td-profit">+{deal.profit}%</span>
            </div>
            <div className="td-route">
              <div className="td-node">
                <small>КУПИТЬ НА</small>
                <div className="td-dex-name">{DEX_THEMES[deal.buyAt].name}</div>
              </div>
              <div className="td-asset">
                <img src={deal.coin.icon} />
                <b>{deal.coin.symbol}</b>
              </div>
              <div className="td-node">
                <small>ПРОДАТЬ НА</small>
                <div className="td-dex-name" style={{color: '#0CF2B0'}}>{DEX_THEMES[deal.sellAt].name}</div>
              </div>
            </div>
            <div className="td-progress"><div className="td-bar" style={{width: `${(timeLeft/120)*100}%`}}></div></div>
          </div>
        )}

        <div className="dex-grid">
          {Object.keys(DEX_THEMES).map(k => (
            <button key={k} onClick={() => setActiveDex(k)} className="dex-card-btn" style={{borderTop: `2px solid ${DEX_THEMES[k].color}`}}>
              <div className="dex-card-name">{DEX_THEMES[k].name}</div>
              <div className="dex-card-status">CONNECTED</div>
            </button>
          ))}
        </div>
      </div>

      {/* ЭКРАН БИРЖИ С ВЫБОРОМ МОНЕТ */}
      {activeDex && (
        <div className="dex-page" style={{ background: DEX_THEMES[activeDex].bg }}>
          <header className="dex-page-header">
            <button onClick={() => setActiveDex(null)}>← BACK</button>
            <b>{DEX_THEMES[activeDex].name}</b>
            <div style={{width: 50}}></div>
          </header>

          <div className="swap-module">
            <div className="swap-input">
              <div className="si-label"><span>SEND</span> <span onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))} className="max-txt">MAX</span></div>
              <div className="si-row">
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.0" />
                <button onClick={() => setShowTokenList('pay')} className="token-sel"><img src={payToken.icon} /> {payToken.symbol}</button>
              </div>
            </div>

            <div className="swap-arrow">↓</div>

            <div className="swap-input">
              <div className="si-label">RECEIVE</div>
              <div className="si-row">
                <div className="res-out">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(5) : '0.00'}</div>
                <button onClick={() => setShowTokenList('get')} className="token-sel-active"><img src={getToken.icon} /> {getToken.symbol}</button>
              </div>
            </div>

            <button onClick={handleSwap} disabled={isPending} className="swap-action-btn" style={{ background: DEX_THEMES[activeDex].color }}>
              {isPending ? "ROUTING..." : "SWAP"}
            </button>
          </div>
        </div>
      )}

      {/* МОДАЛКА ВЫБОРА МОНЕТ */}
      {showTokenList && (
        <div className="modal-full">
          <div className="token-list-content">
            <div className="tl-header">Select Asset <button onClick={() => setShowTokenList(null)}>✕</button></div>
            {Object.values(ASSETS).map(a => (
              <div key={a.symbol} onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }} className="tl-row">
                <img src={a.icon} />
                <div style={{flex:1}}><b>{a.symbol}</b></div>
                <div style={{opacity:0.5}}>${a.price}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* НАСТРОЙКИ */}
      {showSettings && (
        <div className="modal-full">
          <div className="settings-content">
            <h2>SETTINGS</h2>
            <div className="set-row"><span>Click Sound</span> <button onClick={() => setSoundEnabled(!soundEnabled)}>{soundEnabled ? 'ON' : 'OFF'}</button></div>
            <div className="set-row"><span>Creator</span> <a href="https://t.me/kriptoalians" target="_blank">@kriptoalians</a></div>
            <button onClick={() => setShowSettings(false)} className="close-set">CLOSE</button>
          </div>
        </div>
      )}

      {/* ЧЕК */}
      {receipt && (
        <div className="receipt-pop">
          <div className="receipt-card">
            <h3>SUCCESS</h3>
            <div className="r-pnl" style={{color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b'}}>
              {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
            </div>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}} className="r-close">DONE</button>
          </div>
        </div>
      )}

      <style>{`
        .app-container { background: #000; height: 100vh; color: #fff; font-family: 'Inter', sans-serif; overflow: hidden; }
        .main-scroll { padding: 20px; height: 100%; overflow-y: auto; }
        .main-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .liq-tag { font-size: 10px; font-weight: 900; color: #0CF2B0; background: rgba(12,242,176,0.1); padding: 5px 12px; border-radius: 20px; }
        .settings-btn { background: none; border: none; font-size: 20px; color: #fff; }

        .hero-balance { text-align: center; margin: 20px 0 40px; }
        .amount { font-size: 54px; font-weight: 900; letter-spacing: -2px; }
        .sub-amount { font-size: 9px; opacity: 0.3; letter-spacing: 3px; }

        .trading-deal-card { background: #0d0d0d; border: 1px solid #1a1a1a; padding: 20px; border-radius: 28px; margin-bottom: 30px; }
        .td-top { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .td-signal { font-size: 10px; font-weight: 900; color: #0CF2B0; }
        .td-profit { font-size: 18px; font-weight: 900; color: #0CF2B0; }
        .td-route { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .td-node small { font-size: 8px; opacity: 0.4; display: block; margin-bottom: 4px; }
        .td-dex-name { font-size: 14px; font-weight: 900; }
        .td-asset { text-align: center; background: #fff; color: #000; padding: 8px 12px; border-radius: 12px; }
        .td-asset img { width: 16px; margin-bottom: 2px; }
        .td-asset b { display: block; font-size: 10px; }
        .td-progress { height: 2px; background: #222; border-radius: 2px; overflow: hidden; }
        .td-bar { height: 100%; background: #0CF2B0; transition: width 1s linear; }

        .dex-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .dex-card-btn { background: #0d0d0d; border: none; padding: 25px 15px; border-radius: 20px; text-align: center; color: #fff; }
        .dex-card-name { font-size: 13px; font-weight: 900; margin-bottom: 5px; }
        .dex-card-status { font-size: 8px; opacity: 0.3; letter-spacing: 1px; }

        .dex-page { position: fixed; inset: 0; z-index: 100; padding: 20px; display: flex; flex-direction: column; }
        .dex-page-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .dex-page-header button { background: none; border: none; color: #fff; font-weight: bold; }
        .swap-module { background: rgba(0,0,0,0.6); padding: 20px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.05); }
        .swap-input { background: #000; padding: 15px; border-radius: 20px; border: 1px solid #1a1a1a; }
        .si-label { display: flex; justify-content: space-between; font-size: 10px; opacity: 0.5; margin-bottom: 10px; }
        .max-txt { color: #0CF2B0; font-weight: 900; }
        .si-row { display: flex; justify-content: space-between; align-items: center; }
        .si-row input { background: none; border: none; color: #fff; font-size: 28px; font-weight: 700; width: 50%; outline: none; }
        .token-sel, .token-sel-active { background: #111; border: 1px solid #222; color: #fff; padding: 8px 12px; border-radius: 12px; display: flex; align-items: center; gap: 8px; font-size: 12px; }
        .token-sel img, .token-sel-active img { width: 18px; }
        .swap-arrow { text-align: center; margin: 10px 0; opacity: 0.3; }
        .swap-action-btn { width: 100%; padding: 20px; border: none; border-radius: 20px; color: #fff; font-weight: 900; margin-top: 20px; }

        .modal-full { position: fixed; inset: 0; background: #000; z-index: 200; padding: 20px; }
        .tl-header { display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: 900; }
        .tl-row { display: flex; align-items: center; gap: 15px; padding: 15px; border-bottom: 1px solid #111; }
        .tl-row img { width: 30px; }

        .settings-content { text-align: center; padding-top: 50px; }
        .set-row { display: flex; justify-content: space-between; padding: 20px; border-bottom: 1px solid #111; }
        .close-set { background: #fff; color: #000; border: none; width: 100%; padding: 15px; border-radius: 12px; margin-top: 40px; font-weight: 900; }

        .receipt-pop { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 40px; }
        .receipt-card { background: #111; border: 1px solid #222; padding: 30px; border-radius: 35px; width: 100%; text-align: center; }
        .r-pnl { font-size: 38px; font-weight: 900; margin: 20px 0; }
        .r-close { background: #fff; color: #000; border: none; width: 100%; padding: 15px; border-radius: 15px; font-weight: 900; }
      `}</style>
    </div>
  );
}
