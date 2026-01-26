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
  BNB: { symbol: 'BNB', price: 605.20, icon: '🟡' }
};

export default function App() {
  // Загружаем данные СРАЗУ из памяти, чтобы не было черного экрана
  const [balanceUSDT, setBalanceUSDT] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('arb_wallet')) || {});
  const [view, setView] = useState('main'); 
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState(null);
  const [amount, setAmount] = useState('');
  
  const userId = useMemo(() => {
    try {
      const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tg) return tg.username || tg.id.toString();
    } catch (e) {}
    return localStorage.getItem('arb_user_id') || 'Trader_' + Math.floor(Math.random() * 9999);
  }, []);

  // Инициализация Telegram
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  // ПОДКЛЮЧАЕМ FIREBASE С ЗАДЕРЖКОЙ, ЧТОБЫ НЕ ВЕШАТЬ ЭКРАН
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const app = initializeApp(firebaseConfig);
        const db = getDatabase(app);
        const userRef = ref(db, 'players/' + userId);

        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.balanceUSDT !== undefined) setBalanceUSDT(data.balanceUSDT);
            if (data.wallet) setWallet(data.wallet);
          }
        });

        // Сохранение каждые 10 секунд
        const saveInterval = setInterval(() => {
          update(userRef, { 
            balanceUSDT, 
            wallet, 
            lastSeen: serverTimestamp(), 
            username: userId 
          });
          localStorage.setItem('arb_balance', balanceUSDT);
          localStorage.setItem('arb_wallet', JSON.stringify(wallet));
        }, 10000);

        return () => clearInterval(saveInterval);
      } catch (e) { console.error("Firebase connection failed", e); }
    }, 2000); // 2 секунды задержки

    return () => clearTimeout(timer);
  }, [balanceUSDT, wallet, userId]);

  // Генератор сигналов
  useEffect(() => {
    if (!signal) {
      const keys = Object.keys(ASSETS).filter(k => k !== 'USDT');
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      setSignal({ coin, buyAt: 'UNISWAP', sellAt: 'PANCAKE', profit: (Math.random() * 1.5 + 1.2).toFixed(2) });
    }
  }, [signal]);

  const notify = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const startSwap = () => {
    const num = Number(amount);
    if (!num || num <= 0 || num > balanceUSDT) return notify('Ошибка суммы', 'error');
    
    setIsProcessing(true);
    setTimeout(() => {
      const isOk = activeDex === signal?.sellAt;
      const profitMult = isOk ? (1 + signal.profit / 100) : 0.985; // 3% профит или -1.5% рандом
      
      setBalanceUSDT(prev => prev - num + (num * profitMult));
      notify(isOk ? `Прибыль: +${signal.profit}%` : 'Сделка в минус (1.5%)', isOk ? 'success' : 'error');
      
      setIsProcessing(false);
      setAmount('');
      setActiveDex(null);
      setSignal(null);
    }, 1500);
  };

  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', display: 'flex', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '450px', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px' }}>
          <div style={{ color: '#39f2af', fontSize: '12px', fontWeight: 'bold' }}>● ONLINE MODE</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: 'none', color: '#fff', padding: '10px', borderRadius: '10px' }}>⚙️</button>
        </div>

        {view === 'main' && !activeDex && (
          <div style={{ padding: '0 20px' }}>
            <div style={{ textAlign: 'center', margin: '30px 0' }}>
              <h1 style={{ fontSize: '48px', margin: 0 }}>${balanceUSDT.toFixed(2)}</h1>
              <p style={{ opacity: 0.4, fontSize: '11px' }}>USDT BALANCE</p>
            </div>

            {signal && (
              <div style={{ background: 'rgba(57,242,175,0.05)', border: '1px solid #39f2af44', padding: '15px', borderRadius: '18px', marginBottom: '20px' }}>
                <div style={{ color: '#39f2af', fontSize: '10px', fontWeight: 'bold' }}>СИГНАЛ: {signal.coin.symbol}</div>
                <div style={{ fontSize: '14px', margin: '5px 0' }}>Продай на <b style={{color: '#39f2af'}}>{signal.sellAt}</b></div>
                <div style={{ fontSize: '14px' }}>Ожидаемый профит: +{signal.profit}%</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {['UNISWAP', 'PANCAKE', 'RAYDIUM', '1INCH'].map(d => (
                <button key={d} onClick={() => setActiveDex(d)} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#fff', padding: '25px 0', borderRadius: '18px', fontWeight: 'bold', cursor: 'pointer' }}>{d}</button>
              ))}
            </div>
          </div>
        )}

        {activeDex && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000', zIndex: 10 }}>
            <div style={{ padding: '20px' }}>
              <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px' }}>←</button>
              <h2 style={{ textAlign: 'center' }}>{activeDex}</h2>
              <div style={{ background: '#111', padding: '20px', borderRadius: '20px', border: '1px solid #222' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.5 }}>
                  <span>Сумма USDT</span>
                  <span onClick={() => setAmount(balanceUSDT.toString())} style={{ color: '#39f2af', fontWeight: 'bold', cursor: 'pointer' }}>MAX</span>
                </div>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px', width: '100%', outline: 'none', marginTop: '10px' }} placeholder="0.0" />
              </div>
              <button onClick={startSwap} style={{ width: '100%', background: '#39f2af', color: '#000', padding: '20px', borderRadius: '20px', fontWeight: 'bold', marginTop: '20px', border: 'none' }}>ОБМЕНЯТЬ</button>
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000', zIndex: 10, padding: '20px' }}>
            <button onClick={() => setView('main')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px' }}>←</button>
            <div style={{ marginTop: '40px' }}>
               <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', background: '#111', color: '#fff', padding: '15px', borderRadius: '15px', border: '1px solid #333' }}>Менеджер</button>
               <p style={{ textAlign: 'center', opacity: 0.1, marginTop: '100px' }}>v2.9.0 Ultra-Safe</p>
            </div>
          </div>
        )}

        {isProcessing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>ОБРАБОТКА...</div>}
        {toast && <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', padding: '12px 25px', borderRadius: '12px', background: toast.type === 'error' ? '#ff4d4d' : '#39f2af', color: '#000', fontWeight: 'bold', zIndex: 1000 }}>{toast.text}</div>}
      </div>
    </div>
  );
}
