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
  USDT: { symbol: 'USDT', name: 'Tether', price: 1, icon: '💵' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 145.50, icon: '🟣' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2600.00, icon: '🔷' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 605.20, icon: '🟡' },
  DOGE: { symbol: 'DOGE', name: 'Dogecoin', price: 0.16, icon: '🐕' },
  XRP: { symbol: 'XRP', name: 'XRP', price: 0.62, icon: '✖️' },
  TRX: { symbol: 'TRX', name: 'TRON', price: 0.12, icon: '🔴' }
};
const DEXES = ['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'];

export default function FullApp() {
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
    try {
        const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tg) return tg.username || tg.id.toString();
    } catch(e) {}
    let localId = localStorage.getItem('arb_user_id');
    if (!localId) {
        localId = 'Trader' + Math.floor(Math.random() * 9000);
        localStorage.setItem('arb_user_id', localId);
    }
    return localId;
  }, []);

  const t = {
    RU: { bal: "БАЛАНС", hist: "ИСТОРИЯ", leaders: "ТОП", set: "НАСТРОЙКИ", pay: "ОТДАЕТЕ", get: "ПОЛУЧАЕТЕ", swap: "ОБМЕН", admin: "АДМИНКА" },
    EN: { bal: "BALANCE", hist: "HISTORY", leaders: "LEADERS", set: "SETTINGS", pay: "PAY", get: "RECEIVE", swap: "SWAP", admin: "ADMIN" }
  }[lang];

  useEffect(() => {
    const userRef = ref(db, 'players/' + userId);
    update(userRef, { balanceUSDT, wallet, username: userId, lastSeen: serverTimestamp() });
    
    const presenceRef = ref(db, 'online/' + userId);
    set(presenceRef, true);
    onDisconnect(presenceRef).remove();
    onValue(ref(db, 'online'), (s) => setOnline(s.exists() ? Object.keys(s.val()).length : 1));

    const leadersQuery = query(ref(db, 'players'), orderByChild('balanceUSDT'), limitToLast(10));
    onValue(leadersQuery, (snapshot) => {
      if (snapshot.exists()) {
        const data = Object.values(snapshot.val()).sort((a, b) => b.balanceUSDT - a.balanceUSDT);
        setLeaders(data);
      }
    });

    localStorage.setItem('arb_balance', balanceUSDT);
    localStorage.setItem('arb_wallet', JSON.stringify(wallet));
    localStorage.setItem('arb_history', JSON.stringify(history));
    localStorage.setItem('arb_lang', lang);
  }, [balanceUSDT, wallet, history, userId, lang]);

  useEffect(() => {
    if (isAuthorized) onValue(ref(db, 'players'), (s) => s.exists() && setAllPlayers(s.val()));
  }, [isAuthorized]);

  useEffect(() => {
    if (!signal) {
      const available = Object.values(ASSETS).filter(t => t.symbol !== 'USDT');
      const coin = available[Math.floor(Math.random() * available.length)];
      const shuffled = [...DEXES].sort(() => 0.5 - Math.random());
      setSignal({ coin, buyAt: shuffled[0], sellAt: shuffled[1], profit: (Math.random() * 1.5 + 1.5).toFixed(2) });
    }
  }, [signal]);

  const handleSwap = () => {
    if (!amount || amount <= 0) return;
    setIsProcessing(true);
    setTimeout(() => {
      const num = Number(amount);
      const txId = Math.random().toString(36).substr(2, 6).toUpperCase();
      if (payToken.symbol === 'USDT') {
        if (balanceUSDT >= num) {
          setBalanceUSDT(b => b - num);
          setWallet(w => ({ ...w, [receiveToken.symbol]: (w[receiveToken.symbol] || 0) + (num / receiveToken.price) }));
          setHistory(h => [{ id: txId, details: `Buy ${receiveToken.symbol}`, valStr: `-$${num}`, isPlus: false, time: new Date().toLocaleTimeString() }, ...h]);
        }
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          const prof = isCorrect ? Number(signal.profit) : -1.5;
          const finalVal = (num * payToken.price) * (1 + prof/100);
          setBalanceUSDT(b => b + finalVal);
          setWallet(w => ({ ...w, [payToken.symbol]: has - num }));
          setHistory(h => [{ id: txId, details: `Sell ${payToken.symbol}`, valStr: `+$${finalVal.toFixed(2)}`, isPlus: true, time: new Date().toLocaleTimeString() }, ...h]);
          setSignal(null);
        }
      }
      setIsProcessing(false);
      setAmount('');
      setActiveDex(null);
      setNotification("Success!");
      setTimeout(() => setNotification(null), 2000);
    }, Math.random() * 3000 + 2000);
  };

  return (
    <div style={s.app}>
      <div style={s.topBar}>
        <div style={s.online}>● {online} ONLINE</div>
        <div style={{display:'flex', gap:10}}>
            <button onClick={() => setView('leaders')} style={s.iconBtn}>🏆</button>
            <button onClick={() => setView('settings')} style={s.iconBtn}>⚙️</button>
        </div>
      </div>

      {view === 'main' && !activeDex && (
        <div style={{padding: 20, flex:1, display:'flex', flexDirection:'column'}}>
          <div style={{textAlign:'center', margin:'40px 0'}}>
            <h1 style={s.balText}>${balanceUSDT.toFixed(2)}</h1>
            <div style={s.balSub}>{t.bal}</div>
          </div>
          {signal && (
            <div style={s.signalCard}>
                <div style={{color:'#39f2af', fontSize:10}}>LIVE SIGNAL</div>
                <div>Buy {signal.coin.symbol} on {signal.buyAt}</div>
                <div>Sell on {signal.sellAt} <span style={{color:'#39f2af'}}>+{signal.profit}%</span></div>
            </div>
          )}
          <div style={s.dexGrid}>
            {DEXES.map(d => <button key={d} onClick={() => setActiveDex(d)} style={s.dexBtn}>{d}</button>)}
          </div>
          <button onClick={() => setView('history')} style={s.historyBtn}>{t.hist}</button>
          <a href="https://t.me/vladstelin78" style={s.mgrLink}>Support Manager</a>
        </div>
      )}

      {activeDex && (
        <div style={s.subPage}>
            <div style={s.exHeader}><button onClick={() => setActiveDex(null)} style={s.back}>←</button><b>{activeDex}</b><div/></div>
            <div style={{padding:20}}>
                <div style={s.inputBox}>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={s.input} placeholder="0.0"/>
                    <button onClick={() => {setShowTokenList(true); setSelectingFor('pay')}} style={s.tokenSel}>{payToken.symbol}</button>
                </div>
                <div style={{textAlign:'center', margin: 10}}>↓</div>
                <div style={s.inputBox}>
                    <div style={{fontSize:20, fontWeight:'bold'}}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                    <button onClick={() => {setShowTokenList(true); setSelectingFor('receive')}} style={s.tokenSel}>{receiveToken.symbol}</button>
                </div>
                <button onClick={handleSwap} style={s.swapBtn}>{t.swap}</button>
            </div>
        </div>
      )}

      {view === 'leaders' && (
        <div style={s.subPage}>
            <div style={s.exHeader}><button onClick={() => setView('main')} style={s.back}>←</button><h2>{t.leaders}</h2><div/></div>
            <div style={{padding:20}}>
                {leaders.map((l, i) => <div key={i} style={s.listItem}><span>{i+1}. {l.username}</span><b>${Number(l.balanceUSDT).toFixed(0)}</b></div>)}
            </div>
        </div>
      )}

      {view === 'settings' && (
        <div style={s.subPage}>
            <div style={s.exHeader}><button onClick={() => setView('main')} style={s.back}>←</button><h2>{t.set}</h2><div/></div>
            <div style={{padding:20}}>
                <button onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')} style={s.swapBtn}>Lang: {lang}</button>
                <div style={{marginTop:40, textAlign:'center', opacity:0.3}} onClick={() => {setAdminClicks(c => c+1); if(adminClicks > 4) setIsAdminVisible(true)}}>Version 2.0.4</div>
                {isAdminVisible && !isAuthorized && (
                    <div style={{marginTop:20}}><input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} style={s.input}/><button onClick={() => adminPass === 'admin123' && setIsAuthorized(true)} style={s.swapBtn}>Login</button></div>
                )}
                {isAuthorized && (
                    <div style={{marginTop:20, maxHeight: 300, overflowY:'auto'}}>
                        {Object.keys(allPlayers).map(p => (
                            <div key={p} style={s.listItem}>
                                <span style={{fontSize:10}}>{p}</span>
                                <button onClick={() => update(ref(db, 'players/'+p), {balanceUSDT: (allPlayers[p].balanceUSDT || 0) + 1000})} style={{background:'#39f2af', border:'none', borderRadius:4}}>+$1k</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      )}

      {view === 'history' && (
        <div style={s.subPage}>
             <div style={s.exHeader}><button onClick={() => setView('main')} style={s.back}>←</button><h2>{t.hist}</h2><div/></div>
             <div style={{padding:20}}>
                {history.map((h, i) => <div key={i} style={s.listItem}><span>{h.details}</span><b style={{color: h.isPlus ? '#39f2af' : '#ff4d4d'}}>{h.valStr}</b></div>)}
             </div>
        </div>
      )}

      {showTokenList && (
        <div style={{...s.subPage, zIndex: 200}}>
            <div style={s.exHeader}><button onClick={() => setShowTokenList(false)} style={s.back}>×</button><h3>Tokens</h3><div/></div>
            {Object.values(ASSETS).map(t => <div key={t.symbol} onClick={() => {selectingFor === 'pay' ? setPayToken(t) : setReceiveToken(t); setShowTokenList(false)}} style={{...s.listItem, padding:20}}>{t.icon} {t.symbol}</div>)}
        </div>
      )}

      {isProcessing && <div style={s.loader}>CONFIRMING...</div>}
      {notification && <div style={s.toast}>{notification}</div>}
    </div>
  );
}

const s = {
  app: { width: '100vw', height: '100vh', background: '#000', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden', display:'flex', flexDirection:'column' },
  topBar: { padding: 15, display:'flex', justifyContent:'space-between', alignItems:'center' },
  online: { color: '#39f2af', fontSize: 10, fontWeight:'bold' },
  iconBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: 8, borderRadius: 10 },
  balText: { fontSize: 45, fontWeight:'900', margin:0 },
  balSub: { fontSize: 10, opacity:0.4, letterSpacing:2 },
  signalCard: { background: '#111', padding: 15, borderRadius: 15, border: '1px solid #222', marginBottom: 20 },
  dexGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10, marginBottom: 20 },
  dexBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: 20, borderRadius: 15, fontWeight:'bold' },
  historyBtn: { width: '100%', background: 'none', border: '1px solid #222', color: '#fff', padding: 15, borderRadius: 15, marginBottom: 10 },
  mgrLink: { background: '#39f2af', color: '#000', padding: 15, borderRadius: 15, textAlign:'center', textDecoration:'none', fontWeight:'bold', fontSize: 13 },
  subPage: { position:'absolute', inset: 0, background: '#000', zIndex: 100, display:'flex', flexDirection:'column' },
  exHeader: { padding: '40px 20px 10px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  back: { background:'none', border:'none', color:'#fff', fontSize: 24 },
  inputBox: { background: '#111', padding: 15, borderRadius: 15, display:'flex', justifyContent:'space-between', alignItems:'center' },
  input: { background:'none', border:'none', color:'#fff', fontSize: 20, width:'60%', outline:'none' },
  tokenSel: { background: '#222', border:'none', color:'#fff', padding: '10px 15px', borderRadius: 10 },
  swapBtn: { width:'100%', padding: 20, background: '#39f2af', border:'none', borderRadius: 15, fontWeight:'bold', marginTop: 20 },
  listItem: { display:'flex', justifyContent:'space-between', padding: '15px 0', borderBottom: '1px solid #111' },
  loader: { position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  toast: { position:'fixed', top: 20, left: '5%', width: '90%', background: '#39f2af', color: '#000', padding: 15, borderRadius: 10, textAlign:'center', zIndex: 2000 }
};
