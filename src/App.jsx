import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, onDisconnect, serverTimestamp, update } from "firebase/database";

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

// --- Данные активов и бирж ---
const ASSETS = {
  USDT: { symbol: 'USDT', name: 'Tether', price: 1, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 145.50, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 605.20, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  DOGE: { symbol: 'DOGE', name: 'Dogecoin', price: 0.16, icon: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
  XRP: { symbol: 'XRP', name: 'XRP', price: 0.62, icon: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
  ADA: { symbol: 'ADA', name: 'Cardano', price: 0.45, icon: 'https://cryptologos.cc/logos/cardano-ada-logo.png' },
  AVAX: { symbol: 'AVAX', name: 'Avalanche', price: 35.80, icon: 'https://cryptologos.cc/logos/avalanche-avax-logo.png' },
  MATIC: { symbol: 'MATIC', name: 'Polygon', price: 0.72, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.png' },
  DOT: { symbol: 'DOT', name: 'Polkadot', price: 7.10, icon: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png' },
  TRX: { symbol: 'TRX', name: 'TRON', price: 0.12, icon: 'https://cryptologos.cc/logos/tron-trx-logo.png' }
};
const DEXES = ['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'];

export default function FullAppWithTutorial() {
  const [balanceUSDT, setBalanceUSDT] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('arb_wallet')) || {});
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('arb_history')) || []);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('arb_tut_done'));
  const [tutStep, setTutStep] = useState(0);

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

  // --- Telegram / User ID logic ---
  const userId = useMemo(() => {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tg) return tg.id.toString();
    let id = localStorage.getItem('arb_user_id') || 'User_' + Math.floor(Math.random() * 9000);
    localStorage.setItem('arb_user_id', id);
    return id;
  }, []);

  // --- Firebase Sync & Presence ---
  useEffect(() => {
    const userRef = ref(db, 'players/' + userId);
    const presenceRef = ref(db, 'online/' + userId);

    // Сохраняем данные игрока
    update(userRef, { 
      balanceUSDT, 
      wallet, 
      history: history.slice(0, 5), // В базу только последние 5
      lastSeen: serverTimestamp() 
    });

    localStorage.setItem('arb_balance', balanceUSDT);
    localStorage.setItem('arb_wallet', JSON.stringify(wallet));
    localStorage.setItem('arb_history', JSON.stringify(history));

    // Online status
    set(presenceRef, true);
    onDisconnect(presenceRef).remove();
    onValue(ref(db, 'online'), (s) => setOnline(s.exists() ? Object.keys(s.val()).length : 1));
  }, [balanceUSDT, wallet, history, userId]);

  useEffect(() => {
    if (!signal) {
      const available = Object.values(ASSETS).filter(t => t.symbol !== 'USDT');
      const coin = available[Math.floor(Math.random() * available.length)];
      const shuffled = [...DEXES].sort(() => 0.5 - Math.random());
      const profit = (Math.random() * 1.6 + 1.4).toFixed(2);
      setSignal({ coin, buyAt: shuffled[0], sellAt: shuffled[1], profit: parseFloat(profit) });
    }
  }, [signal]);

  const closeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('arb_tut_done', 'true');
  };

  const tutorialSteps = [
    { t: "Добро пожаловать!", d: "Это симулятор межбиржевого арбитража. Мы научим тебя зарабатывать на разнице курсов." },
    { t: "Твой баланс", d: "Мы начислили тебе $1000 демо-средств. Используй их для первой сделки." },
    { t: "Следи за сигналами", d: "В центре экрана появляются 'связки'. Купи монету на одной бирже и продай на другой, чтобы получить профит." },
    { t: "Реальный счет", d: "Когда наберешься опыта — жми на кнопку связи с менеджером для торговли реальными активами!" }
  ];

  const handleSwap = () => {
    if (!amount || amount <= 0) return;
    setIsProcessing(true);
    setTimeout(() => {
      const num = Number(amount);
      if (payToken.symbol === 'USDT') {
        if (balanceUSDT >= num) {
          setBalanceUSDT(b => b - num);
          setWallet(w => ({ ...w, [receiveToken.symbol]: (w[receiveToken.symbol] || 0) + (num / receiveToken.price) }));
          setHistory(h => [{ id: Date.now(), details: `Куплено ${receiveToken.symbol}`, valStr: `-$${num.toFixed(2)}`, isPlus: false, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }, ...h].slice(0, 30));
          setNotification("Успешно куплено");
        } else {
          setNotification("Недостаточно баланса");
        }
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          const prof = isCorrect ? signal.profit : -(Math.random() * 1.5); // Рандомный минус если не по сигналу
          const finalVal = (num * payToken.price) * (1 + prof/100);
          setBalanceUSDT(b => b + finalVal);
          setWallet(w => ({ ...w, [payToken.symbol]: has - num }));
          setHistory(h => [{ id: Date.now(), details: `Продажа ${payToken.symbol}`, valStr: `+$${finalVal.toFixed(2)}`, isPlus: true, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }, ...h].slice(0, 30));
          setNotification(prof > 0 ? `Профит: +$${(finalVal - (num * payToken.price)).toFixed(2)}` : "Сделка завершена");
          setSignal(null);
        } else {
          setNotification("Недостаточно монет");
        }
      }
      setIsProcessing(false);
      setAmount('');
      setTimeout(() => setNotification(null), 3000);
    }, 4000); // 4 сек загрузка
  };

  const theme = activeDex === 'PANCAKE' ? { bg: '#f6f6f9', text: '#280d5f', card: '#fff', input: '#eeeaf4' } :
                activeDex === 'UNISWAP' ? { bg: '#fff', text: '#000', card: '#f7f8fa', input: '#fff' } :
                { bg: '#0c0d21', text: '#fff', card: '#14162e', input: 'rgba(0,0,0,0.3)' };

  return (
    <div style={{ width: '100vw', height: '100dvh', maxWidth: '500px', margin: '0 auto', background: '#000', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden', position: 'relative' }}>
      
      {/* Header Online */}
      <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 100, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(57,242,175,0.1)', padding: '5px 12px', borderRadius: 20, color: '#39f2af', fontSize: 10, fontWeight: 'bold' }}>
        <div style={{ width: 5, height: 5, background: '#39f2af', borderRadius: '50%', boxShadow: '0 0 5px #39f2af' }}></div>
        {online} ONLINE
      </div>

      {/* ТУТОРИАЛ */}
      {showTutorial && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
          <div style={{ background: '#111', padding: 25, borderRadius: 30, border: '1px solid #222', textAlign: 'center', width: '100%' }}>
            <div style={{ fontSize: 40, marginBottom: 15 }}>{['👋', '💰', '📉', '🚀'][tutStep]}</div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: 20 }}>{tutorialSteps[tutStep].t}</h3>
            <p style={{ opacity: 0.6, fontSize: 14, lineHeight: '1.5', marginBottom: 25 }}>{tutorialSteps[tutStep].d}</p>
            <button onClick={() => tutStep < 3 ? setTutStep(tutStep + 1) : closeTutorial()} 
                    style={{ width: '100%', background: '#39f2af', color: '#000', border: 'none', padding: 15, borderRadius: 15, fontWeight: 'bold' }}>
              {tutStep < 3 ? "Далее" : "Понятно!"}
            </button>
          </div>
        </div>
      )}

      {/* Лист токенов */}
      {showTokenList && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 2000, padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><h3>Токены</h3><button onClick={() => setShowTokenList(false)} style={{ color: '#fff', background: 'none', border: 'none', fontSize: 30 }}>&times;</button></div>
          <div style={{ overflowY: 'auto' }}>
            {Object.values(ASSETS).map(t => (
              <div key={t.symbol} onClick={() => { if (selectingFor === 'pay') setPayToken(t); else setReceiveToken(t); setShowTokenList(false); }} 
                   style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '15px 0', borderBottom: '1px solid #111' }}>
                <img src={t.icon} width="30" height="30" alt="" />
                <div style={{ flex: 1 }}><b>{t.symbol}</b></div>
                <div style={{ color: '#39f2af' }}>{t.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[t.symbol] || 0).toFixed(4)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {notification && (
        <div style={{ position: 'fixed', top: 20, left: '5%', width: '90%', background: '#39f2af', color: '#000', padding: 15, borderRadius: 15, zIndex: 3000, textAlign: 'center', fontWeight: 'bold' }}>{notification}</div>
      )}

      {/* Экран Истории */}
      {view === 'history' && (
        <div style={{ height: '100%', padding: 20, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 40 }}>
            <h2 style={{ margin: 0 }}>История</h2>
            <button onClick={() => setView('main')} style={{ color: '#fff', background: '#222', border: 'none', padding: '8px 15px', borderRadius: 10 }}>Назад</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {history.map(h => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #111' }}>
                <div><div>{h.details}</div><div style={{ fontSize: 10, opacity: 0.5 }}>{h.time}</div></div>
                <div style={{ color: h.isPlus ? '#39f2af' : '#ff4d4d', fontWeight: 'bold' }}>{h.valStr}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Главный экран */}
      {view === 'main' && !activeDex && (
        <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 15, marginTop: 30 }}>
            <button onClick={() => setView('history')} style={{ background: '#111', color: '#fff', border: '1px solid #222', padding: '8px 12px', borderRadius: 10, fontSize: 12 }}>📜 История</button>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 25 }}>
            <h1 style={{ fontSize: 40, margin: 0 }}>${balanceUSDT.toLocaleString(undefined, {maximumFractionDigits: 2})}</h1>
            <div style={{ opacity: 0.4, fontSize: 10, marginTop: 5 }}>ДЕМО СЧЕТ</div>
          </div>
          {signal && (
            <div style={{ background: '#111', padding: 15, borderRadius: 20, border: '1px solid #222', marginBottom: 20 }}>
              <div style={{ color: '#39f2af', fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>СИГНАЛ ОБНАРУЖЕН</div>
              <div style={{ fontSize: 15 }}>Купи {signal.coin.symbol} на {signal.buyAt}</div>
              <div style={{ fontSize: 15 }}>Продай на {signal.sellAt} <span style={{ color: '#39f2af' }}>+{signal.profit}%</span></div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 'auto' }}>
            {DEXES.map(d => (
              <button key={d} onClick={() => setActiveDex(d)} style={{ background: '#111', border: '1px solid #222', color: '#fff', padding: '22px 0', borderRadius: 20, fontWeight: 'bold', fontSize: 15 }}>{d}</button>
            ))}
          </div>
          
          <div style={{ background: 'linear-gradient(90deg, #111, #1a1a1a)', padding: '15px 20px', borderRadius: 25, border: '1px solid #222', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 'bold' }}>Готов к реальным сделкам?</div><div style={{ fontSize: 10, opacity: 0.5 }}>Свяжись с @vladstelin78</div></div>
            <a href="https://t.me/vladstelin78" style={{ background: '#39f2af', color: '#000', textDecoration: 'none', padding: '10px 15px', borderRadius: 12, fontSize: 11, fontWeight: 'bold' }}>НАЧАТЬ</a>
          </div>
        </div>
      )}

      {/* Биржа */}
      {activeDex && view === 'main' && (
        <div style={{ height: '100%', background: theme.bg, color: theme.text, animation: 'slideIn 0.3s', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '40px 15px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b style={{ fontSize: 18 }}>{activeDex}</b>
            <button onClick={() => setActiveDex(null)} style={{ background: 'rgba(0,0,0,0.1)', border: 'none', color: 'inherit', padding: '6px 12px', borderRadius: 10 }}>Назад</button>
          </div>
          <div style={{ padding: 15, flex: 1 }}>
            <div style={{ background: theme.card, padding: 20, borderRadius: 28, border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ background: theme.input, padding: 15, borderRadius: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.7 }}>
                  <span>ОТДАЕТЕ</span>
                  <span onClick={() => setAmount(payToken.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[payToken.symbol] || 0).toFixed(6))} style={{ color: '#39f2af', fontWeight: 'bold', cursor: 'pointer' }}>МАКС</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" style={{ background: 'none', border: 'none', fontSize: 24, color: 'inherit', outline: 'none', width: '60%' }} />
                  <button onClick={() => {setShowTokenList(true); setSelectingFor('pay')}} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', color: 'inherit', fontWeight: 'bold', padding: '5px 10px', borderRadius: 10 }}>{payToken.symbol} ▾</button>
                </div>
              </div>
              
              <div style={{ textAlign: 'center', margin: '15px 0', fontSize: 20 }}>↓</div>
              
              <div style={{ background: theme.input, padding: 15, borderRadius: 20, marginBottom: 25 }}>
                <div style={{ fontSize: 10, opacity: 0.7 }}>ПОЛУЧАЕТЕ</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold' }}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                  <button onClick={() => {setShowTokenList(true); setSelectingFor('receive')}} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', color: 'inherit', fontWeight: 'bold', padding: '5px 10px', borderRadius: 10 }}>{receiveToken.symbol} ▾</button>
                </div>
              </div>

              <button onClick={handleSwap} style={{ width: '100%', padding: 20, borderRadius: 20, border: 'none', fontSize: 16, fontWeight: 'bold', background: activeDex === 'UNISWAP' ? '#ff007a' : '#39f2af', color: activeDex === 'UNISWAP' ? '#fff' : '#000', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                {isProcessing ? 'ОБРАБОТКА...' : 'ПОДТВЕРДИТЬ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 5000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loader"></div>
          <div style={{ marginTop: 20, letterSpacing: 2, fontSize: 12, color: '#39f2af' }}>ПРОВЕРКА ТРАНЗАКЦИИ...</div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .loader { width: 50px; height: 50px; border: 3px solid #111; border-top-color: #39f2af; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </div>
  );
}
