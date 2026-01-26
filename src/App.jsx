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
  USDC: { symbol: 'USDC', price: 1, change: '0.00%', icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=024' },
  BTC: { symbol: 'BTC', price: 65000, change: '+1.2%', icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=024' },
  ETH: { symbol: 'ETH', price: 2600, change: '+0.8%', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=024' },
  LINK: { symbol: 'LINK', price: 18.2, change: '-2.1%', icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg?v=024' },
  AAVE: { symbol: 'AAVE', price: 145.5, change: '+5.4%', icon: 'https://cryptologos.cc/logos/aave-aave-logo.svg?v=024' }
};

const DEX_THEMES = {
  UNISWAP: { name: 'Uniswap V3', color: '#FF007A', bg: 'radial-gradient(circle at 50% -20%, #ff007a33, #000 85%)' },
  ODOS: { name: 'Odos Router', color: '#0CF2B0', bg: 'linear-gradient(180deg, #0cf2b010 0%, #000 100%)' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: 'radial-gradient(circle at 0% 0%, #fa52a020, #000 75%)' },
  '1INCH': { name: '1inch Network', color: '#31569c', bg: 'linear-gradient(135deg, #31569c20 0%, #000 100%)' }
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
  const userId = useMemo(() => tgData?.id?.toString() || 'Guest_' + Math.floor(Math.random()*99), [tgData]);
  const userName = useMemo(() => tgData?.username || tgData?.first_name || 'Anonymous', [tgData]);

  // Sync Data
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

  // Signal Generator
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
      const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;

      if (receiveToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        gotAmount *= isCorrect ? (1 + signal.profit / 100) : (1 - (Math.random() * 0.015));
        pnlValue = gotAmount - (amount * payToken.price);
        if (isCorrect) setSignal(null);
      }

      const newBalanceUSDC = payToken.symbol === 'USDC' ? balanceUSDC - amount : (receiveToken.symbol === 'USDC' ? balanceUSDC + gotAmount : balanceUSDC);
      const newWallet = { ...wallet };
      if (payToken.symbol !== 'USDC') newWallet[payToken.symbol] = (newWallet[payToken.symbol] || 0) - amount;
      if (receiveToken.symbol !== 'USDC') newWallet[receiveToken.symbol] = (newWallet[receiveToken.symbol] || 0) + gotAmount;

      // Update Firebase
      update(ref(db, 'players/' + userId), { balanceUSDC: newBalanceUSDC, wallet: newWallet, username: userName, lastSeen: serverTimestamp() });
      
      // Post to Global Feed
      if (pnlValue !== null) {
        push(ref(db, 'globalTrades/'), { 
          user: userName, 
          amount: pnlValue.toFixed(2), 
          isProfit: pnlValue >= 0, 
          time: Date.now() 
        });
      }

      setReceipt({ from: payToken.symbol, to: receiveToken.symbol, spent: amount, got: gotAmount, pnl: pnlValue });
      setIsPending(false); setPayAmount(''); setActiveDex(null);
    }, 1800);
  };

  return (
    <div style={{ background: activeDex ? DEX_THEMES[activeDex].bg : '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', alignItems: 'center', zIndex: 10 }}>
          <div onClick={() => (ADMINS.includes(userName) || ADMINS.includes(userId)) && setShowAdmin(true)} style={{ color: '#0CF2B0', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>БАЛАНС</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px' }}>⚙️</button>
        </div>

        {/* MAIN UI */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {view === 'main' && !activeDex && (
            <>
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <h1 style={{ fontSize: '42px', margin: 0 }}>${balanceUSDC.toFixed(2)}</h1>
                <p style={{ opacity: 0.3, fontSize: '10px' }}>USDC WALLET</p>
              </div>

              {signal && (
                <div style={{ background: '#111', padding: '15px', borderRadius: '18px', marginBottom: '20px', borderLeft: '4px solid #0CF2B0' }}>
                  <div style={{ fontSize: '10px', color: '#0CF2B0', fontWeight: 'bold' }}>ТОРГОВАЯ СДЕЛКА</div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{signal.coin.symbol}: {signal.buyAt} → <span style={{color: '#0CF2B0'}}>{signal.sellAt}</span> (+{signal.profit}%)</div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                {Object.keys(DEX_THEMES).map(k => (
                  <button key={k} onClick={() => setActiveDex(k)} style={{ background: '#0a0a0a', border: `1px solid ${DEX_THEMES[k].color}33`, color: '#fff', padding: '22px 0', borderRadius: '20px', fontWeight: 'bold' }}>{DEX_THEMES[k].name}</button>
                ))}
              </div>

              {/* REAL LIVE TAPE */}
              <div style={{ background: '#080808', borderRadius: '22px', padding: '15px', border: '1px solid #111' }}>
                <div style={{ fontSize: '10px', opacity: 0.4, marginBottom: '12px', fontWeight: 'bold' }}>ЖИВАЯ ЛЕНТА СДЕЛОК</div>
                {globalTrades.map((t, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '8px 0', borderBottom: '1px solid #ffffff05' }}>
                    <span style={{ opacity: 0.7 }}>@{t.user}</span>
                    <span style={{ color: t.isProfit ? '#0CF2B0' : '#FF4B4B', fontWeight: 'bold' }}>{t.isProfit ? '+' : ''}{t.amount} USDC</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ADMIN PANEL */}
        {showAdmin && (
          <div style={{ position: 'fixed', inset: 0, background: '#050505', zIndex: 9999, padding: '20px', overflowY: 'auto' }}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom: 20}}>
              <h2 style={{color: '#0CF2B0'}}>ADMIN PANEL</h2>
              <button onClick={()=>setShowAdmin(false)} style={{background: '#222', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '10px'}}>CLOSE</button>
            </div>
            {Object.keys(allPlayers).map(pId => (
              <div key={pId} style={{background: '#111', padding: '15px', borderRadius: '15px', marginBottom: '10px', border: '1px solid #222'}}>
                <div style={{fontSize: '12px', color: '#0CF2B0'}}>User: @{allPlayers[pId].username || 'unknown'}</div>
                <div style={{fontSize: '10px', opacity: 0.4, marginBottom: 8}}>ID: {pId}</div>
                <div style={{display: 'flex', gap: 10}}>
                  <input 
                    type="number" 
                    defaultValue={allPlayers[pId].balanceUSDC} 
                    id={`inp-${pId}`}
                    style={{flex: 1, background: '#000', border: '1px solid #333', color: '#fff', padding: '8px', borderRadius: '8px'}}
                  />
                  <button 
                    onClick={() => {
                      const val = document.getElementById(`inp-${pId}`).value;
                      update(ref(db, `players/${pId}`), { balanceUSDC: Number(val) });
                      alert('Saved!');
                    }}
                    style={{background: '#0CF2B0', color: '#000', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold'}}
                  >SET</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SETTINGS */}
        {view === 'settings' && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, padding: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2>Настройки</h2>
              <button onClick={() => setView('main')} style={{ background: '#222', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '50%' }}>✕</button>
            </div>
            <button onClick={() => setLang(l => l === 'RU' ? 'EN' : 'RU')} style={{ width: '100%', padding: '20px', background: '#111', color: '#fff', borderRadius: '18px', marginBottom: '15px', border: '1px solid #333' }}>🌐 Язык: {lang}</button>
            <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', padding: '20px', background: '#111', color: '#fff', borderRadius: '18px', border: '1px solid #333' }}>👥 Создатели (@kriptoalians)</button>
          </div>
        )}

        {/* EXCHANGE (PREMIUM UI) */}
        {activeDex && (
          <div style={{ position: 'absolute', inset: 0, background: DEX_THEMES[activeDex].bg, zIndex: 100, padding: '20px' }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>←</button>
            <div style={{ textAlign: 'center', marginBottom: '30px', color: DEX_THEMES[activeDex].color, fontWeight: 'bold' }}>{DEX_THEMES[activeDex].name.toUpperCase()}</div>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '12px', opacity: 0.6 }}><span>Отдаете</span><span onClick={() => setPayAmount((payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0)).toString())} style={{color: DEX_THEMES[activeDex].color, cursor:'pointer'}}>МАКС</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px', width: '50%', outline: 'none' }} placeholder="0.0"/>
                <button onClick={() => setShowTokenList('pay')} style={{ background: '#111', padding: '10px 15px', borderRadius: '14px', color: '#fff', border: '1px solid #333' }}>{payToken.symbol} ▾</button>
              </div>
            </div>

            <div style={{textAlign:'center', margin:'-15px 0', position:'relative', zIndex:2}}><button onClick={()=>{const t=payToken; setPayToken(receiveToken); setReceiveToken(t);}} style={{background:'#000', border:`1px solid ${DEX_THEMES[activeDex].color}66`, color:'#fff', padding:'8px', borderRadius:'12px'}}>⇅</button></div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', marginTop: '5px' }}>
              <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '12px' }}>Получаете</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{fontSize: '32px', fontWeight: 'bold'}}>{payAmount ? ((payAmount * payToken.price) / receiveToken.price).toFixed(6) : '0.0'}</div>
                <button onClick={() => setShowTokenList('receive')} style={{ background: '#111', padding: '10px 15px', borderRadius: '14px', color: '#fff', border: '1px solid #333' }}>{receiveToken.symbol} ▾</button>
              </div>
            </div>
            
            <button onClick={handleSwap} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: '22px', borderRadius: '24px', marginTop: '25px', fontWeight: 'bold', border: 'none', fontSize: '18px' }}>Обменять</button>
          </div>
        )}

      </div>
    </div>
  );
}
