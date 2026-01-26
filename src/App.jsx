import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update, serverTimestamp } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCKmEa1B4xOdMdNGXBDK2LeOhBQoMqWv40",
  authDomain: "treidgame-b2ae0.firebaseapp.com",
  projectId: "treidgame-b2ae0",
  storageBucket: "treidgame-b2ae0.firebasestorage.app",
  messagingSenderId: "985305772375",
  appId: "1:985305772375:web:08d9b482a6f9d3cd748e12"
};

const ASSETS = {
  USDC: { symbol: 'USDC', price: 1, icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=024', color: '#2775CA' },
  BTC: { symbol: 'BTC', price: 65000.00, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=024', color: '#F7931A' },
  ETH: { symbol: 'ETH', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=024', color: '#627EEA' },
  LINK: { symbol: 'LINK', price: 18.20, icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg?v=024', color: '#2A5ADA' },
  AAVE: { symbol: 'AAVE', price: 145.50, icon: 'https://cryptologos.cc/logos/aave-aave-logo.svg?v=024', color: '#B6509E' },
  CRV: { symbol: 'CRV', price: 0.55, icon: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.svg?v=024', color: '#F41B1B' },
  WPOL: { symbol: 'WPOL', price: 0.72, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg?v=024', color: '#8247E5' }
};

const DEX_THEMES = {
  UNISWAP: { name: 'Uniswap', color: '#FF007A' },
  ODOS: { name: 'Odos', color: '#0CF2B0' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0' },
  '1INCH': { name: '1inch', color: '#1B314F' }
};

export default function App() {
  const [balanceUSDC, setBalanceUSDC] = useState(1000.00);
  const [wallet, setWallet] = useState({});
  const [view, setView] = useState('main'); 
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [lang, setLang] = useState('RU');
  const [clickCount, setClickCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Admin inputs
  const [admId, setAdmId] = useState('');
  const [admVal, setAdmVal] = useState('');

  const userId = useMemo(() => {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
    return tg ? (tg.username || tg.id.toString()) : 'User_' + Math.floor(Math.random()*999);
  }, []);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const userRef = ref(db, 'players/' + userId);
    onValue(userRef, (s) => {
      if (s.exists()) {
        setBalanceUSDC(s.val().balanceUSDC ?? 1000);
        setWallet(s.val().wallet ?? {});
      }
    });
    const interval = setInterval(() => {
      update(userRef, { balanceUSDC, wallet, lastSeen: serverTimestamp(), username: userId });
    }, 3000);
    return () => clearInterval(interval);
  }, [balanceUSDC, wallet, userId]);

  useEffect(() => {
    if (!signal) {
      const keys = Object.keys(ASSETS).filter(k => k !== 'USDC');
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      const dexes = Object.keys(DEX_THEMES);
      const buyAt = dexes[Math.floor(Math.random() * dexes.length)];
      let sellAt = dexes[Math.floor(Math.random() * dexes.length)];
      while(sellAt === buyAt) sellAt = dexes[Math.floor(Math.random() * dexes.length)];
      setSignal({ coin, buyAt, sellAt, profit: (Math.random() * 2 + 1).toFixed(2) });
    }
  }, [signal]);

  const execAdmin = async () => {
    if(!admId || !admVal) return;
    const db = getDatabase();
    await update(ref(db, 'players/' + admId), { balanceUSDC: Number(admVal) });
    alert('Баланс игрока ' + admId + ' обновлен');
  };

  const handleTrade = (type, assetKey, amount) => {
    const val = Number(amount);
    if (isNaN(val) || val <= 0) return;

    setIsProcessing(true);
    setTimeout(() => {
      if (type === 'BUY') {
        setBalanceUSDC(prev => prev - val);
        const amountCoins = val / ASSETS[assetKey].price;
        setWallet(prev => ({ ...prev, [assetKey]: (prev[assetKey] || 0) + amountCoins }));
        setReceipt({ title: 'Покупка', amount: val, unit: 'USDC', got: amountCoins, unitGot: assetKey });
      } else {
        const isCorrect = activeDex === signal?.sellAt && assetKey === signal?.coin.symbol;
        const multiplier = isCorrect ? (1 + signal.profit / 100) : (1 - (Math.random() * 0.015));
        const receiveUsdc = (val * ASSETS[assetKey].price) * multiplier;
        
        setWallet(prev => ({ ...prev, [assetKey]: (prev[assetKey] || 0) - val }));
        setBalanceUSDC(prev => prev + receiveUsdc);
        setReceipt({ 
          title: 'Продажа', 
          amount: val, unit: assetKey, 
          got: receiveUsdc, unitGot: 'USDC', 
          profit: isCorrect ? receiveUsdc - (val * ASSETS[assetKey].price) : -(val * ASSETS[assetKey].price * 0.015) 
        });
        if (isCorrect) setSignal(null);
      }
      setIsProcessing(false);
      setActiveDex(null);
    }, 1200);
  };

  const t = {
    RU: { shop: 'КУПИТЬ', sell: 'ПРОДАТЬ', bal: 'МОЙ БАЛАНС', act: 'АКТИВЫ', signal: 'СИГНАЛ' },
    EN: { shop: 'BUY', sell: 'SELL', bal: 'BALANCE', act: 'ASSETS', signal: 'SIGNAL' }
  }[lang];

  return (
    <div style={{ background: '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', alignItems: 'center' }}>
          <div style={{ color: '#0CF2B0', fontWeight: 'bold', fontSize: '12px' }}>{t.bal}</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px' }}>⚙️</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {view === 'main' && !activeDex && (
            <>
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <h1 style={{ fontSize: '46px', margin: 0 }}>${balanceUSDC.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
                <p style={{ opacity: 0.3, fontSize: '12px' }}>USDC Available</p>
              </div>

              {signal && (
                <div style={{ background: 'rgba(12,242,176,0.1)', border: '1px solid #0CF2B033', padding: '15px', borderRadius: '18px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '10px', opacity: 0.5 }}>{t.signal}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '5px 0' }}>
                    <img src={signal.coin.icon} width="20" /> <b>{signal.coin.symbol}</b>
                  </div>
                  <div style={{ fontSize: '14px' }}>{signal.buyAt} <span style={{opacity: 0.3}}>→</span> <b style={{color: '#0CF2B0'}}>{signal.sellAt}</b></div>
                  <div style={{ color: '#0CF2B0', fontWeight: 'bold', marginTop: '5px' }}>+{signal.profit}% PROFIT</div>
                </div>
              )}

              <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '20px', border: '1px solid #1a1a1a', marginBottom: '20px' }}>
                <p style={{ fontSize: '10px', opacity: 0.5, marginBottom: '10px' }}>{t.act}</p>
                {Object.keys(wallet).filter(k => wallet[k] > 0.000001).length === 0 ? <p style={{opacity: 0.2}}>Пусто</p> : 
                  Object.keys(wallet).map(c => wallet[c] > 0.000001 && (
                    <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #111' }}>
                      <span><img src={ASSETS[c].icon} width="16" style={{marginRight: 8}}/>{c}</span>
                      <b>{wallet[c].toFixed(6)}</b>
                    </div>
                  ))
                }
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {Object.keys(DEX_THEMES).map(k => (
                  <button key={k} onClick={() => setActiveDex(k)} style={{ background: '#0a0a0a', border: `1px solid ${DEX_THEMES[k].color}44`, color: '#fff', padding: '25px 0', borderRadius: '20px', fontWeight: 'bold', fontSize: '16px' }}>
                    {DEX_THEMES[k].name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Swap Interface */}
        {activeDex && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, padding: '20px' }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px' }}>←</button>
            <h2 style={{ color: DEX_THEMES[activeDex].color, textAlign: 'center' }}>{activeDex}</h2>
            
            {/* Логика выбора: если в кошельке есть активы, предлагаем продать. Если только USDC - купить */}
            {Object.keys(wallet).some(k => wallet[k] > 0.000001) ? (
              <div style={{ marginTop: '20px' }}>
                <p style={{ opacity: 0.5, fontSize: '12px' }}>Выберите актив для продажи на {activeDex}:</p>
                {Object.keys(wallet).map(c => wallet[c] > 0.000001 && (
                  <div key={c} style={{ background: '#111', padding: '20px', borderRadius: '15px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                       <img src={ASSETS[c].icon} width="24" /> <b>{c}</b>
                       <div style={{fontSize: 12, opacity: 0.5}}>Balance: {wallet[c].toFixed(6)}</div>
                    </div>
                    <button onClick={() => handleTrade('SELL', c, wallet[c])} style={{ background: '#fff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold' }}>MAX SELL</button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: '20px' }}>
                <p style={{ opacity: 0.5, fontSize: '12px' }}>Купить актив за USDC на {activeDex}:</p>
                {Object.keys(ASSETS).filter(k => k !== 'USDC').map(c => (
                  <div key={c} style={{ background: '#111', padding: '15px', borderRadius: '15px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                      <img src={ASSETS[c].icon} width="24" /> <b>{c}</b>
                    </div>
                    <button onClick={() => handleTrade('BUY', c, balanceUSDC)} style={{ background: DEX_THEMES[activeDex].color, color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '10px', fontWeight: 'bold' }}>BUY FOR ALL</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings / Admin */}
        {view === 'settings' && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, padding: '20px' }}>
            <button onClick={() => {setView('main'); setIsAdmin(false)}} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px' }}>←</button>
            
            {!isAdmin ? (
              <div style={{ marginTop: '30px' }}>
                <div style={{ background: '#111', padding: '20px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>Язык / Language</span>
                  <b onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')} style={{color: '#0CF2B0'}}>{lang}</b>
                </div>
                <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', background: '#111', color: '#fff', border: 'none', padding: '20px', borderRadius: '15px', fontWeight: 'bold' }}>Support Manager</button>
                <div style={{marginTop: '100px', textAlign: 'center', opacity: 0.2}} onClick={() => { setClickCount(c => c + 1); if(clickCount >= 4) setIsAdmin(true); }}>v5.0.0 Pro</div>
              </div>
            ) : (
              <div style={{ marginTop: '30px' }}>
                <h3>Admin Console</h3>
                <input placeholder="Target ID" value={admId} onChange={e => setAdmId(e.target.value)} style={{ width: '100%', padding: '15px', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '10px', marginBottom: '10px' }} />
                <input placeholder="USDC Amount" value={admVal} onChange={e => setAdmVal(e.target.value)} style={{ width: '100%', padding: '15px', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '10px', marginBottom: '10px' }} />
                <button onClick={execAdmin} style={{ width: '100%', background: '#0CF2B0', color: '#000', border: 'none', padding: '15px', borderRadius: '10px', fontWeight: 'bold' }}>SET BALANCE</button>
              </div>
            )}
          </div>
        )}

        {/* Receipt / Modal */}
        {receipt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#111', width: '100%', borderRadius: '30px', padding: '30px', border: '1px solid #333', textAlign: 'center' }}>
               <h2 style={{margin: 0}}>{receipt.title}</h2>
               <div style={{ margin: '20px 0', fontSize: '18px' }}>
                  <div style={{opacity: 0.5}}>Отдано:</div>
                  <div>{receipt.amount.toFixed(4)} {receipt.unit}</div>
                  <div style={{margin: '10px 0', fontSize: '24px'}}>↓</div>
                  <div style={{opacity: 0.5}}>Получено:</div>
                  <div style={{color: '#0CF2B0', fontWeight: 'bold'}}>{receipt.got.toFixed(6)} {receipt.unitGot}</div>
                  {receipt.profit !== undefined && (
                    <div style={{marginTop: 15, color: receipt.profit >= 0 ? '#0CF2B0' : '#ff4d4d'}}>
                      Profit: ${receipt.profit.toFixed(2)}
                    </div>
                  )}
               </div>
               <button onClick={() => setReceipt(null)} style={{ width: '100%', background: '#fff', color: '#000', padding: '15px', borderRadius: '15px', fontWeight: 'bold', border: 'none' }}>ОТЛИЧНО</button>
            </div>
          </div>
        )}

        {isProcessing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>TRANSACTION...</div>}
      </div>
    </div>
  );
}
