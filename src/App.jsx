import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, onDisconnect, serverTimestamp, update, query, orderByChild, limitToLast } from "firebase/database";

// --- Firebase Config ---
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
  const [online, setOnline] = useState(1);

  // Admin states
  const [adminClicks, setAdminClicks] = useState(0);
  const [isAdminVisible, setIsAdminVisible] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [allPlayers, setAllPlayers] = useState({});

  const userId = useMemo(() => {
    try {
      const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tg) return tg.username || tg.id.toString();
    } catch (e) {}
    return localStorage.getItem('arb_user_id') || 'Trader_' + Math.floor(Math.random() * 9999);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('arb_user_id')) localStorage.setItem('arb_user_id', userId);
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
  }, [userId]);

  useEffect(() => {
    const userRef = ref(db, 'players/' + userId);
    update(userRef, { balanceUSDT, wallet, username: userId, lastSeen: serverTimestamp() });
    onValue(ref(db, 'online'), (s) => setOnline(s.exists() ? Object.keys(s.val()).length : 1));
    if (isAuthorized) {
        onValue(ref(db, 'players'), (s) => s.exists() && setAllPlayers(s.val()));
    }
    localStorage.setItem('arb_balance', balanceUSDT);
    localStorage.setItem('arb_wallet', JSON.stringify(wallet));
  }, [balanceUSDT, wallet, userId, isAuthorized]);

  useEffect(() => {
    if (!signal) {
      const keys = Object.keys(ASSETS).filter(k => k !== 'USDT');
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      setSignal({ coin, buyAt: 'UNISWAP', sellAt: 'PANCAKE', profit: (Math.random() * 1.5 + 1.5).toFixed(2) });
    }
  }, [signal]);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleMax = () => {
    const val = payToken.symbol === 'USDT' ? balanceUSDT : (wallet[payToken.symbol] || 0);
    setAmount(val.toString());
  };

  const startSwap = () => {
    const num = Number(amount);
    if (!num || num <= 0) return showToast('Enter valid amount', 'error');

    setIsProcessing(true);
    setTimeout(() => {
      if (payToken.symbol === 'USDT') {
        if (balanceUSDT >= num) {
          setBalanceUSDT(prev => prev - num);
          setWallet(prev => ({ ...prev, [receiveToken.symbol]: (prev[receiveToken.symbol] || 0) + (num / receiveToken.price) }));
          showToast(`Success: Bought ${receiveToken.symbol}`);
        } else showToast('Insufficient USDT balance', 'error');
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          const isOk = payToken.symbol === signal?.coin.symbol && activeDex === signal?.sellAt;
          const prof = isOk ? (1 + signal.profit / 100) : (1 - (Math.random() * 0.015)); 
          const result = (num * payToken.price) * prof;
          setBalanceUSDT(prev => prev + result);
          setWallet(prev => ({ ...prev, [payToken.symbol]: has - num }));
          setSignal(null);
          showToast(isOk ? `Profit: +$${(result - (num * payToken.price)).toFixed(2)}` : 'Trade Closed (Loss)', isOk ? 'success' : 'error');
        } else showToast(`Not enough ${payToken.symbol}`, 'error');
      }
      setIsProcessing(false); setAmount(''); setActiveDex(null);
    }, 2000);
  };

  return (
    <div style={s.pageWrapper}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.online}>● {online} ONLINE</div>
          <button onClick={() => setView('settings')} style={s.btnIcon}>⚙️</button>
        </div>

        {view === 'main' && !activeDex && (
          <div style={{ padding: '0 20px' }}>
            <div style={s.balanceBox}>
              <h1 style={{ fontSize: 45, margin: 0 }}>${balanceUSDT.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
              <p style={{ opacity: 0.4, fontSize: 10, letterSpacing: 1 }}>AVAILABLE BALANCE</p>
            </div>

            <div style={s.card}>
              <p style={{ fontSize: 10, color: '#39f2af', fontWeight: 'bold', marginBottom: 10 }}>MY ASSETS</p>
              {Object.keys(wallet).filter(k => wallet[k] > 0).length === 0 ? 
                <p style={{opacity: 0.3, fontSize: 12}}>No assets found</p> :
                Object.keys(wallet).map(c => wallet[c] > 0 && (
                  <div key={c} style={s.row}><span>{ASSETS[c].icon} {c}</span><b>{wallet[c].toFixed(4)}</b></div>
                ))
              }
            </div>

            {signal && (
              <div style={s.signal}>
                <div style={{color: '#39f2af', fontSize: 10, fontWeight:'bold'}}>SIGNAL ACTIVE</div>
                <div style={{fontSize: 14, margin: '5px 0'}}>Buy {signal.coin.symbol} (Any) → Sell on <b>{signal.sellAt}</b></div>
                <div style={{fontSize: 14, color: '#39f2af'}}>Expected Profit: +{signal.profit}%</div>
              </div>
            )}

            <div style={s.grid}>
              {['UNISWAP', 'PANCAKE', 'RAYDIUM', '1INCH'].map(d => (
                <button key={d} onClick={() => setActiveDex(d)} style={s.dexBtn}>{d}</button>
              ))}
            </div>
          </div>
        )}

        {activeDex && (
          <div style={s.overlay}>
            <div style={s.header}>
              <button onClick={() => setActiveDex(null)} style={s.back}>←</button>
              <b>{activeDex}</b>
              <div style={{width: 24}}/>
            </div>
            <div style={{padding: 20}}>
               <div style={s.inputBox}>
                  <div style={s.labelRow}>
                    <span>You Pay</span>
                    <span onClick={handleMax} style={s.maxBtn}>MAX: {payToken.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[payToken.symbol] || 0).toFixed(4)}</span>
                  </div>
                  <div style={s.inputRow}>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={s.input} placeholder="0.0"/>
                    <button onClick={() => {setSelectingFor('pay'); setShowTokenList(true)}} style={s.tokenBtn}>{payToken.symbol} ▾</button>
                  </div>
               </div>
               <div style={{textAlign:'center', margin: '15px 0', opacity: 0.3}}>↓</div>
               <div style={s.inputBox}>
                  <div style={s.labelRow}><span>You Receive</span></div>
                  <div style={s.inputRow}>
                    <div style={{fontSize: 22, fontWeight: 'bold'}}>
                      {amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}
                    </div>
                    <button onClick={() => {setSelectingFor('receive'); setShowTokenList(true)}} style={s.tokenBtn}>{receiveToken.symbol} ▾</button>
                  </div>
               </div>
               <button onClick={startSwap} style={s.mainBtn}>EXECUTE SWAP</button>
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div style={s.overlay}>
             <div style={s.header}><button onClick={() => setView('main')} style={s.back}>←</button><h2>Settings</h2><div/></div>
             <div style={{padding: 20}}>
                <div style={s.card}>
                  <p style={{opacity:0.5, margin:0}}>Account ID</p>
                  <code style={{color:'#39f2af'}}>{userId}</code>
                </div>
                <p style={{textAlign:'center', opacity:0.2, marginTop: 40}} onClick={() => {setAdminClicks(c => c+1); if(adminClicks > 4) setIsAdminVisible(true)}}>
                  Version 2.1.0-stable
                </p>
                {isAdminVisible && !isAuthorized && (
                  <div style={{marginTop: 20}}>
                    <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} style={s.adminInput} placeholder="Admin Password"/>
                    <button onClick={() => adminPass === 'admin123' && setIsAuthorized(true)} style={s.mainBtn}>Login</button>
                  </div>
                )}
                {isAuthorized && (
                  <div style={s.adminPanel}>
                    <h3 style={{color:'#39f2af'}}>Admin Panel</h3>
                    {Object.keys(allPlayers).map(p => (
                      <div key={p} style={s.adminRow}>
                        <span style={{fontSize: 10}}>{allPlayers[p].username}</span>
                        <button onClick={() => update(ref(db, 'players/'+p), {balanceUSDT: (allPlayers[p].balanceUSDT || 0) + 1000})} style={s.miniBtn}>+$1k</button>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        )}

        {showTokenList && (
          <div style={{...s.overlay, zIndex: 1000}}>
            <div style={s.header}><button onClick={() => setShowTokenList(false)} style={s.back}>×</button><h3>Tokens</h3><div/></div>
            <div style={{padding: 10}}>
              {Object.values(ASSETS).map(t => (
                <div key={t.symbol} onClick={() => { selectingFor === 'pay' ? setPayToken(t) : setReceiveToken(t); setShowTokenList(false); }} style={s.tokenRow}>
                  <span>{t.icon} {t.symbol}</span>
                  <span>${t.price}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isProcessing && <div style={s.loader}>TRANSACTION IN PROGRESS...</div>}
        {toast && <div style={{...s.toast, background: toast.type === 'error' ? '#ff4d4d' : '#39f2af'}}>{toast.text}</div>}
      </div>
    </div>
  );
}

const s = {
  pageWrapper: { background: '#050505', minHeight: '100vh', display: 'flex', justifyContent: 'center' },
  container: { width: '100%', maxWidth: '450px', height: '100vh', background: '#000', color: '#fff', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px' },
  online: { color: '#39f2af', fontSize: 10, fontWeight: 'bold', background: 'rgba(57,242,175,0.1)', padding: '4px 10px', borderRadius: 20 },
  btnIcon: { background: '#111', border: 'none', color: '#fff', padding: 8, borderRadius: 10, cursor: 'pointer' },
  balanceBox: { textAlign: 'center', margin: '30px 0' },
  card: { background: '#0a0a0a', padding: 15, borderRadius: 15, border: '1px solid #111', marginBottom: 15 },
  row: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #111' },
  signal: { background: 'rgba(57,242,175,0.05)', border: '1px solid rgba(57,242,175,0.2)', padding: 15, borderRadius: 15, marginBottom: 15 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  dexBtn: { background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#fff', padding: 20, borderRadius: 15, fontWeight: 'bold', cursor: 'pointer' },
  overlay: { position: 'absolute', inset: 0, background: '#000', zIndex: 50 },
  back: { background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' },
  inputBox: { background: '#0a0a0a', padding: 15, borderRadius: 15, border: '1px solid #1a1a1a' },
  labelRow: { display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 8, opacity: 0.5 },
  maxBtn: { color: '#39f2af', fontWeight: 'bold', cursor: 'pointer' },
  inputRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  input: { background: 'none', border: 'none', color: '#fff', fontSize: 24, width: '60%', outline: 'none' },
  tokenBtn: { background: '#1a1a1a', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 10, cursor: 'pointer' },
  mainBtn: { width: '100%', background: '#39f2af', color: '#000', padding: 18, borderRadius: 15, fontWeight: 'bold', fontSize: 16, marginTop: 20, border: 'none', cursor: 'pointer' },
  tokenRow: { display: 'flex', justifyContent: 'space-between', padding: 20, borderBottom: '1px solid #111', cursor: 'pointer' },
  loader: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#39f2af', fontWeight: 'bold' },
  toast: { position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', padding: '12px 25px', borderRadius: 10, color: '#000', fontWeight: 'bold', zIndex: 6000, whiteSpace: 'nowrap' },
  adminInput: { width: '100%', padding: 15, background: '#111', border: '1px solid #222', color: '#fff', borderRadius: 10, marginBottom: 10 },
  adminPanel: { marginTop: 20, background: '#050505', padding: 10, borderRadius: 10, maxHeight: '300px', overflowY: 'auto' },
  adminRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #111' },
  miniBtn: { background: '#39f2af', border: 'none', padding: '4px 8px', borderRadius: 5, fontSize: 10, cursor: 'pointer' }
};
