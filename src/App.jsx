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
  BTC: { symbol: 'BTC', price: 65000, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=024', color: '#F7931A' },
  ETH: { symbol: 'ETH', price: 2600, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=024', color: '#627EEA' },
  LINK: { symbol: 'LINK', price: 18.2, icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg?v=024', color: '#2A5ADA' },
  AAVE: { symbol: 'AAVE', price: 145.5, icon: 'https://cryptologos.cc/logos/aave-aave-logo.svg?v=024', color: '#B6509E' }
};

const DEX_THEMES = {
  UNISWAP: { name: 'Uniswap', color: '#FF007A' },
  ODOS: { name: 'Odos', color: '#0CF2B0' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0' },
  '1INCH': { name: '1inch', color: '#1B314F' }
};

export default function App() {
  const [balanceUSDC, setBalanceUSDC] = useState(1000.0);
  const [wallet, setWallet] = useState({});
  const [view, setView] = useState('main'); 
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [lang, setLang] = useState('RU');
  const [isAdmin, setIsAdmin] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  // Swap State
  const [payToken, setPayToken] = useState(ASSETS.USDC);
  const [receiveToken, setReceiveToken] = useState(ASSETS.BTC);
  const [payAmount, setPayAmount] = useState('');
  const [showTokenList, setShowTokenList] = useState(null); // 'pay' or 'receive'

  const userId = useMemo(() => {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
    return tg ? (tg.username || tg.id.toString()) : 'User_' + Math.floor(Math.random()*99);
  }, []);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    onValue(ref(db, 'players/' + userId), (s) => {
      if (s.exists()) {
        setBalanceUSDC(s.val().balanceUSDC ?? 1000);
        setWallet(s.val().wallet ?? {});
      }
    });
    const inv = setInterval(() => {
      update(ref(db, 'players/' + userId), { balanceUSDC, wallet, lastSeen: serverTimestamp(), username: userId });
    }, 4000);
    return () => clearInterval(inv);
  }, [balanceUSDC, wallet, userId]);

  useEffect(() => {
    if (!signal) {
      const keys = Object.keys(ASSETS).filter(k => k !== 'USDC');
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      const dexes = Object.keys(DEX_THEMES);
      const bAt = dexes[Math.floor(Math.random() * dexes.length)];
      let sAt = dexes[Math.floor(Math.random() * dexes.length)];
      while(sAt === bAt) sAt = dexes[Math.floor(Math.random() * dexes.length)];
      setSignal({ coin, buyAt: bAt, sellAt: sAt, profit: (Math.random()*2+1.5).toFixed(2) });
    }
  }, [signal]);

  const handleSwap = () => {
    const amount = Number(payAmount);
    const userHas = payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0);
    
    if (!amount || amount <= 0 || amount > userHas) return alert('Check balance');

    setIsProcessing(true);
    setTimeout(() => {
      let gotAmount = (amount * payToken.price) / receiveToken.price;
      
      // Логика профита/убытка при арбитраже
      if (receiveToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
          const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          const mult = isCorrect ? (1 + signal.profit / 100) : (0.985);
          gotAmount = gotAmount * mult;
          if (isCorrect) setSignal(null);
      }

      // Обновление балансов
      if (payToken.symbol === 'USDC') setBalanceUSDC(prev => prev - amount);
      else setWallet(prev => ({ ...prev, [payToken.symbol]: (prev[payToken.symbol] || 0) - amount }));

      if (receiveToken.symbol === 'USDC') setBalanceUSDC(prev => prev + gotAmount);
      else setWallet(prev => ({ ...prev, [receiveToken.symbol]: (prev[receiveToken.symbol] || 0) + gotAmount }));

      setReceipt({ from: payToken.symbol, to: receiveToken.symbol, spent: amount, got: gotAmount });
      setIsProcessing(false); setPayAmount(''); setActiveDex(null);
    }, 1500);
  };

  return (
    <div style={{ background: '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Top Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', alignItems: 'center' }}>
          <div style={{ color: '#0CF2B0', fontWeight: 'bold' }}>ARBITRAGE PRO</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px' }}>⚙️</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {view === 'main' && !activeDex && (
            <>
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <h1 style={{ fontSize: '42px', margin: 0 }}>${balanceUSDC.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
                <p style={{ opacity: 0.3 }}>USDC Balance</p>
              </div>

              {signal && (
                <div style={{ background: 'rgba(12,242,176,0.1)', border: '1px solid #0CF2B033', padding: '15px', borderRadius: '20px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', color: '#0CF2B0' }}>LIVE SIGNAL</div>
                  <div style={{ margin: '5px 0' }}>{signal.coin.symbol}: {signal.buyAt} → <b style={{color: '#0CF2B0'}}>{signal.sellAt}</b></div>
                  <div style={{ fontWeight: 'bold' }}>Profit: +{signal.profit}%</div>
                </div>
              )}

              <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '20px', border: '1px solid #1a1a1a', marginBottom: '20px' }}>
                <p style={{ fontSize: '10px', opacity: 0.5 }}>MY WALLET</p>
                {Object.keys(wallet).map(c => wallet[c] > 0.000001 && (
                  <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #111' }}>
                    <span>{c}</span><b>{wallet[c].toFixed(6)}</b>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {Object.keys(DEX_THEMES).map(k => (
                  <button key={k} onClick={() => setActiveDex(k)} style={{ background: '#0a0a0a', border: `1px solid ${DEX_THEMES[k].color}44`, color: '#fff', padding: '25px 0', borderRadius: '20px', fontWeight: 'bold' }}>{DEX_THEMES[k].name}</button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Swap Interface (Uniswap Style) */}
        {activeDex && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, padding: '20px' }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px' }}>←</button>
            <h2 style={{ textAlign: 'center', color: DEX_THEMES[activeDex].color }}>{activeDex}</h2>
            
            <div style={{ marginTop: '20px', background: '#0f0f0f', padding: '20px', borderRadius: '25px', border: '1px solid #222' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12px', opacity: 0.5 }}>
                <span>You Pay</span>
                <span onClick={() => setPayAmount(payToken.symbol==='USDC' ? balanceUSDC : (wallet[payToken.symbol]||0))} style={{color: DEX_THEMES[activeDex].color, fontWeight: 'bold'}}>MAX</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '28px', width: '60%', outline: 'none' }} placeholder="0.0"/>
                <button onClick={() => setShowTokenList('pay')} style={{ background: '#222', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '15px' }}>{payToken.symbol} ▾</button>
              </div>
            </div>

            <div style={{ textAlign: 'center', margin: '-15px 0', position: 'relative', zIndex: 2 }}>
              <button onClick={() => { const temp = payToken; setPayToken(receiveToken); setReceiveToken(temp); }} style={{ background: '#111', border: '4px solid #000', borderRadius: '12px', padding: '8px', color: '#fff' }}>⇅</button>
            </div>

            <div style={{ background: '#0f0f0f', padding: '20px', borderRadius: '25px', border: '1px solid #222', marginTop: '5px' }}>
              <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '10px' }}>You Receive</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '28px' }}>{payAmount ? ((payAmount * payToken.price) / receiveToken.price).toFixed(6) : '0.0'}</div>
                <button onClick={() => setShowTokenList('receive')} style={{ background: '#222', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '15px' }}>{receiveToken.symbol} ▾</button>
              </div>
            </div>

            <button onClick={handleSwap} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: '20px', borderRadius: '20px', marginTop: '20px', fontWeight: 'bold', border: 'none' }}>SWAP ON {activeDex}</button>
          </div>
        )}

        {/* Token Selector Modal */}
        {showTokenList && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, padding: '20px' }}>
             <button onClick={() => setShowTokenList(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px' }}>×</button>
             <div style={{ marginTop: '20px' }}>
               {Object.values(ASSETS).map(t => (
                 <div key={t.symbol} onClick={() => { if(showTokenList==='pay') setPayToken(t); else setReceiveToken(t); setShowTokenList(null); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid #111', alignItems: 'center' }}>
                    <div style={{display:'flex', alignItems:'center', gap: 10}}><img src={t.icon} width="24"/> <b>{t.symbol}</b></div>
                    <span style={{opacity: 0.5}}>${t.price}</span>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* Settings / Admin */}
        {view === 'settings' && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, padding: '20px' }}>
            <button onClick={() => {setView('main'); setIsAdmin(false)}} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px' }}>←</button>
            <div style={{ marginTop: '30px' }}>
               <button onClick={() => setLang(lang==='RU'?'EN':'RU')} style={{ width: '100%', background: '#111', border: 'none', color: '#fff', padding: '20px', borderRadius: '15px', marginBottom: '10px' }}>Язык: {lang}</button>
               <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', background: '#111', color: '#fff', padding: '20px', borderRadius: '15px' }}>Менеджер</button>
               <div style={{marginTop: '100px', textAlign: 'center', opacity: 0.1}} onClick={() => {setClickCount(c=>c+1); if(clickCount>=4) setIsAdmin(true);}}>v6.0.0 Classic</div>
               {isAdmin && <div style={{background:'#111', padding:20, borderRadius:15, marginTop:20}}>Admin Active. Check Database.</div>}
            </div>
          </div>
        )}

        {receipt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#111', padding: '30px', borderRadius: '30px', width: '100%', textAlign: 'center', border: '1px solid #333' }}>
              <h2>✅ Сделка прошла</h2>
              <p>{receipt.spent.toFixed(4)} {receipt.from} → {receipt.got.toFixed(6)} {receipt.to}</p>
              <button onClick={() => setReceipt(null)} style={{ width: '100%', background: '#fff', color: '#000', padding: '15px', borderRadius: '15px', marginTop: '20px', border: 'none', fontWeight: 'bold' }}>ЗАКРЫТЬ</button>
            </div>
          </div>
        )}

        {isProcessing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>EXECUTING SWAP...</div>}
      </div>
    </div>
  );
}
