import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, onDisconnect, serverTimestamp, update } from "firebase/database";

// ТВОЙ КОНФИГ (Оставляем как есть)
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
const COINS = ["SOL", "ETH", "BNB", "DOGE", "XRP", "ADA", "AVAX", "MATIC", "DOT", "TRX"];

function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [lang, setLang] = useState(() => localStorage.getItem('arb_lang') || 'ru');
  const [view, setView] = useState('main'); 
  const [selectedDex, setSelectedDex] = useState(null); // Состояние для выбранной биржи
  const [online, setOnline] = useState(0);
  const [isTrading, setIsTrading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modal, setModal] = useState(null);
  const [signal, setSignal] = useState("");

  const userId = useMemo(() => {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tg) return tg.id.toString();
    let id = localStorage.getItem('arb_user_id') || 'Guest_' + Math.floor(Math.random() * 9000);
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
    const onlineUnsub = onValue(ref(db, 'online'), (snap) => {
      setOnline(snap.exists() ? Object.keys(snap.val()).length : 1);
    });
    return () => onlineUnsub();
  }, [balance, userId, lang]);

  useEffect(() => { if (!signal) generateSignal(); }, [signal]);

  const generateSignal = () => {
    const coin = COINS[Math.floor(Math.random() * COINS.length)];
    const prof = (Math.random() * 1.5 + 1.2).toFixed(2);
    setSignal(`Buy ${coin} on ${DEXES[1]} -> Sell on ${DEXES[0]} (+${prof}%)`);
  };

  const startTrade = () => {
    setIsTrading(true);
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          const isWin = Math.random() > 0.3;
          const percent = isWin ? (Math.random() * 3) : -(Math.random() * 1.5);
          const diff = balance * (percent / 100);
          setBalance(prev => prev + diff);
          setModal({ amount: diff.toFixed(2), isWin });
          setIsTrading(false);
          setSelectedDex(null); // Закрываем окно биржи после сделки
          generateSignal();
        }, 500);
      }
    }, 100);
  };

  const t = {
    ru: { bal: "МОЙ БАЛАНС", online: "В СЕТИ", signal: "СИГНАЛ ОБНАРУЖЕН", help: "Нужна помощь?", manager: "Менеджер онлайн", settings: "Настройки", back: "Назад", exchange: "ОБМЕНЯТЬ", max: "МАКС" },
    en: { bal: "MY BALANCE", online: "ONLINE", signal: "SIGNAL DETECTED", help: "Need help?", manager: "Manager online", settings: "Settings", back: "Back", exchange: "EXCHANGE", max: "MAX" }
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
        <button style={styles.iconBtn}>📜</button>
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
                <div style={{fontWeight: 'bold', fontSize: '14px'}}>{t.help}</div>
                <div style={{opacity: 0.5, fontSize: '12px'}}>{t.manager}</div>
            </div>
            <a href="https://t.me/vladstelin78" style={styles.goBtn}>GO</a>
          </div>
        </div>
      )}

      {/* ОКНО ВЫБРАННОЙ БИРЖИ (Как раньше) */}
      {selectedDex && !isTrading && (
          <div style={styles.dexView}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '30px'}}>
                  <button onClick={() => setSelectedDex(null)} style={styles.iconBtn}>←</button>
                  <h3 style={{margin: 0}}>{selectedDex}</h3>
                  <div style={{width: '40px'}}></div>
              </div>
              
              <div style={styles.tradeCard}>
                  <div style={{opacity: 0.5, fontSize: '12px'}}>Asset: USDT</div>
                  <div style={{fontSize: '24px', fontWeight: 'bold', margin: '10px 0'}}>${balance.toLocaleString()}</div>
                  <button style={styles.maxTag}>{t.max}</button>
              </div>

              <button onClick={startTrade} style={styles.mainExchangeBtn}>{t.exchange}</button>
          </div>
      )}

      {view === 'settings' && (
        <div style={styles.settingsPage}>
          <h2>{t.settings}</h2>
          <div style={styles.settingItem}>
            <button onClick={() => setLang(l => l === 'ru' ? 'en' : 'ru')} style={styles.langBtn}>
              {lang === 'ru' ? 'Русский' : 'English'}
            </button>
          </div>
          <div style={styles.settingItem}>
            <div style={{opacity: 0.5}}>Creators</div>
            <a href="https://t.me/kriptoalians" style={{color: '#39f2af', textDecoration: 'none'}}>@kriptoalians</a>
          </div>
          <button onClick={() => setView('main')} style={styles.backBtn}>{t.back}</button>
        </div>
      )}

      {/* Оверлеи и модалки */}
      {isTrading && (
        <div style={styles.overlay}>
          <div style={{textAlign: 'center', width: '220px'}}>
            <div style={{marginBottom: '15px', color: '#39f2af', fontWeight: 'bold'}}>{selectedDex} PROCESSING...</div>
            <div style={styles.progressBg}><div style={{...styles.progressBar, width: `${progress}%`}}></div></div>
          </div>
        </div>
      )}

      {modal && (
        <div style={styles.overlay}>
          <div style={styles.modalCard}>
            <div style={{fontSize: '50px'}}>{modal.isWin ? '💰' : '📉'}</div>
            <h2 style={{color: modal.isWin ? '#39f2af' : '#ff4d4d', fontSize: '36px', margin: '20px 0'}}>
              {modal.isWin ? `+${modal.amount}` : modal.amount}$
            </h2>
            <button onClick={() => setModal(null)} style={styles.backBtn}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { height: '100vh', background: '#000', color: '#fff', padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  iconBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: '10px 14px', borderRadius: '12px', cursor: 'pointer' },
  onlineTag: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(57,242,175,0.1)', padding: '6px 15px', borderRadius: '20px', color: '#39f2af', fontSize: '11px', fontWeight: 'bold' },
  dot: { width: '6px', height: '6px', background: '#39f2af', borderRadius: '50%', boxShadow: '0 0 8px #39f2af' },
  content: { flex: 1, display: 'flex', flexDirection: 'column' },
  balanceBox: { textAlign: 'center', margin: '30px 0' },
  balanceText: { fontSize: '48px', margin: 0, fontWeight: '900' },
  subText: { opacity: 0.4, fontSize: '12px', marginTop: '5px' },
  signalBox: { background: '#111', border: '1px solid #222', padding: '15px', borderRadius: '20px', marginBottom: '20px', textAlign: 'center' },
  signalTitle: { color: '#39f2af', fontSize: '10px', fontWeight: 'bold', marginBottom: '5px' },
  signalText: { fontSize: '13px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  dexBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: '25px 0', borderRadius: '22px', fontWeight: 'bold' },
  dexView: { flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '10px' },
  tradeCard: { background: '#111', padding: '20px', borderRadius: '25px', border: '1px solid #222', position: 'relative' },
  maxTag: { position: 'absolute', right: '20px', top: '20px', background: '#39f2af', color: '#000', border: 'none', borderRadius: '8px', padding: '4px 8px', fontSize: '10px', fontWeight: 'bold' },
  mainExchangeBtn: { width: '100%', marginTop: '20px', padding: '20px', borderRadius: '20px', background: '#39f2af', color: '#000', fontWeight: 'bold', fontSize: '16px', border: 'none' },
  footer: { marginTop: 'auto', background: 'linear-gradient(90deg, #111, #1a1a1a)', padding: '15px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #222' },
  goBtn: { background: '#39f2af', color: '#000', textDecoration: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold' },
  settingsPage: { display: 'flex', flexDirection: 'column', flex: 1 },
  settingItem: { background: '#111', padding: '20px', borderRadius: '20px', marginBottom: '15px' },
  langBtn: { width: '100%', padding: '12px', background: '#222', border: '1px solid #39f2af', color: '#fff', borderRadius: '12px' },
  backBtn: { width: '100%', marginTop: 'auto', padding: '15px', borderRadius: '15px', background: '#fff', color: '#000', fontWeight: 'bold' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  progressBg: { width: '100%', height: '6px', background: '#222', borderRadius: '10px', overflow: 'hidden' },
  progressBar: { height: '100%', background: '#39f2af', transition: 'width 0.1s linear' },
  modalCard: { background: '#111', padding: '40px', borderRadius: '35px', textAlign: 'center', width: '85%' }
};

export default App;
