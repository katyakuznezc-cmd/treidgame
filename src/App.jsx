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

export default function App() {
  const [balanceUSDT, setBalanceUSDT] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('arb_wallet')) || {});
  const [view, setView] = useState('main'); 
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState(null);
  const [showTokenList, setShowTokenList] = useState(false);
  const [selectingFor, setSelectingFor] = useState('pay');
  const [payToken, setPayToken] = useState(ASSETS.USDT);
  const [receiveToken, setReceiveToken] = useState(ASSETS.SOL);
  const [amount, setAmount] = useState('');
  const [online, setOnline] = useState(1);
  const [adminClicks, setAdminClicks] = useState(0);
  const [isAdminVisible, setIsAdminVisible] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [allPlayers, setAllPlayers] = useState({});

  const userId = useMemo(() => {
    try {
      if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
        return window.Telegram.WebApp.initDataUnsafe.user.username || window.Telegram.WebApp.initDataUnsafe.user.id.toString();
      }
    } catch (e) {}
    return localStorage.getItem('arb_user_id') || 'Trader_' + Math.floor(Math.random() * 9999);
  }, []);

  useEffect(() => {
    const initTG = () => {
        try {
            window.Telegram?.WebApp?.ready();
            window.Telegram?.WebApp?.expand();
            window.Telegram?.WebApp?.enableClosingConfirmation();
        } catch (e) { console.error("TG Init Error", e); }
    };
    initTG();
    if (!localStorage.getItem('arb_user_id')) localStorage.setItem('arb_user_id', userId);
  }, [userId]);

  useEffect(() => {
    const userRef = ref(db, 'players/' + userId);
    update(userRef, { balanceUSDT, wallet, username: userId, lastSeen: serverTimestamp() });
    onValue(ref(db, 'online'), (s) => setOnline(s.exists() ? Object.keys(s.val()).length : 1));
    if (isAuthorized) onValue(ref(db, 'players'), (s) => s.exists() && setAllPlayers(s.val()));
    localStorage.setItem('arb_balance', balanceUSDT);
    localStorage.setItem('arb_wallet', JSON.stringify(wallet));
  }, [balanceUSDT, wallet, userId, isAuthorized]);

  useEffect(() => {
    if (!signal) {
      const keys = Object.keys(ASSETS).filter(k => k !== 'USDT');
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      setSignal({ coin, buyAt: 'UNISWAP', sellAt: 'PANCAKE', profit: (Math.random() * 1.5 + 1.5).toFixed(2) });
    }
  }, [signal]);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleMax = () => {
    const val = payToken.symbol === 'USDT' ? balanceUSDT : (wallet[payToken.symbol] || 0);
    setAmount(val.toString());
  };

  const startSwap = () => {
    const num = Number(amount);
    if (!num || num <= 0) return showToast('Введите сумму', 'error');
    setIsProcessing(true);
    setTimeout(() => {
      if (payToken.symbol === 'USDT') {
        if (balanceUSDT >= num) {
          setBalanceUSDT(prev => prev - num);
          setWallet(prev => ({ ...prev, [receiveToken.symbol]: (prev[receiveToken.symbol] || 0) + (num / receiveToken.price) }));
          showToast(`Куплено ${receiveToken.symbol}`);
        } else showToast('Недостаточно USDT', 'error');
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          const isOk = payToken.symbol === signal?.coin.symbol && activeDex === signal?.sellAt;
          const prof = isOk ? (1 + signal.profit / 100) : (1 - (Math.random() * 0.015 + 0.005)); 
          const result = (num * payToken.price) * prof;
          setBalanceUSDT(prev => prev + result);
          setWallet(prev => ({ ...prev, [payToken.symbol]: has - num }));
          setSignal(null);
          showToast(isOk ? `Профит: +$${(result - (num * payToken.price)).toFixed(2)}` : 'Сделка закрыта (минус)', isOk ? 'success' : 'error');
        } else showToast(`Недостаточно ${payToken.symbol}`, 'error');
      }
      setIsProcessing(false); setAmount(''); setActiveDex(null);
    }, 2000);
  };

  return (
    <div style={{ background: '#000', width: '100%', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '450px', background: '#000', color: '#fff', position: 'relative', minHeight: '100vh', overflowX: 'hidden', fontFamily: 'sans-serif' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px' }}>
          <div style={{ color: '#39f2af', fontSize: '11px', fontWeight: 'bold' }}>● {online} ONLINE</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: 'none', color: '#fff', padding: '8px', borderRadius: '10px' }}>⚙️</button>
        </div>

        {view === 'main' && !activeDex && (
          <div style={{ padding: '0 20px' }}>
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <h1 style={{ fontSize: '42px', margin: 0 }}>${balanceUSDT.toFixed(2)}</h1>
              <p style={{ opacity: 0.4, fontSize: '10px' }}>USDT BALANCE</p>
            </div>

            <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '15px', border: '1px solid #111', marginBottom: '20px' }}>
              <p style={{ fontSize: '10px', color: '#39f2af', fontWeight: 'bold', margin: '0 0 10px 0' }}>МОИ АКТИВЫ</p>
              {Object.keys(wallet).filter(k => wallet[k] > 0).length === 0 ? <p style={{opacity:0.3, fontSize:'12px'}}>Пусто</p> :
                Object.keys(wallet).map(c => wallet[c] > 0 && (
                  <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #111' }}>
                    <span>{ASSETS[c].icon} {c}</span><b>{wallet[c].toFixed(4)}</b>
                  </div>
                ))
              }
            </div>

            {signal && (
              <div style={{ background: 'rgba(57,242,175,0.05)', border: '1px solid #39f2af33', padding: '15px', borderRadius: '15px', marginBottom: '20px' }}>
                <div style={{ color: '#39f2af', fontSize: '10px', fontWeight: 'bold' }}>СИГНАЛ</div>
                <div style={{ fontSize: '13px', margin: '5px 0' }}>Купи {signal.coin.symbol} → Продай на <b>{signal.sellAt}</b></div>
                <div style={{ fontSize: '13px', color: '#39f2af' }}>Ожидаемый профит: +{signal.profit}%</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {['UNISWAP', 'PANCAKE', 'RAYDIUM', '1INCH'].map(d => (
                <button key={d} onClick={() => setActiveDex(d)} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#fff', padding: '20px', borderRadius: '15px', fontWeight: 'bold' }}>{d}</button>
              ))}
            </div>
          </div>
        )}

        {(activeDex || view !== 'main') && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#000', zIndex: 100 }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '20px' }}>
              <button onClick={() => {setActiveDex(null); setView('main')}} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px' }}>←</button>
              <b style={{ marginLeft: '20px' }}>{activeDex || 'Настройки'}</b>
            </div>

            {activeDex && (
              <div style={{ padding: '20px' }}>
                <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', opacity: 0.5, marginBottom: '8px' }}>
                    <span>Отдаете</span>
                    <span onClick={handleMax} style={{ color: '#39f2af', fontWeight: 'bold' }}>MAX: {payToken.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[payToken.symbol] || 0).toFixed(4)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', outline: 'none', width: '60%' }} placeholder="0.0"/>
                    <button onClick={() => {setSelectingFor('pay'); setShowTokenList(true)}} style={{ background: '#1a1a1a', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '10px' }}>{payToken.symbol} ▾</button>
                  </div>
                </div>
                <div style={{ textAlign: 'center', margin: '10px 0', opacity: 0.2 }}>↓</div>
                <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '15px' }}>
                  <div style={{ fontSize: '10px', opacity: 0.5, marginBottom: '8px' }}>Получаете</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                    <button onClick={() => {setSelectingFor('receive'); setShowTokenList(true)}} style={{ background: '#1a1a1a', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '10px' }}>{receiveToken.symbol} ▾</button>
                  </div>
                </div>
                <button onClick={startSwap} style={{ width: '100%', background: '#39f2af', color: '#000', padding: '18px', borderRadius: '15px', fontWeight: 'bold', marginTop: '20px', border: 'none' }}>ОБМЕНЯТЬ</button>
              </div>
            )}

            {view === 'settings' && (
              <div style={{ padding: '20px' }}>
                <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '15px', marginBottom: '20px' }}>
                  <p style={{opacity:0.5, margin:0, fontSize:'12px'}}>ID Пользователя:</p>
                  <code style={{color:'#39f2af'}}>{userId}</code>
                </div>
                <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', background: '#111', color: '#fff', padding: '15px', borderRadius: '15px', border: '1px solid #222', marginBottom: '20px' }}>Написать создателю</button>
                <p style={{ textAlign: 'center', opacity: 0.2, marginTop: '40px' }} onClick={() => { setAdminClicks(c => c + 1); if (adminClicks > 4) setIsAdminVisible(true); }}>Версия 2.1.5 Stable</p>
                {isAdminVisible && (
                  <div style={{ marginTop: '20px' }}>
                    {!isAuthorized ? (
                      <input type="password" placeholder="Пароль" onChange={e => e.target.value === 'admin123' && setIsAuthorized(true)} style={{ width: '100%', padding: '15px', background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '10px' }}/>
                    ) : (
                      <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#050505', padding: '10px', borderRadius: '10px' }}>
                        {Object.keys(allPlayers).map(p => (
                          <div key={p} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #111' }}>
                            <span style={{fontSize:'10px'}}>{allPlayers[p].username}</span>
                            <button onClick={() => update(ref(db, 'players/'+p), {balanceUSDT: (allPlayers[p].balanceUSDT || 0) + 1000})} style={{ background: '#39f2af', border: 'none', padding: '4px 8px', borderRadius: '5px', fontSize: '10px' }}>+$1k</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {showTokenList && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#000', zIndex: 1000 }}>
             <div style={{ padding: '20px', display: 'flex', alignItems: 'center' }}>
               <button onClick={() => setShowTokenList(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px' }}>×</button>
               <h3 style={{ marginLeft: '20px' }}>Выберите токен</h3>
             </div>
             {Object.values(ASSETS).map(t => (
               <div key={t.symbol} onClick={() => { selectingFor === 'pay' ? setPayToken(t) : setReceiveToken(t); setShowTokenList(false); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid #111' }}>
                 <span>{t.icon} {t.symbol}</span>
                 <span style={{opacity:0.5}}>${t.price}</span>
               </div>
             ))}
          </div>
        )}

        {isProcessing && <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#39f2af' }}>ОБРАБОТКА...</div>}
        {toast && <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', padding: '12px 25px', borderRadius: '10px', background: toast.type === 'error' ? '#ff4d4d' : '#39f2af', color: '#000', fontWeight: 'bold', zIndex: 6000 }}>{toast.text}</div>}
      </div>
    </div>
  );
}
