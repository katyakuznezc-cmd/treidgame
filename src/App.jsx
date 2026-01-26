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
  USDC: { symbol: 'USDC', price: 1, icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=024', color: '#2775CA' },
  BTC: { symbol: 'BTC', price: 65000.00, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=024', color: '#F7931A' },
  ETH: { symbol: 'ETH', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=024', color: '#627EEA' },
  LINK: { symbol: 'LINK', price: 18.20, icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg?v=024', color: '#2A5ADA' },
  AAVE: { symbol: 'AAVE', price: 145.50, icon: 'https://cryptologos.cc/logos/aave-aave-logo.svg?v=024', color: '#B6509E' },
  CRV: { symbol: 'CRV', price: 0.55, icon: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.svg?v=024', color: '#F41B1B' },
  WPOL: { symbol: 'WPOL', price: 0.72, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg?v=024', color: '#8247E5' }
};

const DEX_THEMES = {
  UNISWAP: { name: 'Uniswap', color: '#FF007A' },
  ODOS: { name: 'Odos', color: '#0CF2B0' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0' },
  '1INCH': { name: '1inch', color: '#1B314F' }
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
      tg.enableClosingConfirmation();
      tg.headerColor = '#000000';
      tg.backgroundColor = '#000000';
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
            const d = s.val();
            if(d.balanceUSDC) setBalanceUSDC(d.balanceUSDC);
            if(d.wallet) setWallet(d.wallet);
          }
        });
        const interval = setInterval(() => {
          update(userRef, { balanceUSDC, wallet, username: userId, lastSeen: serverTimestamp() });
          localStorage.setItem('arb_balance_usdc', balanceUSDC);
          localStorage.setItem('arb_wallet_v2', JSON.stringify(wallet));
        }, 5000);
        return () => clearInterval(interval);
      } catch (e) {}
    }, 800);
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
    }, 1200);
  };

  const currentMax = payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0);

  return (
    <div style={{ background: '#000', height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
      <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', position: 'relative', height: '100%' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', alignItems: 'center' }}>
          <div style={{ color: '#0CF2B0', fontSize: '11px', fontWeight: 'bold', background: 'rgba(12,242,176,0.1)', padding: '4px 10px', borderRadius: '20px' }}>● LIVE MARKET</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: '1px solid #222', color: '#fff', width: '36px', height: '36px', borderRadius: '10px' }}>⚙️</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px 20px' }}>
          {view === 'main' && !activeDex && (
            <>
              <div style={{ textAlign: 'center', margin: '20px 0 40px 0' }}>
                <h1 style={{ fontSize: '48px', margin: 0, fontWeight: '700' }}>${balanceUSDC.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
                <p style={{ opacity: 0.4, fontSize: '12px', letterSpacing: '1px' }}>USDC BALANCE</p>
              </div>

              {signal && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderLeft: `4px solid ${DEX_THEMES[signal.sellAt].color}`, padding: '15px', borderRadius: '14px', marginBottom: '25px' }}>
                  <div style={{ fontSize: '10px', opacity: 0.5, marginBottom: '5px', fontWeight: 'bold' }}>SMART SIGNAL</div>
                  <div style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={signal.coin.icon} width="18" alt=""/> {signal.coin.symbol}: {signal.buyAt} → <b style={{color: DEX_THEMES[signal.sellAt].color}}>{signal.sellAt}</b>
                  </div>
                  <div style={{ color: '#0CF2B0', fontSize: '13px', marginTop: '6px', fontWeight: '600' }}>Profit: +{signal.profit}%</div>
                </div>
              )}

              <div style={{ background: '#0a0a0a', padding: '18px', borderRadius: '20px', border: '1px solid #1a1a1a', marginBottom: '25px' }}>
                <p style={{ fontSize: '11px', opacity: 0.5, margin: '0 0 12px 0', fontWeight: 'bold' }}>PORTFOLIO</p>
                {Object.keys(wallet).filter(k => wallet[k] > 0.000001).length === 0 ? <p style={{opacity:0.3, fontSize: 13}}>Empty</p> :
                  Object.keys(wallet).map(c => wallet[c] > 0.000001 && (
                    <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #111', alignItems: 'center' }}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <img src={ASSETS[c].icon} width="24" height="24" alt=""/>
                        <span>{c}</span>
                      </div>
                      <b style={{fontSize: '15px'}}>{wallet[c].toFixed(6)}</b>
                    </div>
                  ))
                }
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {Object.keys(DEX_THEMES).map(key => (
                  <button key={key} onClick={() => setActiveDex(key)} style={{ background: '#0a0a0a', border: `1px solid ${DEX_THEMES[key].color}33`, color: '#fff', padding: '25px 0', borderRadius: '18px', fontWeight: 'bold', fontSize: '15px', boxShadow: `0 4px 15px rgba(0,0,0,0.3)` }}>
                    {DEX_THEMES[key].name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Overlay screens (DEX & Settings) */}
        {(activeDex || view === 'settings') && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', justifyContent: 'space-between', borderBottom: '1px solid #111' }}>
              <button onClick={() => {setActiveDex(null); setView('main')}} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '28px' }}>←</button>
              <b style={{ fontSize: '17px' }}>{activeDex ? DEX_THEMES[activeDex].name : 'Settings'}</b>
              <div style={{width: 30}}/>
            </div>

            {activeDex && (
              <div style={{ padding: '20px' }}>
                <div style={{ background: '#0f0f0f', padding: '20px', borderRadius: '24px', border: `1px solid ${DEX_THEMES[activeDex].color}44` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.6, marginBottom: '12px' }}>
                    <span>Sell</span>
                    <span onClick={() => setAmount(currentMax.toString())} style={{ color: DEX_THEMES[activeDex].color, fontWeight: 'bold', cursor: 'pointer', background: `${DEX_THEMES[activeDex].color}22`, padding: '2px 8px', borderRadius: '6px' }}>MAX: {currentMax.toLocaleString(undefined, {maximumFractionDigits: 6})}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px', width: '55%', outline: 'none', fontWeight: '600' }} placeholder="0.0"/>
                    <button onClick={() => {setSelectingFor('pay'); setShowTokenList(true)}} style={{ background: '#1a1a1a', border: 'none', color: '#fff', padding: '10px 14px', borderRadius: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src={payToken.icon} width="20" alt=""/> {payToken.symbol} ▾
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: 'center', margin: '12px 0', opacity: 0.2, fontSize: '24px' }}>↓</div>

                <div style={{ background: '#0f0f0f', padding: '20px', borderRadius: '24px', border: `1px solid ${DEX_THEMES[activeDex].color}44` }}>
                  <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '12px' }}>Buy (Est.)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: '600' }}>{amount ? (payToken.symbol === 'USDC' ? (amount/receiveToken.price).toFixed(6) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                    <button onClick={() => {setSelectingFor('receive'); setShowTokenList(true)}} style={{ background: '#1a1a1a', border: 'none', color: '#fff', padding: '10px 14px', borderRadius: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src={receiveToken.icon} width="20" alt=""/> {receiveToken.symbol} ▾
                    </button>
                  </div>
                </div>

                <button onClick={handleTrade} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: '20px', borderRadius: '24px', fontWeight: 'bold', marginTop: '30px', fontSize: '17px', border: 'none', boxShadow: `0 10px 30px ${DEX_THEMES[activeDex].color}44` }}>Confirm Swap</button>
              </div>
            )}

            {view === 'settings' && (
              <div style={{ padding: '20px' }}>
                <div style={{ background: '#0a0a0a', padding: '20px', borderRadius: '18px', border: '1px solid #1a1a1a' }}>
                   <p style={{opacity:0.5, margin:0, fontSize: '11px', fontWeight: 'bold'}}>USER ID</p>
                   <b style={{fontSize: '16px'}}>{userId}</b>
                </div>
                <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', padding: '18px', borderRadius: '18px', fontWeight: 'bold', marginTop: '15px' }}>Support Manager</button>
              </div>
            )}
          </div>
        )}

        {/* Token List Modal */}
        {showTokenList && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
             <div style={{ display: 'flex', alignItems: 'center', padding: '20px', borderBottom: '1px solid #111' }}>
               <button onClick={() => setShowTokenList(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>×</button>
               <h3 style={{ marginLeft: '20px', fontSize: '18px' }}>Select Asset</h3>
             </div>
             <div style={{flex: 1, overflowY: 'auto'}}>
               {Object.values(ASSETS).map(t => (
                 <div key={t.symbol} onClick={() => { selectingFor === 'pay' ? setPayToken(t) : setReceiveToken(t); setShowTokenList(false); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 25px', borderBottom: '1px solid #0a0a0a', cursor: 'pointer', alignItems: 'center' }}>
                   <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                     <img src={t.icon} width="32" height="32" alt=""/>
                     <div>
                       <div style={{fontWeight: 'bold'}}>{t.symbol}</div>
                       <div style={{fontSize: '12px', opacity: 0.5}}>Crypto Asset</div>
                     </div>
                   </div>
                   <span style={{opacity: 0.8, fontWeight: '500'}}>${t.price.toLocaleString()}</span>
                 </div>
               ))}
             </div>
          </div>
        )}

        {isProcessing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0CF2B0', fontWeight: 'bold', fontSize: '18px', letterSpacing: '1px' }}>PROCESSING...</div>}
        {toast && <div style={{ position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', padding: '14px 28px', borderRadius: '16px', background: toast.type==='error'?'#F41B1B':'#0CF2B0', color: '#000', fontWeight: 'bold', zIndex: 6000, textAlign: 'center', boxShadow: '0 5px 20px rgba(0,0,0,0.5)' }}>{toast.text}</div>}
      </div>
    </div>
  );
}
