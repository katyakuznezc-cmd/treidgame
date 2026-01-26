import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update, get, serverTimestamp } from "firebase/database";

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
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTargetId, setAdminTargetId] = useState('');
  const [adminNewBalance, setAdminNewBalance] = useState('');
  const [clickCount, setClickCount] = useState(0);

  const [showTokenList, setShowTokenList] = useState(false);
  const [selectingFor, setSelectingFor] = useState('pay');
  const [payToken, setPayToken] = useState(ASSETS.USDC);
  const [receiveToken, setReceiveToken] = useState(ASSETS.BTC);
  const [amount, setAmount] = useState('');

  const userId = useMemo(() => {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
    return tg ? (tg.username || tg.id.toString()) : 'Guest_' + Math.floor(Math.random()*1000);
  }, []);

  // Firebase
  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const userRef = ref(db, 'players/' + userId);

    onValue(userRef, (s) => {
      if (s.exists()) {
        const d = s.val();
        setBalanceUSDC(d.balanceUSDC ?? 1000);
        setWallet(d.wallet ?? {});
      }
    });

    const interval = setInterval(() => {
      update(userRef, { balanceUSDC, wallet, lastSeen: serverTimestamp() });
    }, 5000);
    return () => clearInterval(interval);
  }, [balanceUSDC, wallet, userId]);

  // Signal Generator
  useEffect(() => {
    if (!signal) {
      const keys = Object.keys(ASSETS).filter(k => k !== 'USDC');
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      const dexes = Object.keys(DEX_THEMES);
      const buyAt = dexes[Math.floor(Math.random() * dexes.length)];
      let sellAt = dexes[Math.floor(Math.random() * dexes.length)];
      while(sellAt === buyAt) sellAt = dexes[Math.floor(Math.random() * dexes.length)];
      setSignal({ coin, buyAt, sellAt, profit: (Math.random() * 1.8 + 1.2).toFixed(2) });
    }
  }, [signal]);

  const handleAdminChange = async () => {
    if (!adminTargetId || !adminNewBalance) return alert('Fill fields');
    const db = getDatabase();
    await update(ref(db, 'players/' + adminTargetId), { balanceUSDC: Number(adminNewBalance) });
    alert('Success');
  };

  const handleTrade = () => {
    const num = Number(amount);
    const currentOwned = payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0);
    if (!num || num <= 0 || num > currentOwned) return;

    setIsProcessing(true);
    setTimeout(() => {
      if (payToken.symbol === 'USDC') {
        const bought = num / receiveToken.price;
        setBalanceUSDC(prev => prev - num);
        setWallet(prev => ({ ...prev, [receiveToken.symbol]: (prev[receiveToken.symbol] || 0) + bought }));
        setReceipt({ type: 'buy', pay: num, get: bought, asset: receiveToken.symbol, profit: 0 });
      } else {
        const isOk = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
        const mult = isOk ? (1 + signal.profit / 100) : 0.985;
        const usdcGained = (num * payToken.price) * mult;
        setBalanceUSDC(prev => prev + usdcGained);
        setWallet(prev => ({ ...prev, [payToken.symbol]: (prev[payToken.symbol] || 0) - num }));
        setReceipt({ type: 'sell', pay: num, get: usdcGained, asset: payToken.symbol, profit: usdcGained - (num * payToken.price), isOk });
        if(isOk) setSignal(null);
      }
      setIsProcessing(false); setAmount(''); setActiveDex(null);
    }, 1200);
  };

  const t = {
    RU: { bal: 'БАЛАНС', assets: 'АКТИВЫ', swap: 'ОБМЕН', set: 'Настройки', lang: 'Язык', manager: 'Менеджер', profit: 'Профит', spent: 'Потрачено', get: 'Получено' },
    EN: { bal: 'BALANCE', assets: 'ASSETS', swap: 'SWAP', set: 'Settings', lang: 'Language', manager: 'Manager', profit: 'Profit', spent: 'Spent', get: 'Received' }
  }[lang];

  return (
    <div style={{ background: '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', alignItems: 'center' }}>
          <div style={{ color: '#0CF2B0', fontSize: '11px', fontWeight: 'bold' }}>● {t.bal}</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '10px' }}>⚙️</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 80px 20px' }}>
          {view === 'main' && !activeDex && (
            <>
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <h1 style={{ fontSize: '42px', margin: 0 }}>${balanceUSDC.toLocaleString()}</h1>
                <p style={{ opacity: 0.4 }}>USDC</p>
              </div>

              {signal && (
                <div style={{ background: 'rgba(12,242,176,0.1)', border: '1px solid #0CF2B044', padding: '15px', borderRadius: '15px', marginBottom: '20px' }}>
                  <div style={{fontSize: 12, opacity: 0.6}}>SIGNAL: {signal.coin.symbol}</div>
                  <div>Buy: {signal.buyAt} → Sell: <b style={{color: '#0CF2B0'}}>{signal.sellAt}</b></div>
                  <div style={{color: '#0CF2B0', fontWeight: 'bold'}}>+{signal.profit}%</div>
                </div>
              )}

              <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '18px', border: '1px solid #1a1a1a', marginBottom: '20px' }}>
                <p style={{fontSize: 10, opacity: 0.5}}>{t.assets}</p>
                {Object.keys(wallet).map(c => wallet[c] > 0.000001 && (
                  <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #111' }}>
                    <div style={{display:'flex', alignItems:'center', gap: 8}}><img src={ASSETS[c].icon} width="18"/> {c}</div>
                    <b>{wallet[c].toFixed(6)}</b>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {Object.keys(DEX_THEMES).map(k => (
                  <button key={k} onClick={() => setActiveDex(k)} style={{ background: '#0a0a0a', border: `1px solid ${DEX_THEMES[k].color}44`, color: '#fff', padding: '20px 0', borderRadius: '15px', fontWeight: 'bold' }}>{DEX_THEMES[k].name}</button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* DEX UI */}
        {activeDex && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, padding: 20 }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 30 }}>←</button>
            <div style={{ background: '#0f0f0f', padding: 20, borderRadius: 20, marginTop: 20 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.6 }}>
                 <span>Pay</span>
                 <span onClick={() => setAmount((payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0)).toString())} style={{color: '#0CF2B0'}}>MAX</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                 <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, width: '60%' }} placeholder="0.0"/>
                 <button onClick={() => {setSelectingFor('pay'); setShowTokenList(true)}} style={{ background: '#222', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: 8 }}>{payToken.symbol}</button>
               </div>
            </div>
            <button onClick={handleTrade} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: 20, borderRadius: 20, marginTop: 20, fontWeight: 'bold', border: 'none' }}>SWAP</button>
          </div>
        )}

        {/* Settings View */}
        {view === 'settings' && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, padding: 20 }}>
            <button onClick={() => setView('main')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 30 }}>←</button>
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#111', padding: 15, borderRadius: 15, marginBottom: 10 }}>
                <span>{t.lang}</span>
                <b onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')} style={{color: '#0CF2B0'}}>{lang}</b>
              </div>
              <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', background: '#111', border: 'none', color: '#fff', padding: 15, borderRadius: 15 }}>{t.manager}</button>
              
              <div onClick={() => { setClickCount(c => c + 1); if(clickCount > 4) setShowAdmin(true) }} style={{ opacity: 0.1, textAlign: 'center', marginTop: 50 }}>v5.0.0 Pro</div>
              
              {showAdmin && (
                <div style={{ background: '#111', padding: 15, borderRadius: 15, marginTop: 20 }}>
                  <p>Admin Panel</p>
                  <input placeholder="Player ID" value={adminTargetId} onChange={e => setAdminTargetId(e.target.value)} style={{ width: '100%', marginBottom: 10 }}/>
                  <input placeholder="New Balance" value={adminNewBalance} onChange={e => setAdminNewBalance(e.target.value)} style={{ width: '100%', marginBottom: 10 }}/>
                  <button onClick={handleAdminChange} style={{ background: 'red', color: '#fff', width: '100%' }}>UPDATE</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Token List */}
        {showTokenList && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, padding: 20 }}>
             <button onClick={() => setShowTokenList(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 30 }}>×</button>
             {Object.values(ASSETS).map(t => (
               <div key={t.symbol} onClick={() => { selectingFor === 'pay' ? setPayToken(t) : setReceiveToken(t); setShowTokenList(false); }} style={{ display: 'flex', justifyContent: 'space-between', padding: 20, borderBottom: '1px solid #111' }}>
                 <span>{t.symbol}</span><span>${t.price}</span>
               </div>
             ))}
          </div>
        )}

        {/* Receipt */}
        {receipt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#111', padding: 25, borderRadius: 25, width: '100%', textAlign: 'center', border: '1px solid #333' }}>
              <h3>Transaction Detail</h3>
              <p>{t.spent}: {receipt.pay.toFixed(4)}</p>
              <p>{t.get}: {receipt.get.toFixed(4)}</p>
              {receipt.type === 'sell' && <p style={{color: receipt.isOk ? '#0CF2B0' : 'red'}}>{t.profit}: ${receipt.profit.toFixed(2)}</p>}
              <button onClick={() => setReceipt(null)} style={{ background: '#fff', color: '#000', width: '100%', padding: 10, borderRadius: 10, marginTop: 10 }}>OK</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
