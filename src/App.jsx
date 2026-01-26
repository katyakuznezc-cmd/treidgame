import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, push, serverTimestamp, update } from "firebase/database";

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
  USDC: { symbol: 'USDC', price: 1, icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=024', change: '0%' },
  BTC: { symbol: 'BTC', price: 65000, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=024', change: '+1.2%' },
  ETH: { symbol: 'ETH', price: 2600, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=024', change: '+0.5%' },
  LINK: { symbol: 'LINK', price: 18.2, icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg?v=024', change: '-2.1%' }
};

const DEX_THEMES = {
  UNISWAP: { name: 'Uniswap V3', color: '#FF007A', bg: 'radial-gradient(circle at 50% -20%, #ff007a44, #000 85%)' },
  ODOS: { name: 'Odos Router', color: '#0CF2B0', bg: 'linear-gradient(180deg, #0cf2b015 0%, #000 100%)' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: 'radial-gradient(circle at 0% 0%, #fa52a025, #000 75%)' },
  '1INCH': { name: '1inch Network', color: '#31569c', bg: 'linear-gradient(135deg, #31569c25 0%, #000 100%)' }
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
  const [globalTrades, setGlobalTrades] = useState([]);
  const [showTokenList, setShowTokenList] = useState(null);
  const [payToken, setPayToken] = useState(ASSETS.USDC);
  const [receiveToken, setReceiveToken] = useState(ASSETS.BTC);
  const [payAmount, setPayAmount] = useState('');

  const tgData = useMemo(() => window.Telegram?.WebApp?.initDataUnsafe?.user, []);
  const userId = useMemo(() => tgData?.id?.toString() || 'Trader_' + Math.floor(Math.random()*99), [tgData]);
  const userName = useMemo(() => tgData?.username || tgData?.first_name || 'Trader', [tgData]);

  useEffect(() => {
    onValue(ref(db, 'players/'), (s) => {
      if (s.exists()) {
        const data = s.val();
        setAllPlayers(data);
        if (data[userId]) {
          setBalanceUSDC(data[userId].balanceUSDC ?? 1000);
          setWallet(data[userId].wallet ?? {});
        } else {
          set(ref(db, 'players/' + userId), { balanceUSDC: 1000, wallet: {}, username: userName });
        }
      }
    });
    onValue(ref(db, 'globalTrades/'), (s) => {
      if (s.exists()) {
        const trades = Object.values(s.val()).reverse().slice(0, 5);
        setGlobalTrades(trades);
      }
    });
  }, [userId, userName]);

  useEffect(() => {
    if (!signal) {
      const keys = Object.keys(ASSETS).filter(k => k !== 'USDC');
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      setSignal({ coin, buyAt: 'UNISWAP', sellAt: 'ODOS', profit: (Math.random()*1 + 2.1).toFixed(2) });
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
        gotAmount *= isCorrect ? (1 + signal.profit / 100) : (1 - (Math.random() * 0.015));
        pnlValue = gotAmount - (amount * payToken.price);
        if (isCorrect) setSignal(null);
      }

      const newBalanceUSDC = payToken.symbol === 'USDC' ? balanceUSDC - amount : (receiveToken.symbol === 'USDC' ? balanceUSDC + gotAmount : balanceUSDC);
      const newWallet = { ...wallet };
      if (payToken.symbol !== 'USDC') newWallet[payToken.symbol] = (newWallet[payToken.symbol] || 0) - amount;
      if (receiveToken.symbol !== 'USDC') newWallet[receiveToken.symbol] = (newWallet[receiveToken.symbol] || 0) + gotAmount;

      update(ref(db, 'players/' + userId), { balanceUSDC: newBalanceUSDC, wallet: newWallet, username: userName });
      if (pnlValue !== null) {
        push(ref(db, 'globalTrades/'), { user: userName, amount: pnlValue.toFixed(2), isProfit: pnlValue >= 0, time: Date.now() });
      }

      setReceipt({ from: payToken.symbol, to: receiveToken.symbol, spent: amount, got: gotAmount, pnl: pnlValue });
      setIsPending(false); setPayAmount(''); setActiveDex(null);
    }, 1500);
  };

  return (
    <div style={{ background: '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', alignItems: 'center', zIndex: 10 }}>
          <div onClick={() => (ADMINS.includes(userName) || ADMINS.includes(userId)) && setShowAdmin(true)} style={{ color: '#0CF2B0', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>БАЛАНС</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px' }}>⚙️</button>
        </div>

        {/* MAIN PAGE */}
        <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto' }}>
          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <h1 style={{ fontSize: '48px', margin: 0 }}>${balanceUSDC.toFixed(2)}</h1>
            <p style={{ opacity: 0.3, fontSize: '10px' }}>USDC ACCOUNT</p>
          </div>

          {signal && (
            <div style={{ background: '#111', padding: '15px', borderRadius: '20px', marginBottom: '20px', borderLeft: '4px solid #0CF2B0' }}>
              <div style={{ fontSize: '10px', color: '#0CF2B0', fontWeight: 'bold' }}>СИГНАЛ</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{signal.coin.symbol}: {signal.buyAt} → {signal.sellAt} (+{signal.profit}%)</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
            {Object.keys(DEX_THEMES).map(k => (
              <button key={k} onClick={() => setActiveDex(k)} style={{ background: '#0a0a0a', border: `1px solid ${DEX_THEMES[k].color}44`, color: '#fff', padding: '25px 0', borderRadius: '20px', fontWeight: 'bold' }}>{DEX_THEMES[k].name}</button>
            ))}
          </div>

          {/* REAL GLOBAL TAPE */}
          <div style={{ background: '#080808', borderRadius: '22px', padding: '18px', border: '1px solid #111' }}>
            <div style={{ fontSize: '10px', opacity: 0.4, marginBottom: '12px', fontWeight: 'bold' }}>ЖИВАЯ ЛЕНТА</div>
            {globalTrades.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '10px 0', borderBottom: '1px solid #ffffff05' }}>
                <span>@{t.user}</span>
                <span style={{ color: t.isProfit ? '#0CF2B0' : '#FF4B4B', fontWeight: 'bold' }}>{t.isProfit ? '+' : ''}{t.amount} USDC</span>
              </div>
            ))}
          </div>
        </div>

        {/* DEX OVERLAY (FIXED CLICKS) */}
        {activeDex && (
          <div style={{ position: 'absolute', inset: 0, background: DEX_THEMES[activeDex].bg, zIndex: 1000, padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px', alignSelf: 'flex-start', cursor: 'pointer', padding: '10px' }}>←</button>
            <h2 style={{ textAlign: 'center', color: DEX_THEMES[activeDex].color }}>{DEX_THEMES[activeDex].name}</h2>
            
            <div style={{ background: 'rgba(255,255,255,0.07)', padding: '25px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.1)', marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 15 }}>
                <span>Отдаете</span>
                <span onClick={() => setPayAmount((payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0)).toString())} style={{color: DEX_THEMES[activeDex].color, fontWeight: 'bold', cursor: 'pointer', zIndex: 1100}}>МАКС</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '34px', width: '60%', outline: 'none' }} placeholder="0.0"/>
                <button onClick={() => setShowTokenList('pay')} style={{ background: '#111', padding: '12px', borderRadius: '15px', color: '#fff', border: '1px solid #333', zIndex: 1100 }}>{payToken.symbol} ▾</button>
              </div>
            </div>

            <div style={{textAlign:'center', margin:'-15px 0', zIndex: 1050}}><button onClick={()=>{const t=payToken; setPayToken(receiveToken); setReceiveToken(t);}} style={{background:'#000', border:`1px solid ${DEX_THEMES[activeDex].color}`, color:'#fff', padding:'10px', borderRadius:'14px'}}>⇅</button></div>

            <div style={{ background: 'rgba(255,255,255,0.07)', padding: '25px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.1)', marginTop: 5 }}>
              <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: 15 }}>Получаете</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{fontSize: '34px', fontWeight: 'bold'}}>{payAmount ? ((payAmount * payToken.price) / receiveToken.price).toFixed(6) : '0.0'}</div>
                <button onClick={() => setShowTokenList('receive')} style={{ background: '#111', padding: '12px', borderRadius: '15px', color: '#fff', border: '1px solid #333', zIndex: 1100 }}>{receiveToken.symbol} ▾</button>
              </div>
            </div>

            <div style={{marginTop: 20, padding: '0 10px', fontSize: '13px', opacity: 0.5}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 5}}><span>Газ:</span><span>$0.12</span></div>
                <div style={{display:'flex', justifyContent:'space-between'}}><span>Маршрут:</span><span>{payToken.symbol} → {receiveToken.symbol}</span></div>
            </div>
            
            <button onClick={handleSwap} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: '22px', borderRadius: '25px', marginTop: 'auto', marginBottom: 20, fontWeight: 'bold', fontSize: '18px', border: 'none', zIndex: 1100 }}>Обменять</button>
          </div>
        )}

        {/* ADMIN PANEL */}
        {showAdmin && (
          <div style={{ position: 'fixed', inset: 0, background: '#050505', zIndex: 5000, padding: '25px', overflowY: 'auto' }}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom: 25}}>
              <h2 style={{color: '#0CF2B0', margin: 0}}>USERS CONTROL</h2>
              <button onClick={()=>setShowAdmin(false)} style={{background: '#222', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '12px'}}>BACK</button>
            </div>
            {Object.keys(allPlayers).map(pId => (
              <div key={pId} style={{background: '#111', padding: '15px', borderRadius: '20px', marginBottom: '12px', border: '1px solid #222'}}>
                <div style={{fontSize: '14px', color: '#0CF2B0', fontWeight: 'bold'}}>@{allPlayers[pId].username || 'Anon'}</div>
                <div style={{fontSize: '10px', opacity: 0.3, marginBottom: 10}}>ID: {pId}</div>
                <div style={{display: 'flex', gap: 10}}>
                  <input type="number" defaultValue={allPlayers[pId].balanceUSDC} id={`inp-${pId}`} style={{flex: 1, background: '#000', border: '1px solid #333', color: '#fff', padding: '10px', borderRadius: '10px'}} />
                  <button onClick={() => {
                    const val = document.getElementById(`inp-${pId}`).value;
                    update(ref(db, `players/${pId}`), { balanceUSDC: Number(val) });
                    alert('Баланс обновлен!');
                  }} style={{background: '#0CF2B0', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold'}}>SAVE</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SETTINGS */}
        {view === 'settings' && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 4000, padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
              <h2 style={{margin: 0}}>Настройки</h2>
              <button onClick={() => setView('main')} style={{ background: '#222', border: 'none', color: '#fff', width: '45px', height: '45px', borderRadius: '50%', fontSize: '20px' }}>✕</button>
            </div>
            <button onClick={() => setLang(l => l === 'RU' ? 'EN' : 'RU')} style={{ width: '100%', padding: '22px', background: '#111', color: '#fff', borderRadius: '20px', marginBottom: '15px', border: '1px solid #333', textAlign: 'left', fontWeight: 'bold' }}>🌐 Язык: {lang}</button>
            <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', padding: '22px', background: '#111', color: '#fff', borderRadius: '20px', border: '1px solid #333', textAlign: 'left', fontWeight: 'bold' }}>👥 Создатели: @kriptoalians</button>
          </div>
        )}

        {/* TOKEN SELECT */}
        {showTokenList && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 6000, padding: '20px' }}>
             <button onClick={() => setShowTokenList(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '35px', marginBottom: 20 }}>×</button>
             {Object.values(ASSETS).map(item => (
               <div key={item.symbol} onClick={() => { if(showTokenList === 'pay') setPayToken(item); else setReceiveToken(item); setShowTokenList(null); }} style={{ display: 'flex', gap: 15, padding: '20px', borderBottom: '1px solid #111', alignItems: 'center' }}>
                  <img src={item.icon} width="30"/>
                  <div style={{flex: 1}}><b>{item.symbol}</b></div>
                  <div style={{color: item.change.startsWith('+') ? '#0CF2B0' : '#FF4B4B'}}>{item.change}</div>
               </div>
             ))}
          </div>
        )}

      </div>
    </div>
  );
}
