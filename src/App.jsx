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

// СПИСОК АДМИНОВ (впиши свой ник без @)
const ADMINS = ['vladstelin78', 'kriptoalians'];

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
  UNISWAP: { name: 'Uniswap', color: '#FF007A', bg: 'radial-gradient(circle at 50% -20%, #ff007a33, #000 80%), #050505' },
  ODOS: { name: 'Odos', color: '#0CF2B0', bg: 'linear-gradient(180deg, #0cf2b011 0%, #000 100%), #020a08' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: 'radial-gradient(circle at 0% 0%, #fa52a022, #000 70%), #0a050a' },
  '1INCH': { name: '1inch', color: '#31569c', bg: 'linear-gradient(135deg, #31569c22 0%, #000 100%), #05080a' }
};

const TRANSLATIONS = {
  RU: { balance: 'БАЛАНС', portfolio: 'ПОРТФЕЛЬ', settings: 'Настройки', lang: 'Язык: RU', manager: 'Связаться с менеджером', creators: 'Создатели', swap: 'Обменять', max: 'МАКС', pay: 'Вы отдаете', get: 'Вы получаете', signal: 'СИГНАЛ', admin: 'АДМИН-ЦЕНТР', back: 'Назад' },
  EN: { balance: 'BALANCE', portfolio: 'PORTFOLIO', settings: 'Settings', lang: 'Lang: EN', manager: 'Support', creators: 'Creators', swap: 'Swap Now', max: 'MAX', pay: 'You Pay', get: 'You Receive', signal: 'SIGNAL', admin: 'ADMIN CENTER', back: 'Back' }
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  const [lang, setLang] = useState('RU');
  const [balanceUSDC, setBalanceUSDC] = useState(1000.0);
  const [wallet, setWallet] = useState({});
  const [view, setView] = useState('main'); 
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [allPlayers, setAllPlayers] = useState({});

  const [payToken, setPayToken] = useState(ASSETS.USDC);
  const [receiveToken, setReceiveToken] = useState(ASSETS.BTC);
  const [payAmount, setPayAmount] = useState('');
  const [showTokenList, setShowTokenList] = useState(null);

  const t = TRANSLATIONS[lang];
  const tgData = useMemo(() => window.Telegram?.WebApp?.initDataUnsafe?.user, []);
  const userId = useMemo(() => tgData?.username || tgData?.id?.toString() || 'Guest_' + Math.floor(Math.random()*99), [tgData]);

  useEffect(() => {
    onValue(ref(db, 'players/'), (s) => {
      if (s.exists()) {
        const data = s.val();
        setAllPlayers(data);
        if (data[userId]) {
          setBalanceUSDC(data[userId].balanceUSDC ?? 1000);
          setWallet(data[userId].wallet ?? {});
        }
      }
    });
  }, [userId]);

  useEffect(() => {
    if (!signal) {
      const keys = Object.keys(ASSETS).filter(k => k !== 'USDC');
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      const dexes = Object.keys(DEX_THEMES);
      setSignal({ coin, buyAt: dexes[0], sellAt: dexes[1], profit: (Math.random()*1 + 2).toFixed(2) });
    }
  }, [signal]);

  const openAdmin = () => {
    if (ADMINS.includes(userId) || userId.startsWith('Guest')) {
      setShowAdmin(true);
    } else {
      alert("Access Denied");
    }
  };

  const handleSwap = () => {
    const amount = Number(payAmount);
    const available = payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0);
    if (!amount || amount <= 0 || amount > available) return;

    let gotAmount = (amount * payToken.price) / receiveToken.price;
    let pnl = null;

    if (receiveToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
      const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
      gotAmount *= isCorrect ? (1 + signal.profit / 100) : (1 - (Math.random() * 0.015));
      pnl = gotAmount - (amount * payToken.price);
      if (isCorrect) setSignal(null);
    }

    const newBalanceUSDC = payToken.symbol === 'USDC' ? balanceUSDC - amount : (receiveToken.symbol === 'USDC' ? balanceUSDC + gotAmount : balanceUSDC);
    const newWallet = { ...wallet };
    if (payToken.symbol !== 'USDC') newWallet[payToken.symbol] = (newWallet[payToken.symbol] || 0) - amount;
    if (receiveToken.symbol !== 'USDC') newWallet[receiveToken.symbol] = (newWallet[receiveToken.symbol] || 0) + gotAmount;

    set(ref(db, 'players/' + userId), { balanceUSDC: newBalanceUSDC, wallet: newWallet, lastSeen: serverTimestamp() });
    setReceipt({ from: payToken.symbol, to: receiveToken.symbol, spent: amount, got: gotAmount, pnl });
    setPayAmount(''); setActiveDex(null);
  };

  return (
    <div style={{ background: activeDex ? DEX_THEMES[activeDex].bg : '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden', transition: 'all 0.5s ease' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', alignItems: 'center', zIndex: 10 }}>
          <div onClick={openAdmin} style={{ color: '#0CF2B0', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', opacity: 0.8 }}>{t.balance}</div>
          <button onClick={() => setView('settings')} style={{ background: '#ffffff11', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px' }}>⚙️</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>
          {view === 'main' && !activeDex && (
            <>
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <h1 style={{ fontSize: '42px', margin: 0, fontWeight: '800' }}>${balanceUSDC.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
                <p style={{ opacity: 0.3, fontSize: '11px', letterSpacing: '1px' }}>USDC ACCOUNT</p>
              </div>

              <div onClick={() => window.open('https://t.me/vladstelin78')} style={{ background: 'linear-gradient(90deg, #0CF2B022, #000)', padding: '15px', borderRadius: '18px', marginBottom: '15px', border: '1px solid #0CF2B044', cursor: 'pointer' }}>
                <div style={{color: '#0CF2B0', fontWeight: 'bold', fontSize: '14px'}}>💎 {t.manager}</div>
                <div style={{fontSize: '11px', opacity: 0.6}}>@vladstelin78</div>
              </div>

              {signal && (
                <div style={{ background: '#111', padding: '12px', borderRadius: '15px', marginBottom: '15px', borderLeft: '4px solid #0CF2B0' }}>
                  <div style={{ fontSize: '10px', color: '#0CF2B0', fontWeight: 'bold' }}>{t.signal}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{signal.coin.symbol}: {signal.buyAt} → <span style={{color: '#0CF2B0'}}>{signal.sellAt}</span></div>
                </div>
              )}

              <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '20px', marginBottom: '20px', border: '1px solid #1a1a1a' }}>
                <p style={{ fontSize: '10px', opacity: 0.5, marginBottom: '10px' }}>{t.portfolio}</p>
                {Object.keys(wallet).length === 0 && <div style={{opacity: 0.2, fontSize: '12px'}}>{t.empty}</div>}
                {Object.keys(wallet).filter(k => wallet[k] > 0.000001).map(c => (
                  <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #111', alignItems: 'center' }}>
                    <div style={{display:'flex', alignItems:'center', gap: 10}}><img src={ASSETS[c]?.icon} width="18" /> {c}</div>
                    <b style={{fontSize: '14px'}}>{wallet[c].toFixed(6)}</b>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {Object.keys(DEX_THEMES).map(k => (
                  <button key={k} onClick={() => setActiveDex(k)} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${DEX_THEMES[k].color}33`, color: '#fff', padding: '25px 0', borderRadius: '20px', fontWeight: 'bold' }}>{DEX_THEMES[k].name}</button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* SWAP WINDOW */}
        {activeDex && (
          <div style={{ position: 'absolute', inset: 0, background: DEX_THEMES[activeDex].bg, zIndex: 100, padding: '20px' }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px' }}>←</button>
            <h2 style={{ textAlign: 'center', color: DEX_THEMES[activeDex].color, marginTop: -10 }}>{activeDex}</h2>
            
            <div style={{ marginTop: '30px', background: 'rgba(255,255,255,0.07)', padding: '20px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '10px' }}>
                <span style={{opacity: 0.6}}>{t.pay}</span>
                <span onClick={() => setPayAmount((payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0)).toString())} style={{color: DEX_THEMES[activeDex].color, fontWeight: 'bold'}}>{t.max}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '28px', width: '50%', outline: 'none' }} placeholder="0.0"/>
                <button onClick={() => setShowTokenList('pay')} style={{ background: '#00000044', border: 'none', color: '#fff', padding: '10px 15px', borderRadius: '15px', fontWeight: 'bold', display:'flex', alignItems:'center', gap: 5 }}>
                  <img src={payToken.icon} width="18"/> {payToken.symbol} ▾
                </button>
              </div>
            </div>

            <div style={{textAlign:'center', margin:'-12px 0', position:'relative', zIndex:2}}>
               <button onClick={()=>{const t=payToken; setPayToken(receiveToken); setReceiveToken(t);}} style={{background:'#111', border:'4px solid #000', borderRadius:'12px', color:'#fff', padding:'8px 12px'}}>⇅</button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.07)', padding: '20px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '2px' }}>
              <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '10px' }}>{t.get}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{fontSize: '28px'}}>{payAmount ? ((payAmount * payToken.price) / receiveToken.price).toFixed(6) : '0.0'}</div>
                <button onClick={() => setShowTokenList('receive')} style={{ background: '#00000044', border: 'none', color: '#fff', padding: '10px 15px', borderRadius: '15px', fontWeight: 'bold', display:'flex', alignItems:'center', gap: 5 }}>
                  <img src={receiveToken.icon} width="18"/> {receiveToken.symbol} ▾
                </button>
              </div>
            </div>

            <button onClick={handleSwap} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: '20px', borderRadius: '20px', marginTop: '30px', fontWeight: 'bold', border: 'none', fontSize: '18px', boxShadow: `0 10px 30px ${DEX_THEMES[activeDex].color}44` }}>{t.swap}</button>
          </div>
        )}

        {/* ADMIN PANEL */}
        {showAdmin && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 5000, padding: '20px', overflowY: 'auto' }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20}}>
              <h2 style={{margin:0}}>{t.admin}</h2> 
              <button onClick={()=>setShowAdmin(false)} style={{background:'#f00', border:'none', color:'#fff', padding:'8px 15px', borderRadius: 10}}>X</button>
            </div>
            {Object.keys(allPlayers).map(pId => (
              <div key={pId} style={{background:'#111', padding:'15px', marginBottom:'10px', borderRadius:'15px'}}>
                <div style={{fontSize: 10, opacity: 0.5}}>USER: {pId}</div>
                <div style={{fontSize: 16, fontWeight:'bold', margin:'5px 0'}}>${allPlayers[pId].balanceUSDC?.toFixed(2)}</div>
                <input type="number" placeholder="New Balance" onBlur={(e) => set(ref(db, `players/${pId}/balanceUSDC`), Number(e.target.value))} style={{width:'100%', padding:'10px', background:'#000', color:'#fff', border:'1px solid #333', borderRadius: 8}} />
              </div>
            ))}
          </div>
        )}

        {/* SETTINGS */}
        {view === 'settings' && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, padding: '25px' }}>
            <button onClick={() => setView('main')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px' }}>←</button>
            <div style={{marginTop: 30}}>
              <button onClick={() => setLang(l => l === 'RU' ? 'EN' : 'RU')} style={{ width: '100%', padding: '20px', background: '#111', color: '#fff', borderRadius: '18px', marginBottom: '15px', border: '1px solid #222', fontSize: '16px', fontWeight: 'bold' }}>{t.lang}</button>
              <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', padding: '20px', background: '#111', color: '#fff', borderRadius: '18px', border: '1px solid #222', fontSize: '16px' }}>{t.creators}</button>
            </div>
          </div>
        )}

        {/* TOKEN SELECTOR */}
        {showTokenList && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, padding: '20px', overflowY: 'auto' }}>
             <button onClick={() => setShowTokenList(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '35px' }}>×</button>
             <div style={{marginTop: 20}}>
               {Object.values(ASSETS).map(item => (
                 <div key={item.symbol} onClick={() => { if(showTokenList === 'pay') setPayToken(item); else setReceiveToken(item); setShowTokenList(null); }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #111' }}>
                    <div style={{display:'flex', alignItems:'center', gap: 15}}><img src={item.icon} width="25"/> <b style={{fontSize: 18}}>{item.symbol}</b></div>
                    <span style={{opacity: 0.5}}>${item.price.toLocaleString()}</span>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* RECEIPT */}
        {receipt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#111', width: '100%', borderRadius: '35px', padding: '30px', textAlign: 'center', border: '1px solid #222' }}>
              <div style={{fontSize: 50}}>{receipt.pnl >= 0 ? '📈' : '📉'}</div>
              <h2 style={{margin: '10px 0'}}>{receipt.pnl !== null ? (receipt.pnl >= 0 ? 'PROFIT' : 'LOSS') : 'DONE'}</h2>
              <div style={{margin: '15px 0', fontSize: '16px', opacity: 0.8}}>
                {receipt.spent.toFixed(4)} {receipt.from} → {receipt.got.toFixed(4)} {receipt.to}
              </div>
              {receipt.pnl !== null && (
                <div style={{fontSize: '32px', fontWeight: 'bold', color: receipt.pnl >= 0 ? '#0CF2B0' : '#FF4B4B'}}>
                  {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
                </div>
              )}
              <button onClick={() => setReceipt(null)} style={{ width: '100%', background: '#fff', color: '#000', padding: '18px', borderRadius: '18px', border: 'none', marginTop: '25px', fontWeight: 'bold' }}>OK</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
