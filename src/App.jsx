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
  UNISWAP: { name: 'Uniswap', color: '#FF007A', bg: 'radial-gradient(circle at 50% -20%, #ff007a44, #000 85%), #050505' },
  ODOS: { name: 'Odos', color: '#0CF2B0', bg: 'linear-gradient(180deg, #0cf2b015 0%, #000 100%), #020a08' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: 'radial-gradient(circle at 0% 0%, #fa52a025, #000 75%), #0a050a' },
  '1INCH': { name: '1inch', color: '#31569c', bg: 'linear-gradient(135deg, #31569c25 0%, #000 100%), #05080a' }
};

const TRANSLATIONS = {
  RU: { balance: 'БАЛАНС', portfolio: 'ПОРТФЕЛЬ', settings: 'Настройки', lang: 'Язык: RU', manager: 'Менеджер', swap: 'Обменять', max: 'МАКС', pay: 'Отдаете', get: 'Получаете', signal: 'СИГНАЛ', admin: 'АДМИН', loading: 'ТРАНЗАКЦИЯ...', success: 'УСПЕШНО', profit: 'ПРИБЫЛЬ', loss: 'УБЫТОК' },
  EN: { balance: 'BALANCE', portfolio: 'PORTFOLIO', settings: 'Settings', lang: 'Lang: EN', manager: 'Support', swap: 'Swap Now', max: 'MAX', pay: 'Pay', get: 'Receive', signal: 'SIGNAL', admin: 'ADMIN', loading: 'TRANSACTION...', success: 'SUCCESS', profit: 'PROFIT', loss: 'LOSS' }
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
  const [isPending, setIsPending] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [allPlayers, setAllPlayers] = useState({});

  const [payToken, setPayToken] = useState(ASSETS.USDC);
  const [receiveToken, setReceiveToken] = useState(ASSETS.BTC);
  const [payAmount, setPayAmount] = useState('');
  const [showTokenList, setShowTokenList] = useState(null);

  const t = TRANSLATIONS[lang];
  const tgData = useMemo(() => window.Telegram?.WebApp?.initDataUnsafe?.user, []);
  const userId = useMemo(() => tgData?.username || tgData?.id?.toString() || 'Trader_' + Math.floor(Math.random()*99), [tgData]);

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
      setSignal({ coin, buyAt: dexes[0], sellAt: dexes[1], profit: (Math.random()*1 + 2.1).toFixed(2) });
    }
  }, [signal]);

  const handleSwap = () => {
    const amount = Number(payAmount);
    const available = payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0);
    if (!amount || amount <= 0 || amount > available) return;

    setIsPending(true);
    
    setTimeout(() => {
      let gotAmount = (amount * payToken.price) / receiveToken.price;
      let pnlValue = null;

      if (receiveToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
        const multiplier = isCorrect ? (1 + signal.profit / 100) : (1 - (Math.random() * 0.015));
        gotAmount *= multiplier;
        pnlValue = gotAmount - (amount * payToken.price);
        if (isCorrect) setSignal(null);
      }

      const newBalanceUSDC = payToken.symbol === 'USDC' ? balanceUSDC - amount : (receiveToken.symbol === 'USDC' ? balanceUSDC + gotAmount : balanceUSDC);
      const newWallet = { ...wallet };
      if (payToken.symbol !== 'USDC') newWallet[payToken.symbol] = (newWallet[payToken.symbol] || 0) - amount;
      if (receiveToken.symbol !== 'USDC') newWallet[receiveToken.symbol] = (newWallet[receiveToken.symbol] || 0) + gotAmount;

      set(ref(db, 'players/' + userId), { balanceUSDC: newBalanceUSDC, wallet: newWallet, lastSeen: serverTimestamp() });
      setReceipt({ from: payToken.symbol, to: receiveToken.symbol, spent: amount, got: gotAmount, pnl: pnlValue });
      setIsPending(false); setPayAmount(''); setActiveDex(null);
    }, 1500);
  };

  return (
    <div style={{ background: activeDex ? DEX_THEMES[activeDex].bg : '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', alignItems: 'center', zIndex: 10 }}>
          <div onClick={() => (ADMINS.includes(userId) || userId.startsWith('Trader')) && setShowAdmin(true)} style={{ color: '#0CF2B0', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>{t.balance}</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px' }}>⚙️</button>
        </div>

        {/* MAIN SCROLL VIEW */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>
          {view === 'main' && !activeDex && (
            <>
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <h1 style={{ fontSize: '42px', margin: 0 }}>${balanceUSDC.toFixed(2)}</h1>
                <p style={{ opacity: 0.3, fontSize: '11px' }}>USDC</p>
              </div>

              <div onClick={() => window.open('https://t.me/vladstelin78')} style={{ background: '#111', padding: '15px', borderRadius: '18px', marginBottom: '15px', border: '1px solid #0CF2B044', textAlign: 'center' }}>
                <div style={{color: '#0CF2B0', fontWeight: 'bold', fontSize: '14px'}}>💎 {t.manager} (@vladstelin78)</div>
              </div>

              {signal && (
                <div style={{ background: '#111', padding: '12px', borderRadius: '15px', marginBottom: '15px', borderLeft: '4px solid #0CF2B0' }}>
                  <div style={{ fontSize: '10px', color: '#0CF2B0' }}>{t.signal}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{signal.coin.symbol}: {signal.buyAt} → {signal.sellAt} (+{signal.profit}%)</div>
                </div>
              )}

              <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '20px', marginBottom: '20px' }}>
                {Object.keys(wallet).filter(k => wallet[k] > 0.000001).map(c => (
                  <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #111' }}>
                    <div style={{display:'flex', alignItems:'center', gap: 8}}><img src={ASSETS[c]?.icon} width="16" /> {c}</div>
                    <b>{wallet[c].toFixed(6)}</b>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {Object.keys(DEX_THEMES).map(k => (
                  <button key={k} onClick={() => setActiveDex(k)} style={{ background: '#111', border: `1px solid ${DEX_THEMES[k].color}44`, color: '#fff', padding: '22px 0', borderRadius: '18px', fontWeight: 'bold' }}>{DEX_THEMES[k].name}</button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* EXCHANGE INTERFACE */}
        {activeDex && (
          <div style={{ position: 'absolute', inset: 0, background: DEX_THEMES[activeDex].bg, zIndex: 100, padding: '20px' }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>←</button>
            <h2 style={{ textAlign: 'center', color: DEX_THEMES[activeDex].color }}>{activeDex}</h2>
            <div style={{ marginTop: '20px', background: '#ffffff11', padding: '20px', borderRadius: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '10px' }}><span>{t.pay}</span><span onClick={() => setPayAmount((payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0)).toString())} style={{color: '#0CF2B0'}}>{t.max}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '28px', width: '50%' }} placeholder="0.0"/>
                <button onClick={() => setShowTokenList('pay')} style={{ background: '#222', padding: '10px', borderRadius: '12px', color: '#fff' }}>{payToken.symbol} ▾</button>
              </div>
            </div>
            <div style={{textAlign:'center', margin:'10px 0'}}><button onClick={()=>{const t=payToken; setPayToken(receiveToken); setReceiveToken(t);}} style={{background:'#111', border:'none', color:'#fff', padding:'5px 15px', borderRadius:'10px'}}>⇅</button></div>
            <div style={{ background: '#ffffff11', padding: '20px', borderRadius: '25px' }}>
              <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '10px' }}>{t.get}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{fontSize: '28px'}}>{payAmount ? ((payAmount * payToken.price) / receiveToken.price).toFixed(6) : '0.0'}</div>
                <button onClick={() => setShowTokenList('receive')} style={{ background: '#222', padding: '10px', borderRadius: '12px', color: '#fff' }}>{receiveToken.symbol} ▾</button>
              </div>
            </div>
            <button onClick={handleSwap} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: '20px', borderRadius: '20px', marginTop: '25px', fontWeight: 'bold' }}>{t.swap}</button>
          </div>
        )}

        {/* LOADING OVERLAY (RE-ADDED) */}
        {isPending && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '50px', height: '50px', border: '4px solid #222', borderTopColor: '#0CF2B0', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: 20, fontWeight: 'bold', letterSpacing: '1px' }}>{t.loading}</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* RECEIPT NOTIFICATION (RE-ADDED) */}
        {receipt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#111', width: '100%', borderRadius: '35px', padding: '30px', textAlign: 'center', border: '1px solid #222' }}>
              <div style={{fontSize: 50, marginBottom: 10}}>{receipt.pnl >= 0 ? '💰' : '✅'}</div>
              <h2 style={{margin: 0}}>{receipt.pnl !== null ? (receipt.pnl >= 0 ? t.profit : t.loss) : t.success}</h2>
              <div style={{margin: '20px 0', fontSize: '18px', opacity: 0.8}}>
                {receipt.spent.toFixed(2)} {receipt.from} → {receipt.got.toFixed(4)} {receipt.to}
              </div>
              {receipt.pnl !== null && (
                <div style={{fontSize: '34px', fontWeight: 'bold', color: receipt.pnl >= 0 ? '#0CF2B0' : '#FF4B4B'}}>
                  {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
                </div>
              )}
              <button onClick={() => setReceipt(null)} style={{ width: '100%', background: '#fff', color: '#000', padding: '20px', borderRadius: '15px', border: 'none', marginTop: '25px', fontWeight: 'bold', fontSize: '16px' }}>OK</button>
            </div>
          </div>
        )}

        {/* ADMIN & TOKEN LIST (STILL TOP LAYER) */}
        {showAdmin && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 11000, padding: '20px', overflowY: 'auto' }}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom: 20}}><h2>{t.admin}</h2> <button onClick={()=>setShowAdmin(false)}>X</button></div>
            {Object.keys(allPlayers).map(pId => (
              <div key={pId} style={{background:'#111', padding:'15px', marginBottom:'10px', borderRadius:'15px', border:'1px solid #333'}}>
                <div style={{fontSize: 10, opacity: 0.5}}>ID: {pId}</div>
                <div style={{fontSize: 18, fontWeight:'bold', margin:'5px 0'}}>${allPlayers[pId].balanceUSDC?.toFixed(2)}</div>
                <input type="number" placeholder="New Balance" onBlur={(e) => set(ref(db, `players/${pId}/balanceUSDC`), Number(e.target.value))} style={{width:'100%', padding:'10px', background:'#000', color:'#fff', border:'1px solid #444', borderRadius: 8}} />
              </div>
            ))}
          </div>
        )}

        {showTokenList && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 12000, padding: '20px', overflowY: 'auto' }}>
             <button onClick={() => setShowTokenList(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '35px' }}>×</button>
             {Object.values(ASSETS).map(item => (
               <div key={item.symbol} onClick={() => { if(showTokenList === 'pay') setPayToken(item); else setReceiveToken(item); setShowTokenList(null); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid #111' }}>
                  <div style={{display:'flex', alignItems:'center', gap: 10}}><img src={item.icon} width="20"/> {item.symbol}</div>
                  <span>${item.price}</span>
               </div>
             ))}
          </div>
        )}

        {/* SETTINGS (STILL TOP LAYER) */}
        {view === 'settings' && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 10500, padding: '25px' }}>
            <button onClick={() => setView('main')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px' }}>←</button>
            <div style={{marginTop: 30}}>
              <button onClick={() => setLang(l => l === 'RU' ? 'EN' : 'RU')} style={{ width: '100%', padding: '20px', background: '#111', color: '#fff', borderRadius: '18px', marginBottom: '15px' }}>{t.lang}</button>
              <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', padding: '20px', background: '#111', color: '#fff', borderRadius: '18px' }}>{t.creators}</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
