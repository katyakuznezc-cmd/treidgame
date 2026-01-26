import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, onDisconnect, serverTimestamp, update, query, orderByChild, limitToLast } from "firebase/database";

// Конфиг Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCKmEa1B4xOdMdNGXBDK2LeOhBQoMqWv40",
  authDomain: "treidgame-b2ae0.firebaseapp.com",
  projectId: "treidgame-b2ae0",
  storageBucket: "treidgame-b2ae0.firebasestorage.app",
  messagingSenderId: "985305772375",
  appId: "1:985305772375:web:08d9b482a6f9d3cd748e12"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const ASSETS = {
  USDT: { symbol: 'USDT', price: 1, icon: '💵' },
  SOL: { symbol: 'SOL', price: 145.50, icon: '🟣' },
  ETH: { symbol: 'ETH', price: 2600.00, icon: '🔷' },
  BNB: { symbol: 'BNB', price: 605.20, icon: '🟡' },
  DOGE: { symbol: 'DOGE', price: 0.16, icon: '🐕' },
  XRP: { symbol: 'XRP', price: 0.62, icon: '✖️' },
  TRX: { symbol: 'TRX', price: 0.12, icon: '🔴' }
};

export default function App() {
  const [balanceUSDT, setBalanceUSDT] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('arb_wallet')) || {});
  const [history, setHistory] = useState([]);
  const [lang, setLang] = useState('RU');
  const [view, setView] = useState('main'); 
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payToken, setPayToken] = useState(ASSETS.USDT);
  const [receiveToken, setReceiveToken] = useState(ASSETS.SOL);
  const [amount, setAmount] = useState('');
  const [online, setOnline] = useState(1);

  // Инициализация пользователя
  const userId = useMemo(() => {
    let name = 'User_' + Math.floor(Math.random() * 9999);
    try {
      if (window.Telegram?.WebApp?.initDataUnsafe?.user?.username) {
        name = window.Telegram.WebApp.initDataUnsafe.user.username;
      }
    } catch (e) {}
    return name;
  }, []);

  // Принудительная загрузка для Telegram
  useEffect(() => {
    try {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      }
    } catch (e) {}
  }, []);

  // Синхронизация данных
  useEffect(() => {
    const userRef = ref(db, 'players/' + userId);
    update(userRef, { balanceUSDT, wallet, username: userId, lastSeen: serverTimestamp() });
    onValue(ref(db, 'online'), (s) => setOnline(s.exists() ? Object.keys(s.val()).length : 1));
    
    localStorage.setItem('arb_balance', balanceUSDT);
    localStorage.setItem('arb_wallet', JSON.stringify(wallet));
  }, [balanceUSDT, wallet, userId]);

  // Генерация сигналов
  useEffect(() => {
    if (!signal) {
      const keys = Object.keys(ASSETS).filter(k => k !== 'USDT');
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      setSignal({ coin, buyAt: 'UNISWAP', sellAt: 'PANCAKE', profit: (Math.random() * 1.5 + 1.5).toFixed(2) });
    }
  }, [signal]);

  const handleMax = () => {
    const val = payToken.symbol === 'USDT' ? balanceUSDT : (wallet[payToken.symbol] || 0);
    setAmount(val.toString());
  };

  const startSwap = () => {
    if (!amount || Number(amount) <= 0) return;
    setIsProcessing(true);
    setTimeout(() => {
      const num = Number(amount);
      if (payToken.symbol === 'USDT') {
        if (balanceUSDT >= num) {
          setBalanceUSDT(prev => prev - num);
          setWallet(prev => ({ ...prev, [receiveToken.symbol]: (prev[receiveToken.symbol] || 0) + (num / receiveToken.price) }));
        }
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          const isOk = payToken.symbol === signal?.coin.symbol;
          const p = isOk ? (1 + signal.profit / 100) : 0.98;
          const result = (num * payToken.price) * p;
          setBalanceUSDT(prev => prev + result);
          setWallet(prev => ({ ...prev, [payToken.symbol]: has - num }));
          setSignal(null);
        }
      }
      setIsProcessing(false);
      setAmount('');
      setActiveDex(null);
    }, 2000);
  };

  return (
    <div style={styles.app}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ color: '#39f2af', fontWeight: 'bold' }}>● {online} ONLINE</div>
        <button onClick={() => setView('settings')} style={styles.btnIcon}>⚙️</button>
      </div>

      {view === 'main' && !activeDex && (
        <div style={{ padding: 20 }}>
          <div style={styles.balanceSection}>
            <h1 style={{ fontSize: 40, margin: 0 }}>${balanceUSDT.toFixed(2)}</h1>
            <p style={{ opacity: 0.5, fontSize: 12 }}>TOTAL USDT BALANCE</p>
          </div>

          {/* Мой Кошелек (Список токенов) */}
          <div style={styles.walletBox}>
            <p style={{ fontSize: 10, color: '#39f2af', marginBottom: 10 }}>MY ASSETS</p>
            {Object.keys(wallet).map(coin => wallet[coin] > 0 && (
              <div key={coin} style={styles.assetRow}>
                <span>{ASSETS[coin]?.icon} {coin}</span>
                <b>{wallet[coin].toFixed(4)}</b>
              </div>
            ))}
          </div>

          {signal && (
            <div style={styles.signalCard}>
              <p style={{ color: '#39f2af', fontSize: 10, margin: 0 }}>ARBITRAGE SIGNAL</p>
              <div style={{ fontSize: 14, marginTop: 5 }}>Buy {signal.coin.symbol} on {signal.buyAt}</div>
              <div style={{ fontSize: 14 }}>Sell on {signal.sellAt} <span style={{ color: '#39f2af' }}>+{signal.profit}%</span></div>
            </div>
          )}

          <div style={styles.grid}>
            {['UNISWAP', 'PANCAKE', 'RAYDIUM', '1INCH'].map(d => (
              <button key={d} onClick={() => setActiveDex(d)} style={styles.dexBtn}>{d}</button>
            ))}
          </div>
        </div>
      )}

      {activeDex && (
        <div style={styles.overlay}>
          <div style={styles.header}>
            <button onClick={() => setActiveDex(null)} style={styles.back}>←</button>
            <b>{activeDex}</b>
            <div style={{ width: 20 }} />
          </div>
          <div style={{ padding: 20 }}>
            <div style={styles.inputGroup}>
              <div style={styles.inputLabels}>
                <span>Pay</span>
                <span onClick={handleMax} style={{ color: '#39f2af', cursor: 'pointer' }}>MAX: {payToken.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[payToken.symbol] || 0).toFixed(4)}</span>
              </div>
              <div style={styles.inputRow}>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={styles.field} placeholder="0.0" />
                <button onClick={() => {setPayToken(ASSETS.USDT); setReceiveToken(ASSETS.SOL)}} style={styles.tokenSel}>{payToken.symbol}</button>
              </div>
            </div>
            
            <div style={{ textAlign: 'center', margin: '10px 0', fontSize: 20 }}>↓</div>

            <div style={styles.inputGroup}>
              <div style={styles.inputLabels}><span>Receive</span></div>
              <div style={styles.inputRow}>
                <div style={{ fontSize: 20, fontWeight: 'bold' }}>
                    {amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}
                </div>
                <button onClick={() => {setPayToken(ASSETS.SOL); setReceiveToken(ASSETS.USDT)}} style={styles.tokenSel}>{receiveToken.symbol}</button>
              </div>
            </div>

            <button onClick={startSwap} style={styles.actionBtn}>CONFIRM EXCHANGE</button>
          </div>
        </div>
      )}

      {view === 'settings' && (
        <div style={styles.overlay}>
          <div style={styles.header}><button onClick={() => setView('main')} style={styles.back}>←</button><h2>Settings</h2><div/></div>
          <div style={{ padding: 20 }}>
             <p>User ID: {userId}</p>
             <button onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')} style={styles.actionBtn}>Lang: {lang}</button>
             <a href="https://t.me/kriptoalians" style={{ color: '#39f2af', display: 'block', textAlign: 'center', marginTop: 20 }}>@kriptoalians</a>
          </div>
        </div>
      )}

      {isProcessing && <div style={styles.loader}>TRANSACTION PROCESSING...</div>}
    </div>
  );
}

const styles = {
  app: { width: '100%', height: '100vh', background: '#000', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: '#000' },
  btnIcon: { background: '#111', border: 'none', color: '#fff', fontSize: 18, borderRadius: 10, padding: 8 },
  balanceSection: { textAlign: 'center', margin: '30px 0' },
  walletBox: { background: '#111', borderRadius: 15, padding: 15, marginBottom: 20, border: '1px solid #222' },
  assetRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 14 },
  signalCard: { background: 'rgba(57,242,175,0.1)', border: '1px solid #39f2af', padding: 15, borderRadius: 15, marginBottom: 20 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  dexBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: 20, borderRadius: 15, fontWeight: 'bold' },
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#000', zIndex: 100 },
  back: { background: 'none', border: 'none', color: '#fff', fontSize: 24 },
  inputGroup: { background: '#111', padding: 15, borderRadius: 15 },
  inputLabels: { display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 8 },
  inputRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  field: { background: 'none', border: 'none', color: '#fff', fontSize: 22, outline: 'none', width: '60%' },
  tokenSel: { background: '#222', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 10, fontWeight: 'bold' },
  actionBtn: { width: '100%', background: '#39f2af', color: '#000', border: 'none', padding: 18, borderRadius: 15, fontWeight: 'bold', marginTop: 20 },
  loader: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#39f2af' }
};
