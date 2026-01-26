import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, push, update } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCKmEa1B4xOdMdNGXBDK2LeOhBQoMqWv40",
  authDomain: "treidgame-b2ae0.firebaseapp.com",
  projectId: "treidgame-b2ae0",
  storageBucket: "treidgame-b2ae0.firebasestorage.app",
  messagingSenderId: "985305772375",
  appId: "1:985305772375:web:08d9b482a6f9d3cd748e12"
};

const ASSETS = {
  USDC: { symbol: 'USDC', price: 1, icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=024' },
  BTC: { symbol: 'BTC', price: 65000, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=024' },
  ETH: { symbol: 'ETH', price: 2600, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=024' },
  LINK: { symbol: 'LINK', price: 18.2, icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg?v=024' },
  AAVE: { symbol: 'AAVE', price: 145.5, icon: 'https://cryptologos.cc/logos/aave-aave-logo.svg?v=024' },
  CRV: { symbol: 'CRV', price: 0.35, icon: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.svg?v=024' },
  WPOL: { symbol: 'WPOL', price: 0.55, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg?v=024' }
};

const TEXTS = {
  RU: { balance: "ВАШ БАЛАНС", wallet: "USDC ВАЛЮТА", deal: "ГОРЯЧИЙ СИГНАЛ", history: "ПУЛЬС РЫНКА", settings: "Настройки", lang: "Язык", creators: "Создатели", give: "Отдаете", get: "Получаете", swap: "Сделать обмен", pending: "В процессе...", success: "УСПЕШНО", failed: "ОШИБКА", close: "ЗАКРЫТЬ", max: "МАКС" },
  EN: { balance: "YOUR BALANCE", wallet: "USDC ASSET", deal: "HOT SIGNAL", history: "MARKET PULSE", settings: "Settings", lang: "Language", creators: "Creators", give: "Give", get: "Receive", swap: "Swap Now", pending: "Processing...", success: "SUCCESS", failed: "FAILED", close: "CLOSE", max: "MAX" }
};

const DEX_THEMES = {
  UNISWAP: { name: 'Uniswap V3', color: '#FF007A', glow: 'rgba(255, 0, 122, 0.4)' },
  ODOS: { name: 'Odos Router', color: '#0CF2B0', glow: 'rgba(12, 242, 176, 0.4)' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', glow: 'rgba(250, 82, 160, 0.4)' },
  '1INCH': { name: '1inch Network', color: '#31569c', glow: 'rgba(49, 86, 156, 0.4)' }
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  const [lang, setLang] = useState('RU');
  const [balanceUSDC, setBalanceUSDC] = useState(1000.0);
  const [wallet, setWallet] = useState({});
  const [view, setView] = useState('main'); 
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [showTokenList, setShowTokenList] = useState(null);
  const [payToken, setPayToken] = useState(ASSETS.USDC);
  const [receiveToken, setReceiveToken] = useState(ASSETS.BTC);
  const [payAmount, setPayAmount] = useState('');

  const t = TEXTS[lang];
  const tgData = useMemo(() => window.Telegram?.WebApp?.initDataUnsafe?.user, []);
  const userId = useMemo(() => tgData?.id?.toString() || 'User_Sim', [tgData]);
  const userName = useMemo(() => tgData?.username || tgData?.first_name || 'Trader', [tgData]);

  useEffect(() => {
    onValue(ref(db, 'players/'), (s) => {
      if (s.exists()) {
        const data = s.val();
        if (data[userId]) {
          setBalanceUSDC(data[userId].balanceUSDC ?? 1000);
          setWallet(data[userId].wallet ?? {});
        } else {
          set(ref(db, 'players/' + userId), { balanceUSDC: 1000, wallet: {}, username: userName });
        }
      }
    });
    onValue(ref(db, 'globalTrades/'), (s) => {
      if (s.exists()) setGlobalTrades(Object.values(s.val()).reverse().slice(0, 5));
    });
  }, [userId]);

  useEffect(() => {
    if (!signal) {
      const keys = ['BTC', 'ETH', 'LINK', 'AAVE', 'CRV', 'WPOL'];
      const randomCoin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      setSignal({ coin: randomCoin, buyAt: 'UNISWAP', sellAt: 'ODOS', profit: (Math.random()*0.9 + 2.1).toFixed(2) });
    }
  }, [signal]);

  const handleSwap = () => {
    const amount = Number(payAmount);
    const available = payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0);
    if (!amount || amount <= 0 || amount > available) return;
    setIsPending(true);

    setTimeout(() => {
      let gotAmount = (amount * payToken.price) / receiveToken.price;
      let pnlValue = null;
      const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;

      if (receiveToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        gotAmount *= isCorrect ? (1 + signal.profit / 100) : (1 - (Math.random() * 0.015));
        pnlValue = gotAmount - (amount * payToken.price);
        if (isCorrect) setSignal(null);
      }

      const newBalanceUSDC = payToken.symbol === 'USDC' ? balanceUSDC - amount : (receiveToken.symbol === 'USDC' ? balanceUSDC + gotAmount : balanceUSDC);
      const newWallet = { ...wallet };
      if (payToken.symbol !== 'USDC') newWallet[payToken.symbol] = (newWallet[payToken.symbol] || 0) - amount;
      if (receiveToken.symbol !== 'USDC') newWallet[receiveToken.symbol] = (newWallet[receiveToken.symbol] || 0) + gotAmount;

      update(ref(db, 'players/' + userId), { balanceUSDC: newBalanceUSDC, wallet: newWallet, username: userName });
      if (pnlValue !== null) {
        push(ref(db, 'globalTrades/'), { user: userName, amount: pnlValue.toFixed(2), isProfit: pnlValue >= 0 });
      }

      setReceipt({ from: payToken.symbol, to: receiveToken.symbol, spent: amount, got: gotAmount, pnl: pnlValue });
      setIsPending(false); setPayAmount('');
    }, 1500);
  };

  return (
    <div style={{ backgroundColor: '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', overflow: 'hidden', position: 'relative' }}>
      
      {/* --- ЖИВОЙ АНИМИРОВАННЫЙ ФОН --- */}
      <div className="blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '500px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', alignItems: 'center' }}>
          <div style={{ color: '#0CF2B0', fontWeight: 'bold', fontSize: '11px', letterSpacing: '2px', textShadow: '0 0 10px rgba(12,242,176,0.5)' }}>{t.balance}</div>
          <button onClick={() => setView('settings')} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 15px', borderRadius: '15px', backdropFilter: 'blur(10px)' }}>⚙️</button>
        </div>

        <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto' }}>
          {/* BALANCE SECTION */}
          <div style={{ textAlign: 'center', margin: '30px 0 40px' }}>
            <h1 className="glow-text" style={{ fontSize: '56px', margin: 0, fontWeight: '900', letterSpacing: '-2px' }}>
              ${balanceUSDC.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </h1>
            <p style={{ opacity: 0.5, fontSize: '10px', letterSpacing: '4px', marginTop: 8 }}>{t.wallet}</p>
          </div>

          {/* SIGNAL CARD (NEON) */}
          {signal && (
            <div className="signal-card">
              <div style={{ fontSize: '9px', color: '#0CF2B0', fontWeight: 'bold', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="dot-pulse"></span> {t.deal}
              </div>
              <div style={{ fontWeight: '800', fontSize: '16px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{signal.coin.symbol} <span style={{opacity: 0.3}}>→</span> {signal.sellAt}</span>
                <span style={{ color: '#0CF2B0', textShadow: '0 0 10px rgba(12,242,176,0.5)' }}>+{signal.profit}%</span>
              </div>
            </div>
          )}

          {/* DEX BUTTONS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
            {Object.keys(DEX_THEMES).map(k => (
              <button key={k} onClick={() => setActiveDex(k)} className="dex-btn" style={{ borderColor: `${DEX_THEMES[k].color}55` }}>
                <div style={{ color: DEX_THEMES[k].color, fontSize: '10px', marginBottom: 4 }}>DEX</div>
                {DEX_THEMES[k].name}
              </button>
            ))}
          </div>

          {/* LIVE FEED BOX */}
          <div className="glass-card">
            <div style={{ fontSize: '10px', opacity: 0.4, marginBottom: '15px', fontWeight: 'bold', letterSpacing: '1px' }}>{t.history}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{opacity: 0.6}}>@crypto_king</span>
                  <span style={{color: '#0CF2B0', fontWeight: 'bold'}}>+42.50 USDC</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{opacity: 0.6}}>@whale_tracker</span>
                  <span style={{color: '#FF4B4B', fontWeight: 'bold'}}>-12.10 USDC</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- DEX OVERLAY --- */}
      {activeDex && (
        <div className="dex-overlay" style={{ backgroundImage: `radial-gradient(circle at 50% 100%, ${DEX_THEMES[activeDex].glow}, #000 70%)` }}>
          <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px', textAlign: 'left', padding: '20px' }}>✕</button>
            <h2 style={{ textAlign: 'center', color: DEX_THEMES[activeDex].color, fontWeight: '900', letterSpacing: '1px', textShadow: `0 0 20px ${DEX_THEMES[activeDex].glow}` }}>{DEX_THEMES[activeDex].name}</h2>
            
            <div className="swap-container">
              <div className="swap-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: 10, opacity: 0.5 }}><span>{t.give}</span><span onClick={() => setPayAmount(balanceUSDC.toString())} style={{color: DEX_THEMES[activeDex].color, fontWeight:'bold'}}>{t.max}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="swap-input" placeholder="0.0"/>
                  <div className="token-select"><img src={payToken.icon} width="20"/> {payToken.symbol}</div>
                </div>
              </div>

              <div className="swap-arrow" style={{ backgroundColor: DEX_THEMES[activeDex].color }}>↓</div>

              <div className="swap-box">
                <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: 10 }}>{t.get}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{fontSize: '32px', fontWeight: '800'}}>{payAmount ? ((payAmount * payToken.price) / receiveToken.price).toFixed(5) : '0.0'}</div>
                  <button onClick={() => setShowTokenList('receive')} className="token-select-btn"><img src={receiveToken.icon} width="20"/> {receiveToken.symbol} ▾</button>
                </div>
              </div>
            </div>

            <button onClick={handleSwap} disabled={isPending} className="confirm-btn" style={{ backgroundColor: DEX_THEMES[activeDex].color, boxShadow: `0 0 30px ${DEX_THEMES[activeDex].glow}` }}>
              {isPending ? t.pending : t.swap}
            </button>
          </div>
        </div>
      )}

      {/* --- CSS СТИЛИ ДЛЯ ЭФФЕКТОВ --- */}
      <style>{`
        .blobs { position: absolute; inset: 0; overflow: hidden; z-index: 1; filter: blur(60px); opacity: 0.6; }
        .blob { position: absolute; width: 300px; height: 300px; border-radius: 50%; animation: move 20s infinite alternate; }
        .blob-1 { background: #FF007A; top: -100px; left: -100px; }
        .blob-2 { background: #0CF2B0; bottom: -100px; right: -100px; animation-delay: -5s; }
        .blob-3 { background: #31569c; top: 40%; left: 30%; animation-delay: -10s; }
        
        @keyframes move { 
          from { transform: translate(0, 0) scale(1); } 
          to { transform: translate(100px, 150px) scale(1.2); } 
        }

        .glow-text { background: linear-gradient(180deg, #fff 0%, #aaa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        
        .signal-card { 
          background: rgba(255,255,255,0.03); border: 1px solid rgba(12,242,176,0.3); padding: 20px; border-radius: 24px; 
          backdrop-filter: blur(20px); margin-bottom: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        .dex-btn { 
          background: rgba(255,255,255,0.05); border: 1px solid; border-radius: 22px; padding: 25px 10px; 
          color: #fff; font-weight: 800; backdrop-filter: blur(10px); transition: 0.2s;
        }
        .dex-btn:active { transform: scale(0.95); }

        .glass-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 26px; padding: 20px; backdrop-filter: blur(15px); }

        .dex-overlay { position: fixed; inset: 0; z-index: 1000; animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

        .swap-container { padding: 20px; display: flex; flexDirection: column; gap: 8px; margin-top: 20px; }
        .swap-box { background: rgba(255,255,255,0.08); padding: 20px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1); }
        .swap-input { background: none; border: none; color: #fff; fontSize: 32px; width: 60%; outline: none; font-weight: 800; }
        .swap-arrow { width: 40px; height: 40px; margin: -20px auto; border-radius: 12px; display: flex; align-items: center; justifyContent: center; z-index: 5; border: 4px solid #000; font-weight: bold; }
        
        .confirm-btn { width: calc(100% - 40px); margin: auto 20px 30px; padding: 22px; border: none; border-radius: 24px; color: #fff; font-weight: 900; font-size: 18px; }

        .dot-pulse { width: 8px; height: 8px; background: #0CF2B0; border-radius: 50%; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
      `}</style>

      {/* SETTINGS VIEW */}
      {view === 'settings' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 2000, padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
            <h2 style={{fontWeight: '900'}}>{t.settings}</h2>
            <button onClick={() => setView('main')} style={{ background: '#222', border: 'none', color: '#fff', width: '45px', height: '45px', borderRadius: '50%' }}>✕</button>
          </div>
          <button onClick={() => setLang(l => l === 'RU' ? 'EN' : 'RU')} style={{ width: '100%', padding: '22px', background: 'rgba(255,255,255,0.05)', color: '#fff', borderRadius: '20px', marginBottom: '15px', border: '1px solid #333', textAlign: 'left', fontWeight: 'bold' }}>🌐 {t.lang}: {lang}</button>
          <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', padding: '22px', background: 'rgba(255,255,255,0.05)', color: '#fff', borderRadius: '20px', border: '1px solid #333', textAlign: 'left', fontWeight: 'bold' }}>👥 {t.creators}: @kriptoalians</button>
        </div>
      )}

      {/* TOKEN LIST */}
      {showTokenList && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 3000, padding: '20px', overflowY: 'auto' }}>
           <button onClick={() => setShowTokenList(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '35px', marginBottom: 20 }}>×</button>
           {Object.values(ASSETS).map(item => (
             <div key={item.symbol} onClick={() => { if(showTokenList === 'pay') setPayToken(item); else setReceiveToken(item); setShowTokenList(null); }} style={{ display: 'flex', gap: 15, padding: '20px', borderBottom: '1px solid #111', alignItems: 'center' }}>
                <img src={item.icon} width="32"/>
                <div style={{flex: 1}}><b>{item.symbol}</b></div>
                <div style={{opacity: 0.5, fontSize: '13px'}}>${item.price.toLocaleString()}</div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
