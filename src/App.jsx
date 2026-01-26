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
  USDT: { symbol: 'USDT', price: 1, icon: '💵' },
  SOL: { symbol: 'SOL', price: 145.50, icon: '🟣' },
  ETH: { symbol: 'ETH', price: 2600.00, icon: '🔷' },
  BNB: { symbol: 'BNB', price: 605.20, icon: '🟡' },
  DOGE: { symbol: 'DOGE', price: 0.16, icon: '🐕' },
  XRP: { symbol: 'XRP', price: 0.62, icon: '✖️' }
};

export default function App() {
  const [balanceUSDT, setBalanceUSDT] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('arb_wallet')) || {});
  const [view, setView] = useState('main'); 
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState(null);
  const [showTokenList, setShowTokenList] = useState(false);
  const [selectingFor, setSelectingFor] = useState('pay');
  const [payToken, setPayToken] = useState(ASSETS.USDT);
  const [receiveToken, setReceiveToken] = useState(ASSETS.SOL);
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
      tg.expand(); // Растянуть на весь экран
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
            setBalanceUSDT(s.val().balanceUSDT || 1000);
            setWallet(s.val().wallet || {});
          }
        });
        const interval = setInterval(() => {
          update(userRef, { balanceUSDT, wallet, username: userId, lastSeen: serverTimestamp() });
          localStorage.setItem('arb_balance', balanceUSDT);
          localStorage.setItem('arb_wallet', JSON.stringify(wallet));
        }, 5000);
        return () => clearInterval(interval);
      } catch (e) {}
    }, 1000);
  }, [balanceUSDT, wallet, userId]);

  useEffect(() => {
    if (!signal) {
      const keys = Object.keys(ASSETS).filter(k => k !== 'USDT');
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      const dexes = ['UNISWAP', 'PANCAKE', 'RAYDIUM', '1INCH'];
      const buyAt = dexes[Math.floor(Math.random() * dexes.length)];
      let sellAt = dexes[Math.floor(Math.random() * dexes.length)];
      while (sellAt === buyAt) sellAt = dexes[Math.floor(Math.random() * dexes.length)];
      
      setSignal({ coin, buyAt, sellAt, profit: (Math.random() * 1.5 + 1.5).toFixed(2) });
    }
  }, [signal]);

  const notify = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const startSwap = () => {
    const num = Number(amount);
    if (!num || num <= 0) return notify('Введите сумму', 'error');
    setIsProcessing(true);

    setTimeout(() => {
      if (payToken.symbol === 'USDT') {
        if (balanceUSDT >= num) {
          setBalanceUSDT(prev => prev - num);
          setWallet(prev => ({ ...prev, [receiveToken.symbol]: (prev[receiveToken.symbol] || 0) + (num / receiveToken.price) }));
          notify(`Куплено ${receiveToken.symbol}`);
        } else notify('Недостаточно USDT', 'error');
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          const isOk = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          // Макс профит 3%, или рандомный минус до 1.5%
          const mult = isOk ? (1 + signal.profit / 100) : (1 - (Math.random() * 0.015));
          const result = (num * payToken.price) * mult;
          setBalanceUSDT(prev => prev + result);
          setWallet(prev => ({ ...prev, [payToken.symbol]: has - num }));
          setSignal(null);
          notify(isOk ? `Профит: +$${(result - num * payToken.price).toFixed(2)}` : 'Сделка закрыта (минус)', isOk ? 'success' : 'error');
        } else notify(`Нет ${payToken.symbol}`, 'error');
      }
      setIsProcessing(false); setAmount(''); setActiveDex(null);
    }, 1500);
  };

  return (
    <div style={{ background: '#000', minHeight: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', color: '#fff', fontFamily: 'sans-serif', overflowX: 'hidden' }}>
      <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', alignItems: 'center' }}>
          <div style={{ color: '#39f2af', fontSize: '11px', fontWeight: 'bold', background: 'rgba(57,242,175,0.1)', padding: '5px 12px', borderRadius: '20px' }}>● LIVE MARKET</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: '1px solid #222', color: '#fff', padding: '8px 12px', borderRadius: '12px' }}>⚙️</button>
        </div>

        {view === 'main' && !activeDex && (
          <div style={{ padding: '0 20px' }}>
            <div style={{ textAlign: 'center', margin: '40px 0' }}>
              <h1 style={{ fontSize: '54px', margin: 0, fontWeight: 'bold' }}>${balanceUSDT.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
              <p style={{ opacity: 0.4, fontSize: '12px', letterSpacing: '1px' }}>TOTAL BALANCE (USDT)</p>
            </div>

            {signal && (
              <div style={{ background: 'linear-gradient(135deg, rgba(57,242,175,0.1) 0%, rgba(0,0,0,0) 100%)', border: '1px solid #39f2af44', padding: '18px', borderRadius: '20px', marginBottom: '20px' }}>
                <div style={{ color: '#39f2af', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px' }}>SMART SIGNAL</div>
                <div style={{ fontSize: '15px' }}>Купи <b>{signal.coin.symbol}</b> на <b>{signal.buyAt}</b></div>
                <div style={{ fontSize: '15px' }}>Продай на <b style={{textDecoration: 'underline'}}>{signal.sellAt}</b></div>
                <div style={{ color: '#39f2af', marginTop: '5px', fontSize: '14px' }}>Ожидаемый профит: +{signal.profit}%</div>
              </div>
            )}

            <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '20px', border: '1px solid #111', marginBottom: '25px' }}>
              <p style={{ fontSize: '10px', color: '#39f2af', fontWeight: 'bold', margin: '0 0 10px 0' }}>МОИ АКТИВЫ</p>
              {Object.keys(wallet).filter(k => wallet[k] > 0).length === 0 ? <p style={{opacity:0.3, fontSize: 13}}>Кошелек пуст</p> :
                Object.keys(wallet).map(c => wallet[c] > 0 && (
                  <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #111' }}>
                    <span>{ASSETS[c].icon} {c}</span><b>{wallet[c].toFixed(4)}</b>
                  </div>
                ))
              }
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingBottom: '40px' }}>
              {['UNISWAP', 'PANCAKE', 'RAYDIUM', '1INCH'].map(d => (
                <button key={d} onClick={() => setActiveDex(d)} style={{ background: '#0a0a0a', border: '1px solid #222', color: '#fff', padding: '25px 0', borderRadius: '20px', fontWeight: 'bold', fontSize: '16px' }}>{d}</button>
              ))}
            </div>
          </div>
        )}

        {(activeDex || view === 'settings') && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '20px', justifyContent: 'space-between' }}>
              <button onClick={() => {setActiveDex(null); setView('main')}} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>←</button>
              <b style={{ fontSize: '18px' }}>{activeDex || 'Настройки'}</b>
              <div style={{width: 30}}/>
            </div>

            {activeDex && (
              <div style={{ padding: '20px' }}>
                <div style={{ background: '#0f0f0f', padding: '20px', borderRadius: '20px', border: '1px solid #1a1a1a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.5, marginBottom: '10px' }}>
                    <span>Отдаете</span>
                    <span onClick={() => setAmount(payToken.symbol === 'USDT' ? balanceUSDT : (wallet[payToken.symbol] || 0))} style={{ color: '#39f2af', fontWeight: 'bold', cursor: 'pointer' }}>MAX: {payToken.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[payToken.symbol] || 0).toFixed(4)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '28px', width: '60%', outline: 'none' }} placeholder="0.0"/>
                    <button onClick={() => {setSelectingFor('pay'); setShowTokenList(true)}} style={{ background: '#222', border: 'none', color: '#fff', padding: '10px 15px', borderRadius: '12px', fontWeight: 'bold' }}>{payToken.symbol} ▾</button>
                  </div>
                </div>

                <div style={{ textAlign: 'center', margin: '15px 0', fontSize: '24px', opacity: 0.3 }}>↓</div>

                <div style={{ background: '#0f0f0f', padding: '20px', borderRadius: '20px', border: '1px solid #1a1a1a' }}>
                  <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '10px' }}>Получаете</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                    <button onClick={() => {setSelectingFor('receive'); setShowTokenList(true)}} style={{ background: '#222', border: 'none', color: '#fff', padding: '10px 15px', borderRadius: '12px', fontWeight: 'bold' }}>{receiveToken.symbol} ▾</button>
                  </div>
                </div>

                <button onClick={startSwap} style={{ width: '100%', background: '#39f2af', color: '#000', padding: '20px', borderRadius: '20px', fontWeight: 'bold', marginTop: '30px', fontSize: '18px', border: 'none' }}>ОБМЕНЯТЬ</button>
              </div>
            )}

            {view === 'settings' && (
              <div style={{ padding: '20px' }}>
                <div style={{ background: '#111', padding: '20px', borderRadius: '20px', marginBottom: '20px' }}>
                  <p style={{opacity:0.5, margin:0, fontSize: '12px'}}>ID Пользователя</p>
                  <b style={{fontSize: '18px'}}>{userId}</b>
                </div>
                <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', background: '#111', border: '1px solid #333', color: '#fff', padding: '18px', borderRadius: '15px', fontWeight: 'bold', fontSize: '16px' }}>👨‍💻 Менеджер</button>
                <p style={{ textAlign: 'center', opacity: 0.2, marginTop: '100px', fontSize: '12px' }}>v3.1.0 FullScreen Edition</p>
              </div>
            )}
          </div>
        )}

        {showTokenList && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, padding: '20px' }}>
             <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
               <button onClick={() => setShowTokenList(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>×</button>
               <h3 style={{ marginLeft: '20px' }}>Выберите токен</h3>
             </div>
             {Object.values(ASSETS).map(t => (
               <div key={t.symbol} onClick={() => { selectingFor === 'pay' ? setPayToken(t) : setReceiveToken(t); setShowTokenList(false); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid #111' }}>
                 <span style={{fontSize: '18px'}}>{t.icon} {t.symbol}</span>
                 <span style={{opacity: 0.5}}>${t.price}</span>
               </div>
             ))}
          </div>
        )}

        {isProcessing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#39f2af', fontWeight: 'bold' }}>ОБРАБОТКА ТРАНЗАКЦИИ...</div>}
        {toast && <div style={{ position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', padding: '15px 30px', borderRadius: '15px', background: toast.type==='error'?'#ff4d4d':'#39f2af', color: '#000', fontWeight: 'bold', zIndex: 6000 }}>{toast.text}</div>}
      </div>
    </div>
  );
}
