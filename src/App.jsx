import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, serverTimestamp, update } from "firebase/database";

// --- КОНФИГ (НЕ МЕНЯТЬ) ---
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
  
  // Админ-состояния
  const [adminClicks, setAdminClicks] = useState(0);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [playersList, setPlayersList] = useState({});

  const userId = useMemo(() => {
    try {
      const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tg) return tg.username || tg.id.toString();
    } catch (e) {}
    return localStorage.getItem('arb_user_id') || 'Trader_' + Math.floor(Math.random() * 9999);
  }, []);

  // 1. Инициализация Telegram
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    if (!localStorage.getItem('arb_user_id')) localStorage.setItem('arb_user_id', userId);
  }, [userId]);

  // 2. Инициализация Firebase и Синхронизация
  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const userRef = ref(db, 'players/' + userId);

    update(userRef, { balanceUSDT, wallet, username: userId, lastSeen: serverTimestamp() });
    
    if (isAuthorized) {
      onValue(ref(db, 'players'), (s) => s.exists() && setPlayersList(s.val()));
    }

    localStorage.setItem('arb_balance', balanceUSDT);
    localStorage.setItem('arb_wallet', JSON.stringify(wallet));
  }, [balanceUSDT, wallet, userId, isAuthorized]);

  // 3. Генератор сигналов
  useEffect(() => {
    if (!signal) {
      const keys = Object.keys(ASSETS).filter(k => k !== 'USDT');
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      setSignal({ coin, buyAt: 'UNISWAP', sellAt: 'PANCAKE', profit: (Math.random() * 1.5 + 1.2).toFixed(2) });
    }
  }, [signal]);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleMax = () => {
    const val = payToken.symbol === 'USDT' ? balanceUSDT : (wallet[payToken.symbol] || 0);
    setAmount(val.toFixed(payToken.symbol === 'USDT' ? 2 : 4));
  };

  const executeSwap = () => {
    const num = Number(amount);
    if (!num || num <= 0) return showToast('Введите сумму', 'error');
    setIsProcessing(true);

    setTimeout(() => {
      if (payToken.symbol === 'USDT') {
        if (balanceUSDT >= num) {
          setBalanceUSDT(prev => prev - num);
          setWallet(prev => ({ ...prev, [receiveToken.symbol]: (prev[receiveToken.symbol] || 0) + (num / receiveToken.price) }));
          showToast(`Куплено ${receiveToken.symbol}`);
        } else showToast('Недостаточно USDT', 'error');
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          const isCorrectDex = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          const multiplier = isCorrectDex ? (1 + signal.profit / 100) : (1 - (Math.random() * 0.02 + 0.01));
          const result = (num * payToken.price) * multiplier;
          
          setBalanceUSDT(prev => prev + result);
          setWallet(prev => ({ ...prev, [payToken.symbol]: has - num }));
          setSignal(null);
          showToast(isCorrectDex ? `Профит: +$${(result - num*payToken.price).toFixed(2)}` : 'Сделка в минус', isCorrectDex ? 'success' : 'error');
        } else showToast(`Нет столько ${payToken.symbol}`, 'error');
      }
      setIsProcessing(false); setAmount(''); setActiveDex(null);
    }, 1500);
  };

  return (
    <div style={s.page}>
      <div style={s.appContainer}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.status}>● LIVE TRADING</div>
          <button onClick={() => setView('settings')} style={s.iconBtn}>⚙️</button>
        </div>

        {view === 'main' && !activeDex && (
          <div style={{ padding: '0 20px' }}>
            <div style={s.hero}>
              <h1 style={s.balanceText}>${balanceUSDT.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
              <p style={s.subText}>USDT BALANCE</p>
            </div>

            <div style={s.card}>
              <p style={s.cardTitle}>ВАШИ АКТИВЫ</p>
              {Object.keys(wallet).filter(k => wallet[k] > 0).length === 0 ? <p style={{opacity:0.3, fontSize:'12px'}}>Нет монет</p> :
                Object.keys(wallet).map(c => wallet[c] > 0 && (
                  <div key={c} style={s.assetRow}>
                    <span>{ASSETS[c].icon} {c}</span><b>{wallet[c].toFixed(4)}</b>
                  </div>
                ))
              }
            </div>

            {signal && (
              <div style={s.signalCard}>
                <div style={{color:'#39f2af', fontSize:'10px', fontWeight:'bold'}}>NEW SIGNAL</div>
                <div style={{fontSize:'14px', margin:'5px 0'}}>Купи {signal.coin.symbol} → Продай на <b style={{color:'#39f2af'}}>{signal.sellAt}</b></div>
                <div style={{fontSize:'13px', opacity:0.8}}>Ожидаемый профит: +{signal.profit}%</div>
              </div>
            )}

            <div style={s.grid}>
              {['UNISWAP', 'PANCAKE', 'RAYDIUM', '1INCH'].map(d => (
                <button key={d} onClick={() => setActiveDex(d)} style={s.dexBtn}>{d}</button>
              ))}
            </div>
          </div>
        )}

        {(activeDex || view === 'settings') && (
          <div style={s.overlay}>
             <div style={s.header}>
               <button onClick={() => {setActiveDex(null); setView('main')}} style={s.backBtn}>←</button>
               <b>{activeDex || 'Настройки'}</b>
               <div style={{width:24}}/>
             </div>

             {activeDex && (
               <div style={{padding:20}}>
                 <div style={s.inputBox}>
                   <div style={s.inputHeader}>
                     <span>Отдаете</span>
                     <span onClick={handleMax} style={s.maxLink}>MAX: {payToken.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[payToken.symbol] || 0).toFixed(4)}</span>
                   </div>
                   <div style={s.inputRow}>
                     <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={s.inputField} placeholder="0.0"/>
                     <button onClick={() => {setSelectingFor('pay'); setShowTokenList(true)}} style={s.tokenSelect}>{payToken.symbol} ▾</button>
                   </div>
                 </div>
                 <div style={{textAlign:'center', margin:'10px 0', opacity:0.3}}>↓</div>
                 <div style={s.inputBox}>
                   <div style={s.inputHeader}><span>Получаете</span></div>
                   <div style={s.inputRow}>
                     <div style={{fontSize:'22px', fontWeight:'bold'}}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                     <button onClick={() => {setSelectingFor('receive'); setShowTokenList(true)}} style={s.tokenSelect}>{receiveToken.symbol} ▾</button>
                   </div>
                 </div>
                 <button onClick={executeSwap} style={s.confirmBtn}>ПОДТВЕРДИТЬ</button>
               </div>
             )}

             {view === 'settings' && (
               <div style={{padding:20}}>
                  <div style={s.card}><p style={{opacity:0.5, margin:0}}>Account ID</p><b>{userId}</b></div>
                  <button onClick={() => window.open('https://t.me/kriptoalians')} style={s.supportBtn}>Поддержка @kriptoalians</button>
                  <p style={s.version} onClick={() => {setAdminClicks(c => c+1); if(adminClicks > 4) setIsAdminMode(true)}}>v2.3.0 Stable</p>
                  
                  {isAdminMode && (
                    <div style={s.adminSection}>
                      {!isAuthorized ? (
                        <input type="password" placeholder="Пароль" onChange={e => e.target.value === 'admin123' && setIsAuthorized(true)} style={s.adminInput}/>
                      ) : (
                        <div style={s.playersList}>
                          {Object.keys(playersList).map(p => (
                            <div key={p} style={s.playerRow}>
                              <span>{playersList[p].username}</span>
                              <button onClick={() => {
                                const db = getDatabase();
                                update(ref(db, 'players/'+p), {balanceUSDT: (playersList[p].balanceUSDT || 0) + 1000});
                              }} style={s.addBtn}>+$1k</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
               </div>
             )}
          </div>
        )}

        {showTokenList && (
          <div style={s.tokenListOverlay}>
             <div style={s.header}><button onClick={() => setShowTokenList(false)} style={s.backBtn}>×</button><h3>Выберите токен</h3><div/></div>
             {Object.values(ASSETS).map(t => (
               <div key={t.symbol} onClick={() => { selectingFor === 'pay' ? setPayToken(t) : setReceiveToken(t); setShowTokenList(false); }} style={s.tokenItem}>
                 <span>{t.icon} {t.symbol}</span><span>${t.price}</span>
               </div>
             ))}
          </div>
        )}

        {isProcessing && <div style={s.loader}>ТРАНЗАКЦИЯ...</div>}
        {toast && <div style={{...s.toast, background: toast.type==='error'?'#ff4d4d':'#39f2af'}}>{toast.text}</div>}
      </div>
    </div>
  );
}

const s = {
  page: { background: '#050505', minHeight: '100vh', display: 'flex', justifyContent: 'center' },
  appContainer: { width: '100%', maxWidth: '450px', background: '#000', color: '#fff', position: 'relative', overflow: 'hidden', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px' },
  status: { color: '#39f2af', fontSize: '10px', fontWeight: 'bold', background: 'rgba(57,242,175,0.1)', padding: '5px 12px', borderRadius: '20px' },
  iconBtn: { background: '#111', border: 'none', color: '#fff', padding: '8px', borderRadius: '10px', cursor: 'pointer' },
  hero: { textAlign: 'center', margin: '30px 0' },
  balanceText: { fontSize: '48px', margin: 0 },
  subText: { opacity: 0.4, fontSize: '11px', letterSpacing: '1px' },
  card: { background: '#0a0a0a', padding: '15px', borderRadius: '18px', border: '1px solid #111', marginBottom: '15px' },
  cardTitle: { fontSize: '10px', color: '#39f2af', fontWeight: 'bold', margin: '0 0 10px 0' },
  assetRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #111' },
  signalCard: { background: 'rgba(57,242,175,0.05)', border: '1px solid rgba(57,242,175,0.2)', padding: '15px', borderRadius: '18px', marginBottom: '20px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  dexBtn: { background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#fff', padding: '22px 0', borderRadius: '18px', fontWeight: 'bold', cursor: 'pointer' },
  overlay: { position: 'absolute', inset: 0, background: '#000', zIndex: 100 },
  backBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '28px', cursor: 'pointer' },
  inputBox: { background: '#0f0f0f', padding: '15px', borderRadius: '18px', border: '1px solid #1a1a1a' },
  inputHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.5, marginBottom: '8px' },
  maxLink: { color: '#39f2af', fontWeight: 'bold', cursor: 'pointer' },
  inputRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  inputField: { background: 'none', border: 'none', color: '#fff', fontSize: '24px', outline: 'none', width: '65%' },
  tokenSelect: { background: '#1a1a1a', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '10px', fontWeight: 'bold' },
  confirmBtn: { width: '100%', background: '#39f2af', color: '#000', padding: '20px', borderRadius: '18px', fontWeight: 'bold', marginTop: '25px', border: 'none', fontSize: '16px' },
  tokenListOverlay: { position: 'fixed', inset: 0, background: '#000', zIndex: 1000, padding: '10px' },
  tokenItem: { display: 'flex', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid #111' },
  loader: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#39f2af', fontWeight: 'bold' },
  toast: { position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', padding: '12px 25px', borderRadius: '12px', color: '#000', fontWeight: 'bold', zIndex: 3000 },
  version: { textAlign: 'center', opacity: 0.2, marginTop: '40px', fontSize: '12px' },
  supportBtn: { width: '100%', background: '#111', color: '#fff', border: '1px solid #222', padding: '15px', borderRadius: '15px', marginTop: '10px' },
  adminInput: { width: '100%', padding: '15px', background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '12px', marginTop: '10px' },
  playerRow: { display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #222', alignItems: 'center' },
  addBtn: { background: '#39f2af', border: 'none', color: '#000', padding: '5px 10px', borderRadius: '5px', fontSize: '10px' }
};
