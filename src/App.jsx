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
  UNISWAP: { name: 'Uniswap', color: '#FF007A', bg: 'radial-gradient(circle at 50% -20%, #ff007a44, #000 85%)' },
  ODOS: { name: 'Odos', color: '#0CF2B0', bg: 'linear-gradient(180deg, #0cf2b015 0%, #000 100%)' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: 'radial-gradient(circle at 0% 0%, #fa52a025, #000 75%)' },
  '1INCH': { name: '1inch', color: '#31569c', bg: 'linear-gradient(135deg, #31569c25 0%, #000 100%)' }
};

const TRANSLATIONS = {
  RU: { balance: 'БАЛАНС', portfolio: 'ПОРТФЕЛЬ', settings: 'Настройки', lang: 'Язык: RU', manager: 'Менеджер', swap: 'Обменять', max: 'МАКС', pay: 'Отдаете', get: 'Получаете', signal: 'ТОРГОВАЯ СДЕЛКА', admin: 'АДМИН', live: 'ЖИВАЯ ЛЕНТА СДЕЛОК', creators: 'Создатели', back: 'Закрыть' },
  EN: { balance: 'BALANCE', portfolio: 'PORTFOLIO', settings: 'Settings', lang: 'Lang: EN', manager: 'Support', swap: 'Swap Now', max: 'MAX', pay: 'Pay', get: 'Receive', signal: 'TRADE DEAL', admin: 'ADMIN', live: 'LIVE TRADE TAPE', creators: 'Creators', back: 'Close' }
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

  // Генератор живой ленты
  useEffect(() => {
    const traders = ['CryptoVitya', 'MoonBoy', 'Whale13', 'FastSwap', 'DeFi_Shark', 'RichPasha'];
    const interval = setInterval(() => {
      const trader = traders[Math.floor(Math.random() * traders.length)];
      const amount = (Math.random() * 150 + 10).toFixed(2);
      const isProfit = Math.random() > 0.4;
      const newEvent = { trader, amount, isProfit, id: Date.now() };
      setLiveEvents(prev => [newEvent, ...prev].slice(0, 4));
    }, 4500);
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
    }, 1500);
  };

  return (
    <div style={{ background: activeDex ? DEX_THEMES[activeDex].bg : '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden', position: 'relative' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', alignItems: 'center', zIndex: 10 }}>
          <div onClick={() => (ADMINS.includes(userId) || userId.startsWith('Trader')) && setShowAdmin(true)} style={{ color: '#0CF2B0', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>{t.balance}</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px', fontSize: '18px' }}>⚙️</button>
        </div>

        {/* MAIN VIEW */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {view === 'main' && !activeDex && (
            <>
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <h1 style={{ fontSize: '42px', margin: 0 }}>${balanceUSDC.toFixed(2)}</h1>
                <p style={{ opacity: 0.3, fontSize: '11px' }}>USDC</p>
              </div>

              {signal && (
                <div style={{ background: '#111', padding: '15px', borderRadius: '18px', marginBottom: '15px', borderLeft: '4px solid #0CF2B0' }}>
                  <div style={{ fontSize: '10px', color: '#0CF2B0', fontWeight: 'bold' }}>{t.signal}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{signal.coin.symbol}: {signal.buyAt} → {signal.sellAt} (+{signal.profit}%)</div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {Object.keys(DEX_THEMES).map(k => (
                  <button key={k} onClick={() => setActiveDex(k)} style={{ background: '#0a0a0a', border: `1px solid ${DEX_THEMES[k].color}44`, color: '#fff', padding: '20px 0', borderRadius: '18px', fontWeight: 'bold' }}>{DEX_THEMES[k].name}</button>
                ))}
              </div>

              {/* LIVE TAPE */}
              <div style={{ background: '#080808', borderRadius: '20px', padding: '15px', border: '1px solid #111' }}>
                <div style={{ fontSize: '10px', opacity: 0.4, marginBottom: '10px', fontWeight: 'bold' }}>{t.live}</div>
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

        {/* SETTINGS MODAL (FIXED) */}
        {view === 'settings' && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, padding: '25px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ margin: 0 }}>{t.settings}</h2>
              <button onClick={() => setView('main')} style={{ background: '#222', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', fontSize: '20px' }}>✕</button>
            </div>
            
            <button onClick={() => setLang(l => l === 'RU' ? 'EN' : 'RU')} style={{ width: '100%', padding: '20px', background: '#111', color: '#fff', borderRadius: '18px', marginBottom: '15px', border: '1px solid #333', textAlign: 'left', fontWeight: 'bold' }}>
              🌐 {t.lang}
            </button>
            
            <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', padding: '20px', background: '#111', color: '#fff', borderRadius: '18px', border: '1px solid #333', textAlign: 'left', fontWeight: 'bold' }}>
              👥 {t.creators} (@kriptoalians)
            </button>

            <div style={{ marginTop: 'auto', textAlign: 'center', opacity: 0.2, fontSize: '12px' }}>v2.4.0 Live Trade Update</div>
          </div>
        )}

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

        {/* LOADING & RECEIPTS */}
        {isPending && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #222', borderTopColor: '#0CF2B0', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {receipt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#111', width: '100%', borderRadius: '35px', padding: '30px', textAlign: 'center', border: '1px solid #222' }}>
              <h2 style={{margin: 0}}>{receipt.pnl >= 0 ? '🤑 PROFIT' : '✅ DONE'}</h2>
              <div style={{margin: '20px 0', fontSize: '16px', opacity: 0.6}}>
                {receipt.spent.toFixed(2)} {receipt.from} → {receipt.got.toFixed(4)} {receipt.to}
              </div>
              {receipt.pnl !== null && (
                <div style={{fontSize: '32px', fontWeight: 'bold', color: receipt.pnl >= 0 ? '#0CF2B0' : '#FF4B4B'}}>
                  {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
                </div>
              )}
              <button onClick={() => setReceipt(null)} style={{ width: '100%', background: '#fff', color: '#000', padding: '18px', borderRadius: '15px', border: 'none', marginTop: '25px', fontWeight: 'bold' }}>OK</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
