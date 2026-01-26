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
  LINK: { symbol: 'LINK', price: 18.2, icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg?v=024' }
};

const DEX_THEMES = {
  UNISWAP: { name: 'Uniswap', color: '#FF007A' },
  ODOS: { name: 'Odos', color: '#0CF2B0' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0' }
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
    return tg ? (tg.username || tg.id.toString()) : 'Player_' + Math.floor(Math.random()*99);
  }, []);

  // 1. Загрузка данных при старте
  useEffect(() => {
    onValue(ref(db, 'players/' + userId), (s) => {
      if (s.exists()) {
        const d = s.val();
        setBalanceUSDC(d.balanceUSDC ?? 1000);
        setWallet(d.wallet ?? {});
      }
    });
  }, [userId]);

  // 2. Генерация сигналов
  useEffect(() => {
    if (!signal) {
      const keys = ['BTC', 'ETH', 'LINK'];
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      const dexes = Object.keys(DEX_THEMES);
      setSignal({ coin, buyAt: dexes[0], sellAt: dexes[1], profit: (Math.random()*2+1.5).toFixed(2) });
    }
  }, [signal]);

  // 3. Динамический баланс для кнопки МАКС
  const currentAvailable = useMemo(() => {
    return payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0);
  }, [payToken, balanceUSDC, wallet]);

  const handleSwap = () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0 || amount > currentAvailable) return;

    setIsProcessing(true);
    
    // Рассчитываем новые значения
    let gotAmount = (amount * payToken.price) / receiveToken.price;
    if (receiveToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
        const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
        gotAmount *= isCorrect ? (1 + signal.profit / 100) : 0.985;
        if (isCorrect) setSignal(null);
    }

    const newBalanceUSDC = payToken.symbol === 'USDC' ? balanceUSDC - amount : (receiveToken.symbol === 'USDC' ? balanceUSDC + gotAmount : balanceUSDC);
    const newWallet = { ...wallet };
    
    // Списание токена
    if (payToken.symbol !== 'USDC') {
        newWallet[payToken.symbol] = (newWallet[payToken.symbol] || 0) - amount;
    }
    // Начисление токена
    if (receiveToken.symbol !== 'USDC') {
        newWallet[receiveToken.symbol] = (newWallet[receiveToken.symbol] || 0) + gotAmount;
    }

    // Сохранение (сначала локально, потом в базу)
    setBalanceUSDC(newBalanceUSDC);
    setWallet(newWallet);

    setTimeout(() => {
      set(ref(db, 'players/' + userId), {
        balanceUSDC: newBalanceUSDC,
        wallet: newWallet,
        lastSeen: serverTimestamp()
      }).then(() => {
        setReceipt({ from: payToken.symbol, to: receiveToken.symbol, spent: amount, got: gotAmount });
        setIsProcessing(false); setPayAmount(''); setActiveDex(null);
      });
    }, 1000);
  };

  return (
    <div style={{ background: '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px' }}>
          <div style={{ color: '#0CF2B0', fontWeight: 'bold' }}>DEX APP</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px' }}>⚙️</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {view === 'main' && !activeDex && (
            <>
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <h1 style={{ fontSize: '42px', margin: 0 }}>${balanceUSDC.toFixed(2)}</h1>
                <p style={{ opacity: 0.3 }}>USDC Balance</p>
              </div>

              <div onClick={() => window.open('https://t.me/kriptoalians')} style={{ background: '#0CF2B022', padding: '15px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #0CF2B044' }}>
                <div style={{color: '#0CF2B0', fontWeight: 'bold'}}>💎 {t.manager}</div>
                <div style={{fontSize: 11}}>Support Channel</div>
              </div>

              <div style={{ background: '#111', padding: '15px', borderRadius: '15px', marginBottom: '20px' }}>
                <p style={{ fontSize: '10px', opacity: 0.5, margin: '0 0 10px 0' }}>{t.portfolio}</p>
                {Object.keys(wallet).filter(k => wallet[k] > 0.000001).map(c => (
                  <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span>{c}</span><b>{wallet[c].toFixed(6)}</b>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {Object.keys(DEX_THEMES).map(k => (
                  <button key={k} onClick={() => setActiveDex(k)} style={{ background: '#111', border: `1px solid ${DEX_THEMES[k].color}44`, color: '#fff', padding: '20px 0', borderRadius: '15px', fontWeight: 'bold' }}>{DEX_THEMES[k].name}</button>
                ))}
              </div>
            </>
          )}
        </div>

        {activeDex && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, padding: '20px' }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>←</button>
            <h2 style={{ textAlign: 'center', color: DEX_THEMES[activeDex].color }}>{activeDex}</h2>
            
            <div style={{ background: '#111', padding: '20px', borderRadius: '20px', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '10px' }}>
                <span>{t.pay}</span>
                <span onClick={() => setPayAmount(currentAvailable.toString())} style={{color: '#0CF2B0', fontWeight: 'bold'}}>
                   {t.max}: {currentAvailable.toFixed(6)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', width: '60%' }} placeholder="0.0"/>
                <button onClick={() => setShowTokenList('pay')} style={{ background: '#222', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '10px' }}>{payToken.symbol} ▾</button>
              </div>
            </div>

            <div style={{ background: '#111', padding: '20px', borderRadius: '20px', marginTop: '10px' }}>
              <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '10px' }}>{t.get}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '24px' }}>{payAmount ? ((payAmount * payToken.price) / receiveToken.price).toFixed(6) : '0.0'}</div>
                <button onClick={() => setShowTokenList('receive')} style={{ background: '#222', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '10px' }}>{receiveToken.symbol} ▾</button>
              </div>
            </div>

            <button onClick={handleSwap} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: '18px', borderRadius: '15px', marginTop: '20px', fontWeight: 'bold', border: 'none' }}>{t.swap}</button>
          </div>
        )}

        {view === 'settings' && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, padding: '20px' }}>
            <button onClick={() => setView('main')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>←</button>
            <div style={{ marginTop: '20px' }}>
               <div style={{ background: '#111', padding: '20px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>{t.lang}</span>
                  <b onClick={() => setLang(l => l === 'RU' ? 'EN' : 'RU')} style={{color: '#0CF2B0'}}>{lang}</b>
               </div>
               <div onClick={() => window.open('https://t.me/kriptoalians')} style={{ background: '#111', padding: '20px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t.creators}</span>
                  <span style={{color: '#0CF2B0'}}>@kriptoalians</span>
               </div>
            </div>
          </div>
        )}

        {showTokenList && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, padding: '20px' }}>
             <button onClick={() => setShowTokenList(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>×</button>
             {Object.values(ASSETS).map(item => (
               <div key={item.symbol} onClick={() => { if(showTokenList === 'pay') setPayToken(item); else setReceiveToken(item); setShowTokenList(null); }} style={{ display: 'flex', padding: '20px', borderBottom: '1px solid #111' }}>
                  <b>{item.symbol}</b>
               </div>
             ))}
          </div>
        )}

        {receipt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#111', padding: '30px', borderRadius: '30px', textAlign: 'center', width: '100%' }}>
              <h2>Success</h2>
              <p>{receipt.spent} {receipt.from} → {receipt.got.toFixed(6)} {receipt.to}</p>
              <button onClick={() => setReceipt(null)} style={{ background: '#fff', color: '#000', padding: '15px', borderRadius: '15px', width: '100%', border: 'none' }}>CLOSE</button>
            </div>
          </div>
        )}

        {isProcessing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>SWAPPING...</div>}
      </div>
    </div>
  );
}
