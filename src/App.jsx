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
  USDC: { symbol: 'USDC', price: 1, change: '0.00%', icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=024' },
  BTC: { symbol: 'BTC', price: 65000, change: '+1.2%', icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=024' },
  ETH: { symbol: 'ETH', price: 2600, change: '+0.8%', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=024' },
  LINK: { symbol: 'LINK', price: 18.2, change: '-2.1%', icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg?v=024' },
  AAVE: { symbol: 'AAVE', price: 145.5, change: '+5.4%', icon: 'https://cryptologos.cc/logos/aave-aave-logo.svg?v=024' },
  CRV: { symbol: 'CRV', price: 0.55, change: '-0.2%', icon: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.svg?v=024' },
  WPOL: { symbol: 'WPOL', price: 0.72, change: '+3.1%', icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg?v=024' }
};

const DEX_THEMES = {
  UNISWAP: { name: 'Uniswap V3', color: '#FF007A', bg: 'radial-gradient(circle at 50% -20%, #ff007a33, #000 85%)' },
  ODOS: { name: 'Odos Router', color: '#0CF2B0', bg: 'linear-gradient(180deg, #0cf2b010 0%, #000 100%)' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: 'radial-gradient(circle at 0% 0%, #fa52a020, #000 75%)' },
  '1INCH': { name: '1inch Network', color: '#31569c', bg: 'linear-gradient(135deg, #31569c20 0%, #000 100%)' }
};

const TRANSLATIONS = {
  RU: { balance: 'БАЛАНС', settings: 'Настройки', lang: 'Язык: RU', manager: 'Менеджер', swap: 'Обменять', max: 'МАКС', pay: 'Отдаете', get: 'Получаете', signal: 'ТОРГОВАЯ СДЕЛКА', admin: 'АДМИН', live: 'ЖИВАЯ ЛЕНТА СДЕЛОК', creators: 'Создатели', slippage: 'Проскальзывание', fee: 'Газ', route: 'Маршрут' },
  EN: { balance: 'BALANCE', settings: 'Settings', lang: 'Lang: EN', manager: 'Support', swap: 'Swap Now', max: 'MAX', pay: 'Pay', get: 'Receive', signal: 'TRADE DEAL', admin: 'ADMIN', live: 'LIVE TRADE TAPE', creators: 'Creators', slippage: 'Slippage', fee: 'Gas', route: 'Route' }
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
  const [liveEvents, setLiveEvents] = useState([]);
  const [showTokenList, setShowTokenList] = useState(null);
  const [payToken, setPayToken] = useState(ASSETS.USDC);
  const [receiveToken, setReceiveToken] = useState(ASSETS.BTC);
  const [payAmount, setPayAmount] = useState('');

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

  useEffect(() => {
    const traders = ['Whale_Hunter', 'Dex_Guru', 'Solana_King', 'Vadim_BTC', 'Crypto_Nika', 'Bull_Run'];
    const interval = setInterval(() => {
      const trader = traders[Math.floor(Math.random() * traders.length)];
      const amount = (Math.random() * 200 + 20).toFixed(2);
      const isProfit = Math.random() > 0.4;
      setLiveEvents(prev => [{ trader, amount, isProfit, id: Date.now() }, ...prev].slice(0, 4));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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
        gotAmount *= isCorrect ? (1 + signal.profit / 100) : (1 - (Math.random() * 0.015));
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
    }, 1800);
  };

  return (
    <div style={{ background: activeDex ? DEX_THEMES[activeDex].bg : '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden', position: 'relative' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', alignItems: 'center', zIndex: 10 }}>
          <div onClick={() => (ADMINS.includes(userId) || userId.startsWith('Trader')) && setShowAdmin(true)} style={{ color: '#0CF2B0', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>{t.balance}</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px' }}>⚙️</button>
        </div>

        {/* MAIN SCREEN */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {view === 'main' && !activeDex && (
            <>
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <h1 style={{ fontSize: '42px', margin: 0, letterSpacing: '-1.5px' }}>${balanceUSDC.toFixed(2)}</h1>
                <p style={{ opacity: 0.3, fontSize: '10px', fontWeight: 'bold' }}>USDC WALLET</p>
              </div>

              {signal && (
                <div style={{ background: '#111', padding: '15px', borderRadius: '18px', marginBottom: '20px', borderLeft: '4px solid #0CF2B0' }}>
                  <div style={{ fontSize: '10px', color: '#0CF2B0', fontWeight: 'bold', marginBottom: 4 }}>{t.signal}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{signal.coin.symbol}: {signal.buyAt} → <span style={{color: '#0CF2B0'}}>{signal.sellAt}</span> (+{signal.profit}%)</div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                {Object.keys(DEX_THEMES).map(k => (
                  <button key={k} onClick={() => setActiveDex(k)} style={{ background: '#0a0a0a', border: `1px solid ${DEX_THEMES[k].color}33`, color: '#fff', padding: '25px 0', borderRadius: '20px', fontWeight: 'bold' }}>{DEX_THEMES[k].name}</button>
                ))}
              </div>

              {/* LIVE TAPE */}
              <div style={{ background: '#080808', borderRadius: '22px', padding: '15px', border: '1px solid #111' }}>
                <div style={{ fontSize: '10px', opacity: 0.4, marginBottom: '12px', fontWeight: 'bold' }}>{t.live}</div>
                {liveEvents.map(ev => (
                  <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '8px 0', borderBottom: '1px solid #ffffff05' }}>
                    <span style={{ opacity: 0.7 }}>{ev.trader}</span>
                    <span style={{ color: ev.isProfit ? '#0CF2B0' : '#FF4B4B', fontWeight: 'bold' }}>{ev.isProfit ? '+' : '-'}${ev.amount}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* DEX INTERFACE (WITH ALL DETAILS) */}
        {activeDex && (
          <div style={{ position: 'absolute', inset: 0, background: DEX_THEMES[activeDex].bg, zIndex: 100, padding: '20px', animation: 'fadeIn 0.3s' }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>←</button>
            <div style={{ textAlign: 'center', marginBottom: '30px', color: DEX_THEMES[activeDex].color, fontWeight: 'bold', fontSize: '14px' }}>{DEX_THEMES[activeDex].name.toUpperCase()}</div>
            
            {/* PAY BLOCK */}
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '12px', opacity: 0.6 }}><span>{t.pay}</span><span onClick={() => setPayAmount((payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0)).toString())} style={{color: DEX_THEMES[activeDex].color, cursor:'pointer'}}>{t.max}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px', width: '50%', outline: 'none' }} placeholder="0.0"/>
                <button onClick={() => setShowTokenList('pay')} style={{ background: '#111', padding: '10px 15px', borderRadius: '14px', color: '#fff', border: '1px solid #333' }}>{payToken.symbol} ▾</button>
              </div>
              <div style={{marginTop: 10}}><svg width="60" height="15"><path d="M0 10 Q 15 0, 30 10 T 60 5" fill="none" stroke={DEX_THEMES[activeDex].color} strokeWidth="2" opacity="0.4"/></svg></div>
            </div>

            <div style={{textAlign:'center', margin:'-15px 0', position:'relative', zIndex:2}}><button onClick={()=>{const t=payToken; setPayToken(receiveToken); setReceiveToken(t);}} style={{background:'#000', border:`1px solid ${DEX_THEMES[activeDex].color}66`, color:'#fff', padding:'8px', borderRadius:'12px'}}>⇅</button></div>

            {/* RECEIVE BLOCK */}
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', marginTop: '5px' }}>
              <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '12px' }}>{t.get}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{fontSize: '32px', fontWeight: 'bold'}}>{payAmount ? ((payAmount * payToken.price) / receiveToken.price).toFixed(6) : '0.0'}</div>
                <button onClick={() => setShowTokenList('receive')} style={{ background: '#111', padding: '10px 15px', borderRadius: '14px', color: '#fff', border: '1px solid #333' }}>{receiveToken.symbol} ▾</button>
              </div>
            </div>

            {/* DEX DETAILS */}
            <div style={{ marginTop: '20px', padding: '0 10px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>{t.slippage}</span><span style={{color: '#fff'}}>0.5%</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span>{t.fee}</span><span style={{color: '#fff'}}>$0.14</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t.route}</span><span style={{color: DEX_THEMES[activeDex].color}}>{payToken.symbol} → {receiveToken.symbol}</span></div>
            </div>
            
            <button onClick={handleSwap} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: '22px', borderRadius: '24px', marginTop: '25px', fontWeight: 'bold', border: 'none', fontSize: '18px', boxShadow: `0 10px 30px ${DEX_THEMES[activeDex].color}33` }}>{t.swap}</button>
          </div>
        )}

        {/* SETTINGS (FIXED) */}
        {view === 'settings' && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, padding: '25px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ margin: 0 }}>{t.settings}</h2>
              <button onClick={() => setView('main')} style={{ background: '#222', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '50%' }}>✕</button>
            </div>
            <button onClick={() => setLang(l => l === 'RU' ? 'EN' : 'RU')} style={{ width: '100%', padding: '20px', background: '#111', color: '#fff', borderRadius: '18px', marginBottom: '15px', border: '1px solid #333', textAlign: 'left' }}>🌐 {t.lang}</button>
            <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', padding: '20px', background: '#111', color: '#fff', borderRadius: '18px', border: '1px solid #333', textAlign: 'left' }}>👥 {t.creators}</button>
          </div>
        )}

        {/* TOKEN LIST */}
        {showTokenList && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 2000, padding: '20px', overflowY: 'auto' }}>
             <button onClick={() => setShowTokenList(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '35px', marginBottom: 20 }}>×</button>
             {Object.values(ASSETS).map(item => (
               <div key={item.symbol} onClick={() => { if(showTokenList === 'pay') setPayToken(item); else setReceiveToken(item); setShowTokenList(null); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '18px', borderBottom: '1px solid #111', alignItems: 'center' }}>
                  <div style={{display:'flex', alignItems:'center', gap: 12}}><img src={item.icon} width="24"/> <div><b>{item.symbol}</b><br/><span style={{fontSize: 10, opacity: 0.4}}>${item.price}</span></div></div>
                  <div style={{color: item.change.startsWith('+') ? '#0CF2B0' : '#FF4B4B', fontSize: '12px'}}>{item.change}</div>
               </div>
             ))}
          </div>
        )}

        {/* LOADING & RECEIPT */}
        {isPending && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '50px', height: '50px', border: '4px solid #111', borderTopColor: '#0CF2B0', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {receipt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#111', width: '100%', borderRadius: '35px', padding: '35px', textAlign: 'center', border: '1px solid #222' }}>
              <div style={{fontSize: 40, marginBottom: 15}}>{receipt.pnl >= 0 ? '🤑' : '✅'}</div>
              <h2 style={{margin: 0}}>{receipt.pnl !== null ? (receipt.pnl >= 0 ? 'PROFIT' : 'LOSS') : 'SUCCESS'}</h2>
              {receipt.pnl !== null && <div style={{fontSize: '32px', color: receipt.pnl >= 0 ? '#0CF2B0' : '#FF4B4B', fontWeight: 'bold', margin: '15px 0'}}>{receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC</div>}
              <button onClick={() => setReceipt(null)} style={{ width: '100%', background: '#fff', color: '#000', padding: '18px', borderRadius: '15px', border: 'none', fontWeight: 'bold' }}>OK</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
