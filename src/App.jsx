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
  USDT: { symbol: 'USDT', name: 'Tether', price: 1, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 145.50, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 605.20, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  DOGE: { symbol: 'DOGE', name: 'Dogecoin', price: 0.16, icon: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
  XRP: { symbol: 'XRP', name: 'XRP', price: 0.62, icon: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
  TRX: { symbol: 'TRX', name: 'TRON', price: 0.12, icon: 'https://cryptologos.cc/logos/tron-trx-logo.png' }
};
const DEXES = ['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'];

export default function FullApp() {
  // --- Состояния ---
  const [balanceUSDT, setBalanceUSDT] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('arb_wallet')) || {});
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('arb_history')) || []);
  const [lang, setLang] = useState(() => localStorage.getItem('arb_lang') || 'RU');
  const [activeDex, setActiveDex] = useState(null);
  const [view, setView] = useState('main'); 
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
  const [soundEnabled, setSoundEnabled] = useState(true);

  // --- Admin State ---
  const [adminClicks, setAdminClicks] = useState(0);
  const [isAdminVisible, setIsAdminVisible] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [allPlayers, setAllPlayers] = useState({});

  const userId = useMemo(() => {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const id = tg ? (tg.username || tg.id.toString()) : (localStorage.getItem('arb_user_id') || 'Trader' + Math.floor(Math.random() * 9000));
    localStorage.setItem('arb_user_id', id);
    return id;
  }, []);

  const t = {
    RU: { bal: "ДОСТУПНЫЙ БАЛАНС", hist: "ИСТОРИЯ", leaders: "ТОП ИГРОКОВ", set: "НАСТРОЙКИ", pay: "ОТДАЕТЕ", get: "ПОЛУЧАЕТЕ", swap: "ПОДТВЕРДИТЬ", lang: "Язык", sound: "Звук", contact: "Менеджер", admin: "АДМИН ПАНЕЛЬ", back: "Назад" },
    EN: { bal: "AVAILABLE BALANCE", hist: "HISTORY", leaders: "LEADERBOARD", set: "SETTINGS", pay: "YOU PAY", get: "YOU GET", swap: "CONFIRM SWAP", lang: "Language", sound: "Sound", contact: "Manager", admin: "ADMIN PANEL", back: "Back" }
  }[lang];

  // --- Firebase Sync ---
  useEffect(() => {
    const userRef = ref(db, 'players/' + userId);
    update(userRef, { balanceUSDT, wallet, lastSeen: serverTimestamp(), username: userId });
    
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

  // Подгрузка всех игроков для админа
  useEffect(() => {
    if (isAuthorized) {
      onValue(ref(db, 'players'), (s) => s.exists() && setAllPlayers(s.val()));
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (!signal) {
      const available = Object.values(ASSETS).filter(t => t.symbol !== 'USDT');
      const coin = available[Math.floor(Math.random() * available.length)];
      const shuffled = [...DEXES].sort(() => 0.5 - Math.random());
      setSignal({ coin, buyAt: shuffled[0], sellAt: shuffled[1], profit: (Math.random() * 1.4 + 1.4).toFixed(2) });
    }
  }, [signal]);

  const handleSwap = () => {
    if (!amount || amount <= 0) return;
    setIsProcessing(true);
    const txTime = Math.floor(Math.random() * 4000) + 3000;

    setTimeout(() => {
      const num = Number(amount);
      const txId = Math.random().toString(36).substr(2, 7).toUpperCase();

      if (payToken.symbol === 'USDT') {
        if (balanceUSDT >= num) {
          setBalanceUSDT(b => b - num);
          setWallet(w => ({ ...w, [receiveToken.symbol]: (w[receiveToken.symbol] || 0) + (num / receiveToken.price) }));
          setHistory(h => [{ id: txId, details: `Buy ${receiveToken.symbol}`, dex: activeDex, valStr: `-$${num.toFixed(2)}`, isPlus: false, time: new Date().toLocaleTimeString() }, ...h].slice(0, 20));
        }
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          const prof = isCorrect ? Number(signal.profit) : -(Math.random() * 1.5);
          const finalVal = (num * payToken.price) * (1 + prof/100);
          setBalanceUSDT(b => b + finalVal);
          setWallet(w => ({ ...w, [payToken.symbol]: has - num }));
          setHistory(h => [{ id: txId, details: `Sell ${payToken.symbol}`, dex: activeDex, valStr: `+$${finalVal.toFixed(2)}`, isPlus: true, time: new Date().toLocaleTimeString() }, ...h].slice(0, 20));
          setSignal(null);
        }
      }
      setIsProcessing(false);
      setAmount('');
      setActiveDex(null);
      setNotification(lang === 'RU' ? "Транзакция завершена" : "Transaction Complete");
      setTimeout(() => setNotification(null), 2000);
    }, txTime);
  };

  const updateOtherPlayer = (pId, newBal) => {
    update(ref(db, 'players/' + pId), { balanceUSDT: newBal });
  };

  return (
    <div style={s.app}>
      {/* Header Online */}
      <div style={s.topBar}>
        <div style={s.online}><div style={s.dot}></div> {online} ONLINE</div>
        <div style={{display:'flex', gap: 10}}>
            <button onClick={() => setView('leaders')} style={s.iconBtn}>🏆</button>
            <button onClick={() => setView('settings')} style={s.iconBtn}>⚙️</button>
        </div>
      </div>

      {view === 'main' && !activeDex && (
        <div style={{padding: 20, display:'flex', flexDirection:'column', flex: 1}}>
          <div style={{textAlign: 'center', margin: '40px 0'}}>
            <h1 style={s.balText}>${balanceUSDT.toLocaleString(undefined, {maximumFractionDigits: 2})}</h1>
            <div style={s.balSub}>{t.bal}</div>
          </div>

          {signal && (
            <div style={s.signalCard}>
              <div style={{color: '#39f2af', fontSize: 10, fontWeight: 'bold'}}>LIVE SIGNAL</div>
              <div style={{fontSize: 14, marginTop: 5}}>Buy {signal.coin.symbol} on <b>{signal.buyAt}</b></div>
              <div style={{fontSize: 14}}>Sell on <b>{signal.sellAt}</b> <span style={{color:'#39f2af'}}>+{signal.profit}%</span></div>
            </div>
          )}

          <div style={s.dexGrid}>
            {DEXES.map(d => <button key={d} onClick={() => setActiveDex(d)} style={s.dexBtn}>{d}</button>)}
          </div>

          <button onClick={() => setView('history')} style={s.historyBtn}>📜 {t.hist}</button>
          
          <div style={s.managerBanner}>
            <div style={{fontSize: 12}}>Support 24/7</div>
            <a href="https://t.me/vladstelin78" style={s.mgrLink}>{t.contact}</a>
          </div>
        </div>
      )}

      {activeDex && (
        <div style={{...s.exchangePage, background: activeDex === 'PANCAKE' ? '#f6f6f9' : '#0c0d21', color: activeDex === 'PANCAKE' ? '#280d5f' : '#fff'}}>
          <div style={s.exHeader}>
            <button onClick={() => setActiveDex(null)} style={{background:'none', border:'none', color:'inherit', fontSize: 24}}>←</button>
            <b>{activeDex}</b>
            <div style={{width: 30}}></div>
          </div>
          <div style={{padding: 20}}>
            <div style={{background: 'rgba(255,255,255,0.05)', padding: 20, borderRadius: 25, border: '1px solid rgba(255,255,255,0.1)'}}>
                <div style={s.inputBox}>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize: 10, opacity: 0.6}}>
                        <span>{t.pay}</span>
                        <span onClick={() => setAmount(payToken.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[payToken.symbol] || 0))} style={{color:'#39f2af', fontWeight:'bold', cursor:'pointer'}}>MAX</span>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', marginTop: 10}}>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{...s.inputField, color: 'inherit'}} placeholder="0.0"/>
                        <button onClick={() => {setShowTokenList(true); setSelectingFor('pay')}} style={s.tokenSel}>{payToken.symbol} ▾</button>
                    </div>
                </div>
                <div style={{textAlign:'center', margin: '15px 0'}}>↓</div>
                <div style={s.inputBox}>
                    <div style={{fontSize: 10, opacity: 0.6}}>{t.get}</div>
                    <div style={{display:'flex', justifyContent:'space-between', marginTop: 10}}>
                        <div style={{fontSize: 22, fontWeight:'bold'}}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                        <button onClick={() => {setShowTokenList(true); setSelectingFor('receive')}} style={s.tokenSel}>{receiveToken.symbol} ▾</button>
                    </div>
                </div>
                <button onClick={handleSwap} style={s.swapBtn}>{t.swap}</button>
            </div>
          </div>
        </div>
      )}

      {view === 'history' && (
        <div style={s.subPage}>
          <div style={s.exHeader}><button onClick={() => setView('main')} style={s.backBtn}>←</button><h2>{t.hist}</h2><div/></div>
          <div style={{overflowY:'auto', padding: '0 20px'}}>
            {history.map(h => (
              <div key={h.id} style={s.histItem}>
                <div><div style={{fontWeight:'bold'}}>{h.details}</div><div style={{fontSize: 10, opacity: 0.4}}>{h.dex} • ID: {h.id}</div></div>
                <div style={{textAlign:'right'}}><div style={{color: h.isPlus ? '#39f2af' : '#ff4d4d', fontWeight:'bold'}}>{h.valStr}</div><div style={{fontSize: 10, opacity: 0.4}}>{h.time}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'leaders' && (
        <div style={s.subPage}>
          <div style={s.exHeader}><button onClick={() => setView('main')} style={s.backBtn}>←</button><h2>{t.leaders}</h2><div/></div>
          <div style={{padding: 20}}>
            {leaders.map((l, i) => (
              <div key={i} style={s.leaderItem}><span>{i+1}. {l.username}</span><span style={{color:'#39f2af'}}>${Number(l.balanceUSDT).toFixed(0)}</span></div>
            ))}
          </div>
        </div>
      )}

      {view === 'settings' && (
        <div style={s.subPage}>
          <div style={s.exHeader}><button onClick={() => setView('main')} style={s.backBtn}>←</button><h2>{t.set}</h2><div/></div>
          <div style={{padding: 20}}>
            <div style={s.setRow}><span>{t.lang}</span><button onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')} style={s.setBtn}>{lang}</button></div>
            <div style={{...s.setRow, marginTop: 10}}><span>{t.sound}</span><button onClick={() => setSoundEnabled(!soundEnabled)} style={s.setBtn}>{soundEnabled ? 'ON' : 'OFF'}</button></div>
            
            <div style={{marginTop: 30, opacity: 0.4, fontSize: 12, textAlign: 'center'}}>
                <p onClick={() => { setAdminClicks(c => c + 1); if(adminClicks >= 4) setIsAdminVisible(true); }}>Version: 2.0.4-stable</p>
                <p>Creators: <a href="https://t.me/kriptoalians" style={{color:'#39f2af', textDecoration:'none'}}>@kriptoalians</a></p>
            </div>

            {isAdminVisible && !isAuthorized && (
              <div style={{marginTop: 20, background: '#111', padding: 15, borderRadius: 15}}>
                <input type="password" placeholder="Password" value={adminPass} onChange={e => setAdminPass(e.target.value)} style={s.adminInput}/>
                <button onClick={() => adminPass === 'admin123' ? setIsAuthorized(true) : alert('No')} style={s.swapBtn}>Login</button>
              </div>
            )}

            {isAuthorized && (
              <div style={{marginTop: 20, background: '#111', padding: 15, borderRadius: 20, border: '1px solid #39f2af'}}>
                <h4 style={{color:'#39f2af', margin:'0 0 10px 0'}}>ADMIN - ALL PLAYERS</h4>
                <div style={{maxHeight: 250, overflowY: 'auto'}}>
                  {Object.keys(allPlayers).map(pId => (
                    <div key={pId} style={{padding: '10px 0', borderBottom: '1px solid #222', fontSize: 11}}>
                      <div style={{display:'flex', justifyContent:'space-between'}}>
                        <span>{pId}</span>
                        <b style={{color:'#39f2af'}}>${Number(allPlayers[pId].balanceUSDT || 0).toFixed(0)}</b>
                      </div>
                      <div style={{display:'flex', gap: 5, marginTop: 5}}>
                        <button onClick={() => updateOtherPlayer(pId, (allPlayers[pId].balanceUSDT || 0) + 1000)} style={s.miniBtn}>+$1k</button>
                        <button onClick={() => updateOtherPlayer(pId, 0)} style={{...s.miniBtn, borderColor: '#ff4d4d'}}>Reset</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setSignal(null)} style={{...s.adminBtn, marginTop: 15}}>Reset Signal</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showTokenList && (
        <div style={s.tokenModal}>
            <div style={s.exHeader}><h3>Tokens</h3><button onClick={() => setShowTokenList(false)} style={s.backBtn}>×</button></div>
            <div style={{overflowY:'auto', padding: '0 20px'}}>
              {Object.values(ASSETS).map(t => (
                  <div key={t.symbol} onClick={() => { selectingFor === 'pay' ? setPayToken(t) : setReceiveToken(t); setShowTokenList(false); }} style={s.tokenItem}>
                      <img src={t.icon} width="30" alt=""/>
                      <b style={{flex: 1, marginLeft: 15}}>{t.symbol}</b>
                      <span style={{opacity: 0.5}}>{t.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[t.symbol] || 0).toFixed(4)}</span>
                  </div>
              ))}
            </div>
        </div>
      )}

      {isProcessing && <div style={s.loaderOverlay}><div className="loader"></div><div style={{marginTop: 20, fontSize: 10, letterSpacing: 2}}>CONFIRMING...</div></div>}
      {notification && <div style={s.toast}>{notification}</div>}

      <style>{`
        .loader { width: 40px; height: 40px; border: 3px solid #111; border-top-color: #39f2af; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        body { margin: 0; background: #000; }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>
    </div>
  );
}

const s = {
  app: { width: '100vw', height: '100dvh', maxWidth: '500px', margin: '0 auto', background: '#000', color: '#fff', fontFamily: '-apple-system, sans-serif', overflow: 'hidden', position: 'relative', display:'flex', flexDirection:'column' },
  topBar: { padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  online: { background: 'rgba(57,242,175,0.1)', color: '#39f2af', padding: '6px 12px', borderRadius: 20, fontSize: 10, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, background: '#39f2af', borderRadius: '50%', boxShadow: '0 0 8px #39f2af' },
  iconBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: '8px 10px', borderRadius: 12 },
  balText: { fontSize: 48, fontWeight: '900', margin: 0 },
  balSub: { fontSize: 10, opacity: 0.3, letterSpacing: 2, marginTop: 5 },
  signalCard: { background: '#111', padding: 15, borderRadius: 20, border: '1px solid #222', marginBottom: 20 },
  dexGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 },
  dexBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: '24px 0', borderRadius: 20, fontWeight: 'bold', fontSize: 14 },
  historyBtn: { width: '100%', background: 'none', border: '1px solid #222', color: '#fff', padding: 15, borderRadius: 18, fontSize: 11, fontWeight: 'bold' },
  managerBanner: { marginTop: 'auto', background: 'linear-gradient(90deg, #111, #1a1a1a)', padding: '15px 20px', borderRadius: 25, border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  mgrLink: { background: '#39f2af', color: '#000', textDecoration: 'none', padding: '10px 16px', borderRadius: 12, fontSize: 11, fontWeight: 'bold' },
  exchangePage: { position: 'absolute', inset: 0, zIndex: 20, display:'flex', flexDirection:'column' },
  exHeader: { padding: '40px 20px 15px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  inputBox: { background: 'rgba(0,0,0,0.06)', padding: 15, borderRadius: 20 },
  inputField: { background: 'none', border: 'none', fontSize: 26, outline: 'none', width: '60%', fontWeight: 'bold' },
  tokenSel: { background: 'rgba(255,255,255,0.1)', border: 'none', color: 'inherit', fontWeight: 'bold', padding: '8px 12px', borderRadius: 12 },
  swapBtn: { width: '100%', padding: 20, borderRadius: 22, border: 'none', background: '#39f2af', color: '#000', fontWeight: 'bold', fontSize: 16, marginTop: 20 },
  subPage: { position: 'absolute', inset: 0, background: '#000', zIndex: 30, display:'flex', flexDirection:'column' },
  backBtn: { background: 'none', border: 'none', color: '#fff', fontSize: 26 },
  histItem: { display: 'flex', justifyContent: 'space-between', padding: '18px 0', borderBottom: '1px solid #111' },
  leaderItem: { display: 'flex', justifyContent: 'space-between', padding: '20px', background: '#111', borderRadius: 18, marginBottom: 10 },
  setRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px', background: '#111', borderRadius: 18 },
  setBtn: { background: '#222', border: '1px solid #333', color: '#fff', padding: '8px 16px', borderRadius: 12, fontWeight: 'bold' },
  tokenModal: { position: 'fixed', inset: 0, background: '#000', zIndex: 100, display: 'flex', flexDirection: 'column' },
  tokenItem: { display: 'flex', alignItems: 'center', padding: '18px 0', borderBottom: '1px solid #111' },
  loaderOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.98)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'fixed', top: 25, left: '5%', width: '90%', background: '#39f2af', color: '#000', padding: 16, borderRadius: 15, zIndex: 2000, textAlign: 'center', fontWeight: 'bold', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  adminInput: { width: '100%', padding: 15, borderRadius: 12, background: '#222', border: '1px solid #333', color: '#fff', marginBottom: 10 },
  adminBtn: { width: '100%', padding: 12, borderRadius: 12, background: '#222', border: '1px solid #444', color: '#fff', fontSize: 12, fontWeight: 'bold' },
  miniBtn: { flex: 1, padding: 8, background: 'none', border: '1px solid #444', color: '#fff', borderRadius: 8, fontSize: 10 }
};
