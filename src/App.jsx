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
  UNISWAP: { name: 'Uniswap V3', color: '#FF007A', bg: '#0d0208' },
  ODOS: { name: 'Odos Router', color: '#0CF2B0', bg: '#020d0a' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: '#0d0206' },
  '1INCH': { name: '1inch Network', color: '#31569c', bg: '#02050d' }
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
    RU: { bal: "БАЛАНС", deal: "ТОРГОВАЯ СДЕЛКА", buy: "КУПИТЬ НА", sell: "ПРОДАТЬ НА", swap: "Обменять", max: "МАКС", manager: "Менеджер" },
    EN: { bal: "BALANCE", deal: "TRADE DEAL", buy: "BUY ON", sell: "SELL ON", swap: "Swap Now", max: "MAX", manager: "Manager" }
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
      setTimeLeft((prev) => {
        if (prev <= 1) { generateDeal(); return 120; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [deal]);

  const generateDeal = () => {
    const assetKeys = ['BTC', 'ETH', 'LINK', 'AAVE', 'CRV', 'WPOL'];
    const dexKeys = Object.keys(DEX_THEMES);
    const buyAt = dexKeys[Math.floor(Math.random() * dexKeys.length)];
    let sellAt = dexKeys[Math.floor(Math.random() * dexKeys.length)];
    while (sellAt === buyAt) sellAt = dexKeys[Math.floor(Math.random() * dexKeys.length)];

    setDeal({
      coin: ASSETS[assetKeys[Math.floor(Math.random() * assetKeys.length)]],
      buyAt,
      sellAt,
      profit: (Math.random() * 0.5 + 2.5).toFixed(2) // Профит ~3%
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

      // Логика профита: Продажа нужного токена на нужной бирже
      const isCorrectSale = getToken.symbol === 'USDC' && payToken.symbol === deal.coin.symbol && activeDex === deal.sellAt;

      if (getToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        if (isCorrectSale) {
            receiveAmount *= (1 + deal.profit / 100);
            pnl = receiveAmount - (amount * payToken.price);
            generateDeal(); // Сделка выполнена успешно
        } else {
            receiveAmount *= (1 - (Math.random() * 0.015)); // Рандомный минус
            pnl = receiveAmount - (amount * payToken.price);
        }
      }

      const newBalance = payToken.symbol === 'USDC' ? balance - amount : (getToken.symbol === 'USDC' ? balance + receiveAmount : balance);
      const newWallet = { ...wallet };
      if (payToken.symbol !== 'USDC') newWallet[payToken.symbol] = (newWallet[payToken.symbol] || 0) - amount;
      if (getToken.symbol !== 'USDC') newWallet[getToken.symbol] = (newWallet[getToken.symbol] || 0) + receiveAmount;

      update(ref(db, `players/${userId}`), { balanceUSDC: newBalance, wallet: newWallet });
      setReceipt({ pnl, get: receiveAmount, from: payToken.symbol, to: getToken.symbol, amount });
      setIsPending(false); setPayAmount('');
    }, 2000);
  };

  return (
    <div style={{ backgroundColor: '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* BACKGROUND FX */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at 50% 10%, #111 0%, #000 80%)', zIndex: 0 }}></div>

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <header style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#0CF2B0', fontWeight: 'bold', fontSize: '11px' }}>{t.bal}</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => window.open('https://t.me/vladstelin78')} className="h-btn">👨‍💻 {t.manager}</button>
            <button onClick={() => setLang(l => l === 'RU' ? 'EN' : 'RU')} className="h-btn">🌐 {lang}</button>
          </div>
        </header>

        <main style={{ flex: 1, padding: '0 20px' }}>
          <div style={{ textAlign: 'center', margin: '20px 0 40px' }}>
            <h1 style={{ fontSize: '50px', fontWeight: '900', margin: 0 }}>${balance.toFixed(2)}</h1>
          </div>

          {/* ТОРГОВАЯ СДЕЛКА: КУПИ ТАМ -> ПРОДАЙ ТУТ */}
          {deal && (
            <div className="deal-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span style={{ color: '#0CF2B0', fontSize: '10px', fontWeight: 'bold' }}>{t.deal}</span>
                <span style={{ opacity: 0.5, fontSize: '10px' }}>⏳ {timeLeft}s</span>
              </div>
              
              <div className="step-box">
                <div className="step-tag" style={{borderColor: DEX_THEMES[deal.buyAt].color}}>{t.buy}</div>
                <div className="step-info">
                   <b>{deal.coin.symbol}</b> <span style={{opacity: 0.5}}>на</span> <b>{DEX_THEMES[deal.buyAt].name}</b>
                </div>
              </div>

              <div style={{ paddingLeft: '15px', color: '#0CF2B0', margin: '5px 0' }}>↓</div>

              <div className="step-box" style={{ background: 'rgba(12, 242, 176, 0.05)' }}>
                <div className="step-tag" style={{borderColor: '#0CF2B0', color: '#0CF2B0'}}>{t.sell}</div>
                <div className="step-info">
                   <b>{deal.coin.symbol}</b> <span style={{opacity: 0.5}}>на</span> <b style={{color: '#0CF2B0'}}>{DEX_THEMES[deal.sellAt].name}</b>
                </div>
                <div style={{ color: '#0CF2B0', fontWeight: 'bold' }}>+{deal.profit}%</div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '25px' }}>
            {Object.keys(DEX_THEMES).map(k => (
              <button key={k} onClick={() => setActiveDex(k)} className="dex-select-btn">
                <div style={{ fontSize: '10px', opacity: 0.5, marginBottom: '5px' }}>MARKET</div>
                <div style={{ color: DEX_THEMES[k].color, fontWeight: 'bold' }}>{DEX_THEMES[k].name}</div>
              </button>
            ))}
          </div>
        </main>
      </div>

      {/* ЭКРАН БИРЖИ */}
      {activeDex && (
        <div className="dex-screen" style={{ backgroundColor: DEX_THEMES[activeDex].bg }}>
          <header className="dex-top">
            <button onClick={() => setActiveDex(null)} style={{ fontSize: '24px' }}>✕</button>
            <div style={{ color: DEX_THEMES[activeDex].color, fontWeight: '900' }}>{DEX_THEMES[activeDex].name.toUpperCase()}</div>
            <div style={{ width: 30 }}></div>
          </header>

          <div style={{ padding: '20px' }}>
            <div className="sw-input">
              <div className="sw-label"><span>Отдаете</span><span onClick={() => setPayAmount((payToken.symbol === 'USDC' ? balance : wallet[payToken.symbol] || 0).toString())} style={{color: DEX_THEMES[activeDex].color}}>{t.max}</span></div>
              <div className="sw-row">
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.0" />
                <button onClick={() => setShowTokenList('pay')} className="t-btn"><img src={payToken.icon} width="18"/> {payToken.symbol}</button>
              </div>
            </div>

            <div style={{ textAlign: 'center', margin: '-10px 0', zIndex: 10, position: 'relative' }}>
              <div style={{ background: '#000', border: `1px solid ${DEX_THEMES[activeDex].color}`, width: '36px', height: '36px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>↓</div>
            </div>

            <div className="sw-input">
              <div className="sw-label">Получаете</div>
              <div className="sw-row">
                <div style={{ fontSize: '26px', fontWeight: 'bold' }}>{payAmount ? ((payAmount * payToken.price)/getToken.price).toFixed(5) : '0.0'}</div>
                <button onClick={() => setShowTokenList('get')} className="t-btn"><img src={getToken.icon} width="18"/> {getToken.symbol}</button>
              </div>
            </div>

            <button onClick={handleSwap} disabled={isPending} className="sw-exe-btn" style={{ background: DEX_THEMES[activeDex].color }}>
              {isPending ? <div className="spinner"></div> : t.swap.toUpperCase()}
            </button>
          </div>
        </div>
      )}

      {/* КВИТАНЦИЯ */}
      {receipt && (
        <div className="receipt-overlay">
          <div className="receipt-card">
            <h2 style={{margin: 0}}>{receipt.pnl >= 0 ? 'Success' : 'Completed'}</h2>
            <div style={{ color: receipt.pnl >= 0 ? '#0CF2B0' : '#ff4b4b', fontSize: '32px', fontWeight: '900', margin: '20px 0' }}>
              {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
            </div>
            <div className="receipt-list">
              <div className="r-item"><span>Exchange:</span> <span>{DEX_THEMES[activeDex].name}</span></div>
              <div className="r-item"><span>Swapped:</span> <span>{receipt.amount} {receipt.from}</span></div>
              <div className="r-item"><span>Received:</span> <span>{receipt.get.toFixed(2)} {receipt.to}</span></div>
            </div>
            <button onClick={() => {setReceipt(null); setActiveDex(null);}} className="r-close">OK</button>
          </div>
        </div>
      )}

      {/* ВЫБОР ТОКЕНА */}
      {showTokenList && (
        <div className="token-modal">
          <div className="modal-head"><h3>Select Asset</h3><button onClick={() => setShowTokenList(null)}>✕</button></div>
          {Object.values(ASSETS).map(a => (
            <div key={a.symbol} onClick={() => { if(showTokenList==='pay') setPayToken(a); else setGetToken(a); setShowTokenList(null); }} className="a-row">
              <img src={a.icon} width="28"/>
              <div style={{flex: 1}}><b>{a.symbol}</b></div>
              <div style={{opacity: 0.5}}>${a.price}</div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .h-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 10px 14px; border-radius: 12px; font-size: 11px; font-weight: bold; }
        .deal-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 24px; }
        .step-box { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); }
        .step-tag { font-size: 9px; font-weight: 900; border: 1px solid; padding: 4px 8px; border-radius: 6px; white-space: nowrap; }
        .step-info { flex: 1; font-size: 14px; }
        
        .dex-select-btn { background: #111; border: 1px solid #222; padding: 22px; border-radius: 20px; color: #fff; text-align: left; transition: 0.2s; }
        .dex-select-btn:active { transform: scale(0.97); }
        
        .dex-screen { position: fixed; inset: 0; z-index: 1000; display: flex; flex-direction: column; animation: slideUp 0.3s ease; }
        .dex-top { padding: 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .dex-top button { background: none; border: none; color: #fff; }
        
        .sw-input { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 20px; border-radius: 24px; }
        .sw-label { display: flex; justify-content: space-between; font-size: 11px; opacity: 0.5; margin-bottom: 10px; }
        .sw-row { display: flex; justify-content: space-between; align-items: center; }
        .sw-row input { background: none; border: none; color: #fff; font-size: 26px; width: 50%; outline: none; font-weight: bold; }
        .t-btn { background: #222; border: 1px solid #333; color: #fff; padding: 8px 12px; border-radius: 12px; display: flex; align-items: center; gap: 8px; }
        .sw-exe-btn { width: 100%; padding: 22px; border-radius: 24px; border: none; color: #fff; font-weight: 900; font-size: 18px; margin-top: 25px; }
        
        .receipt-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .receipt-card { background: #111; border: 1px solid #222; padding: 40px; border-radius: 35px; width: 100%; text-align: center; }
        .receipt-list { background: #000; padding: 15px; border-radius: 20px; text-align: left; font-size: 13px; margin-bottom: 25px; }
        .r-item { display: flex; justify-content: space-between; margin-bottom: 8px; opacity: 0.7; }
        .r-close { background: #fff; color: #000; width: 100%; padding: 16px; border-radius: 16px; border: none; font-weight: bold; }
        
        .token-modal { position: fixed; inset: 0; background: #000; z-index: 3000; padding: 20px; overflow-y: auto; }
        .modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .modal-head button { background: none; border: none; color: #fff; font-size: 24px; }
        .a-row { display: flex; align-items: center; gap: 15px; padding: 18px; border-bottom: 1px solid #111; }
        
        .spinner { width: 20px; height: 20px; border: 3px solid #fff; border-bottom-color: transparent; border-radius: 50%; animation: rot 0.8s linear infinite; margin: auto; }
        @keyframes rot { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}
