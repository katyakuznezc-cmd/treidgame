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
  { id: 'TRX', name: 'TRON', icon: 'https://cryptologos.cc/logos/tron-trx-logo.png' }
];

function App() {
  // Состояния
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [holdCoin, setHoldCoin] = useState(() => localStorage.getItem('arb_hold_coin') || 'USDT'); 
  const [lang, setLang] = useState(() => localStorage.getItem('arb_lang') || 'ru');
  const [view, setView] = useState('main'); 
  const [selectedDex, setSelectedDex] = useState(null);
  const [targetCoin, setTargetCoin] = useState(null);
  
  const [online, setOnline] = useState(0);
  const [isTrading, setIsTrading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modal, setModal] = useState(null);
  const [signal, setSignal] = useState("");

  const userId = useMemo(() => {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tg) return tg.id.toString();
    return localStorage.getItem('arb_user_id') || 'Player_' + Math.floor(Math.random() * 9000);
  }, []);

  // Firebase & LocalStorage
  useEffect(() => {
    localStorage.setItem('arb_balance', balance);
    localStorage.setItem('arb_hold_coin', holdCoin);
    update(ref(db, 'players/' + userId), { balance, holdCoin, lastSeen: serverTimestamp() });
    onValue(ref(db, 'online'), (s) => setOnline(s.exists() ? Object.keys(s.val()).length : 1));
  }, [balance, holdCoin]);

  useEffect(() => { if (!signal) generateSignal(); }, [signal]);

  const generateSignal = () => {
    const coin = COINS[Math.floor(Math.random() * COINS.length)];
    const prof = (Math.random() * 2 + 1.1).toFixed(2);
    setSignal(`BUY ${coin.id} @ ${DEXES[1]} -> SELL @ ${DEXES[0]} (+${prof}%)`);
  };

  const executeTrade = () => {
    setIsTrading(true);
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          if (holdCoin === 'USDT') {
            // ПОКУПКА МОНЕТЫ
            setHoldCoin(targetCoin);
            setModal({ msg: `Bought ${targetCoin}`, type: 'buy' });
          } else {
            // ПРОДАЖА В USDT (С профитом или убытком)
            const isWin = Math.random() > 0.3;
            const change = isWin ? (Math.random() * 0.03) : -(Math.random() * 0.015);
            const newBal = balance * (1 + change);
            setBalance(newBal);
            setHoldCoin('USDT');
            setModal({ amount: Math.abs(newBal - balance).toFixed(2), isWin, type: 'sell' });
            generateSignal();
          }
          setIsTrading(false);
          setSelectedDex(null);
          setTargetCoin(null);
        }, 500);
      }
    }, 80);
  };

  const t = {
    ru: { bal: "БАЛАНС", sell: "ПРОДАТЬ", buy: "КУПИТЬ", max: "МАКС", back: "НАЗАД" },
    en: { bal: "BALANCE", sell: "SELL", buy: "BUY", max: "MAX", back: "BACK" }
  }[lang];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.onlineTag}><div style={styles.dot}></div>{online} ONLINE</div>
        <button onClick={() => setView('settings')} style={styles.iconBtn}>⚙️</button>
      </div>

      {view === 'main' && !selectedDex && (
        <div style={styles.content}>
          <div style={styles.balanceBox}>
            <div style={styles.subText}>{holdCoin} {t.bal}</div>
            <h1 style={styles.balanceText}>{holdCoin === 'USDT' ? '$' : ''}{balance.toLocaleString(undefined, {maximumFractionDigits: 2})}</h1>
          </div>

          <div style={styles.signalBox}>
            <div style={{color: '#39f2af', fontSize: '10px', fontWeight: 'bold'}}>LIVE SIGNAL</div>
            <div style={{fontSize: '12px'}}>{signal}</div>
          </div>

          <div style={styles.grid}>
            {DEXES.map(d => (
              <button key={d} onClick={() => setSelectedDex(d)} style={styles.dexBtn}>{d}</button>
            ))}
          </div>
        </div>
      )}

      {selectedDex && !isTrading && (
        <div style={styles.dexView}>
          <div style={styles.dexHeader}>
            <button onClick={() => setSelectedDex(null)} style={styles.backBtnSmall}>{t.back}</button>
            <span style={{fontWeight: 'bold'}}>{selectedDex}</span>
            <div style={{width: '50px'}}></div>
          </div>

          <div style={styles.tradeZone}>
            <div style={styles.assetRow}>
              <span>{holdCoin === 'USDT' ? 'Pay' : 'Give'}</span>
              <span>{balance.toFixed(2)} {holdCoin}</span>
            </div>
            
            <div style={styles.coinGrid}>
              {COINS.map(c => (
                <button 
                  key={c.id} 
                  disabled={holdCoin !== 'USDT' && holdCoin !== c.id}
                  onClick={() => setTargetCoin(c.id)}
                  style={{...styles.coinBtn, borderColor: (targetCoin === c.id || holdCoin === c.id) ? '#39f2af' : '#222'}}
                >
                  <img src={c.icon} width="20" alt="" />
                  <div style={{fontSize: '10px'}}>{c.id}</div>
                </button>
              ))}
            </div>

            <button 
              onClick={executeTrade}
              disabled={holdCoin === 'USDT' ? !targetCoin : holdCoin === 'USDT'}
              style={{...styles.mainBtn, background: holdCoin === 'USDT' ? '#39f2af' : '#ff4d4d'}}
            >
              {holdCoin === 'USDT' ? `${t.buy} ${targetCoin || ''}` : `${t.sell} ${holdCoin}`}
            </button>
          </div>
        </div>
      )}

      {/* Перекрытия */}
      {isTrading && (
        <div style={styles.overlay}>
          <div style={{textAlign: 'center', width: '70%'}}>
            <div style={{marginBottom: '10px', fontSize: '12px'}}>{selectedDex} EXECUTING...</div>
            <div style={styles.pBg}><div style={{...styles.pBar, width: `${progress}%`}}></div></div>
          </div>
        </div>
      )}

      {modal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{fontSize: '40px'}}>{modal.type === 'buy' ? '✅' : (modal.isWin ? '💰' : '📉')}</div>
            <h3>{modal.type === 'buy' ? 'Assets Exchanged' : 'Trade Finished'}</h3>
            {modal.amount && <h2 style={{color: modal.isWin ? '#39f2af' : '#ff4d4d'}}>{modal.isWin ? '+' : '-'}${modal.amount}</h2>}
            <button onClick={() => setModal(null)} style={styles.closeBtn}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { height: '100vh', width: '100vw', maxWidth: '450px', margin: '0 auto', background: '#000', color: '#fff', padding: '15px', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  onlineTag: { background: 'rgba(57,242,175,0.1)', color: '#39f2af', padding: '5px 12px', borderRadius: '15px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' },
  dot: { width: '5px', height: '5px', background: '#39f2af', borderRadius: '50%' },
  iconBtn: { background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '10px', padding: '8px' },
  balanceBox: { textAlign: 'center', margin: '30px 0' },
  balanceText: { fontSize: '45px', margin: 0, fontWeight: '900' },
  subText: { opacity: 0.4, fontSize: '11px' },
  signalBox: { background: '#111', padding: '15px', borderRadius: '15px', border: '1px solid #222', marginBottom: '20px', textAlign: 'center' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  dexBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: '20px 0', borderRadius: '15px', fontWeight: 'bold' },
  dexView: { flex: 1, display: 'flex', flexDirection: 'column' },
  dexHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  backBtnSmall: { background: '#222', border: 'none', color: '#fff', padding: '5px 12px', borderRadius: '8px', fontSize: '10px' },
  tradeZone: { flex: 1, display: 'flex', flexDirection: 'column' },
  assetRow: { display: 'flex', justifyContent: 'space-between', opacity: 0.6, fontSize: '12px', marginBottom: '15px' },
  coinGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' },
  coinBtn: { background: '#111', border: '2px solid #222', borderRadius: '12px', padding: '10px 5px', color: '#fff' },
  mainBtn: { width: '100%', marginTop: 'auto', padding: '18px', borderRadius: '15px', border: 'none', color: '#000', fontWeight: '900' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  pBg: { width: '100%', height: '4px', background: '#222', borderRadius: '10px' },
  pBar: { height: '100%', background: '#39f2af' },
  modal: { background: '#111', padding: '30px', borderRadius: '25px', border: '1px solid #222', textAlign: 'center', width: '80%' },
  closeBtn: { width: '100%', background: '#fff', color: '#000', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', marginTop: '15px' }
};

export default App;
