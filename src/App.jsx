import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, onDisconnect, serverTimestamp, update, query, orderByChild, limitToLast } from "firebase/database";

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
const DEXES = ['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'];

export default function App() {
  const [balanceUSDT, setBalanceUSDT] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('arb_wallet')) || {});
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('arb_history')) || []);
  const [lang, setLang] = useState(() => localStorage.getItem('arb_lang') || 'RU');
  const [view, setView] = useState('main'); 
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showTokenList, setShowTokenList] = useState(false);
  const [selectingFor, setSelectingFor] = useState('pay');
  const [payToken, setPayToken] = useState(ASSETS.USDT);
  const [receiveToken, setReceiveToken] = useState(ASSETS.SOL);
  const [amount, setAmount] = useState('');
  const [online, setOnline] = useState(1);
  const [leaders, setLeaders] = useState([]);
  
  const [adminClicks, setAdminClicks] = useState(0);
  const [isAdminVisible, setIsAdminVisible] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [allPlayers, setAllPlayers] = useState({});

  const userId = useMemo(() => {
    let id = 'Trader_' + Math.floor(Math.random() * 9000);
    try {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            id = window.Telegram.WebApp.initDataUnsafe.user.username || window.Telegram.WebApp.initDataUnsafe.user.id.toString();
        }
    } catch(e) {}
    return id;
  }, []);

  useEffect(() => {
    try {
        window.Telegram?.WebApp?.ready();
        window.Telegram?.WebApp?.expand();
    } catch(e) {}
  }, []);

  const t = {
    RU: { bal: "БАЛАНС", hist: "ИСТОРИЯ", leaders: "ТОП", set: "НАСТРОЙКИ", pay: "ОТДАЕТЕ", get: "ПОЛУЧАЕТЕ", swap: "ОБМЕН", max: "МАКС" },
    EN: { bal: "BALANCE", hist: "HISTORY", leaders: "LEADERS", set: "SETTINGS", pay: "PAY", get: "RECEIVE", swap: "SWAP", max: "MAX" }
  }[lang];

  useEffect(() => {
    const userRef = ref(db, 'players/' + userId);
    update(userRef, { balanceUSDT, wallet, username: userId, lastSeen: serverTimestamp() });
    onValue(ref(db, 'online'), (s) => setOnline(s.exists() ? Object.keys(s.val()).length : 1));
    const lQuery = query(ref(db, 'players'), orderByChild('balanceUSDT'), limitToLast(10));
    onValue(lQuery, (s) => {
        if (s.exists()) setLeaders(Object.values(s.val()).sort((a,b) => b.balanceUSDT - a.balanceUSDT));
    });
    localStorage.setItem('arb_balance', balanceUSDT);
    localStorage.setItem('arb_wallet', JSON.stringify(wallet));
    localStorage.setItem('arb_history', JSON.stringify(history));
  }, [balanceUSDT, wallet, history, userId]);

  useEffect(() => {
    if (isAuthorized) onValue(ref(db, 'players'), (s) => s.exists() && setAllPlayers(s.val()));
  }, [isAuthorized]);

  useEffect(() => {
    if (!signal) {
      const coins = Object.values(ASSETS).filter(x => x.symbol !== 'USDT');
      const coin = coins[Math.floor(Math.random() * coins.length)];
      const dex = [...DEXES].sort(() => 0.5 - Math.random());
      setSignal({ coin, buyAt: dex[0], sellAt: dex[1], profit: (Math.random() * 1.5 + 1.5).toFixed(2) });
    }
  }, [signal]);

  const handleMax = () => {
    if (payToken.symbol === 'USDT') setAmount(balanceUSDT.toString());
    else setAmount((wallet[payToken.symbol] || 0).toString());
  };

  const handleSwap = () => {
    if (!amount || Number(amount) <= 0) return;
    setIsProcessing(true);
    setTimeout(() => {
      const num = Number(amount);
      const txId = Math.random().toString(36).substr(2, 6).toUpperCase();
      if (payToken.symbol === 'USDT') {
        if (balanceUSDT >= num) {
          setBalanceUSDT(b => b - num);
          setWallet(w => ({ ...w, [receiveToken.symbol]: (w[receiveToken.symbol] || 0) + (num / receiveToken.price) }));
          setHistory(h => [{ details: `Buy ${receiveToken.symbol}`, valStr: `-$${num}`, isPlus: false, time: new Date().toLocaleTimeString() }, ...h]);
        }
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          const isOk = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          const prof = isOk ? Number(signal.profit) : -1.2;
          const final = (num * payToken.price) * (1 + prof/100);
          setBalanceUSDT(b => b + final);
          setWallet(w => ({ ...w, [payToken.symbol]: has - num }));
          setHistory(h => [{ details: `Sell ${payToken.symbol}`, valStr: `+$${final.toFixed(2)}`, isPlus: true, time: new Date().toLocaleTimeString() }, ...h]);
          setSignal(null);
        }
      }
      setIsProcessing(false);
      setAmount('');
      setActiveDex(null);
      setNotification("Complete!");
      setTimeout(() => setNotification(null), 2000);
    }, 2500);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', color: '#fff', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden', display:'flex', flexDirection:'column' }}>
      
      {/* Top Bar */}
      <div style={{ padding: 15, display:'flex', justifyContent:'space-between', alignItems:'center', background: '#000' }}>
        <div style={{ color: '#39f2af', fontSize: 12, fontWeight:'bold' }}>● {online} ONLINE</div>
        <div style={{ display:'flex', gap: 10 }}>
          <button onClick={() => setView('leaders')} style={s.iconBtn}>🏆</button>
          <button onClick={() => setView('settings')} style={s.iconBtn}>⚙️</button>
        </div>
      </div>

      {view === 'main' && !activeDex && (
        <div style={{ padding: 20, flex: 1, display:'flex', flexDirection:'column' }}>
          <div style={{ textAlign:'center', margin:'40px 0' }}>
            <h1 style={{ fontSize: 50, margin: 0 }}>${balanceUSDT.toFixed(2)}</h1>
            <div style={{ fontSize: 10, opacity: 0.5 }}>{t.bal}</div>
          </div>
          {signal && (
            <div style={{ background: '#111', padding: 15, borderRadius: 15, border: '1px solid #222', marginBottom: 20 }}>
              <div style={{ color: '#39f2af', fontSize: 10, fontWeight: 'bold' }}>LIVE SIGNAL</div>
              <div style={{ fontSize: 14 }}>Buy {signal.coin.symbol} on {signal.buyAt}</div>
              <div style={{ fontSize: 14 }}>Sell on {signal.sellAt} <span style={{ color: '#39f2af' }}>+{signal.profit}%</span></div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {DEXES.map(d => <button key={d} onClick={() => setActiveDex(d)} style={s.dexBtn}>{d}</button>)}
          </div>
          <button onClick={() => setView('history')} style={s.historyBtn}>{t.hist}</button>
          <a href="https://t.me/vladstelin78" style={s.mgrBtn}>Support Manager</a>
        </div>
      )}

      {activeDex && (
        <div style={s.fullOverlay}>
          <div style={s.header}><button onClick={() => setActiveDex(null)} style={s.back}>←</button><b>{activeDex}</b><div/></div>
          <div style={{ padding: 20 }}>
            <div style={s.box}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                  <span style={{ opacity: 0.5 }}>{t.pay}</span>
                  <span style={{ color: '#39f2af' }}>Balance: {payToken.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[payToken.symbol] || 0).toFixed(4)}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={s.input} placeholder="0.0"/>
                  <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                    <button onClick={handleMax} style={{ background: '#222', color: '#39f2af', border: 'none', borderRadius: 5, padding: '4px 8px', fontSize: 10 }}>{t.max}</button>
                    <button onClick={() => {setShowTokenList(true); setSelectingFor('pay')}} style={s.tokenBtn}>{payToken.symbol}</button>
                  </div>
               </div>
            </div>
            <div style={{ textAlign: 'center', margin: 10 }}>↓</div>
            <div style={s.box}>
               <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 5 }}>{t.get}</div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems:'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold' }}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                  <button onClick={() => {setShowTokenList(true); setSelectingFor('receive')}} style={s.tokenBtn}>{receiveToken.symbol}</button>
               </div>
            </div>
            <button onClick={handleSwap} style={s.mainBtn}>{t.swap}</button>
          </div>
        </div>
      )}

      {view === 'leaders' && (
        <div style={s.fullOverlay}>
           <div style={s.header}><button onClick={() => setView('main')} style={s.back}>←</button><h2>{t.leaders}</h2><div/></div>
           <div style={{ padding: 20 }}>
              {leaders.map((l, i) => <div key={i} style={s.listRow}><span>{i+1}. {l.username}</span><b>${Number(l.balanceUSDT).toFixed(0)}</b></div>)}
           </div>
        </div>
      )}

      {view === 'settings' && (
        <div style={s.fullOverlay}>
           <div style={s.header}><button onClick={() => setView('main')} style={s.back}>←</button><h2>{t.set}</h2><div/></div>
           <div style={{ padding: 20 }}>
              <button onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')} style={s.mainBtn}>Language: {lang}</button>
              <div style={{ marginTop: 40, textAlign: 'center', opacity: 0.3 }} onClick={() => {setAdminClicks(c => c+1); if(adminClicks > 4) setIsAdminVisible(true)}}>Version 2.0.5</div>
              {isAdminVisible && !isAuthorized && (
                <div style={{ marginTop: 20 }}>
                  <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} style={s.inputBox} placeholder="Admin Pass"/>
                  <button onClick={() => adminPass === 'admin123' && setIsAuthorized(true)} style={s.mainBtn}>Login</button>
                </div>
              )}
              {isAuthorized && (
                <div style={{ marginTop: 20, maxHeight: 300, overflowY: 'auto' }}>
                  {Object.keys(allPlayers).map(p => (
                    <div key={p} style={s.listRow}>
                      <span style={{fontSize:10}}>{p}</span>
                      <button onClick={() => update(ref(db, 'players/'+p), {balanceUSDT: (allPlayers[p].balanceUSDT || 0) + 1000})} style={{background:'#39f2af', border:'none', borderRadius:5, padding:5}}>+$1k</button>
                    </div>
                  ))}
                </div>
              )}
           </div>
        </div>
      )}

      {view === 'history' && (
        <div style={s.fullOverlay}>
           <div style={s.header}><button onClick={() => setView('main')} style={s.back}>←</button><h2>{t.hist}</h2><div/></div>
           <div style={{ padding: 20 }}>
              {history.map((h, i) => <div key={i} style={s.listRow}><span>{h.details}</span><b style={{ color: h.isPlus ? '#39f2af' : '#ff4d4d' }}>{h.valStr}</b></div>)}
           </div>
        </div>
      )}

      {showTokenList && (
        <div style={{ ...s.fullOverlay, zIndex: 1000 }}>
           <div style={s.header}><button onClick={() => setShowTokenList(false)} style={s.back}>×</button><h3>Tokens</h3><div/></div>
           <div style={{ padding: 20 }}>
              {Object.values(ASSETS).map(t => (
                <div key={t.symbol} onClick={() => {selectingFor === 'pay' ? setPayToken(t) : setReceiveToken(t); setShowTokenList(false)}} style={s.listRow}>{t.icon} {t.symbol}</div>
              ))}
           </div>
        </div>
      )}

      {isProcessing && <div style={s.loader}>CONFIRMING...</div>}
      {notification && <div style={s.toast}>{notification}</div>}
    </div>
  );
}

const s = {
  iconBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: 8, borderRadius: 10 },
  dexBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: 22, borderRadius: 15, fontWeight: 'bold' },
  historyBtn: { width: '100%', background: 'none', border: '1px solid #222', color: '#fff', padding: 15, borderRadius: 15, marginBottom: 10 },
  mgrBtn: { background: '#39f2af', color: '#000', padding: 15, borderRadius: 15, textAlign: 'center', textDecoration: 'none', fontWeight: 'bold', fontSize: 13 },
  fullOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 50, display: 'flex', flexDirection: 'column' },
  header: { padding: '40px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  back: { background: 'none', border: 'none', color: '#fff', fontSize: 24 },
  box: { background: '#111', padding: 15, borderRadius: 15 },
  input: { background: 'none', border: 'none', color: '#fff', fontSize: 22, width: '50%', outline: 'none', fontWeight: 'bold' },
  tokenBtn: { background: '#222', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 10, fontWeight: 'bold' },
  mainBtn: { width: '100%', padding: 18, background: '#39f2af', border: 'none', borderRadius: 15, fontWeight: 'bold', fontSize: 16, marginTop: 20 },
  listRow: { display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #111' },
  loader: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, color: '#39f2af', fontWeight: 'bold' },
  toast: { position: 'fixed', top: 20, left: '5%', width: '90%', background: '#39f2af', color: '#000', padding: 15, borderRadius: 10, textAlign: 'center', zIndex: 3000, fontWeight: 'bold' },
  inputBox: { width: '100%', padding: 15, background: '#111', border: '1px solid #222', color: '#fff', borderRadius: 10, marginBottom: 10 }
};
