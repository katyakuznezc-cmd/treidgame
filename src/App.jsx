

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
const COINS = [
  { id: 'SOL', icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  { id: 'ETH', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { id: 'BNB', icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  { id: 'DOGE', icon: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
  { id: 'XRP', icon: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
  { id: 'ADA', icon: 'https://cryptologos.cc/logos/cardano-ada-logo.png' },
  { id: 'AVAX', icon: 'https://cryptologos.cc/logos/avalanche-avax-logo.png' },
  { id: 'MATIC', icon: 'https://cryptologos.cc/logos/polygon-matic-logo.png' },
  { id: 'DOT', icon: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png' },
  { id: 'TRX', icon: 'https://cryptologos.cc/logos/tron-trx-logo.png' },
  { id: 'USDT', icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' }
];

function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [holdCoin, setHoldCoin] = useState(() => localStorage.getItem('arb_hold') || 'USDT');
  const [lang, setLang] = useState(() => localStorage.getItem('arb_lang') || 'ru');
  const [view, setView] = useState('main');
  const [selectedDex, setSelectedDex] = useState(null);
  const [targetCoin, setTargetCoin] = useState(null);
  const [online, setOnline] = useState(1);
  const [signal, setSignal] = useState('');
  const [isTrading, setIsTrading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modal, setModal] = useState(null);

  const userId = useMemo(() => {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tg) return tg.id.toString();
    return localStorage.getItem('arb_id') || 'User_' + Math.random().toString(36).substr(2, 5);
  }, []);

  useEffect(() => {
    localStorage.setItem('arb_balance', balance);
    localStorage.setItem('arb_hold', holdCoin);
    localStorage.setItem('arb_lang', lang);
    update(ref(db, 'players/' + userId), { balance, holdCoin, lastSeen: serverTimestamp() });
    
    const presenceRef = ref(db, 'online/' + userId);
    set(presenceRef, true);
    onDisconnect(presenceRef).remove();
    onValue(ref(db, 'online'), (s) => setOnline(s.exists() ? Object.keys(s.val()).length : 1));
  }, [balance, holdCoin, lang]);

  useEffect(() => {
    const gen = () => {
      const c = COINS[Math.floor(Math.random() * (COINS.length - 1))];
      const p = (Math.random() * 2 + 1).toFixed(2);
      setSignal(`BUY ${c.id} on ${DEXES[1]} → SELL on ${DEXES[0]} (+${p}%)`);
    };
    gen();
    const inv = setInterval(gen, 20000);
    return () => clearInterval(inv);
  }, []);

  const handleTrade = () => {
    setIsTrading(true);
    let p = 0;
    const inv = setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 100) {
        clearInterval(inv);
        setTimeout(() => {
          if (holdCoin === 'USDT') {
            setHoldCoin(targetCoin);
            setModal({ type: 'buy', coin: targetCoin });
          } else {
            const isWin = Math.random() > 0.3;
            const change = isWin ? (1 + Math.random() * 0.03) : (1 - Math.random() * 0.015);
            const newBal = balance * change;
            const diff = newBal - balance;
            setBalance(newBal);
            setHoldCoin('USDT');
            setModal({ type: 'sell', win: isWin, amount: Math.abs(diff).toFixed(2) });
          }
          setIsTrading(false);
          setSelectedDex(null);
          setTargetCoin(null);
        }, 500);
      }
    }, 100);
  };

  const t = {
    ru: { bal: "БАЛАНС", help: "Нужна помощь?", manager: "Менеджер онлайн", settings: "Настройки", exchange: "ОБМЕНЯТЬ", pay: "ОТДАЕТЕ", get: "ПОЛУЧАЕТЕ" },
    en: { bal: "BALANCE", help: "Need help?", manager: "Manager online", settings: "Settings", exchange: "EXCHANGE", pay: "YOU PAY", get: "YOU GET" }
  }[lang];

  return (
    <div style={s.container}>
      {/* Шапка */}
      <div style={s.header}>
        <button onClick={() => setView('settings')} style={s.iconBtn}>⚙️</button>
        <div style={s.onlineTag}><div style={s.dot}></div> {online} ONLINE</div>
        <div style={{width: 40}}></div>
      </div>

      {view === 'main' && !selectedDex && (
        <div style={s.fade}>
          <div style={s.balanceBox}>
            <div style={s.label}>{holdCoin} {t.bal}</div>
            <h1 style={s.mainBal}>{holdCoin === 'USDT' ? '$' : ''}{balance.toLocaleString(undefined, {maximumFractionDigits: 2})}</h1>
          </div>

          <div style={s.signalBox}>
            <div style={s.signalLabel}>LIVE ARBITRAGE SIGNAL</div>
            <div style={s.signalText}>{signal}</div>
          </div>

          <div style={s.dexGrid}>
            {DEXES.map(d => (
              <button key={d} onClick={() => setSelectedDex(d)} style={s.dexBtn}>{d}</button>
            ))}
          </div>

          <div style={s.footer}>
            <div style={{textAlign: 'left'}}>
              <div style={{fontSize: 13, fontWeight: 'bold'}}>{t.help}</div>
              <div style={{fontSize: 11, opacity: 0.5}}>{t.manager}</div>
            </div>
            <a href="https://t.me/vladstelin78" style={s.goBtn}>GO</a>
          </div>
        </div>
      )}

      {selectedDex && !isTrading && (
        <div style={s.fade}>
          <div style={s.exHeader}>
            <button onClick={() => setSelectedDex(null)} style={s.backBtn}>←</button>
            <span style={{fontWeight: 'bold'}}>{selectedDex}</span>
            <div style={{width: 30}}></div>
          </div>

          <div style={s.tradeCard}>
            <div style={s.label}>{t.pay}</div>
            <div style={s.row}>
              <div style={s.asset}><img src={COINS.find(c => c.id === holdCoin)?.icon} width="20"/> {holdCoin}</div>
              <div style={s.val}>{balance.toFixed(2)}</div>
              <button style={s.maxBtn}>MAX</button>
            </div>
          </div>

          <div style={{textAlign: 'center', margin: '15px 0', fontSize: 20}}>↓</div>

          <div style={s.tradeCard}>
            <div style={s.label}>{t.get}</div>
            <div style={s.coinGrid}>
              {COINS.filter(c => c.id !== holdCoin).map(c => (
                <button key={c.id} onClick={() => setTargetCoin(c.id)} 
                        style={{...s.coinBtn, borderColor: (targetCoin === c.id || holdCoin === c.id) ? '#39f2af' : '#222'}}>
                  <img src={c.icon} width="22" alt=""/>
                  <div style={{fontSize: 10, marginTop: 4}}>{c.id}</div>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleTrade} disabled={holdCoin === 'USDT' ? !targetCoin : false} style={s.mainBtn}>
            {t.exchange}
          </button>
        </div>
      )}

      {view === 'settings' && (
        <div style={s.fade}>
          <h2>{t.settings}</h2>
          <button onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')} style={s.settingItem}>
            Language: {lang === 'ru' ? 'Русский' : 'English'}
          </button>
          <div style={s.settingItem}>
            Creators: <a href="https://t.me/kriptoalians" style={{color: '#39f2af'}}>@kriptoalians</a>
          </div>
          <button onClick={() => setView('main')} style={s.mainBtn}>BACK</button>
        </div>
      )}

      {/* Оверлеи */}
      {isTrading && (
        <div style={s.overlay}>
          <div style={{textAlign: 'center', width: '70%'}}>
            <div style={{color: '#39f2af', marginBottom: 10, fontWeight: 'bold'}}>SYNCING WITH {selectedDex}...</div>
            <div style={s.pBg}><div style={{...s.pBar, width: `${progress}%`}}></div></div>
          </div>
        </div>
      )}

      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{fontSize: 50}}>{modal.type === 'buy' ? '✅' : (modal.win ? '💰' : '📉')}</div>
            <h2>{modal.type === 'buy' ? 'Asset Bought' : 'Result'}</h2>
            {modal.amount && <h1 style={{color: modal.win ? '#39f2af' : '#ff4d4d'}}>{modal.win ? '+' : '-'}${modal.amount}</h1>}
            <button onClick={() => setModal(null)} style={s.mainBtn}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { height: '100vh', width: '100vw', maxWidth: 450, margin: '0 auto', background: '#000', color: '#fff', padding: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  onlineTag: { background: 'rgba(57,242,175,0.1)', color: '#39f2af', padding: '6px 15px', borderRadius: 20, fontSize: 10, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, background: '#39f2af', borderRadius: '50%', boxShadow: '0 0 8px #39f2af' },
  iconBtn: { background: '#111', border: '1px solid #222', color: '#fff', borderRadius: 12, padding: 10 },
  balanceBox: { textAlign: 'center', margin: '30px 0' },
  mainBal: { fontSize: 45, fontWeight: 900, marginTop: 5 },
  label: { opacity: 0.4, fontSize: 11, letterSpacing: 1 },
  signalBox: { background: '#111', padding: 15, borderRadius: 20, border: '1px solid #222', marginBottom: 25 },
  signalLabel: { color: '#39f2af', fontSize: 10, fontWeight: 'bold', marginBottom: 5 },
  signalText: { fontSize: 13, fontWeight: 'bold' },
  dexGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  dexBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: '25px 0', borderRadius: 20, fontWeight: 'bold' },
  footer: { marginTop: 'auto', background: 'linear-gradient(90deg, #111, #1a1a1a)', padding: 15, borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #222' },
  goBtn: { background: '#39f2af', color: '#000', textDecoration: 'none', padding: '10px 20px', borderRadius: 12, fontWeight: 'bold' },
  exHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  backBtn: { background: 'none', border: 'none', color: '#fff', fontSize: 24 },
  tradeCard: { background: '#111', padding: 15, borderRadius: 20, border: '1px solid #222' },
  row: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 },
  asset: { background: '#222', padding: '8px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 },
  val: { flex: 1, fontSize: 18, fontWeight: 'bold' },
  maxBtn: { background: '#39f2af', color: '#000', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 10, fontWeight: 'bold' },
  coinGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 10 },
  coinBtn: { background: '#222', border: '2px solid transparent', borderRadius: 12, padding: '10px 5px', color: '#fff' },
  mainBtn: { width: '100%', background: '#39f2af', color: '#000', border: 'none', padding: 18, borderRadius: 18, fontWeight: 'bold', marginTop: 'auto' },
  settingItem: { background: '#111', width: '100%', padding: 20, borderRadius: 15, border: '1px solid #222', color: '#fff', marginBottom: 10, textAlign: 'left' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  pBg: { width: '100%', height: '6px', background: '#222', borderRadius: 10 },
  pBar: { height: '100%', background: '#39f2af' },
  modal: { background: '#111', width: '85%', padding: 30, borderRadius: 30, border: '1px solid #222', textAlign: 'center' },
  fade: { animation: 'fadeIn 0.3s ease-in', display: 'flex', flexDirection: 'column', flex: 1 }
};

export default App;
