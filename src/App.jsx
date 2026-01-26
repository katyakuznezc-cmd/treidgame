import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, onDisconnect, serverTimestamp, update } from "firebase/database";

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

const DEXES = ['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'];
const ASSETS = [
  { id: 'USDT', icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  { id: 'SOL', icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  { id: 'ETH', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { id: 'BNB', icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  { id: 'DOGE', icon: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
  { id: 'XRP', icon: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
  { id: 'ADA', icon: 'https://cryptologos.cc/logos/cardano-ada-logo.png' },
  { id: 'AVAX', icon: 'https://cryptologos.cc/logos/avalanche-avax-logo.png' },
  { id: 'MATIC', icon: 'https://cryptologos.cc/logos/polygon-matic-logo.png' },
  { id: 'DOT', icon: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png' },
  { id: 'TRX', icon: 'https://cryptologos.cc/logos/tron-trx-logo.png' }
];

function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [currentAsset, setCurrentAsset] = useState(() => localStorage.getItem('arb_asset') || 'USDT');
  const [view, setView] = useState('main');
  const [selectedDex, setSelectedDex] = useState(null);
  const [fromAsset, setFromAsset] = useState('USDT');
  const [toAsset, setToAsset] = useState('');
  const [amount, setAmount] = useState('');
  const [online, setOnline] = useState(1);
  const [isTrading, setIsTrading] = useState(false);
  const [modal, setModal] = useState(null);

  const userId = useMemo(() => {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tg) return tg.id.toString();
    let id = localStorage.getItem('arb_id') || 'User_' + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('arb_id', id);
    return id;
  }, []);

  // Sync Firebase
  useEffect(() => {
    localStorage.setItem('arb_balance', balance);
    localStorage.setItem('arb_asset', currentAsset);
    const userRef = ref(db, 'players/' + userId);
    update(userRef, { balance, currentAsset, lastSeen: serverTimestamp() });
    
    const onlineRef = ref(db, 'online/' + userId);
    set(onlineRef, true);
    onDisconnect(onlineRef).remove();
    onValue(ref(db, 'online'), (s) => setOnline(s.exists() ? Object.keys(s.val()).length : 1));
  }, [balance, currentAsset]);

  const handleExchange = () => {
    if (!amount || !toAsset || fromAsset !== currentAsset) return;
    
    setIsTrading(true);
    setTimeout(() => {
      let isWin = Math.random() > 0.3;
      let change = isWin ? (1 + Math.random() * 0.03) : (1 - Math.random() * 0.015);
      
      if (fromAsset === 'USDT') {
        // Покупаем монету (профит закладывается в будущую продажу)
        setCurrentAsset(toAsset);
        setModal({ type: 'success', text: `Вы купили ${toAsset}` });
      } else {
        // Продаем в USDT (фиксируем профит/убыток)
        const newBal = balance * change;
        const diff = newBal - balance;
        setBalance(newBal);
        setCurrentAsset('USDT');
        setModal({ type: 'result', win: diff > 0, val: Math.abs(diff).toFixed(2) });
      }
      
      setIsTrading(false);
      setSelectedDex(null);
      setAmount('');
      setToAsset('');
    }, 1500);
  };

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.online}><div style={s.dot}></div> {online} ONLINE</div>
        <button onClick={() => setView('settings')} style={s.iconBtn}>⚙️</button>
      </div>

      {view === 'main' && !selectedDex && (
        <div style={s.content}>
          <div style={s.balanceCard}>
            <div style={s.label}>{currentAsset} BALANCE</div>
            <div style={s.mainBal}>{currentAsset === 'USDT' ? '$' : ''}{balance.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
          </div>

          <div style={s.dexGrid}>
            {DEXES.map(d => (
              <button key={d} onClick={() => {setSelectedDex(d); setFromAsset(currentAsset);}} style={s.dexBtn}>{d}</button>
            ))}
          </div>

          <div style={s.managerCard}>
            <div style={{fontSize: '12px'}}>Есть вопросы по выводу?</div>
            <a href="https://t.me/vladstelin78" style={s.managerLink}>Связаться с менеджером</a>
          </div>
        </div>
      )}

      {selectedDex && (
        <div style={s.exchangeView}>
          <div style={s.exHeader}>
            <button onClick={() => setSelectedDex(null)} style={s.backBtn}>←</button>
            <span>{selectedDex} EXCHANGE</span>
            <div style={{width: 30}}></div>
          </div>

          {/* From */}
          <div style={s.inputGroup}>
            <div style={s.groupLabel}>ОТДАЕТЕ</div>
            <div style={s.inputRow}>
              <div style={s.assetTag}><img src={ASSETS.find(a => a.id === fromAsset)?.icon} width="20"/> {fromAsset}</div>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={s.input}/>
              <button onClick={() => setAmount(balance.toFixed(2))} style={s.maxBtn}>MAX</button>
            </div>
          </div>

          <div style={{textAlign: 'center', margin: '10px 0', fontSize: '20px'}}>↓</div>

          {/* To */}
          <div style={s.inputGroup}>
            <div style={s.groupLabel}>ПОЛУЧАЕТЕ</div>
            <div style={s.assetScroll}>
              {ASSETS.filter(a => a.id !== fromAsset).map(a => (
                <button key={a.id} onClick={() => setToAsset(a.id)} style={{...s.assetSelect, borderColor: toAsset === a.id ? '#39f2af' : '#222'}}>
                  <img src={a.icon} width="24"/>
                  <span>{a.id}</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleExchange} disabled={!amount || !toAsset || isTrading} style={s.exchangeBtn}>
            {isTrading ? 'ТРАНЗАКЦИЯ...' : 'ОБМЕНЯТЬ'}
          </button>
        </div>
      )}

      {view === 'settings' && (
        <div style={s.content}>
          <button onClick={() => setView('main')} style={s.backBtn}>← Назад</button>
          <div style={{marginTop: 30, background: '#111', padding: 20, borderRadius: 20}}>
            <p>Creators: <a href="https://t.me/kriptoalians" style={{color: '#39f2af'}}>@kriptoalians</a></p>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal && (
        <div style={s.overlay} onClick={() => setModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{fontSize: 50}}>{modal.win === false ? '📉' : '💰'}</div>
            <h2>{modal.type === 'success' ? 'Успешно' : 'Результат'}</h2>
            {modal.val && <h1 style={{color: modal.win ? '#39f2af' : '#ff4d4d'}}>{modal.win ? '+' : '-'}${modal.val}</h1>}
            <p>{modal.text}</p>
            <button onClick={() => setModal(null)} style={s.closeBtn}>ОК</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { height: '100vh', width: '100vw', maxWidth: 450, margin: '0 auto', background: '#000', color: '#fff', fontFamily: 'sans-serif', padding: 15, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  online: { background: 'rgba(57,242,175,0.1)', color: '#39f2af', padding: '6px 15px', borderRadius: 20, fontSize: 11, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, background: '#39f2af', borderRadius: '50%', boxShadow: '0 0 8px #39f2af' },
  iconBtn: { background: '#111', border: '1px solid #222', color: '#fff', borderRadius: 12, padding: 10, cursor: 'pointer' },
  balanceCard: { textAlign: 'center', margin: '40px 0' },
  label: { opacity: 0.4, fontSize: 11, letterSpacing: 1 },
  mainBal: { fontSize: 45, fontWeight: 900, marginTop: 5 },
  dexGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  dexBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: '25px 0', borderRadius: 20, fontWeight: 'bold', fontSize: 14 },
  managerCard: { marginTop: 'auto', background: '#111', padding: 15, borderRadius: 20, textAlign: 'center', border: '1px solid #222' },
  managerLink: { color: '#39f2af', textDecoration: 'none', fontSize: 13, display: 'block', marginTop: 5 },
  exchangeView: { flex: 1, display: 'flex', flexDirection: 'column' },
  exHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  backBtn: { background: '#111', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' },
  inputGroup: { background: '#111', padding: 15, borderRadius: 20, border: '1px solid #222' },
  groupLabel: { fontSize: 10, opacity: 0.5, marginBottom: 10 },
  inputRow: { display: 'flex', alignItems: 'center', gap: 10 },
  assetTag: { background: '#222', padding: '8px 12px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 },
  input: { background: 'transparent', border: 'none', color: '#fff', fontSize: 20, flex: 1, outline: 'none' },
  maxBtn: { background: '#39f2af', color: '#000', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 'bold' },
  assetScroll: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  assetSelect: { background: '#222', border: '2px solid #222', borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, color: '#fff' },
  exchangeBtn: { width: '100%', background: '#39f2af', color: '#000', border: 'none', padding: 20, borderRadius: 20, fontWeight: 'bold', fontSize: 16, marginTop: 'auto' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#111', width: '85%', padding: 30, borderRadius: 30, textAlign: 'center', border: '1px solid #222' },
  closeBtn: { width: '100%', background: '#fff', color: '#000', border: 'none', padding: 15, borderRadius: 15, fontWeight: 'bold', marginTop: 20 }
};

export default App;
