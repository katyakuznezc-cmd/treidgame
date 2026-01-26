import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update } from "firebase/database";

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
  CRV: { symbol: 'CRV', price: 0.35, icon: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.svg' },
  WPOL: { symbol: 'WPOL', price: 0.55, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg' }
};

const DEX_THEMES = {
  UNISWAP: { name: 'Uniswap V3', color: '#FF007A', bg: 'radial-gradient(circle at 50% 0%, #2d0016 0%, #000 100%)', icon: '🦄' },
  ODOS: { name: 'Odos Router', color: '#0CF2B0', bg: 'radial-gradient(circle at 50% 0%, #002d21 0%, #000 100%)', icon: '🌀' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: 'radial-gradient(circle at 50% 0%, #2d001a 0%, #000 100%)', icon: '🍣' },
  '1INCH': { name: '1inch Net', color: '#31569c', bg: 'radial-gradient(circle at 50% 0%, #000c2d 0%, #000 100%)', icon: '🛡️' }
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  const [lang, setLang] = useState('RU');
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

  const t = {
    RU: { bal: "ВАШ БАЛАНС", deal: "ТОРГОВАЯ СДЕЛКА", swap: "ОБМЕНЯТЬ", max: "MAX", manager: "Менеджер", buy: "КУПИТЬ", sell: "ПРОДАТЬ" },
    EN: { bal: "YOUR BALANCE", deal: "TRADE DEAL", swap: "SWAP NOW", max: "MAX", manager: "Manager", buy: "BUY", sell: "SELL" }
  }[lang];

  const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || 'Guest';

  useEffect(() => {
    onValue(ref(db, `players/${userId}`), (s) => {
      if (s.exists()) {
        setBalance(s.val().balanceUSDC || 1000);
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
    const dexs = Object.keys(DEX_THEMES);
    const buyAt = dexs[Math.floor(Math.random()*dexs.length)];
    let sellAt = dexs[Math.floor(Math.random()*dexs.length)];
    while(sellAt === buyAt) sellAt = dexs[Math.floor(Math.random()*dexs.length)];
    
    setDeal({
      coin: ASSETS[assets[Math.floor(Math.random()*assets.length)]],
      buyAt, sellAt,
      profit: (Math.random()*0.5 + 2.6).toFixed(2)
    });
    setTimeLeft(120);
  };

  const handleSwap = () => {
    const amount = Number(payAmount);
    if (!amount || (payToken.symbol === 'USDC' ? balance : wallet[payToken.symbol] || 0) < amount) return;
    setIsPending(true);
    setTimeout(() => {
      let receiveAmount = (amount * payToken.price) / getToken.price;
      let pnl = 0;
      const isCorrectSale = getToken.symbol === 'USDC' && payToken.symbol === deal.coin.symbol && activeDex === deal.sellAt;

      if (getToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        receiveAmount *= isCorrectSale ? (1 + deal.profit/100) : (1 - (Math.random()*0.015));
        pnl = receiveAmount - (amount * payToken.price);
        if (isCorrectSale) generateDeal();
      }

      const newBalance = payToken.symbol === 'USDC' ? balance - amount : (getToken.symbol === 'USDC' ? balance + receiveAmount : balance);
      const newWallet = { ...wallet };
      if (payToken.symbol !== 'USDC') newWallet[payToken.symbol] = (newWallet[payToken.symbol] || 0) - amount;
      if (getToken.symbol !== 'USDC') newWallet[getToken.symbol] = (newWallet[getToken.symbol] || 0) + receiveAmount;

      update(ref(db, `players/${userId}`), { balanceUSDC: newBalance, wallet: newWallet });
      setReceipt({ pnl, get: receiveAmount, from: payToken.symbol, to: getToken.symbol, amount, dex: activeDex });
      setIsPending(false); setPayAmount('');
    }, 2200);
  };

  return (
    <div className="app-container">
      <div className="bg-blur-1"></div>
      <div className="bg-blur-2"></div>

      <div className="content">
        <header className="main-header">
          <div className="bal-label">
            <div className="dot"></div> {t.bal}
          </div>
          <div className="header-actions">
            <button onClick={() => window.open('https://t.me/vladstelin78')} className="glass-btn">👨‍💻 {t.manager}</button>
            <button onClick={() => setLang(l => l === 'RU' ? 'EN' : 'RU')} className="glass-btn">🌐 {lang}</button>
          </div>
        </header>

        <section className="balance-section">
          <h1 className="balance-text">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
          <div className="balance-sub">USDC LIQUIDITY POOL</div>
        </section>

        {/* НОВЫЙ ДЕТАЛИЗИРОВАННЫЙ БЛОК СДЕЛКИ */}
        {deal && (
          <div className="deal-card-ultra">
            <div className="deal-top">
              <span className="deal-title">{t.deal}</span>
              <span className="deal-timer">EXPIRES: {timeLeft}s</span>
            </div>
            
            <div className="deal-route">
              <div className="route-node">
                <div className="node-icon">{DEX_THEMES[deal.buyAt].icon}</div>
                <div className="node-info">
                  <span className="node-label">{t.buy}</span>
                  <span className="node-name">{DEX_THEMES[deal.buyAt].name}</span>
                </div>
              </div>

              <div className="route-path">
                <div className="path-line"></div>
                <img src={deal.coin.icon} className="path-coin" />
                <div className="path-line"></div>
              </div>

              <div className="route-node">
                <div className="node-icon" style={{color: '#0CF2B0'}}>{DEX_THEMES[deal.sellAt].icon}</div>
                <div className="node-info">
                  <span className="node-label">{t.sell}</span>
                  <span className="node-name" style={{color: '#0CF2B0'}}>{DEX_THEMES[deal.sellAt].name}</span>
                </div>
              </div>
            </div>

            <div className="deal-footer">
              <span className="profit-tag">PROFIT: +{deal.profit}%</span>
              <span className="asset-tag">{deal.coin.symbol}</span>
            </div>
          </div>
        )}

        <div className="dex-grid">
          {Object.keys(DEX_THEMES).map(k => (
            <button key={k} onClick={() => setActiveDex(k)} className="dex-card">
              <div className="dex-card-inner" style={{borderTop: `2px solid ${DEX_THEMES[k].color}`}}>
                <span className="dex-icon-main">{DEX_THEMES[k].icon}</span>
                <span className="dex-name-main">{DEX_THEMES[k].name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ЭКРАН БИРЖИ С ПОЛНОЙ ДЕТАЛИЗАЦИЕЙ */}
      {activeDex && (
        <div className="dex-overlay" style={{ background: DEX_THEMES[activeDex].bg }}>
          <header className="dex-header">
            <button onClick={() => setActiveDex(null)} className="close-btn">✕</button>
            <div className="dex-title-box">
               <span className="dex-icon-min">{DEX_THEMES[activeDex].icon}</span>
               <b>{DEX_THEMES[activeDex].name}</b>
            </div>
            <div style={{width: 40}}></div>
          </header>

          <div className="swap-container">
            <div className="glass-panel">
              <div className="panel-top"><span>ОТДАЕТЕ</span><span onClick={() => setPayAmount((payToken.symbol === 'USDC' ? balance : wallet[payToken.symbol] || 0).toString())} className="max-chip">{t.max}</span></div>
              <div className="panel-main">
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.0" />
                <button onClick={() => setShowTokenList('pay')} className="token-picker">
                  <img src={payToken.icon} /> {payToken.symbol}
                </button>
              </div>
            </div>

            <div className="swap-arrow-container">
               <div className="swap-arrow-circle" style={{borderColor: DEX_THEMES[activeDex].color}}>↓</div>
            </div>

            <div className="glass-panel">
              <div className="panel-top">ПОЛУЧАЕТЕ</div>
              <div className="panel-main">
                <div className="res-val">{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(6) : '0.00'}</div>
                <button onClick={() => setShowTokenList('get')} className="token-picker">
                  <img src={getToken.icon} /> {getToken.symbol}
                </button>
              </div>
            </div>

            <div className="gas-info">
               <span>NETWORK FEE: <b>$0.08</b></span>
               <span>SLIPPAGE: <b>0.1%</b></span>
            </div>

            <button onClick={handleSwap} disabled={isPending} className="swap-btn-final" style={{ background: DEX_THEMES[activeDex].color }}>
              {isPending ? <div className="loader"></div> : t.swap}
            </button>
          </div>
        </div>
      )}

      {/* КВИТАНЦИЯ (CHECK) */}
      {receipt && (
        <div className="receipt-overlay">
          <div className="receipt-check">
            <div className="check-header">TRANSACTION RECEIPT</div>
            <div className="check-pnl" style={{color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b'}}>
              {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
            </div>
            <div className="check-body">
               <div className="check-row"><span>Exchange</span> <span>{receipt.dex}</span></div>
               <div className="check-row"><span>From</span> <span>{receipt.amount} {receipt.from}</span></div>
               <div className="check-row"><span>To</span> <span>{receipt.get.toFixed(4)} {receipt.to}</span></div>
               <div className="check-divider"></div>
               <div className="check-row"><span>Status</span> <span style={{color: '#0CF2B0'}}>Success</span></div>
            </div>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}} className="check-btn">CLOSE</button>
          </div>
        </div>
      )}

      {/* ВЫБОР ТОКЕНА */}
      {showTokenList && (
        <div className="token-list-modal">
          <header className="modal-head"><span>Select Asset</span><button onClick={() => setShowTokenList(null)}>✕</button></header>
          <div className="token-scroll">
            {Object.values(ASSETS).map(a => (
              <div key={a.symbol} onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }} className="token-row">
                <img src={a.icon} />
                <div className="t-info"><b>{a.symbol}</b><span>{a.symbol === 'USDC' ? 'Stablecoin' : 'Crypto Asset'}</span></div>
                <div className="t-price">${a.price}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .app-container { background: #000; height: 100vh; color: #fff; overflow: hidden; position: relative; font-family: 'Inter', sans-serif; }
        .bg-blur-1 { position: absolute; top: -10%; left: -10%; width: 50%; height: 50%; background: #0CF2B011; filter: blur(100px); border-radius: 50%; }
        .bg-blur-2 { position: absolute; bottom: -10%; right: -10%; width: 50%; height: 50%; background: #FF007A08; filter: blur(100px); border-radius: 50%; }
        .content { position: relative; z-index: 10; display: flex; flex-direction: column; height: 100%; padding: 0 20px; }
        
        .main-header { padding: 20px 0; display: flex; justify-content: space-between; align-items: center; }
        .bal-label { font-size: 10px; font-weight: 900; letter-spacing: 1.5px; display: flex; align-items: center; gap: 8px; color: #0CF2B0; }
        .dot { width: 6px; height: 6px; background: #0CF2B0; border-radius: 50%; box-shadow: 0 0 10px #0CF2B0; }
        .glass-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 10px 16px; border-radius: 14px; font-size: 12px; font-weight: 600; backdrop-filter: blur(10px); }
        
        .balance-section { text-align: center; margin: 20px 0 30px; }
        .balance-text { font-size: 54px; font-weight: 900; margin: 0; letter-spacing: -1px; }
        .balance-sub { font-size: 10px; opacity: 0.3; letter-spacing: 4px; margin-top: 5px; }

        /* DEAL CARD ULTRA */
        .deal-card-ultra { background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%); border: 1px solid rgba(255,255,255,0.08); padding: 20px; border-radius: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        .deal-top { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .deal-title { font-size: 10px; font-weight: 900; color: #0CF2B0; }
        .deal-timer { font-size: 10px; opacity: 0.4; font-family: monospace; }
        .deal-route { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .route-node { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .node-icon { font-size: 24px; background: rgba(255,255,255,0.05); width: 45px; height: 45px; border-radius: 15px; display: flex; align-items: center; justify-content: center; }
        .node-info { text-align: center; }
        .node-label { font-size: 8px; opacity: 0.5; display: block; }
        .node-name { font-size: 12px; font-weight: 800; }
        .route-path { flex: 1; display: flex; align-items: center; gap: 5px; padding: 0 10px; }
        .path-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); }
        .path-coin { width: 24px; height: 24px; filter: drop-shadow(0 0 10px rgba(255,255,255,0.2)); }
        .deal-footer { display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.05); pt: 15px; margin-top: 15px; padding-top: 15px; }
        .profit-tag { color: #0CF2B0; font-weight: 900; font-size: 14px; }
        .asset-tag { background: #fff; color: #000; padding: 2px 10px; border-radius: 8px; font-size: 10px; font-weight: 900; }

        .dex-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 25px; }
        .dex-card { background: rgba(255,255,255,0.03); border: none; padding: 0; border-radius: 24px; cursor: pointer; }
        .dex-card-inner { padding: 25px 20px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .dex-icon-main { font-size: 24px; }
        .dex-name-main { font-size: 13px; font-weight: 700; }

        /* DEX OVERLAY */
        .dex-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; flex-direction: column; animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .dex-header { padding: 20px; display: flex; align-items: center; justify-content: space-between; }
        .close-btn { background: rgba(255,255,255,0.1); border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; font-size: 18px; }
        .dex-title-box { display: flex; align-items: center; gap: 10px; font-size: 16px; }
        .swap-container { padding: 20px; flex: 1; overflow-y: auto; }
        .glass-panel { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); padding: 20px; border-radius: 28px; }
        .panel-top { display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; opacity: 0.5; margin-bottom: 15px; }
        .max-chip { color: #fff; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 6px; cursor: pointer; }
        .panel-main { display: flex; justify-content: space-between; align-items: center; }
        .panel-main input { background: none; border: none; color: #fff; font-size: 32px; font-weight: 700; width: 50%; outline: none; }
        .token-picker { background: #111; border: 1px solid #333; color: #fff; padding: 10px 14px; border-radius: 16px; display: flex; align-items: center; gap: 10px; font-weight: 700; }
        .token-picker img { width: 22px; height: 22px; }
        .swap-arrow-container { display: flex; justify-content: center; margin: -15px 0; position: relative; z-index: 5; }
        .swap-arrow-circle { background: #000; width: 42px; height: 42px; border-radius: 50%; border: 2px solid; display: flex; align-items: center; justify-content: center; font-weight: bold; }
        .gas-info { display: flex; justify-content: space-between; font-size: 10px; opacity: 0.4; padding: 15px 10px; }
        .swap-btn-final { width: 100%; padding: 22px; border-radius: 24px; border: none; color: #fff; font-weight: 900; font-size: 18px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }

        /* RECEIPT */
        .receipt-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 30px; }
        .receipt-check { background: #111; border: 1px solid #222; width: 100%; border-radius: 35px; padding: 30px; position: relative; }
        .check-header { font-size: 11px; font-weight: 900; opacity: 0.3; letter-spacing: 2px; margin-bottom: 20px; }
        .check-pnl { font-size: 42px; font-weight: 900; margin-bottom: 30px; }
        .check-body { background: #000; padding: 20px; border-radius: 20px; text-align: left; }
        .check-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 12px; opacity: 0.7; }
        .check-divider { height: 1px; background: rgba(255,255,255,0.05); margin: 15px 0; }
        .check-btn { background: #fff; color: #000; border: none; width: 100%; padding: 18px; border-radius: 20px; font-weight: 900; margin-top: 30px; }

        /* TOKEN MODAL */
        .token-list-modal { position: fixed; inset: 0; background: #000; z-index: 3000; display: flex; flex-direction: column; padding: 20px; }
        .modal-head { display: flex; justify-content: space-between; align-items: center; padding-bottom: 20px; border-bottom: 1px solid #111; }
        .token-row { display: flex; align-items: center; gap: 15px; padding: 20px; border-bottom: 1px solid #111; }
        .token-row img { width: 32px; height: 32px; }
        .t-info { flex: 1; display: flex; flex-direction: column; }
        .t-info span { font-size: 10px; opacity: 0.4; }
        .loader { width: 24px; height: 24px; border: 3px solid #fff; border-bottom-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin: auto; }
        
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}
