import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, onDisconnect, serverTimestamp, update } from "firebase/database";

// Конфиг Firebase (Твой текущий)
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
  const [selectedDex, setSelectedDex] = useState(null);
  const [toAsset, setToAsset] = useState(null);
  const [amount, setAmount] = useState('');
  const [signal, setSignal] = useState('');
  const [online, setOnline] = useState(1);
  const [isTrading, setIsTrading] = useState(false);
  const [modal, setModal] = useState(null);

  const userId = useMemo(() => {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tg) return tg.id.toString();
    let id = localStorage.getItem('arb_id') || 'User_' + Math.floor(Math.random() * 9999);
    localStorage.setItem('arb_id', id);
    return id;
  }, []);

  // Firebase Logic
  useEffect(() => {
    localStorage.setItem('arb_balance', balance);
    localStorage.setItem('arb_asset', currentAsset);
    update(ref(db, 'players/' + userId), { balance, currentAsset, lastSeen: serverTimestamp() });
    
    const presenceRef = ref(db, 'online/' + userId);
    set(presenceRef, true);
    onDisconnect(presenceRef).remove();
    onValue(ref(db, 'online'), (s) => setOnline(s.exists() ? Object.keys(s.val()).length : 1));
  }, [balance, currentAsset]);

  // Signals Logic
  useEffect(() => {
    const genSignal = () => {
      const asset = ASSETS[Math.floor(Math.random() * (ASSETS.length - 1)) + 1];
      const d1 = DEXES[Math.floor(Math.random() * DEXES.length)];
      const d2 = DEXES.filter(d => d !== d1)[Math.floor(Math.random() * 3)];
      const prof = (Math.random() * 1.8 + 1.2).toFixed(2);
      setSignal(`BUY ${asset.id} ON ${d1} -> SELL ON ${d2} (+${prof}%)`);
    };
    genSignal();
    const interval = setInterval(genSignal, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSwap = () => {
    if (!amount || !toAsset) return;
    setIsTrading(true);
    setTimeout(() => {
      const isWin = Math.random() > 0.3;
      const change = isWin ? (1 + Math.random() * 0.03) : (1 - Math.random() * 0.015);
      
      if (currentAsset === 'USDT') {
        setCurrentAsset(toAsset.id);
        setModal({ type: 'buy', title: 'Asset Purchased', asset: toAsset.id });
      } else {
        const newBal = balance * change;
        const diff = newBal - balance;
        setBalance(newBal);
        setCurrentAsset('USDT');
        setModal({ type: 'sell', win: diff > 0, amount: Math.abs(diff).toFixed(2) });
      }
      setIsTrading(false);
      setSelectedDex(null);
      setAmount('');
      setToAsset(null);
    }, 2000);
  };

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.onlineTag}><div style={s.dot}></div> {online} ONLINE</div>
        <div style={{fontSize: 12, fontWeight: '900', color: '#39f2af'}}>CRYPTO ALLIANCE</div>
      </div>

      {!selectedDex ? (
        <div style={s.mainView}>
          <div style={s.balanceSection}>
            <div style={s.assetLabel}>{currentAsset} BALANCE</div>
            <div style={s.balanceText}>{currentAsset === 'USDT' ? '$' : ''}{balance.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
          </div>

          <div style={s.signalBox}>
            <div style={s.signalHeader}>🔴 LIVE SIGNAL</div>
            <div style={s.signalText}>{signal}</div>
          </div>

          <div style={s.dexGrid}>
            {DEXES.map(d => (
              <button key={d} onClick={() => setSelectedDex(d)} style={s.dexBtn}>
                <div style={{fontSize: 14}}>{d}</div>
                <div style={{fontSize: 10, opacity: 0.5}}>Liquidity: High</div>
              </button>
            ))}
          </div>

          <div style={s.footerCard}>
            <div style={{fontSize: 12}}>Нужна помощь?</div>
            <a href="https://t.me/vladstelin78" style={s.managerBtn}>Менеджер</a>
          </div>
        </div>
      ) : (
        <div style={s.exchangeView}>
          <div style={s.exHeader}>
            <button onClick={() => setSelectedDex(null)} style={s.backBtn}>← Back</button>
            <div style={{fontWeight: 'bold'}}>{selectedDex}</div>
            <div style={{width: 50}}></div>
          </div>

          {/* Pay Block */}
          <div style={s.tradeCard}>
            <div style={s.cardLabel}>YOU PAY</div>
            <div style={s.tradeRow}>
              <div style={s.assetDisplay}>
                <img src={ASSETS.find(a => a.id === currentAsset).icon} width="20"/>
                <span>{currentAsset}</span>
              </div>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={s.input}/>
              <button onClick={() => setAmount(balance.toFixed(2))} style={s.maxBtn}>MAX</button>
            </div>
          </div>

          <div style={{textAlign: 'center', margin: '15px 0', fontSize: 20, opacity: 0.5}}>↓</div>

          {/* Receive Block */}
          <div style={s.tradeCard}>
            <div style={s.cardLabel}>YOU RECEIVE</div>
            <div style={s.assetGrid}>
              {ASSETS.filter(a => a.id !== currentAsset).map(a => (
                <div key={a.id} onClick={() => setToAsset(a)} 
                     style={{...s.assetItem, borderColor: toAsset?.id === a.id ? '#39f2af' : '#222'}}>
                  <img src={a.icon} width="24"/>
                  <div style={{fontSize: 10, marginTop: 4}}>{a.id}</div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleSwap} disabled={!amount || !toAsset} style={s.swapBtn}>
            {isTrading ? 'PROCESSING...' : (currentAsset === 'USDT' ? 'BUY ASSET' : 'SELL TO USDT')}
          </button>
        </div>
      )}

      {/* Modal Result */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{fontSize: 50}}>{modal.type === 'buy' ? '✅' : (modal.win ? '💰' : '📉')}</div>
            <h2 style={{margin: '10px 0'}}>{modal.type === 'buy' ? 'Success' : 'Trade Result'}</h2>
            {modal.amount && <h1 style={{color: modal.win ? '#39f2af' : '#ff4d4d'}}>{modal.win ? '+' : '-'}${modal.amount}</h1>}
            <p style={{opacity: 0.6}}>{modal.type === 'buy' ? `You now hold ${modal.asset}` : 'Funds returned to USDT'}</p>
            <button onClick={() => setModal(null)} style={s.closeBtn}>CONTINUE</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { height: '100vh', width: '100vw', maxWidth: 450, margin: '0 auto', background: '#000', color: '#fff', padding: 15, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '-apple-system, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  onlineTag: { background: 'rgba(57,242,175,0.1)', color: '#39f2af', padding: '5px 12px', borderRadius: 15, fontSize: 10, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, background: '#39f2af', borderRadius: '50%', boxShadow: '0 0 8px #39f2af' },
  mainView: { flex: 1, display: 'flex', flexDirection: 'column' },
  balanceSection: { textAlign: 'center', margin: '20px 0' },
  assetLabel: { fontSize: 10, opacity: 0.4, letterSpacing: 1 },
  balanceText: { fontSize: 45, fontWeight: '900', marginTop: 5 },
  signalBox: { background: '#111', padding: 15, borderRadius: 20, border: '1px solid #222', marginBottom: 20 },
  signalHeader: { fontSize: 10, fontWeight: 'bold', color: '#ff4d4d', marginBottom: 5 },
  signalText: { fontSize: 13, fontWeight: 'bold' },
  dexGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  dexBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: '20px 0', borderRadius: 18, textAlign: 'center' },
  footerCard: { marginTop: 'auto', background: 'linear-gradient(90deg, #111, #1a1a1a)', padding: 15, borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  managerBtn: { background: '#39f2af', color: '#000', textDecoration: 'none', padding: '8px 15px', borderRadius: 10, fontSize: 12, fontWeight: 'bold' },
  exchangeView: { flex: 1, display: 'flex', flexDirection: 'column' },
  exHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { background: 'none', border: 'none', color: '#39f2af', fontSize: 14 },
  tradeCard: { background: '#111', padding: 15, borderRadius: 20, border: '1px solid #222' },
  cardLabel: { fontSize: 9, opacity: 0.5, marginBottom: 10, fontWeight: 'bold' },
  tradeRow: { display: 'flex', alignItems: 'center', gap: 10 },
  assetDisplay: { background: '#222', padding: '8px 12px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 },
  input: { background: 'transparent', border: 'none', color: '#fff', fontSize: 22, flex: 1, outline: 'none' },
  maxBtn: { background: '#39f2af', color: '#000', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 'bold' },
  assetGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 },
  assetItem: { background: '#222', padding: 8, borderRadius: 12, border: '2px solid transparent', textAlign: 'center' },
  swapBtn: { width: '100%', marginTop: 'auto', background: '#39f2af', color: '#000', padding: 18, borderRadius: 18, fontWeight: '900', border: 'none', fontSize: 16 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#111', width: '85%', padding: 30, borderRadius: 30, border: '1px solid #222', textAlign: 'center' },
  closeBtn: { width: '100%', background: '#fff', color: '#000', padding: 14, borderRadius: 14, fontWeight: 'bold', border: 'none', marginTop: 20 }
};

export default App;
