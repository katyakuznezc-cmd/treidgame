import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, onDisconnect, serverTimestamp, update } from "firebase/database";

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
const COINS = [
  { id: 'SOL', name: 'Solana', icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  { id: 'ETH', name: 'Ethereum', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { id: 'BNB', name: 'BNB', icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  { id: 'DOGE', name: 'Dogecoin', icon: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
  { id: 'XRP', name: 'XRP', icon: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
  { id: 'ADA', name: 'Cardano', icon: 'https://cryptologos.cc/logos/cardano-ada-logo.png' },
  { id: 'AVAX', name: 'Avalanche', icon: 'https://cryptologos.cc/logos/avalanche-avax-logo.png' },
  { id: 'MATIC', name: 'Polygon', icon: 'https://cryptologos.cc/logos/polygon-matic-logo.png' },
  { id: 'DOT', name: 'Polkadot', icon: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png' },
  { id: 'TRX', name: 'TRON', icon: 'https://cryptologos.cc/logos/tron-trx-logo.png' },
  { id: 'USDT', name: 'Tether', icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' }
];

function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [lang, setLang] = useState(() => localStorage.getItem('arb_lang') || 'ru');
  const [view, setView] = useState('main'); 
  const [selectedDex, setSelectedDex] = useState(null);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [tradeAmount, setTradeAmount] = useState("");
  const [online, setOnline] = useState(0);
  const [isTrading, setIsTrading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modal, setModal] = useState(null);
  const [signal, setSignal] = useState("");

  const userId = useMemo(() => {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tg) return tg.id.toString();
    let id = localStorage.getItem('arb_user_id') || 'Player_' + Math.floor(Math.random() * 9000);
    localStorage.setItem('arb_user_id', id);
    return id;
  }, []);

  useEffect(() => {
    const userRef = ref(db, 'players/' + userId);
    const presenceRef = ref(db, 'online/' + userId);
    set(presenceRef, true);
    onDisconnect(presenceRef).remove();
    update(userRef, { id: userId, balance: balance, lastSeen: serverTimestamp() });
    localStorage.setItem('arb_balance', balance);
    localStorage.setItem('arb_lang', lang);
    onValue(ref(db, 'online'), (s) => setOnline(s.exists() ? Object.keys(s.val()).length : 1));
  }, [balance, userId, lang]);

  useEffect(() => { if (!signal) generateSignal(); }, [signal]);

  const generateSignal = () => {
    const coin = COINS[Math.floor(Math.random() * (COINS.length - 1))];
    const prof = (Math.random() * 1.5 + 1.2).toFixed(2);
    setSignal(`Buy ${coin.id} on ${DEXES[1]} -> Sell on ${DEXES[0]} (+${prof}%)`);
  };

  const startTrade = () => {
    if (!selectedCoin || !tradeAmount) return;
    setIsTrading(true);
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 4;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          const isWin = Math.random() > 0.35; // ~65% шанс успеха
          const percent = isWin ? (Math.random() * 3) : -(Math.random() * 1.5);
          const diff = balance * (percent / 100);
          setBalance(prev => prev + diff);
          setModal({ amount: Math.abs(diff).toFixed(2), isWin });
          setIsTrading(false);
          setSelectedDex(null);
          setSelectedCoin(null);
          setTradeAmount("");
          generateSignal();
        }, 500);
      }
    }, 100);
  };

  const t = {
    ru: { bal: "БАЛАНС", online: "В СЕТИ", signal: "СИГНАЛ", settings: "Настройки", back: "Назад", exchange: "ОБМЕНЯТЬ", max: "MAX", select: "Выберите монету" },
    en: { bal: "BALANCE", online: "ONLINE", signal: "SIGNAL", settings: "Settings", back: "Back", exchange: "EXCHANGE", max: "MAX", select: "Select coin" }
  }[lang];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => setView('settings')} style={styles.iconBtn}>⚙️</button>
        <div style={styles.onlineTag}>
          <div style={styles.dot}></div>
          <span>{online} {t.online}</span>
        </div>
        <button style={styles.iconBtn} onClick={() => window.location.reload()}>📜</button>
      </div>

      {view === 'main' && !selectedDex && (
        <div style={styles.content}>
          <div style={styles.balanceBox}>
            <h1 style={styles.balanceText}>${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
            <div style={styles.subText}>{t.bal}</div>
          </div>

          <div style={styles.signalBox}>
            <div style={styles.signalTitle}>{t.signal}</div>
            <div style={styles.signalText}>{signal}</div>
          </div>

          <div style={styles.grid}>
            {DEXES.map(d => (
              <button key={d} onClick={() => setSelectedDex(d)} style={styles.dexBtn}>{d}</button>
            ))}
          </div>

          <div style={styles.footer}>
            <div style={{textAlign: 'left'}}>
              <div style={{fontWeight: 'bold', fontSize: '13px'}}>{t.ru === 'БАЛАНС' ? 'Нужна помощь?' : 'Need help?'}</div>
              <a href="https://t.me/vladstelin78" style={{color: '#39f2af', fontSize: '12px', textDecoration: 'none'}}>@vladstelin78</a>
            </div>
            <div style={{fontSize: '10px', opacity: 0.3}}>v1.2.0</div>
          </div>
        </div>
      )}

      {selectedDex && !isTrading && (
        <div style={styles.dexView}>
          <button onClick={() => {setSelectedDex(null); setSelectedCoin(null);}} style={{...styles.iconBtn, alignSelf: 'flex-start'}}>←</button>
          <h2 style={{textAlign: 'center', margin: '10px 0'}}>{selectedDex}</h2>
          
          <div style={styles.coinGrid}>
            {COINS.map(c => (
              <div key={c.id} 
                   onClick={() => setSelectedCoin(c.id)} 
                   style={{...styles.coinItem, borderColor: selectedCoin === c.id ? '#39f2af' : '#222'}}>
                <img src={c.icon} width="24" height="24" alt="" />
                <span style={{fontSize: '10px', marginTop: '5px'}}>{c.id}</span>
              </div>
            ))}
          </div>

          <div style={styles.tradeInputBox}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
              <span style={{fontSize: '12px', opacity: 0.5}}>{selectedCoin || '---'}</span>
              <button onClick={() => setTradeAmount(balance.toFixed(2))} style={styles.maxBtn}>{t.max}</button>
            </div>
            <input 
              type="number" 
              placeholder="0.00" 
              value={tradeAmount} 
              onChange={(e) => setTradeAmount(e.target.value)}
              style={styles.input}
            />
          </div>

          <button 
            disabled={!selectedCoin || !tradeAmount}
            onClick={startTrade} 
            style={{...styles.mainExchangeBtn, opacity: (!selectedCoin || !tradeAmount) ? 0.5 : 1}}
          >
            {t.exchange}
          </button>
        </div>
      )}

      {view === 'settings' && (
        <div style={styles.settingsPage}>
          <h2>{t.settings}</h2>
          <div style={styles.settingItem}>
            <button onClick={() => setLang(l => l === 'ru' ? 'en' : 'ru')} style={styles.langBtn}>
              {lang === 'ru' ? 'Язык: Русский' : 'Language: English'}
            </button>
          </div>
          <div style={styles.settingItem}>
            <div style={{opacity: 0.5, fontSize: '12px'}}>CHANNEL</div>
            <a href="https://t.me/kriptoalians" style={{color: '#39f2af', textDecoration: 'none', fontWeight: 'bold'}}>@kriptoalians</a>
          </div>
          <button onClick={() => setView('main')} style={styles.backBtn}>{t.back}</button>
        </div>
      )}

      {isTrading && (
        <div style={styles.overlay}>
          <div style={{textAlign: 'center', width: '80%'}}>
            <div style={{color: '#39f2af', fontWeight: 'bold', marginBottom: '10px'}}>SYNCHRONIZING {selectedDex}...</div>
            <div style={styles.progressBg}><div style={{...styles.progressBar, width: `${progress}%`}}></div></div>
            <div style={{marginTop: '10px', opacity: 0.5, fontSize: '10px'}}>{progress}%</div>
          </div>
        </div>
      )}

      {modal && (
        <div style={styles.overlay}>
          <div style={styles.modalCard}>
            <div style={{fontSize: '50px'}}>{modal.isWin ? '💰' : '📉'}</div>
            <h2 style={{color: modal.isWin ? '#39f2af' : '#ff4d4d', fontSize: '32px', margin: '15px 0'}}>
              {modal.isWin ? `+${modal.amount}` : `-${modal.amount}`}$
            </h2>
            <button onClick={() => setModal(null)} style={styles.backBtn}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { height: '100vh', width: '100vw', maxWidth: '500px', margin: '0 auto', background: '#000', color: '#fff', padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  iconBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: '10px 14px', borderRadius: '12px', cursor: 'pointer' },
  onlineTag: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(57,242,175,0.1)', padding: '6px 15px', borderRadius: '20px', color: '#39f2af', fontSize: '11px', fontWeight: 'bold' },
  dot: { width: '6px', height: '6px', background: '#39f2af', borderRadius: '50%', boxShadow: '0 0 8px #39f2af' },
  content: { flex: 1, display: 'flex', flexDirection: 'column' },
  balanceBox: { textAlign: 'center', margin: '20px 0' },
  balanceText: { fontSize: '42px', margin: 0, fontWeight: '900' },
  subText: { opacity: 0.4, fontSize: '11px', marginTop: '5px' },
  signalBox: { background: '#111', border: '1px solid #222', padding: '12px', borderRadius: '18px', marginBottom: '20px', textAlign: 'center' },
  signalTitle: { color: '#39f2af', fontSize: '10px', fontWeight: 'bold', marginBottom: '3px' },
  signalText: { fontSize: '12px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  dexBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: '20px 0', borderRadius: '18px', fontWeight: 'bold' },
  dexView: { flex: 1, display: 'flex', flexDirection: 'column' },
  coinGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', margin: '15px 0' },
  coinItem: { background: '#111', border: '2px solid #222', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' },
  tradeInputBox: { background: '#111', padding: '15px', borderRadius: '20px', border: '1px solid #222', margin: '10px 0' },
  maxBtn: { background: '#39f2af', color: '#000', border: 'none', borderRadius: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: 'bold' },
  input: { background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', width: '100%', outline: 'none' },
  mainExchangeBtn: { width: '100%', marginTop: 'auto', padding: '18px', borderRadius: '18px', background: '#39f2af', color: '#000', fontWeight: 'bold', fontSize: '16px', border: 'none' },
  footer: { marginTop: 'auto', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  settingsPage: { display: 'flex', flexDirection: 'column', flex: 1 },
  settingItem: { background: '#111', padding: '20px', borderRadius: '20px', marginBottom: '15px' },
  langBtn: { width: '100%', padding: '12px', background: '#222', border: '1px solid #39f2af', color: '#fff', borderRadius: '12px' },
  backBtn: { width: '100%', marginTop: 'auto', padding: '15px', borderRadius: '15px', background: '#fff', color: '#000', fontWeight: 'bold', border: 'none' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  progressBg: { width: '100%', height: '8px', background: '#222', borderRadius: '10px', overflow: 'hidden' },
  progressBar: { height: '100%', background: '#39f2af', transition: 'width 0.2s linear' },
  modalCard: { background: '#111', padding: '30px', borderRadius: '30px', textAlign: 'center', width: '85%', border: '1px solid #222' }
};

export default App;
