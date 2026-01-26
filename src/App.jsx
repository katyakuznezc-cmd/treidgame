import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, push, update } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCKmEa1B4xOdMdNGXBDK2LeOhBQoMqWv40",
  authDomain: "treidgame-b2ae0.firebaseapp.com",
  projectId: "treidgame-b2ae0",
  storageBucket: "treidgame-b2ae0.firebasestorage.app",
  messagingSenderId: "985305772375",
  appId: "1:985305772375:web:08d9b482a6f9d3cd748e12"
};

// --- ТОЛЬКО ТВОИ ТОКЕНЫ ---
const ASSETS = {
  USDC: { symbol: 'USDC', price: 1, icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=024' },
  BTC: { symbol: 'BTC', price: 65000, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=024' },
  ETH: { symbol: 'ETH', price: 2600, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=024' },
  LINK: { symbol: 'LINK', price: 18.2, icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg?v=024' },
  AAVE: { symbol: 'AAVE', price: 145.5, icon: 'https://cryptologos.cc/logos/aave-aave-logo.svg?v=024' },
  CRV: { symbol: 'CRV', price: 0.35, icon: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.svg?v=024' },
  WPOL: { symbol: 'WPOL', price: 0.55, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg?v=024' }
};

const TEXTS = {
  RU: { balance: "БАЛАНС", wallet: "USDC КОШЕЛЕК", deal: "АКТИВНЫЙ СИГНАЛ", history: "ЖИВАЯ ЛЕНТА", settings: "Настройки", lang: "Язык", creators: "Создатели", give: "Вы отдаете", get: "Вы получаете", gas: "Газ", slippage: "Проскальзывание", route: "Маршрут", swap: "Обменять", pending: "Транзакция...", success: "УСПЕХ", failed: "СДЕЛКА", txDone: "Транзакция выполнена", close: "ЗАКРЫТЬ", max: "МАКС" },
  EN: { balance: "BALANCE", wallet: "USDC WALLET", deal: "ACTIVE SIGNAL", history: "LIVE FEED", settings: "Settings", lang: "Language", creators: "Creators", give: "You give", get: "You receive", gas: "Gas", slippage: "Slippage", route: "Route", swap: "Swap", pending: "Processing...", success: "SUCCESS", failed: "TRADE", txDone: "Transaction completed", close: "CLOSE", max: "MAX" }
};

const DEX_THEMES = {
  UNISWAP: { name: 'Uniswap V3', color: '#FF007A', bg: 'radial-gradient(circle at 50% -20%, rgba(255, 0, 122, 0.4), #000 85%)' },
  ODOS: { name: 'Odos Router', color: '#0CF2B0', bg: 'linear-gradient(180deg, rgba(12, 242, 176, 0.15) 0%, #000 100%)' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: 'radial-gradient(circle at 0% 0%, rgba(250, 82, 160, 0.3), #000 75%)' },
  '1INCH': { name: '1inch Network', color: '#31569c', bg: 'linear-gradient(135deg, rgba(49, 86, 156, 0.25) 0%, #000 100%)' }
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

  const t = TEXTS[lang];
  const tgData = useMemo(() => window.Telegram?.WebApp?.initDataUnsafe?.user, []);
  const userId = useMemo(() => tgData?.id?.toString() || 'Guest_' + Math.floor(Math.random()*99), [tgData]);
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
      if (s.exists()) setGlobalTrades(Object.values(s.val()).reverse().slice(0, 5));
    });
  }, [userId]);

  useEffect(() => {
    if (!signal) {
      const keys = ['BTC', 'ETH', 'LINK', 'AAVE', 'CRV', 'WPOL'];
      const randomCoin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      setSignal({ coin: randomCoin, buyAt: 'UNISWAP', sellAt: 'ODOS', profit: (Math.random()*1 + 2.1).toFixed(2) });
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

      update(ref(db, 'players/' + userId), { balanceUSDC: newBalanceUSDC, wallet: newWallet, username: userName });
      if (pnlValue !== null) {
        push(ref(db, 'globalTrades/'), { user: userName, amount: pnlValue.toFixed(2), isProfit: pnlValue >= 0 });
      }

      setReceipt({ from: payToken.symbol, to: receiveToken.symbol, spent: amount, got: gotAmount, pnl: pnlValue });
      setIsPending(false); setPayAmount('');
    }, 1500);
  };

  return (
    <div style={{ background: '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden', position: 'relative' }}>
      
      {/* --- ГЛАВНЫЙ ЭКРАН --- */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '500px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', alignItems: 'center' }}>
          <div onClick={() => (ADMINS.includes(userName) || ADMINS.includes(userId)) && setShowAdmin(true)} style={{ color: '#0CF2B0', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', textShadow: '0 0 10px rgba(12,242,176,0.3)' }}>{t.balance}</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: '1px solid #222', color: '#fff', padding: '10px', borderRadius: '12px' }}>⚙️</button>
        </div>

        <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto' }}>
          <div style={{ textAlign: 'center', margin: '40px 0' }}>
            <h1 style={{ fontSize: '52px', margin: 0, fontWeight: '900' }}>${balanceUSDC.toFixed(2)}</h1>
            <p style={{ opacity: 0.3, fontSize: '10px', letterSpacing: '2px' }}>{t.wallet}</p>
          </div>

          {signal && (
            <div style={{ background: 'rgba(12, 242, 176, 0.05)', padding: '18px', borderRadius: '22px', marginBottom: '25px', border: '1px solid rgba(12, 242, 176, 0.2)', boxShadow: '0 0 15px rgba(12,242,176,0.1)' }}>
              <div style={{ fontSize: '10px', color: '#0CF2B0', fontWeight: 'bold', marginBottom: 5 }}>{t.deal}</div>
              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{signal.coin.symbol}: {signal.buyAt} → <span style={{color: '#0CF2B0'}}>{signal.sellAt}</span> (+{signal.profit}%)</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
            {Object.keys(DEX_THEMES).map(k => (
              <button key={k} onClick={() => setActiveDex(k)} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${DEX_THEMES[k].color}44`, color: '#fff', padding: '25px 0', borderRadius: '22px', fontWeight: 'bold', backdropFilter: 'blur(10px)' }}>{DEX_THEMES[k].name}</button>
            ))}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '25px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '10px', opacity: 0.4, marginBottom: '15px', fontWeight: 'bold' }}>{t.history}</div>
            {globalTrades.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <span style={{opacity: 0.7}}>@{item.user}</span>
                <span style={{ color: item.isProfit ? '#0CF2B0' : '#FF4B4B', fontWeight: 'bold' }}>{item.isProfit ? '+' : ''}{item.amount} USDC</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- БИРЖА --- */}
      {activeDex && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', backgroundImage: DEX_THEMES[activeDex].bg, zIndex: 1000, padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>←</button>
          <h2 style={{ textAlign: 'center', color: DEX_THEMES[activeDex].color }}>{DEX_THEMES[activeDex].name}</h2>
          
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '25px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.1)', marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: 12, opacity: 0.5 }}><span>{t.give}</span><span onClick={() => setPayAmount((payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0)).toString())} style={{color: DEX_THEMES[activeDex].color, fontWeight:'bold', cursor:'pointer'}}>{t.max}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '34px', width: '60%', outline: 'none' }} placeholder="0.0"/>
              <button onClick={() => setShowTokenList('pay')} style={{ background: '#111', padding: '12px 18px', borderRadius: '15px', color: '#fff', border: '1px solid #333' }}>{payToken.symbol} ▾</button>
            </div>
          </div>

          <div style={{textAlign:'center', margin:'-15px 0', zIndex: 1001}}><button onClick={()=>{const temp=payToken; setPayToken(receiveToken); setReceiveToken(temp);}} style={{background:'#000', border:`1px solid ${DEX_THEMES[activeDex].color}`, color:'#fff', padding:'10px', borderRadius:'15px'}}>⇅</button></div>

          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '25px', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.1)', marginTop: 5 }}>
            <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: 12 }}>{t.get}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{fontSize: '34px', fontWeight: 'bold'}}>{payAmount ? ((payAmount * payToken.price) / receiveToken.price).toFixed(6) : '0.0'}</div>
              <button onClick={() => setShowTokenList('receive')} style={{ background: '#111', padding: '12px 18px', borderRadius: '15px', color: '#fff', border: '1px solid #333' }}>{receiveToken.symbol} ▾</button>
            </div>
          </div>

          <div style={{marginTop: 20, padding: '20px', borderRadius: '22px', background: 'rgba(0,0,0,0.3)', fontSize: '12px', border: '1px solid rgba(255,255,255,0.05)'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom: 10}}><span style={{opacity: 0.5}}>{t.gas}:</span><span style={{color: '#0CF2B0'}}>$0.14</span></div>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom: 10}}><span style={{opacity: 0.5}}>{t.slippage}:</span><span>0.5%</span></div>
              <div style={{display:'flex', justifyContent:'space-between'}}><span style={{opacity: 0.5}}>{t.route}:</span><span style={{color: DEX_THEMES[activeDex].color}}>{payToken.symbol} → {receiveToken.symbol}</span></div>
          </div>
          
          <button onClick={handleSwap} disabled={isPending} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: '22px', borderRadius: '25px', marginTop: 'auto', marginBottom: 20, fontWeight: 'bold', fontSize: '18px', border: 'none', boxShadow: `0 10px 30px ${DEX_THEMES[activeDex].color}44` }}>
            {isPending ? t.pending : t.swap}
          </button>
        </div>
      )}

      {/* --- НАСТРОЙКИ --- */}
      {view === 'settings' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 2000, padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <h2 style={{margin: 0}}>{t.settings}</h2>
            <button onClick={() => setView('main')} style={{ background: '#222', border: 'none', color: '#fff', width: '45px', height: '45px', borderRadius: '50%' }}>✕</button>
          </div>
          <button onClick={() => setLang(l => l === 'RU' ? 'EN' : 'RU')} style={{ width: '100%', padding: '22px', background: '#111', color: '#fff', borderRadius: '20px', marginBottom: '15px', border: '1px solid #333', textAlign: 'left', fontWeight: 'bold' }}>🌐 {t.lang}: {lang}</button>
          <button onClick={() => window.open('https://t.me/kriptoalians')} style={{ width: '100%', padding: '22px', background: '#111', color: '#fff', borderRadius: '20px', border: '1px solid #333', textAlign: 'left', fontWeight: 'bold' }}>👥 {t.creators}: @kriptoalians</button>
        </div>
      )}

      {/* --- СПИСОК ТОКЕНОВ --- */}
      {showTokenList && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 3000, padding: '20px', overflowY: 'auto' }}>
           <button onClick={() => setShowTokenList(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '35px', marginBottom: 20 }}>×</button>
           {Object.values(ASSETS).map(item => (
             <div key={item.symbol} onClick={() => { if(showTokenList === 'pay') setPayToken(item); else setReceiveToken(item); setShowTokenList(null); }} style={{ display: 'flex', gap: 15, padding: '20px', borderBottom: '1px solid #111', alignItems: 'center' }}>
                <img src={item.icon} width="32"/>
                <div style={{flex: 1}}><b>{item.symbol}</b></div>
                <div style={{opacity: 0.5, fontSize: '13px'}}>${item.price}</div>
             </div>
           ))}
        </div>
      )}

      {/* --- ЧЕК --- */}
      {receipt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#111', width: '100%', maxWidth: '350px', borderRadius: '35px', padding: '35px', textAlign: 'center', border: '1px solid #222' }}>
            <div style={{ fontSize: '50px', marginBottom: '10px' }}>{receipt.pnl >= 0 ? '✅' : '📉'}</div>
            <h2>{receipt.pnl >= 0 ? t.success : t.failed}</h2>
            <div style={{ background: receipt.pnl >= 0 ? 'rgba(12, 242, 176, 0.1)' : 'rgba(255, 75, 75, 0.1)', padding: '15px', borderRadius: '15px', color: receipt.pnl >= 0 ? '#0CF2B0' : '#FF4B4B', fontWeight: 'bold', marginBottom: '25px', fontSize: '20px' }}>
              {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
            </div>
            <button onClick={() => { setReceipt(null); setActiveDex(null); }} style={{ width: '100%', background: '#fff', color: '#000', padding: '18px', borderRadius: '15px', fontWeight: 'bold', border: 'none' }}>{t.close}</button>
          </div>
        </div>
      )}
    </div>
  );
}
