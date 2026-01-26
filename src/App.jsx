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
  UNISWAP: { name: 'Uniswap V3', color: '#FF007A', bg: 'linear-gradient(180deg, #15000a 0%, #000 100%)' },
  ODOS: { name: 'Odos Router', color: '#0CF2B0', bg: 'linear-gradient(180deg, #00150f 0%, #000 100%)' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: 'linear-gradient(180deg, #15000d 0%, #000 100%)' },
  '1INCH': { name: '1inch Network', color: '#31569c', bg: 'linear-gradient(180deg, #000515 0%, #000 100%)' }
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
    const max = payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0);
    if (!amt || amt > max) return;
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
    <div className="app-container">
      <div className="safe-area">
        <header className="minimal-header">
          <div className="brand">DEX<span>ARBITRAGE</span></div>
          <button onClick={() => setShowSettings(true)} className="icon-btn">⚙️</button>
        </header>

        <div className="main-balance-wrap">
          <div className="bal-label">TOTAL EQUITY</div>
          <div className="bal-value">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
        </div>

        {/* АККУРАТНАЯ ТОРГОВАЯ СДЕЛКА */}
        {deal && (
          <div className="compact-deal">
            <div className="deal-top-info">
              <span className="signal-status"><span className="dot"></span> LIVE SIGNAL</span>
              <span className="profit-badge">+{deal.profit}%</span>
            </div>
            
            <div className="deal-route-grid">
              <div className="route-part">
                <small>BUY</small>
                <div className="dex-name-txt">{DEX_THEMES[deal.buyAt].name}</div>
              </div>
              <div className="route-asset">
                <img src={deal.coin.icon} />
                <b>{deal.coin.symbol}</b>
              </div>
              <div className="route-part align-right">
                <small>SELL</small>
                <div className="dex-name-txt highlight">{DEX_THEMES[deal.sellAt].name}</div>
              </div>
            </div>

            <div className="deal-progress-mini">
              <div className="progress-bar" style={{width: `${(timeLeft/120)*100}%`}}></div>
            </div>
          </div>
        )}

        <div className="dex-list-grid">
          {Object.keys(DEX_THEMES).map(k => (
            <button key={k} onClick={() => setActiveDex(k)} className="dex-item-card">
              <div className="dex-accent" style={{background: DEX_THEMES[k].color}}></div>
              <div className="dex-info-wrap">
                <span className="dex-main-name">{DEX_THEMES[k].name}</span>
                <span className="dex-sub-status">Liquidity: High</span>
              </div>
              <div className="dex-arrow">→</div>
            </button>
          ))}
        </div>
      </div>

      {/* ЭКРАН ОБМЕНА */}
      {activeDex && (
        <div className="fullscreen-dex" style={{ background: DEX_THEMES[activeDex].bg }}>
          <div className="dex-header-mini">
            <button onClick={() => setActiveDex(null)}>← Close</button>
            <span className="dex-current-title">{DEX_THEMES[activeDex].name}</span>
            <div style={{width: 40}}></div>
          </div>

          <div className="swap-card-clean">
            <div className="input-group-clean">
              <div className="ig-top"><span>From</span> <span onClick={() => setPayAmount(payToken.symbol === 'USDC' ? balance : (wallet[payToken.symbol] || 0))} className="max-link">MAX</span></div>
              <div className="ig-bottom">
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.0" />
                <button onClick={() => setShowTokenList('pay')} className="token-btn-clean"><img src={payToken.icon} /> {payToken.symbol}</button>
              </div>
            </div>

            <div className="swap-spacer">
              <div className="divider-line"></div>
              <div className="arrow-down">↓</div>
              <div className="divider-line"></div>
            </div>

            <div className="input-group-clean">
              <div className="ig-top">To</div>
              <div className="ig-bottom">
                <div className="read-only-val">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(5) : '0.00'}</div>
                <button onClick={() => setShowTokenList('get')} className="token-btn-clean active"><img src={getToken.icon} /> {getToken.symbol}</button>
              </div>
            </div>

            <button onClick={handleSwap} disabled={isPending} className="confirm-btn" style={{ background: DEX_THEMES[activeDex].color }}>
              {isPending ? "Confirming..." : "Swap Assets"}
            </button>
          </div>
        </div>
      )}

      {/* СПИСОК ТОКЕНОВ */}
      {showTokenList && (
        <div className="modal-sheet">
          <div className="sheet-content">
            <div className="sheet-header">Select Asset <button onClick={() => setShowTokenList(null)}>✕</button></div>
            <div className="sheet-list">
              {Object.values(ASSETS).map(a => (
                <div key={a.symbol} onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }} className="asset-row-clean">
                  <img src={a.icon} />
                  <div className="asset-name-wrap"><b>{a.symbol}</b><small>Asset Protocol</small></div>
                  <div className="asset-price-val">${a.price}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* НАСТРОЙКИ */}
      {showSettings && (
        <div className="modal-sheet">
          <div className="sheet-content">
            <div className="sheet-header">Settings <button onClick={() => setShowSettings(false)}>✕</button></div>
            <div className="settings-options">
              <div className="opt-item"><span>Dev Team</span> <a href="https://t.me/kriptoalians">@kriptoalians</a></div>
              <div className="opt-item"><span>Manager</span> <a href="https://t.me/vladstelin78">@vladstelin78</a></div>
            </div>
          </div>
        </div>
      )}

      {/* КВИТАНЦИЯ */}
      {receipt && (
        <div className="overlay-receipt">
          <div className="receipt-box-clean">
            <div className="check-icon">✓</div>
            <h3>TRANSACTION SUCCESS</h3>
            <div className="pnl-val" style={{color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b'}}>
              {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
            </div>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}} className="close-receipt-btn">Done</button>
          </div>
        </div>
      )}

      <style>{`
        .app-container { background: #000; height: 100vh; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica; overflow: hidden; }
        .safe-area { padding: 20px; height: 100%; overflow-y: auto; }
        .minimal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .brand { font-weight: 900; letter-spacing: 1px; font-size: 14px; }
        .brand span { color: #0CF2B0; }
        .icon-btn { background: none; border: none; font-size: 18px; color: #fff; opacity: 0.6; }

        .main-balance-wrap { text-align: center; margin-bottom: 40px; }
        .bal-label { font-size: 10px; opacity: 0.4; letter-spacing: 2px; margin-bottom: 8px; }
        .bal-value { font-size: 48px; font-weight: 800; letter-spacing: -1px; }

        /* КОМПАКТНАЯ СДЕЛКА */
        .compact-deal { background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 20px; padding: 16px; margin-bottom: 30px; }
        .deal-top-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .signal-status { font-size: 9px; font-weight: 800; opacity: 0.6; display: flex; align-items: center; gap: 6px; }
        .dot { width: 4px; height: 4px; background: #0CF2B0; border-radius: 50%; box-shadow: 0 0 8px #0CF2B0; }
        .profit-badge { color: #0CF2B0; font-weight: 900; font-size: 14px; }
        .deal-route-grid { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .route-part small { font-size: 7px; opacity: 0.3; display: block; margin-bottom: 2px; }
        .dex-name-txt { font-size: 12px; font-weight: 700; }
        .dex-name-txt.highlight { color: #0CF2B0; }
        .route-asset { display: flex; align-items: center; gap: 6px; background: #fff; color: #000; padding: 4px 10px; border-radius: 10px; }
        .route-asset img { width: 14px; }
        .route-asset b { font-size: 10px; }
        .deal-progress-mini { height: 2px; background: #111; border-radius: 1px; overflow: hidden; }
        .progress-bar { height: 100%; background: #0CF2B0; transition: width 1s linear; }

        /* СПИСОК БИРЖ */
        .dex-list-grid { display: flex; flex-direction: column; gap: 10px; }
        .dex-item-card { background: #0a0a0a; border: none; border-radius: 16px; padding: 18px; display: flex; align-items: center; gap: 15px; cursor: pointer; }
        .dex-accent { width: 3px; height: 25px; border-radius: 2px; }
        .dex-info-wrap { flex: 1; text-align: left; }
        .dex-main-name { display: block; font-size: 14px; font-weight: 700; margin-bottom: 2px; }
        .dex-sub-status { font-size: 9px; opacity: 0.3; }
        .dex-arrow { opacity: 0.2; font-size: 14px; }

        /* ЭКРАН ОБМЕНА */
        .fullscreen-dex { position: fixed; inset: 0; z-index: 100; padding: 20px; display: flex; flex-direction: column; animation: fadeIn 0.3s ease; }
        .dex-header-mini { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .dex-header-mini button { background: none; border: none; color: #fff; font-size: 14px; font-weight: 600; }
        .dex-current-title { font-weight: 800; font-size: 15px; }
        .swap-card-clean { background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 16px; backdrop-filter: blur(20px); }
        .input-group-clean { background: #000; border: 1px solid #1a1a1a; padding: 16px; border-radius: 18px; }
        .ig-top { display: flex; justify-content: space-between; font-size: 10px; opacity: 0.4; margin-bottom: 10px; }
        .max-link { color: #0CF2B0; font-weight: 800; }
        .ig-bottom { display: flex; justify-content: space-between; align-items: center; }
        .ig-bottom input { background: none; border: none; color: #fff; font-size: 24px; font-weight: 600; width: 50%; outline: none; }
        .token-btn-clean { background: #111; border: 1px solid #222; color: #fff; padding: 6px 12px; border-radius: 10px; display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; }
        .token-btn-clean.active { border-color: #0CF2B022; }
        .token-btn-clean img { width: 16px; }
        .swap-spacer { display: flex; align-items: center; gap: 15px; padding: 10px 0; }
        .divider-line { flex: 1; height: 1px; background: #1a1a1a; }
        .arrow-down { opacity: 0.3; font-size: 12px; }
        .confirm-btn { width: 100%; padding: 18px; border-radius: 18px; border: none; color: #fff; font-weight: 800; font-size: 15px; margin-top: 20px; }

        /* МОДАЛКИ */
        .modal-sheet { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 500; display: flex; align-items: flex-end; }
        .sheet-content { background: #0d0d0d; width: 100%; border-top-left-radius: 30px; border-top-right-radius: 30px; padding: 25px; max-height: 80vh; overflow-y: auto; }
        .sheet-header { display: flex; justify-content: space-between; font-weight: 800; margin-bottom: 25px; }
        .asset-row-clean { display: flex; align-items: center; gap: 15px; padding: 15px 0; border-bottom: 1px solid #151515; }
        .asset-row-clean img { width: 28px; }
        .asset-name-wrap b { display: block; font-size: 14px; }
        .asset-name-wrap small { font-size: 9px; opacity: 0.3; }
        .asset-price-val { flex: 1; text-align: right; font-weight: 700; font-size: 14px; }
        .settings-options .opt-item { display: flex; justify-content: space-between; padding: 18px 0; border-bottom: 1px solid #151515; font-size: 14px; }
        .settings-options a { color: #0CF2B0; text-decoration: none; }

        .overlay-receipt { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 30px; }
        .receipt-box-clean { background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 30px; padding: 30px; width: 100%; text-align: center; }
        .check-icon { width: 50px; height: 50px; background: #0CF2B015; color: #0CF2B0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 24px; }
        .pnl-val { font-size: 38px; font-weight: 900; margin: 20px 0; }
        .close-receipt-btn { background: #fff; color: #000; border: none; width: 100%; padding: 15px; border-radius: 14px; font-weight: 800; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
