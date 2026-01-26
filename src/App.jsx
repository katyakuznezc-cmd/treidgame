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
  const [lang, setLang] = useState('RU');
  const [view, setView] = useState('main'); 
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTokenList, setShowTokenList] = useState(false);
  const [selectingFor, setSelectingFor] = useState('pay');
  const [payToken, setPayToken] = useState(ASSETS.USDT);
  const [receiveToken, setReceiveToken] = useState(ASSETS.SOL);
  const [amount, setAmount] = useState('');
  const [online, setOnline] = useState(1);

  const userId = useMemo(() => {
    try {
      const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tg) return tg.username || tg.id.toString();
    } catch (e) {}
    return localStorage.getItem('arb_user_id') || 'Trader_' + Math.floor(Math.random() * 9999);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('arb_user_id')) localStorage.setItem('arb_user_id', userId);
    try {
      window.Telegram?.WebApp?.ready();
      window.Telegram?.WebApp?.expand();
    } catch (e) {}
  }, [userId]);

  useEffect(() => {
    const userRef = ref(db, 'players/' + userId);
    update(userRef, { balanceUSDT, wallet, username: userId, lastSeen: serverTimestamp() });
    onValue(ref(db, 'online'), (s) => setOnline(s.exists() ? Object.keys(s.val()).length : 1));
    localStorage.setItem('arb_balance', balanceUSDT);
    localStorage.setItem('arb_wallet', JSON.stringify(wallet));
  }, [balanceUSDT, wallet, userId]);

  useEffect(() => {
    if (!signal) {
      const keys = Object.keys(ASSETS).filter(k => k !== 'USDT');
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      setSignal({ coin, buyAt: 'UNISWAP', sellAt: 'PANCAKE', profit: (Math.random() * 1.5 + 1.5).toFixed(2) });
    }
  }, [signal]);

  const handleMax = (e) => {
    e.preventDefault(); e.stopPropagation();
    const val = payToken.symbol === 'USDT' ? balanceUSDT : (wallet[payToken.symbol] || 0);
    setAmount(val.toString());
  };

  const startSwap = (e) => {
    e.preventDefault();
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
          const isOk = payToken.symbol === signal?.coin.symbol && activeDex === signal?.sellAt;
          const p = isOk ? (1 + signal.profit / 100) : 0.985;
          const result = (num * payToken.price) * p;
          setBalanceUSDT(prev => prev + result);
          setWallet(prev => ({ ...prev, [payToken.symbol]: has - num }));
          setSignal(null);
        }
      }
      setIsProcessing(false); setAmount(''); setActiveDex(null);
    }, 2000);
  };

  const openTokenList = (type) => { setSelectingFor(type); setShowTokenList(true); };

  const selectToken = (token) => {
    if (selectingFor === 'pay') setPayToken(token);
    else setReceiveToken(token);
    setShowTokenList(false);
  };

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={{ color: '#39f2af', fontWeight: 'bold' }}>● {online} ONLINE</div>
        <button onTouchStart={() => setView('settings')} onClick={() => setView('settings')} style={styles.btnIcon}>⚙️</button>
      </div>

      {view === 'main' && !activeDex && (
        <div style={{ padding: '0 20px' }}>
          <div style={styles.balanceSection}>
            <h1 style={{ fontSize: 45, margin: 0 }}>${balanceUSDT.toFixed(2)}</h1>
            <p style={{ opacity: 0.5, fontSize: 10, letterSpacing: 1 }}>USDT BALANCE</p>
          </div>

          <div style={styles.walletBox}>
            <p style={{ fontSize: 10, color: '#39f2af', marginBottom: 10, fontWeight: 'bold' }}>MY WALLET</p>
            {Object.keys(wallet).length === 0 || Object.values(wallet).every(v => v === 0) ? 
              <p style={{fontSize: 12, opacity: 0.3}}>No assets yet</p> :
              Object.keys(wallet).map(coin => wallet[coin] > 0 && (
                <div key={coin} style={styles.assetRow}>
                  <span>{ASSETS[coin]?.icon} {coin}</span>
                  <b>{wallet[coin].toFixed(4)}</b>
                </div>
              ))
            }
          </div>

          {signal && (
            <div style={styles.signalCard}>
              <p style={{ color: '#39f2af', fontSize: 10, fontWeight: 'bold' }}>SIGNAL FOUND</p>
              <div style={{ fontSize: 14 }}>Buy {signal.coin.symbol} on {signal.buyAt}</div>
              <div style={{ fontSize: 14 }}>Sell on {signal.sellAt} <span style={{ color: '#39f2af' }}>+{signal.profit}%</span></div>
            </div>
          )}

          <div style={styles.grid}>
            {['UNISWAP', 'PANCAKE', 'RAYDIUM', '1INCH'].map(d => (
              <button key={d} onTouchStart={() => setActiveDex(d)} onClick={() => setActiveDex(d)} style={styles.dexBtn}>{d}</button>
            ))}
          </div>
        </div>
      )}

      {activeDex && (
        <div style={styles.overlay}>
          <div style={styles.header}>
            <button onTouchStart={() => setActiveDex(null)} onClick={() => setActiveDex(null)} style={styles.back}>←</button>
            <b>{activeDex} EXCHANGE</b>
            <div style={{ width: 24 }} />
          </div>
          <div style={{ padding: 20 }}>
            <div style={styles.inputGroup}>
              <div style={styles.inputLabels}>
                <span>You Pay</span>
                <span onTouchStart={handleMax} onClick={handleMax} style={{ color: '#39f2af', fontWeight: 'bold' }}>
                  MAX: {payToken.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[payToken.symbol] || 0).toFixed(4)}
                </span>
              </div>
              <div style={styles.inputRow}>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={styles.field} placeholder="0.0" />
                <button onTouchStart={() => openTokenList('pay')} onClick={() => openTokenList('pay')} style={styles.tokenSel}>{payToken.symbol} ▾</button>
              </div>
            </div>
            
            <div style={{ textAlign: 'center', margin: '15px 0', fontSize: 24, opacity: 0.5 }}>↓</div>

            <div style={styles.inputGroup}>
              <div style={styles.inputLabels}><span>You Receive</span></div>
              <div style={styles.inputRow}>
                <div style={{ fontSize: 22, fontWeight: 'bold' }}>
                    {amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}
                </div>
                <button onTouchStart={() => openTokenList('receive')} onClick={() => openTokenList('receive')} style={styles.tokenSel}>{receiveToken.symbol} ▾</button>
              </div>
            </div>

            <button onTouchStart={startSwap} onClick={startSwap} style={styles.actionBtn}>CONFIRM TRANSACTION</button>
          </div>
        </div>
      )}

      {showTokenList && (
        <div style={{ ...styles.overlay, zIndex: 200 }}>
          <div style={styles.header}>
            <button onTouchStart={() => setShowTokenList(false)} onClick={() => setShowTokenList(false)} style={styles.back}>×</button>
            <h3>Select Token</h3>
            <div style={{width:20}}/>
          </div>
          <div style={{ padding: 10 }}>
            {Object.values(ASSETS).map(t => (
              <div key={t.symbol} onTouchStart={() => selectToken(t)} onClick={() => selectToken(t)} style={styles.tokenItem}>
                <span style={{fontSize: 24}}>{t.icon}</span>
                <div style={{marginLeft: 15, flex: 1}}>
                  <div style={{fontWeight: 'bold'}}>{t.symbol}</div>
                  <div style={{fontSize: 10, opacity: 0.5}}>${t.price}</div>
                </div>
                <div style={{textAlign: 'right'}}>
                   {t.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[t.symbol] || 0).toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'settings' && (
        <div style={styles.overlay}>
          <div style={styles.header}><button onTouchStart={() => setView('main')} onClick={() => setView('main')} style={styles.back}>←</button><h2>Settings</h2><div/></div>
          <div style={{ padding: 20, textAlign: 'center' }}>
             <p style={{opacity: 0.5}}>Logged as: {userId}</p>
             <button onTouchStart={() => setLang(lang === 'RU' ? 'EN' : 'RU')} onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')} style={styles.actionBtn}>Language: {lang}</button>
             <p style={{marginTop: 40, fontSize: 12, opacity: 0.3}}>Arbitrage Pro v2.0.6</p>
             <a href="https://t.me/kriptoalians" style={{ color: '#39f2af', textDecoration: 'none', display: 'block', marginTop: 10 }}>Support @kriptoalians</a>
          </div>
        </div>
      )}

      {isProcessing && <div style={styles.loader}><div className="spinner"></div><p>PROCESSING...</p></div>}
      <style>{`.spinner { width: 30px; height: 30px; border: 3px solid #111; border-top-color: #39f2af; border-radius: 50%; animation: s 1s linear infinite; margin-bottom: 10px; } @keyframes s { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles = {
  app: { width: '100%', height: '100vh', background: '#000', color: '#fff', fontFamily: '-apple-system, system-ui, sans-serif', overflowX: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: '#000' },
  btnIcon: { background: '#111', border: '1px solid #222', color: '#fff', fontSize: 18, borderRadius: 12, padding: 10, cursor: 'pointer' },
  balanceSection: { textAlign: 'center', margin: '20px 0 30px' },
  walletBox: { background: '#0a0a0a', borderRadius: 20, padding: 20, marginBottom: 20, border: '1px solid #1a1a1a' },
  assetRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #111' },
  signalCard: { background: 'rgba(57,242,175,0.05)', border: '1px solid rgba(57,242,175,0.3)', padding: 15, borderRadius: 15, marginBottom: 20 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  dexBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: '25px 0', borderRadius: 20, fontWeight: 'bold', fontSize: 14, cursor: 'pointer' },
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#000', zIndex: 100, overflowY: 'auto' },
  back: { background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer' },
  inputGroup: { background: '#111', padding: 20, borderRadius: 20, border: '1px solid #222' },
  inputLabels: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 10, opacity: 0.6 },
  inputRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  field: { background: 'none', border: 'none', color: '#fff', fontSize: 26, outline: 'none', width: '60%', fontWeight: 'bold' },
  tokenSel: { background: '#222', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer' },
  actionBtn: { width: '100%', background: '#39f2af', color: '#000', border: 'none', padding: 20, borderRadius: 20, fontWeight: '900', fontSize: 16, marginTop: 25, cursor: 'pointer' },
  tokenItem: { display: 'flex', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #111', cursor: 'pointer' },
  loader: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#39f2af', fontWeight: 'bold' }
};
