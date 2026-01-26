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
  
  const [adminClicks, setAdminClicks] = useState(0);
  const [isAdminVisible, setIsAdminVisible] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [allPlayers, setAllPlayers] = useState({});

  const userId = useMemo(() => {
    try {
      const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tg) return tg.username || tg.id.toString();
    } catch (e) {}
    return localStorage.getItem('arb_user_id') || 'Trader_' + Math.floor(Math.random() * 9999);
  }, []);

  // Инициализация базы данных
  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const userRef = ref(db, 'players/' + userId);

    // Синхронизация при загрузке
    onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.balanceUSDT !== undefined) setBalanceUSDT(data.balanceUSDT);
        if (data.wallet) setWallet(data.wallet);
      }
    });

    if (isAuthorized) {
      onValue(ref(db, 'players'), (s) => s.exists() && setAllPlayers(s.val()));
    }

    // Сохранение данных
    const timer = setInterval(() => {
      update(userRef, { balanceUSDT, wallet, lastSeen: serverTimestamp(), username: userId });
      localStorage.setItem('arb_balance', balanceUSDT);
      localStorage.setItem('arb_wallet', JSON.stringify(wallet));
    }, 5000);

    return () => clearInterval(timer);
  }, [balanceUSDT, wallet, userId, isAuthorized]);

  // Сигналы
  useEffect(() => {
    if (!signal) {
      const keys = Object.keys(ASSETS).filter(k => k !== 'USDT');
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      setSignal({ coin, buyAt: 'UNISWAP', sellAt: 'PANCAKE', profit: (Math.random() * 1.5 + 1.5).toFixed(2) });
    }
  }, [signal]);

  const notify = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleMax = () => {
    const val = payToken.symbol === 'USDT' ? balanceUSDT : (wallet[payToken.symbol] || 0);
    setAmount(val.toString());
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
          const isOk = payToken.symbol === signal?.coin.symbol && activeDex === signal?.sellAt;
          const p = isOk ? (1 + signal.profit / 100) : (1 - (Math.random() * 0.015)); 
          const result = (num * payToken.price) * p;
          setBalanceUSDT(prev => prev + result);
          setWallet(prev => ({ ...prev, [payToken.symbol]: has - num }));
          setSignal(null);
          notify(isOk ? `Профит: +$${(result - num * payToken.price).toFixed(2)}` : 'Сделка в минус', isOk ? 'success' : 'error');
        } else notify(`Недостаточно ${payToken.symbol}`, 'error');
      }
      setIsProcessing(false); setAmount(''); setActiveDex(null);
    }, 1500);
  };

  return (
    <div style={s.body}>
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.online}>● LIVE TRADING</div>
          <button onClick={() => setView('settings')} style={s.iconBtn}>⚙️</button>
        </div>

        {view === 'main' && !activeDex && (
          <div style={{ padding: '0 20px' }}>
            <div style={s.balanceHero}>
              <h1 style={s.mainBalance}>${balanceUSDT.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
              <p style={s.label}>AVAILABLE USDT</p>
            </div>

            <div style={s.card}>
              <p style={s.cardHead}>КОШЕЛЕК</p>
              {Object.keys(wallet).filter(k => wallet[k] > 0).length === 0 ? <p style={{opacity: 0.3, fontSize: 12}}>Пусто</p> :
                Object.keys(wallet).map(c => wallet[c] > 0 && (
                  <div key={c} style={s.assetRow}><span>{ASSETS[c].icon} {c}</span><b>{wallet[c].toFixed(4)}</b></div>
                ))
              }
            </div>

            {signal && (
              <div style={s.signalCard}>
                <div style={s.sigBadge}>СИГНАЛ</div>
                <div style={{fontSize: 14, margin: '5px 0'}}>Купи {signal.coin.symbol} → Продай на <b>{signal.sellAt}</b></div>
                <div style={{fontSize: 14, color: '#39f2af'}}>Доходность: +{signal.profit}%</div>
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
               <button onClick={() => {setActiveDex(null); setView('main')}} style={s.back}>←</button>
               <b>{activeDex || 'Настройки'}</b>
               <div style={{width: 24}}/>
             </div>

             {activeDex && (
               <div style={{padding: 20}}>
                 <div style={s.inputBox}>
                   <div style={s.inputTop}>
                     <span>Отдаете</span>
                     <span onClick={handleMax} style={s.maxBtn}>MAX: {payToken.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[payToken.symbol] || 0).toFixed(4)}</span>
                   </div>
                   <div style={s.inputFlex}>
                     <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={s.field} placeholder="0.0"/>
                     <button onClick={() => {setSelectingFor('pay'); setShowTokenList(true)}} style={s.sel}>{payToken.symbol} ▾</button>
                   </div>
                 </div>
                 <div style={{textAlign: 'center', margin: '10px 0', opacity: 0.2, fontSize: 24}}>↓</div>
                 <div style={s.inputBox}>
                   <div style={s.inputTop}><span>Получаете (расчет)</span></div>
                   <div style={s.inputFlex}>
                     <div style={s.resVal}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                     <button onClick={() => {setSelectingFor('receive'); setShowTokenList(true)}} style={s.sel}>{receiveToken.symbol} ▾</button>
                   </div>
                 </div>
                 <button onClick={startSwap} style={s.actionBtn}>ПОДТВЕРДИТЬ</button>
               </div>
             )}

             {view === 'settings' && (
               <div style={{padding: 20}}>
                 <div style={s.card}><p style={{opacity:0.5, margin:0}}>UID</p><b>{userId}</b></div>
                 <button onClick={() => window.open('https://t.me/kriptoalians')} style={s.mgrBtn}>Связаться с менеджером</button>
                 <p style={s.verText} onClick={() => {setAdminClicks(c => c+1); if(adminClicks > 4) setIsAdminVisible(true)}}>v2.6.5 Stable</p>
                 
                 {isAdminVisible && (
                   <div style={s.adminWrap}>
                     {!isAuthorized ? (
                       <input type="password" placeholder="Pass" onChange={e => e.target.value === 'admin123' && setIsAuthorized(true)} style={s.admInp}/>
                     ) : (
                       <div style={{maxHeight: 200, overflow: 'auto'}}>
                         {Object.keys(allPlayers).map(p => (
                           <div key={p} style={s.admRow}>
                             <span style={{fontSize: 10}}>{allPlayers[p].username}</span>
                             <button onClick={() => {
                               const db = getDatabase();
                               update(ref(db, 'players/'+p), {balanceUSDT: (allPlayers[p].balanceUSDT || 0) + 1000});
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
          <div style={s.overlay}>
             <div style={s.header}><button onClick={() => setShowTokenList(false)} style={s.back}>×</button><h3>Активы</h3><div/></div>
             {Object.values(ASSETS).map(t => (
               <div key={t.symbol} onClick={() => { selectingFor === 'pay' ? setPayToken(t) : setReceiveToken(t); setShowTokenList(false); }} style={s.tknRow}>
                 <span>{t.icon} {t.symbol}</span><span>${t.price}</span>
               </div>
             ))}
          </div>
        )}

        {isProcessing && <div style={s.loader}>ОБРАБОТКА...</div>}
        {toast && <div style={{...s.toast, background: toast.type === 'error' ? '#ff4d4d' : '#39f2af'}}>{toast.text}</div>}
      </div>
    </div>
  );
}

const s = {
  body: { background: '#050505', minHeight: '100vh', display: 'flex', justifyContent: 'center' },
  container: { width: '100%', maxWidth: '450px', background: '#000', color: '#fff', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '15px 20px', alignItems: 'center' },
  online: { color: '#39f2af', fontSize: 10, fontWeight: 'bold', background: 'rgba(57,242,175,0.1)', padding: '5px 12px', borderRadius: 20 },
  iconBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: 8, borderRadius: 10, cursor: 'pointer' },
  balanceHero: { textAlign: 'center', margin: '30px 0' },
  mainBalance: { fontSize: 48, margin: 0 },
  label: { opacity: 0.4, fontSize: 10, letterSpacing: 1 },
  card: { background: '#0a0a0a', padding: 15, borderRadius: 20, border: '1px solid #111', marginBottom: 15 },
  cardHead: { fontSize: 10, color: '#39f2af', fontWeight: 'bold', margin: '0 0 10px 0' },
  assetRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #111' },
  signalCard: { background: 'rgba(57,242,175,0.05)', border: '1px solid rgba(57,242,175,0.2)', padding: 15, borderRadius: 20, marginBottom: 20 },
  sigBadge: { color: '#39f2af', fontSize: 10, fontWeight: 'bold' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  dexBtn: { background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#fff', padding: '22px 0', borderRadius: 20, fontWeight: 'bold', cursor: 'pointer' },
  overlay: { position: 'absolute', inset: 0, background: '#000', zIndex: 100 },
  back: { background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer' },
  inputBox: { background: '#0f0f0f', padding: 15, borderRadius: 20, border: '1px solid #1a1a1a' },
  inputTop: { display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.5, marginBottom: 8 },
  maxBtn: { color: '#39f2af', fontWeight: 'bold', cursor: 'pointer' },
  inputFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  field: { background: 'none', border: 'none', color: '#fff', fontSize: 26, outline: 'none', width: '65%', fontWeight: 'bold' },
  sel: { background: '#1a1a1a', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 10, fontWeight: 'bold' },
  resVal: { fontSize: 22, fontWeight: 'bold' },
  actionBtn: { width: '100%', background: '#39f2af', color: '#000', padding: 20, borderRadius: 20, fontWeight: 'bold', marginTop: 25, border: 'none' },
  tknRow: { display: 'flex', justifyContent: 'space-between', padding: 20, borderBottom: '1px solid #111', cursor: 'pointer' },
  loader: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#39f2af' },
  toast: { position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', padding: '12px 25px', borderRadius: 12, color: '#000', fontWeight: 'bold', zIndex: 2000, textAlign: 'center' },
  verText: { textAlign: 'center', opacity: 0.2, marginTop: 50, fontSize: 12 },
  mgrBtn: { width: '100%', background: '#111', color: '#fff', border: '1px solid #222', padding: 15, borderRadius: 15, marginTop: 15 },
  admRow: { display: 'flex', justifyContent: 'space-between', padding: 10, borderBottom: '1px solid #111' },
  admInp: { width: '100%', padding: 10, background: '#111', border: '1px solid #333', color: '#fff', borderRadius: 10 },
  addBtn: { background: '#39f2af', border: 'none', padding: '5px 10px', borderRadius: 5, fontSize: 10 }
};
