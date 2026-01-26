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
  UNISWAP: { name: 'Uniswap', color: '#FF007A', bg: 'radial-gradient(circle at top right, #3d0521, #000 60%)' },
  ODOS: { name: 'Odos', color: '#0CF2B0', bg: 'linear-gradient(180deg, #051a14 0%, #000 100%)' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: 'radial-gradient(circle at bottom left, #2d102e, #000 70%)' },
  '1INCH': { name: '1inch', color: '#1B314F', bg: 'linear-gradient(135deg, #0a1320 0%, #000 100%)' }
};

const TRANSLATIONS = {
  RU: { balance: 'БАЛАНС', portfolio: 'ПОРТФЕЛЬ', settings: 'Настройки', lang: 'Язык: RU', manager: 'Связаться с менеджером', creators: 'Создатели', pay: 'Вы отдаете', get: 'Вы получаете', swap: 'Обменять', max: 'МАКС', empty: 'Пусто', signal: 'СИГНАЛ', tx: 'ТРАНЗАКЦИЯ...', success: 'Успешно', profit: 'ПРИБЫЛЬ', admin: 'АДМИН-МЕНЮ' },
  EN: { balance: 'BALANCE', portfolio: 'PORTFOLIO', settings: 'Settings', lang: 'Lang: EN', manager: 'Contact Manager', creators: 'Creators', pay: 'You Pay', get: 'You Receive', swap: 'Swap Now', max: 'MAX', empty: 'Empty', signal: 'SIGNAL', tx: 'TRANSACTION...', success: 'Success', profit: 'PROFIT', admin: 'ADMIN PANEL' }
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
  const [txStatus, setTxStatus] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [adminClicks, setAdminClicks] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);

  const [payToken, setPayToken] = useState(ASSETS.USDC);
  const [receiveToken, setReceiveToken] = useState(ASSETS.BTC);
  const [payAmount, setPayAmount] = useState('');
  const [showTokenList, setShowTokenList] = useState(null);

  const t = TRANSLATIONS[lang];
  const userId = useMemo(() => {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
    return tg ? (tg.username || tg.id.toString()) : 'User_' + Math.floor(Math.random()*99);
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
      setSignal({ coin, buyAt: dexes[0], sellAt: dexes[1], profit: (Math.random()*1.5+2.1).toFixed(2) });
    }
  }, [signal]);

  const handleAdmin = () => {
    setAdminClicks(prev => {
      if (prev + 1 >= 5) { setShowAdmin(true); return 0; }
      return prev + 1;
    });
  };

  const handleSwap = () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0 || amount > (payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0))) return;

    setTxStatus('step1');
    setTimeout(() => {
      setTxStatus('step2');
      setTimeout(() => {
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

        setBalanceUSDC(newBalanceUSDC);
        setWallet(newWallet);
        set(ref(db, 'players/' + userId), { balanceUSDC: newBalanceUSDC, wallet: newWallet, lastSeen: serverTimestamp() });
        setReceipt({ from: payToken.symbol, to: receiveToken.symbol, spent: amount, got: gotAmount, pnl });
        setTxStatus(null); setPayAmount(''); setActiveDex(null);
      }, 1200);
    }, 1000);
  };

  const currentBg = activeDex ? DEX_THEMES[activeDex].bg : '#000';

  return (
    <div style={{ background: currentBg, height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden', transition: 'all 0.5s ease' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', alignItems: 'center' }}>
          <div onClick={handleAdmin} style={{ color: '#0CF2B0', fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px' }}>{t.balance}</div>
          <button onClick={() => setView('settings')} style={{ background: '#ffffff11', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px' }}>⚙️</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>
          {view === 'main' && !activeDex && (
            <>
              <div style={{ textAlign: 'center', margin: '30px 0' }}>
                <h1 style={{ fontSize: '48px', margin: 0 }}>${balanceUSDC.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
                <p style={{ opacity: 0.3, fontSize: '12px' }}>DEPOSITED USDC</p>
              </div>

              {/* Manager Banner */}
              <div onClick={() => window.open('https://t.me/kriptoalians')} style={{ background: 'linear-gradient(45deg, #0CF2B022, #0CF2B011)', padding: '18px', borderRadius: '20px', marginBottom: '20px', border: '1px solid #0CF2B044', cursor: 'pointer' }}>
                <div style={{color: '#0CF2B0', fontWeight: 'bold', fontSize: '15px'}}>💎 {t.manager}</div>
                <div style={{fontSize: '11px', opacity: 0.6, marginTop: '4px'}}>Withdrawal & Official Support</div>
              </div>

              {signal && (
                <div style={{ background: '#111', padding: '15px', borderRadius: '15px', marginBottom: '20px', borderLeft: '4px solid #0CF2B0' }}>
                  <div style={{ fontSize: '10px', color: '#0CF2B0', fontWeight: 'bold' }}>{t.signal}</div>
                  <div style={{ fontWeight: 'bold', margin: '5px 0' }}>{signal.coin.symbol}: {signal.buyAt} → <span style={{color:'#0CF2B0'}}>{signal.sellAt}</span></div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Expected: +{signal.profit}%</div>
                </div>
              )}

              <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '20px', border: '1px solid #1a1a1a', marginBottom: '20px' }}>
                <p style={{ fontSize: '10px', opacity: 0.5, marginBottom: '10px' }}>{t.portfolio}</p>
                {Object.keys(wallet).filter(k => wallet[k] > 0.000001).map(c => (
                  <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #111', alignItems: 'center' }}>
                    <div style={{display:'flex', alignItems:'center', gap: 10}}><img src={ASSETS[c]?.icon} width="20" /> {c}</div>
                    <b>{wallet[c].toFixed(6)}</b>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {Object.keys(DEX_THEMES).map(k => (
                  <button key={k} onClick={() => setActiveDex(k)} style={{ background: '#ffffff08', border: `1px solid ${DEX_THEMES[k].color}33`, color: '#fff', padding: '28px 0', borderRadius: '22px', fontWeight: 'bold', fontSize: '16px' }}>{DEX_THEMES[k].name}</button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Swap Window */}
        {activeDex && (
          <div style={{ position: 'absolute', inset: 0, background: currentBg, zIndex: 100, padding: '20px', transition: 'background 0.5s ease' }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px' }}>←</button>
            <h2 style={{ textAlign: 'center', color: DEX_THEMES[activeDex].color, letterSpacing: '2px' }}>{activeDex}</h2>
            
            <div style={{ marginTop: '30px', background: '#ffffff11', padding: '24px', borderRadius: '28px', border: '1px solid #ffffff11' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px' }}>
                <span style={{opacity: 0.6}}>{t.pay}</span>
                <span onClick={() => setPayAmount((payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0)).toString())} style={{color: DEX_THEMES[activeDex].color, fontWeight: 'bold', cursor: 'pointer'}}>
                  {t.max}: {(payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0)).toFixed(4)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px', width: '60%', outline: 'none' }} placeholder="0.0"/>
                <button onClick={() => setShowTokenList('pay')} style={{ background: '#ffffff11', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
                   <img src={payToken.icon} width="20" /> {payToken.symbol} ▾
                </button>
              </div>
            </div>

            <div style={{ background: '#ffffff11', padding: '24px', borderRadius: '28px', border: '1px solid #ffffff11', marginTop: '10px' }}>
              <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '12px' }}>{t.get}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '32px', color: payAmount ? '#fff' : '#ffffff33' }}>
                   {payAmount ? ((payAmount * payToken.price) / receiveToken.price).toFixed(6) : '0.0'}
                </div>
                <button onClick={() => setShowTokenList('receive')} style={{ background: '#ffffff11', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
                   <img src={receiveToken.icon} width="20" /> {receiveToken.symbol} ▾
                </button>
              </div>
            </div>

            <button onClick={handleSwap} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: '22px', borderRadius: '24px', marginTop: '30px', fontWeight: 'bold', border: 'none', fontSize: '18px', boxShadow: `0 10px 20px ${DEX_THEMES[activeDex].color}33` }}>{t.swap}</button>
          </div>
        )}

        {/* Tx Overlays */}
        {txStatus && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #333', borderTopColor: '#0CF2B0', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '20px', fontWeight: 'bold' }}>{txStatus === 'step1' ? t.tx_sending : t.tx_confirm}</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Final Receipt */}
        {receipt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '25px' }}>
            <div style={{ background: '#111', width: '100%', borderRadius: '35px', padding: '35px', textAlign: 'center', border: '1px solid #222' }}>
              <h2 style={{ margin: '0 0 20px 0' }}>{t.success}</h2>
              <div style={{ background: '#000', padding: '20px', borderRadius: '20px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 15, fontSize: '20px' }}>
                  <b>{receipt.spent.toFixed(2)} {receipt.from}</b> → <b>{receipt.got.toFixed(4)} {receipt.to}</b>
                </div>
                {receipt.pnl !== null && (
                  <div style={{ marginTop: '15px', borderTop: '1px solid #111', paddingTop: '15px' }}>
                    <div style={{ fontSize: '12px', opacity: 0.5 }}>{t.profit}</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: receipt.pnl >= 0 ? '#0CF2B0' : '#FF4B4B' }}>
                      {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setReceipt(null)} style={{ width: '100%', background: '#fff', color: '#000', padding: '18px', borderRadius: '20px', fontWeight: 'bold', border: 'none' }}>{t.done}</button>
            </div>
          </div>
        )}

        {/* Admin Console */}
        {showAdmin && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 5000, padding: '30px' }}>
            <h2>{t.admin}</h2>
            <button onClick={() => { setBalanceUSDC(b => b + 1000); set(ref(db, 'players/'+userId+'/balanceUSDC'), balanceUSDC + 1000); }} style={{ width: '100%', padding: '20px', background: '#0CF2B0', color: '#000', borderRadius: '15px', marginBottom: '10px' }}>ADD $1000</button>
            <button onClick={() => { setBalanceUSDC(0); setWallet({}); set(ref(db, 'players/'+userId), {balanceUSDC: 0, wallet: {}}); }} style={{ width: '100%', padding: '20px', background: '#FF4B4B', color: '#fff', borderRadius: '15px', marginBottom: '10px' }}>RESET ALL</button>
            <button onClick={() => setShowAdmin(false)} style={{ width: '100%', padding: '20px', background: '#222', color: '#fff', borderRadius: '15px' }}>CLOSE</button>
          </div>
        )}

        {/* Settings */}
        {view === 'settings' && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, padding: '25px' }}>
            <button onClick={() => setView('main')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px' }}>←</button>
            <div style={{ marginTop: '40px' }}>
               <button onClick={() => setLang(l => l === 'RU' ? 'EN' : 'RU')} style={{ width: '100%', padding: '20px', background: '#111', color: '#fff', borderRadius: '18px', border: '1px solid #222', marginBottom: '15px', fontSize: '16px' }}>{t.lang}</button>
               <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', padding: '20px', background: '#111', color: '#fff', borderRadius: '18px', border: '1px solid #222', fontSize: '16px' }}>{t.creators}</button>
            </div>
          </div>
        )}

        {/* Token List */}
        {showTokenList && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, padding: '20px' }}>
             <button onClick={() => setShowTokenList(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px' }}>×</button>
             <div style={{ marginTop: '20px' }}>
               {Object.values(ASSETS).map(item => (
                 <div key={item.symbol} onClick={() => { if(showTokenList === 'pay') setPayToken(item); else setReceiveToken(item); setShowTokenList(null); setPayAmount(''); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '22px', borderBottom: '1px solid #111', alignItems: 'center' }}>
                    <div style={{display:'flex', alignItems:'center', gap: 14}}><img src={item.icon} width="30"/> <b>{item.symbol}</b></div>
                    <span style={{opacity: 0.5}}>${item.price.toLocaleString()}</span>
                 </div>
               ))}
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
