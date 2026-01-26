import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, serverTimestamp } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCKmEa1B4xOdMdNGXBDK2LeOhBQoMqWv40",
  authDomain: "treidgame-b2ae0.firebaseapp.com",
  projectId: "treidgame-b2ae0",
  storageBucket: "treidgame-b2ae0.firebasestorage.app",
  messagingSenderId: "985305772375",
  appId: "1:985305772375:web:08d9b482a6f9d3cd748e12"
};

const ASSETS = {
  USDC: { symbol: 'USDC', price: 1, icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=024' },
  BTC: { symbol: 'BTC', price: 65000, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=024' },
  ETH: { symbol: 'ETH', price: 2600, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=024' },
  LINK: { symbol: 'LINK', price: 18.2, icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg?v=024' },
  AAVE: { symbol: 'AAVE', price: 145.5, icon: 'https://cryptologos.cc/logos/aave-aave-logo.svg?v=024' },
  CRV: { symbol: 'CRV', price: 0.55, icon: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.svg?v=024' },
  WPOL: { symbol: 'WPOL', price: 0.72, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg?v=024' }
};

const DEX_THEMES = {
  UNISWAP: { name: 'Uniswap', color: '#FF007A' },
  ODOS: { name: 'Odos', color: '#0CF2B0' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0' },
  '1INCH': { name: '1inch', color: '#1B314F' }
};

const TRANSLATIONS = {
  RU: { balance: 'БАЛАНС', portfolio: 'ПОРТФЕЛЬ', settings: 'Настройки', lang: 'Язык', manager: 'Менеджер', creators: 'Создатели', pay: 'Вы отдаете', get: 'Вы получаете', swap: 'Обменять', max: 'МАКС', wallet_empty: 'Активов нет', signal: 'СИГНАЛ' },
  EN: { balance: 'BALANCE', portfolio: 'PORTFOLIO', settings: 'Settings', lang: 'Language', manager: 'Support', creators: 'Creators', pay: 'You Pay', get: 'You Receive', swap: 'Swap Now', max: 'MAX', wallet_empty: 'No assets', signal: 'SIGNAL' }
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  const [balanceUSDC, setBalanceUSDC] = useState(1000.0);
  const [wallet, setWallet] = useState({});
  const [view, setView] = useState('main'); 
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [lang, setLang] = useState('RU');
  
  const [payToken, setPayToken] = useState(ASSETS.USDC);
  const [receiveToken, setReceiveToken] = useState(ASSETS.BTC);
  const [payAmount, setPayAmount] = useState('');
  const [showTokenList, setShowTokenList] = useState(null);

  const t = TRANSLATIONS[lang];
  const userId = useMemo(() => {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
    return tg ? (tg.username || tg.id.toString()) : 'Trader_' + Math.floor(Math.random()*999);
  }, []);

  useEffect(() => {
    onValue(ref(db, 'players/' + userId), (s) => {
      if (s.exists()) {
        setBalanceUSDC(s.val().balanceUSDC ?? 1000);
        setWallet(s.val().wallet ?? {});
      }
    });
  }, [userId]);

  useEffect(() => {
    if (!signal) {
      const keys = Object.keys(ASSETS).filter(k => k !== 'USDC');
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      const dexes = Object.keys(DEX_THEMES);
      const bAt = dexes[Math.floor(Math.random() * dexes.length)];
      let sAt = dexes[Math.floor(Math.random() * dexes.length)];
      while(sAt === bAt) sAt = dexes[Math.floor(Math.random() * dexes.length)];
      setSignal({ coin, buyAt: bAt, sellAt: sAt, profit: (Math.random()*1.5+2).toFixed(2) });
    }
  }, [signal]);

  const currentAvailable = useMemo(() => {
    return payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0);
  }, [payToken, balanceUSDC, wallet]);

  const handleSwap = () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0 || amount > currentAvailable) return;

    setIsProcessing(true);
    let gotAmount = (amount * payToken.price) / receiveToken.price;

    if (receiveToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
        gotAmount *= isCorrect ? (1 + signal.profit / 100) : 0.985;
        if (isCorrect) setSignal(null);
    }

    const newBalanceUSDC = payToken.symbol === 'USDC' ? balanceUSDC - amount : (receiveToken.symbol === 'USDC' ? balanceUSDC + gotAmount : balanceUSDC);
    const newWallet = { ...wallet };
    if (payToken.symbol !== 'USDC') newWallet[payToken.symbol] = (newWallet[payToken.symbol] || 0) - amount;
    if (receiveToken.symbol !== 'USDC') newWallet[receiveToken.symbol] = (newWallet[receiveToken.symbol] || 0) + gotAmount;

    setBalanceUSDC(newBalanceUSDC);
    setWallet(newWallet);

    setTimeout(() => {
      set(ref(db, 'players/' + userId), { balanceUSDC: newBalanceUSDC, wallet: newWallet, lastSeen: serverTimestamp() }).then(() => {
        setReceipt({ from: payToken.symbol, to: receiveToken.symbol, spent: amount, got: gotAmount });
        setIsProcessing(false); setPayAmount(''); setActiveDex(null);
      });
    }, 1200);
  };

  return (
    <div style={{ background: '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', alignItems: 'center' }}>
          <div style={{ color: '#0CF2B0', fontWeight: 'bold' }}>{t.balance}</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px' }}>⚙️</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>
          {view === 'main' && !activeDex && (
            <>
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <h1 style={{ fontSize: '42px', margin: 0 }}>${balanceUSDC.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
                <p style={{ opacity: 0.3 }}>USDC Balance</p>
              </div>

              {/* Banner Manager */}
              <div onClick={() => window.open('https://t.me/kriptoalians')} style={{ background: 'linear-gradient(90deg, #0CF2B011, #0CF2B022)', padding: '15px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #0CF2B033', cursor: 'pointer' }}>
                <div style={{fontSize: 14, fontWeight: 'bold', color: '#0CF2B0'}}>💎 {t.manager}</div>
                <div style={{fontSize: 11, opacity: 0.6}}>Support & Withdrawals</div>
              </div>

              {signal && (
                <div style={{ background: '#111', padding: '15px', borderRadius: '15px', marginBottom: '20px', borderLeft: '4px solid #0CF2B0' }}>
                  <div style={{ fontSize: '10px', color: '#0CF2B0' }}>{t.signal}</div>
                  <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <img src={signal.coin.icon} width="16" /> {signal.coin.symbol}: {signal.buyAt} → <span style={{color:'#0CF2B0'}}>{signal.sellAt}</span>
                  </div>
                  <div style={{ fontSize: '12px', marginTop: 4 }}>Profit: +{signal.profit}%</div>
                </div>
              )}

              <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '20px', border: '1px solid #1a1a1a', marginBottom: '20px' }}>
                <p style={{ fontSize: '10px', opacity: 0.5, marginBottom: '10px' }}>{t.portfolio}</p>
                {Object.keys(wallet).filter(k => wallet[k] > 0.000001).map(c => (
                  <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #111', alignItems: 'center' }}>
                    <div style={{display:'flex', alignItems:'center', gap: 8}}><img src={ASSETS[c]?.icon} width="16" /> {c}</div>
                    <b>{wallet[c].toFixed(6)}</b>
                  </div>
                ))}
                {Object.keys(wallet).filter(k => wallet[k] > 0.000001).length === 0 && <p style={{opacity:0.2}}>{t.wallet_empty}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {Object.keys(DEX_THEMES).map(k => (
                  <button key={k} onClick={() => setActiveDex(k)} style={{ background: '#0a0a0a', border: `1px solid ${DEX_THEMES[k].color}44`, color: '#fff', padding: '25px 0', borderRadius: '20px', fontWeight: 'bold' }}>{DEX_THEMES[k].name}</button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Swap Window */}
        {activeDex && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, padding: '20px' }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px' }}>←</button>
            <h2 style={{ textAlign: 'center', color: DEX_THEMES[activeDex].color }}>{activeDex}</h2>
            
            <div style={{ marginTop: '20px', background: '#0f0f0f', padding: '20px', borderRadius: '25px', border: '1px solid #222' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12px' }}>
                <span style={{opacity: 0.5}}>{t.pay}</span>
                <span onClick={() => setPayAmount(currentAvailable.toString())} style={{color: '#0CF2B0', fontWeight: 'bold', cursor: 'pointer'}}>
                  {t.max}: {currentAvailable.toFixed(6)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '28px', width: '60%', outline: 'none' }} placeholder="0.0"/>
                <button onClick={() => setShowTokenList('pay')} style={{ background: '#222', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 5 }}>
                   <img src={payToken.icon} width="18" /> {payToken.symbol} ▾
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center', margin: '-15px 0', position: 'relative', zIndex: 2 }}>
              <button onClick={() => { const tmp = payToken; setPayToken(receiveToken); setReceiveToken(tmp); setPayAmount(''); }} style={{ background: '#111', border: '4px solid #000', borderRadius: '12px', padding: '8px', color: '#fff' }}>⇅</button>
            </div>

            <div style={{ background: '#0f0f0f', padding: '20px', borderRadius: '25px', border: '1px solid #222', marginTop: '5px' }}>
              <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '10px' }}>{t.get}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '28px', color: payAmount ? '#fff' : '#444' }}>
                  {payAmount ? ((payAmount * payToken.price) / receiveToken.price).toFixed(6) : '0.0'}
                </div>
                <button onClick={() => setShowTokenList('receive')} style={{ background: '#222', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 5 }}>
                   <img src={receiveToken.icon} width="18" /> {receiveToken.symbol} ▾
                </button>
              </div>
            </div>

            <button onClick={handleSwap} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: '20px', borderRadius: '20px', marginTop: '25px', fontWeight: 'bold', border: 'none' }}>{t.swap}</button>
          </div>
        )}

        {/* Settings */}
        {view === 'settings' && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, padding: '20px' }}>
            <button onClick={() => setView('main')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px' }}>←</button>
            <div style={{ marginTop: '30px' }}>
               <div style={{ background: '#111', padding: '20px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>{t.lang}</span>
                  <b onClick={() => setLang(l => l === 'RU' ? 'EN' : 'RU')} style={{color: '#0CF2B0', cursor: 'pointer'}}>{lang}</b>
               </div>
               <div onClick={() => window.open('https://t.me/kriptoalians')} style={{ background: '#111', padding: '20px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', marginBottom: '10px', cursor: 'pointer' }}>
                  <span>{t.creators}</span>
                  <span style={{color: '#0CF2B0'}}>@kriptoalians</span>
               </div>
               <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', background: '#0CF2B0', color: '#000', padding: '15px', borderRadius: '15px', border: 'none', fontWeight: 'bold' }}>{t.manager}</button>
            </div>
          </div>
        )}

        {/* Token Selector Modal */}
        {showTokenList && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, padding: '20px' }}>
             <button onClick={() => setShowTokenList(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px' }}>×</button>
             <div style={{ marginTop: '20px' }}>
               {Object.values(ASSETS).map(item => (
                 <div key={item.symbol} onClick={() => { if(showTokenList === 'pay') setPayToken(item); else setReceiveToken(item); setShowTokenList(null); setPayAmount(''); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid #111', alignItems: 'center' }}>
                    <div style={{display:'flex', alignItems:'center', gap: 12}}><img src={item.icon} width="28"/> <b>{item.symbol}</b></div>
                    <span style={{opacity: 0.5}}>${item.price.toLocaleString()}</span>
                 </div>
               ))}
             </div>
          </div>
        )}

        {receipt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#111', padding: '30px', borderRadius: '30px', width: '100%', textAlign: 'center', border: '1px solid #333' }}>
              <div style={{fontSize: 40, marginBottom: 10}}>✅</div>
              <h2 style={{margin: 0}}>Success</h2>
              <p style={{opacity: 0.7, margin: '15px 0'}}>
                {receipt.spent.toFixed(4)} {receipt.from} <br/> ↓ <br/> {receipt.got.toFixed(6)} {receipt.to}
              </p>
              <button onClick={() => setReceipt(null)} style={{ width: '100%', background: '#fff', color: '#000', padding: '15px', borderRadius: '15px', fontWeight: 'bold', border: 'none' }}>CLOSE</button>
            </div>
          </div>
        )}

        {isProcessing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>WAITING...</div>}
      </div>
    </div>
  );
}
