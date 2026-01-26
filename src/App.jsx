import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update, serverTimestamp } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCKmEa1B4xOdMdNGXBDK2LeOhBQoMqWv40",
  authDomain: "treidgame-b2ae0.firebaseapp.com",
  projectId: "treidgame-b2ae0",
  storageBucket: "treidgame-b2ae0.firebasestorage.app",
  messagingSenderId: "985305772375",
  appId: "1:985305772375:web:08d9b482a6f9d3cd748e12"
};

const ASSETS = {
  USDC: { symbol: 'USDC', price: 1, icon: '💵', color: '#2775CA' },
  BTC: { symbol: 'BTC', price: 65000.00, icon: '₿', color: '#F7931A' },
  ETH: { symbol: 'ETH', price: 2600.00, icon: 'Ξ', color: '#627EEA' },
  LINK: { symbol: 'LINK', price: 18.20, icon: '🔗', color: '#2A5ADA' },
  AAVE: { symbol: 'AAVE', price: 145.50, icon: '👻', color: '#B6509E' },
  CRV: { symbol: 'CRV', price: 0.55, icon: '🌈', color: '#F41B1B' },
  WPOL: { symbol: 'WPOL', price: 0.72, icon: '🟣', color: '#8247E5' }
};

const DEX_THEMES = {
  UNISWAP: { name: 'Uniswap', color: '#FF007A', bg: 'rgba(255,0,122,0.1)' },
  ODOS: { name: 'Odos', color: '#0CF2B0', bg: 'rgba(12,242,176,0.1)' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: 'rgba(250,82,160,0.1)' },
  '1INCH': { name: '1inch', color: '#1B314F', bg: 'rgba(27,49,79,0.5)' }
};

export default function App() {
  const [balanceUSDC, setBalanceUSDC] = useState(() => Number(localStorage.getItem('arb_balance_usdc')) || 1000.00);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('arb_wallet_v2')) || {});
  const [view, setView] = useState('main'); 
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState(null);
  const [showTokenList, setShowTokenList] = useState(false);
  const [selectingFor, setSelectingFor] = useState('pay');
  const [payToken, setPayToken] = useState(ASSETS.USDC);
  const [receiveToken, setReceiveToken] = useState(ASSETS.BTC);
  const [amount, setAmount] = useState('');

  const userId = useMemo(() => {
    try {
      const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tg) return tg.username || tg.id.toString();
    } catch (e) {}
    return localStorage.getItem('arb_user_id') || 'Trader_' + Math.floor(Math.random() * 9999);
  }, []);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.headerColor = '#000000';
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const app = initializeApp(firebaseConfig);
        const db = getDatabase(app);
        const userRef = ref(db, 'players/' + userId);
        onValue(userRef, (s) => {
          if (s.exists()) {
            setBalanceUSDC(s.val().balanceUSDC || 1000);
            setWallet(s.val().wallet || {});
          }
        });
        const interval = setInterval(() => {
          update(userRef, { balanceUSDC, wallet, username: userId, lastSeen: serverTimestamp() });
          localStorage.setItem('arb_balance_usdc', balanceUSDC);
          localStorage.setItem('arb_wallet_v2', JSON.stringify(wallet));
        }, 5000);
        return () => clearInterval(interval);
      } catch (e) {}
    }, 500);
  }, [balanceUSDC, wallet, userId]);

  useEffect(() => {
    if (!signal) {
      const keys = Object.keys(ASSETS).filter(k => k !== 'USDC');
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      const dexKeys = Object.keys(DEX_THEMES);
      const buyAt = dexKeys[Math.floor(Math.random() * dexKeys.length)];
      let sellAt = dexKeys[Math.floor(Math.random() * dexKeys.length)];
      while (sellAt === buyAt) sellAt = dexKeys[Math.floor(Math.random() * dexKeys.length)];
      setSignal({ coin, buyAt, sellAt, profit: (Math.random() * 1.5 + 1.5).toFixed(2) });
    }
  }, [signal]);

  const notify = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleTrade = () => {
    const num = Number(amount);
    if (!num || num <= 0) return notify('Введите сумму', 'error');
    setIsProcessing(true);
    setTimeout(() => {
      if (payToken.symbol === 'USDC') {
        if (balanceUSDC >= num) {
          setBalanceUSDT(prev => prev - num); // internal fix
          setBalanceUSDC(prev => prev - num);
          setWallet(prev => ({ ...prev, [receiveToken.symbol]: (prev[receiveToken.symbol] || 0) + (num / receiveToken.price) }));
          notify(`Куплено ${receiveToken.symbol}`);
        } else notify('Недостаточно USDC', 'error');
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          const isOk = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          const mult = isOk ? (1 + signal.profit / 100) : (1 - (Math.random() * 0.015));
          const result = (num * payToken.price) * mult;
          setBalanceUSDC(prev => prev + result);
          setWallet(prev => ({ ...prev, [payToken.symbol]: has - num }));
          setSignal(null);
          notify(isOk ? `Прибыль: +$${(result - num * payToken.price).toFixed(2)}` : 'Сделка в минус (1.5%)', isOk ? 'success' : 'error');
        } else notify(`Недостаточно ${payToken.symbol}`, 'error');
      }
      setIsProcessing(false); setAmount(''); setActiveDex(null);
    }, 1500);
  };

  return (
    <div style={{ background: '#000', minHeight: '100vh', width: '100%', display: 'flex', justifyContent: 'center', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '500px', paddingBottom: '100px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', alignItems: 'center' }}>
          <div style={{ color: '#0CF2B0', fontSize: '11px', fontWeight: 'bold', background: 'rgba(12,242,176,0.1)', padding: '5px 12px', borderRadius: '20px' }}>● ARBITRAGE LIVE</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: '1px solid #222', color: '#fff', width: '40px', height: '40px', borderRadius: '12px' }}>⚙️</button>
        </div>

        {view === 'main' && !activeDex && (
          <div style={{ padding: '0 20px' }}>
            <div style={{ textAlign: 'center', margin: '30px 0' }}>
              <h1 style={{ fontSize: '50px', margin: 0 }}>${balanceUSDC.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
              <p style={{ opacity: 0.4, fontSize: '12px', letterSpacing: '1px' }}>USDC BALANCE</p>
            </div>

            {signal && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderLeft: `4px solid ${DEX_THEMES[signal.sellAt].color}`, padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ fontSize: '10px', opacity: 0.5, marginBottom: '5px' }}>АКТУАЛЬНАЯ СВЯЗКА</div>
                <div style={{ fontSize: '15px' }}>{signal.coin.icon} {signal.coin.symbol}: {signal.buyAt} → <b style={{color: DEX_THEMES[signal.sellAt].color}}>{signal.sellAt}</b></div>
                <div style={{ color: '#0CF2B0', fontSize: '13px', marginTop: '4px' }}>Ожидаемый профит: +{signal.profit}%</div>
              </div>
            )}

            <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '18px', border: '1px solid #111', marginBottom: '20px' }}>
              <p style={{ fontSize: '10px', opacity: 0.5, margin: '0 0 10px 0' }}>МОИ АКТИВЫ</p>
              {Object.keys(wallet).filter(k => wallet[k] > 0).length === 0 ? <p style={{opacity:0.3, fontSize: 13}}>Нет активов</p> :
                Object.keys(wallet).map(c => wallet[c] > 0 && (
                  <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #111' }}>
                    <span style={{color: ASSETS[c].color}}>{ASSETS[c].icon} {c}</span><b>{wallet[c].toFixed(6)}</b>
                  </div>
                ))
              }
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {Object.keys(DEX_THEMES).map(key => (
                <button key={key} onClick={() => setActiveDex(key)} style={{ background: '#0a0a0a', border: `1px solid ${DEX_THEMES[key].color}44`, color: '#fff', padding: '30px 0', borderRadius: '20px', fontWeight: 'bold', fontSize: '16px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: DEX_THEMES[key].color}}></div>
                  {DEX_THEMES[key].name}
                </button>
              ))}
            </div>
          </div>
        )}

        {(activeDex || view === 'settings') && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '20px', justifyContent: 'space-between' }}>
              <button onClick={() => {setActiveDex(null); setView('main')}} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>←</button>
              <b style={{ fontSize: '18px' }}>{activeDex ? DEX_THEMES[activeDex].name : 'Настройки'}</b>
              <div style={{width: 30}}/>
            </div>

            {activeDex && (
              <div style={{ padding: '20px' }}>
                <div style={{ background: '#0f0f0f', padding: '20px', borderRadius: '24px', border: `1px solid ${DEX_THEMES[activeDex].color}33` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.5, marginBottom: '10px' }}>
                    <span>Sell</span>
                    <span onClick={() => setAmount(payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0))} style={{ color: DEX_THEMES[activeDex].color, fontWeight: 'bold', cursor: 'pointer' }}>MAX: {payToken.symbol === 'USDC' ? balanceUSDC.toFixed(2) : (wallet[payToken.symbol] || 0).toFixed(6)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px', width: '60%', outline: 'none', fontWeight: 'bold' }} placeholder="0.0"/>
                    <button onClick={() => {setSelectingFor('pay'); setShowTokenList(true)}} style={{ background: '#1a1a1a', border: 'none', color: '#fff', padding: '10px 15px', borderRadius: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{color: payToken.color}}>{payToken.icon}</span> {payToken.symbol} ▾
                    </button>
                  </div>
                </div>

                <div style={{ height: '10px' }} />

                <div style={{ background: '#0f0f0f', padding: '20px', borderRadius: '24px', border: `1px solid ${DEX_THEMES[activeDex].color}33` }}>
                  <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '10px' }}>Buy (Estimated)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{amount ? (payToken.symbol === 'USDC' ? (amount/receiveToken.price).toFixed(6) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                    <button onClick={() => {setSelectingFor('receive'); setShowTokenList(true)}} style={{ background: '#1a1a1a', border: 'none', color: '#fff', padding: '10px 15px', borderRadius: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{color: receiveToken.color}}>{receiveToken.icon}</span> {receiveToken.symbol} ▾
                    </button>
                  </div>
                </div>

                <button onClick={handleTrade} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: '20px', borderRadius: '24px', fontWeight: 'bold', marginTop: '30px', fontSize: '18px', border: 'none', boxShadow: `0 10px 30px ${DEX_THEMES[activeDex].color}33` }}>Swap on {DEX_THEMES[activeDex].name}</button>
              </div>
            )}

            {view === 'settings' && (
              <div style={{ padding: '20px' }}>
                <div style={{ background: '#111', padding: '20px', borderRadius: '15px', marginBottom: '15px' }}>
                   <p style={{opacity:0.5, margin:0, fontSize: '11px'}}>USER ID</p>
                   <b>{userId}</b>
                </div>
                <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', padding: '18px', borderRadius: '15px', fontWeight: 'bold' }}>Contact Support</button>
                <p style={{ textAlign: 'center', opacity: 0.1, marginTop: '100px' }}>v4.0.0 Enterprise</p>
              </div>
            )}
          </div>
        )}

        {showTokenList && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, padding: '20px' }}>
             <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
               <button onClick={() => setShowTokenList(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>×</button>
               <h3 style={{ marginLeft: '20px' }}>Select Token</h3>
             </div>
             {Object.values(ASSETS).map(t => (
               <div key={t.symbol} onClick={() => { selectingFor === 'pay' ? setPayToken(t) : setReceiveToken(t); setShowTokenList(false); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid #111', cursor: 'pointer' }}>
                 <span style={{fontSize: '18px'}}><span style={{color: t.color, marginRight: '10px'}}>{t.icon}</span> {t.symbol}</span>
                 <span style={{opacity: 0.5}}>${t.price.toLocaleString()}</span>
               </div>
             ))}
          </div>
        )}

        {isProcessing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0CF2B0', fontWeight: 'bold', fontSize: '20px' }}>EXECUTING SWAP...</div>}
        {toast && <div style={{ position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', padding: '15px 30px', borderRadius: '15px', background: toast.type==='error'?'#F41B1B':'#0CF2B0', color: '#000', fontWeight: 'bold', zIndex: 6000 }}>{toast.text}</div>}
      </div>
    </div>
  );
}
