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
  // Загружаем данные из localStorage при старте
  const [balanceUSDC, setBalanceUSDC] = useState(() => Number(localStorage.getItem('arb_balance_usdc')) || 1000.00);
  const [wallet, setWallet] = useState(() => {
    const saved = localStorage.getItem('arb_wallet_v3');
    return saved ? JSON.parse(saved) : {};
  });
  
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

  // Инициализация Firebase и синхронизация
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const app = initializeApp(firebaseConfig);
        const db = getDatabase(app);
        const userRef = ref(db, 'players/' + userId);

        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.balanceUSDC !== undefined) setBalanceUSDC(data.balanceUSDC);
            if (data.wallet) setWallet(data.wallet);
          }
        });

        const syncInterval = setInterval(() => {
          update(userRef, { 
            balanceUSDC, 
            wallet, 
            username: userId, 
            lastSeen: serverTimestamp() 
          });
          // Дублируем в локальное хранилище для надежности
          localStorage.setItem('arb_balance_usdc', balanceUSDC);
          localStorage.setItem('arb_wallet_v3', JSON.stringify(wallet));
          localStorage.setItem('arb_user_id', userId);
        }, 3000);

        return () => clearInterval(syncInterval);
      } catch (e) { console.error(e); }
    }, 1000);
    return () => clearTimeout(timer);
  }, [balanceUSDC, wallet, userId]);

  // Генератор сигналов
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

  // ФУНКЦИЯ MAX (Теперь работает для любого выбранного токена)
  const handleMax = () => {
    if (payToken.symbol === 'USDC') {
      setAmount(balanceUSDC.toString());
    } else {
      const tokenAmount = wallet[payToken.symbol] || 0;
      setAmount(tokenAmount.toString());
    }
  };

  const handleTrade = () => {
    const num = Number(amount);
    if (!num || num <= 0) return notify('Введите сумму', 'error');
    
    setIsProcessing(true);
    setTimeout(() => {
      if (payToken.symbol === 'USDC') {
        // ПОКУПКА ТОКЕНА ЗА USDC
        if (balanceUSDC >= num) {
          const newBalance = balanceUSDC - num;
          const boughtAmount = num / receiveToken.price;
          const newWallet = { ...wallet, [receiveToken.symbol]: (wallet[receiveToken.symbol] || 0) + boughtAmount };
          
          setBalanceUSDC(newBalance);
          setWallet(newWallet);
          notify(`Куплено ${receiveToken.symbol}`);
        } else notify('Недостаточно USDC', 'error');
      } else {
        // ПРОДАЖА ТОКЕНА ЗА USDC
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          const isOk = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          const mult = isOk ? (1 + signal.profit / 100) : (1 - (Math.random() * 0.015));
          const resultUsdc = (num * payToken.price) * mult;
          
          const newBalance = balanceUSDC + resultUsdc;
          const newWallet = { ...wallet, [payToken.symbol]: has - num };
          
          setBalanceUSDC(newBalance);
          setWallet(newWallet);
          setSignal(null);
          notify(isOk ? `Прибыль: +$${(resultUsdc - num * payToken.price).toFixed(2)}` : 'Минусовая сделка', isOk ? 'success' : 'error');
        } else notify(`Недостаточно ${payToken.symbol}`, 'error');
      }
      setIsProcessing(false); setAmount(''); setActiveDex(null);
    }, 1200);
  };

  return (
    <div style={{ background: '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '500px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', alignItems: 'center' }}>
          <div style={{ color: '#0CF2B0', fontSize: '11px', fontWeight: 'bold', background: 'rgba(12,242,176,0.1)', padding: '5px 12px', borderRadius: '20px' }}>● ARBITRAGE SYSTEM</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: '1px solid #222', color: '#fff', width: '35px', height: '35px', borderRadius: '10px' }}>⚙️</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px 20px' }}>
          {view === 'main' && !activeDex && (
            <>
              <div style={{ textAlign: 'center', margin: '30px 0' }}>
                <h1 style={{ fontSize: '48px', margin: 0 }}>${balanceUSDC.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
                <p style={{ opacity: 0.4, fontSize: '12px' }}>AVAILABLE USDC</p>
              </div>

              {signal && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderLeft: `4px solid ${DEX_THEMES[signal.sellAt].color}`, padding: '15px', borderRadius: '15px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                    <img src={signal.coin.icon} width="16" style={{marginRight: 5}} /> 
                    {signal.coin.symbol}: {signal.buyAt} → <b style={{color: DEX_THEMES[signal.sellAt].color}}>{signal.sellAt}</b>
                  </div>
                  <div style={{ color: '#0CF2B0', fontSize: '13px', fontWeight: 'bold' }}>Profit: +{signal.profit}%</div>
                </div>
              )}

              <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '20px', border: '1px solid #1a1a1a', marginBottom: '20px' }}>
                <p style={{ fontSize: '10px', opacity: 0.5, marginBottom: '10px' }}>ASSETS</p>
                {Object.keys(wallet).filter(k => wallet[k] > 0.0000001).length === 0 ? <p style={{opacity: 0.2}}>No assets yet</p> :
                  Object.keys(wallet).map(c => wallet[c] > 0.0000001 && (
                    <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #111' }}>
                      <div style={{display:'flex', alignItems:'center', gap: 8}}>
                        <img src={ASSETS[c].icon} width="20"/> <span>{c}</span>
                      </div>
                      <b>{wallet[c].toFixed(6)}</b>
                    </div>
                  ))
                }
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {Object.keys(DEX_THEMES).map(k => (
                  <button key={k} onClick={() => setActiveDex(k)} style={{ background: '#0a0a0a', border: `1px solid ${DEX_THEMES[k].color}44`, color: '#fff', padding: '25px 0', borderRadius: '18px', fontWeight: 'bold' }}>
                    {DEX_THEMES[k].name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* DEX INTERFACE */}
        {(activeDex || view === 'settings') && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', padding: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
              <button onClick={() => {setActiveDex(null); setView('main')}} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>←</button>
              <b>{activeDex ? DEX_THEMES[activeDex].name : 'Settings'}</b>
              <div style={{width: 30}}/>
            </div>

            {activeDex && (
              <div style={{ padding: '20px' }}>
                <div style={{ background: '#0f0f0f', padding: '20px', borderRadius: '24px', border: `1px solid ${DEX_THEMES[activeDex].color}44` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.6, marginBottom: '10px' }}>
                    <span>You Pay</span>
                    <span onClick={handleMax} style={{ color: DEX_THEMES[activeDex].color, fontWeight: 'bold', cursor: 'pointer' }}>
                      MAX: {payToken.symbol === 'USDC' ? balanceUSDC.toFixed(2) : (wallet[payToken.symbol] || 0).toFixed(6)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '28px', width: '60%', outline: 'none' }} placeholder="0.0"/>
                    <button onClick={() => {setSelectingFor('pay'); setShowTokenList(true)}} style={{ background: '#1a1a1a', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <img src={payToken.icon} width="18"/> {payToken.symbol}
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: 'center', margin: '10px 0', opacity: 0.2 }}>↓</div>

                <div style={{ background: '#0f0f0f', padding: '20px', borderRadius: '24px', border: `1px solid ${DEX_THEMES[activeDex].color}44` }}>
                  <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '10px' }}>You Receive</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                      {amount ? (payToken.symbol === 'USDC' ? (amount/receiveToken.price).toFixed(6) : (amount*payToken.price).toFixed(2)) : '0.0'}
                    </div>
                    <button onClick={() => {setSelectingFor('receive'); setShowTokenList(true)}} style={{ background: '#1a1a1a', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <img src={receiveToken.icon} width="18"/> {receiveToken.symbol}
                    </button>
                  </div>
                </div>

                <button onClick={handleTrade} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: '20px', borderRadius: '20px', fontWeight: 'bold', marginTop: '30px', border: 'none' }}>
                  Swap on {activeDex}
                </button>
              </div>
            )}
            
            {view === 'settings' && (
               <div style={{padding: 20}}>
                  <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', background: '#111', color: '#fff', padding: '15px', borderRadius: '15px', border: '1px solid #333' }}>Manager</button>
               </div>
            )}
          </div>
        )}

        {/* Token Selector Modal */}
        {showTokenList && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, padding: 20 }}>
             <button onClick={() => setShowTokenList(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>×</button>
             {Object.values(ASSETS).map(t => (
               <div key={t.symbol} onClick={() => { selectingFor === 'pay' ? setPayToken(t) : setReceiveToken(t); setShowTokenList(false); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #111', alignItems: 'center' }}>
                 <div style={{display:'flex', alignItems:'center', gap: 10}}>
                   <img src={t.icon} width="24"/> <span>{t.symbol}</span>
                 </div>
                 <span style={{opacity: 0.5}}>${t.price}</span>
               </div>
             ))}
          </div>
        )}

        {isProcessing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0CF2B0' }}>PROCESSING...</div>}
        {toast && <div style={{ position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', padding: '12px 25px', borderRadius: '12px', background: toast.type==='error'?'#ff4d4d':'#0CF2B0', color: '#000', fontWeight: 'bold', zIndex: 6000 }}>{toast.text}</div>}
      </div>
    </div>
  );
}
