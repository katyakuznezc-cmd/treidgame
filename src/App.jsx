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
  UNISWAP: { name: 'Uniswap', color: '#FF007A', bg: 'radial-gradient(circle at top right, #3d0521, #000 65%)' },
  ODOS: { name: 'Odos', color: '#0CF2B0', bg: 'linear-gradient(180deg, #051a14 0%, #000 100%)' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: 'radial-gradient(circle at bottom left, #2d102e, #000 70%)' },
  '1INCH': { name: '1inch', color: '#31569c', bg: 'linear-gradient(135deg, #0a1320 0%, #000 100%)' }
};

const TRANSLATIONS = {
  RU: { balance: 'БАЛАНС', portfolio: 'ПОРТФЕЛЬ', settings: 'Настройки', lang: 'RU', manager: 'Связаться с менеджером', swap: 'Обменять', max: 'МАКС', signal: 'СИГНАЛ', admin: 'АДМИН' },
  EN: { balance: 'BALANCE', portfolio: 'PORTFOLIO', settings: 'Settings', lang: 'EN', manager: 'Contact Manager', swap: 'Swap Now', max: 'MAX', signal: 'SIGNAL', admin: 'ADMIN' }
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
  const userId = useMemo(() => {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
    return tg ? (tg.username || tg.id.toString()) : 'Player_' + Math.floor(Math.random()*999);
  }, []);

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
      setSignal({ coin, buyAt: dexes[0], sellAt: dexes[2], profit: (Math.random()*1.5+2.1).toFixed(2) });
    }
  }, [signal]);

  const updateOtherPlayer = (pId, newBal) => {
    set(ref(db, `players/${pId}/balanceUSDC`), Number(newBal));
  };

  const handleSwap = () => {
    const amount = Number(payAmount);
    const available = payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0);
    if (!amount || amount <= 0 || amount > available) return;

    let gotAmount = (amount * payToken.price) / receiveToken.price;
    let pnl = null;

    if (receiveToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
        gotAmount *= isCorrect ? (1 + signal.profit / 100) : 0.985;
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
    <div style={{ background: activeDex ? DEX_THEMES[activeDex].bg : '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', alignItems: 'center' }}>
          <div onClick={() => setShowAdmin(true)} style={{ color: '#0CF2B0', fontWeight: 'bold', fontSize: '13px' }}>{t.balance}</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px' }}>⚙️</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>
          {view === 'main' && !activeDex && (
            <>
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <h1 style={{ fontSize: '42px', margin: 0 }}>${balanceUSDC.toFixed(2)}</h1>
                <p style={{ opacity: 0.3, fontSize: '11px' }}>USDC</p>
              </div>

              <div onClick={() => window.open('https://t.me/vladstelin78')} style={{ background: '#111', padding: '15px', borderRadius: '18px', marginBottom: '15px', border: '1px solid #0CF2B044', textAlign: 'center' }}>
                <div style={{color: '#0CF2B0', fontWeight: 'bold', fontSize: '14px'}}>💎 {t.manager}</div>
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
                    <b>{wallet[c].toFixed(4)}</b>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {Object.keys(DEX_THEMES).map(k => (
                  <button key={k} onClick={() => setActiveDex(k)} style={{ background: '#111', border: `1px solid ${DEX_THEMES[k].color}44`, color: '#fff', padding: '20px 0', borderRadius: '18px', fontWeight: 'bold' }}>{DEX_THEMES[k].name}</button>
                ))}
              </div>
            </>
          )}
        </div>

        {activeDex && (
          <div style={{ position: 'absolute', inset: 0, background: DEX_THEMES[activeDex].bg, zIndex: 100, padding: '20px' }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>←</button>
            <h2 style={{ textAlign: 'center', color: DEX_THEMES[activeDex].color }}>{activeDex}</h2>
            
            <div style={{ marginTop: '20px', background: '#111', padding: '20px', borderRadius: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '10px' }}>
                <span>{t.pay}</span>
                <span onClick={() => setPayAmount((payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0)).toString())} style={{color: '#0CF2B0'}}>{t.max}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', width: '50%' }} placeholder="0.0"/>
                <button onClick={() => setShowTokenList('pay')} style={{ background: '#222', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px' }}>{payToken.symbol}</button>
              </div>
            </div>

            <button onClick={handleSwap} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: '18px', borderRadius: '18px', marginTop: '20px', fontWeight: 'bold', border: 'none' }}>{t.swap}</button>
          </div>
        )}

        {showAdmin && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 5000, padding: '20px', overflowY: 'auto' }}>
            <div style={{display:'flex', justifyContent:'space-between'}}><h2>{t.admin}</h2> <button onClick={()=>setShowAdmin(false)}>X</button></div>
            {Object.keys(allPlayers).map(pId => (
              <div key={pId} style={{background:'#111', padding:'10px', margin:'10px 0', borderRadius:'10px'}}>
                <div>ID: {pId}</div>
                <div>Bal: ${allPlayers[pId].balanceUSDC?.toFixed(2)}</div>
                <input type="number" placeholder="New Balance" onBlur={(e) => updateOtherPlayer(pId, e.target.value)} style={{width:'100%', marginTop:'5px'}} />
              </div>
            ))}
          </div>
        )}

        {view === 'settings' && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, padding: '20px' }}>
            <button onClick={() => setView('main')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>←</button>
            <button onClick={() => setLang(l => l === 'RU' ? 'EN' : 'RU')} style={{ width: '100%', padding: '15px', background: '#111', color: '#fff', borderRadius: '12px', marginTop: '20px' }}>{t.lang}</button>
          </div>
        )}

        {showTokenList && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, padding: '20px', overflowY: 'auto' }}>
             <button onClick={() => setShowTokenList(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>×</button>
             {Object.values(ASSETS).map(item => (
               <div key={item.symbol} onClick={() => { if(showTokenList === 'pay') setPayToken(item); else setReceiveToken(item); setShowTokenList(null); }} style={{ display: 'flex', gap: 10, padding: '15px', borderBottom: '1px solid #111' }}>
                  <img src={item.icon} width="20"/> {item.symbol}
               </div>
             ))}
          </div>
        )}

        {receipt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#111', width: '100%', borderRadius: '25px', padding: '25px', textAlign: 'center' }}>
              <h2>{receipt.pnl >= 0 ? '+$'+receipt.pnl.toFixed(2) : 'Success'}</h2>
              <button onClick={() => setReceipt(null)} style={{ width: '100%', background: '#fff', color: '#000', padding: '15px', borderRadius: '15px', border: 'none', marginTop: '20px' }}>OK</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
