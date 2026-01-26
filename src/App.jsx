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
  RU: { balance: "ТЕКУЩИЙ БАЛАНС", wallet: "USDC WALLET", deal: "SMART SIGNAL", history: "АКТИВНОСТЬ СЕТИ", settings: "Настройки", lang: "Язык", creators: "Создатели", give: "Отдаете", get: "Получаете", swap: "Подтвердить обмен", pending: "Выполнение...", success: "ПРИБЫЛЬ", failed: "УБЫТОК", close: "ВЕРНУТЬСЯ", max: "МАКС" },
  EN: { balance: "TOTAL BALANCE", wallet: "USDC WALLET", deal: "SMART SIGNAL", history: "NETWORK ACTIVITY", settings: "Settings", lang: "Language", creators: "Creators", give: "Give", get: "Receive", swap: "Confirm Swap", pending: "Processing...", success: "PROFIT", failed: "LOSS", close: "GO BACK", max: "MAX" }
};

const DEX_THEMES = {
  UNISWAP: { name: 'Uniswap V3', color: '#FF007A', bg: 'radial-gradient(circle at 50% 0%, rgba(255, 0, 122, 0.25), #000 80%)' },
  ODOS: { name: 'Odos Router', color: '#0CF2B0', bg: 'linear-gradient(180deg, rgba(12, 242, 176, 0.1) 0%, #000 100%)' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0', bg: 'radial-gradient(circle at 0% 0%, rgba(250, 82, 160, 0.2), #000 70%)' },
  '1INCH': { name: '1inch Network', color: '#31569c', bg: 'linear-gradient(135deg, rgba(49, 86, 156, 0.2) 0%, #000 100%)' }
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
  const userId = useMemo(() => tgData?.id?.toString() || 'User_Sim', [tgData]);
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
      if (s.exists()) setGlobalTrades(Object.values(s.val()).reverse().slice(0, 4));
    });
  }, [userId]);

  useEffect(() => {
    if (!signal) {
      const keys = ['BTC', 'ETH', 'LINK', 'AAVE', 'CRV', 'WPOL'];
      const randomCoin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      setSignal({ coin: randomCoin, buyAt: 'UNISWAP', sellAt: 'ODOS', profit: (Math.random()*0.8 + 2.2).toFixed(2) });
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
        gotAmount *= isCorrect ? (1 + signal.profit / 100) : (1 - (Math.random() * 0.012));
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
    }, 1200);
  };

  return (
    <div style={{ background: '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: '-apple-system, sans-serif', overflow: 'hidden', position: 'relative' }}>
      
      {/* --- ЭФФЕКТЫ ФОНА --- */}
      <div style={{ position: 'absolute', top: '-10%', left: '-20%', width: '70%', height: '70%', background: 'radial-gradient(circle, rgba(12, 242, 176, 0.1) 0%, transparent 70%)', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-20%', width: '70%', height: '70%', background: 'radial-gradient(circle, rgba(255, 0, 122, 0.08) 0%, transparent 70%)', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', top: '30%', left: '10%', width: '100px', height: '100px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', filter: 'blur(40px)', animation: 'float 8s infinite ease-in-out' }}></div>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '500px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '25px', alignItems: 'center' }}>
          <div onClick={() => setShowAdmin(true)} style={{ color: '#0CF2B0', fontWeight: '800', fontSize: '12px', letterSpacing: '1.5px', cursor: 'pointer' }}>{t.balance}</div>
          <button onClick={() => setView('settings')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', width: '42px', height: '42px', borderRadius: '14px', backdropFilter: 'blur(10px)' }}>⚙️</button>
        </div>

        <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto' }}>
          {/* BALANCE */}
          <div style={{ textAlign: 'center', margin: '30px 0 50px 0' }}>
            <h1 style={{ fontSize: '58px', margin: 0, fontWeight: '900', background: 'linear-gradient(180deg, #FFFFFF 0%, #A0A0A0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ${balanceUSDC.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </h1>
            <p style={{ opacity: 0.4, fontSize: '11px', letterSpacing: '3px', marginTop: 10 }}>{t.wallet}</p>
          </div>

          {/* SIGNAL CARD (Glassmorphism) */}
          {signal && (
            <div style={{ 
              background: 'rgba(12, 242, 176, 0.04)', 
              padding: '20px', 
              borderRadius: '26px', 
              marginBottom: '30px', 
              border: '1px solid rgba(12, 242, 176, 0.15)', 
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ fontSize: '10px', color: '#0CF2B0', fontWeight: 'bold', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, background: '#0CF2B0', borderRadius: '50%', boxShadow: '0 0 10px #0CF2B0' }}></span>
                {t.deal}
              </div>
              <div style={{ fontWeight: '800', fontSize: '17px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{signal.coin.symbol} <span style={{opacity: 0.3, fontWeight: '300'}}>→</span> {signal.sellAt}</span>
                <span style={{ color: '#0CF2B0' }}>+{signal.profit}%</span>
              </div>
            </div>
          )}

          {/* DEX GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '35px' }}>
            {Object.keys(DEX_THEMES).map(k => (
              <button key={k} onClick={() => setActiveDex(k)} style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: `1px solid ${DEX_THEMES[k].color}33`, 
                color: '#fff', 
                padding: '28px 0', 
                borderRadius: '26px', 
                fontWeight: '800', 
                fontSize: '14px',
                backdropFilter: 'blur(12px)',
                transition: 'transform 0.2s'
              }} onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.96)'} onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                {DEX_THEMES[k].name}
              </button>
            ))}
          </div>

          {/* FEED */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '28px', padding: '22px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '10px', opacity: 0.3, marginBottom: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>{t.history}</div>
            {globalTrades.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <span style={{opacity: 0.6}}>@{item.user}</span>
                <span style={{ color: item.isProfit ? '#0CF2B0' : '#FF4B4B', fontWeight: '800' }}>{item.isProfit ? '+' : ''}{item.amount} USDC</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- DEX OVERLAY --- */}
      {activeDex && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', backgroundImage: DEX_THEMES[activeDex].bg, zIndex: 1000, padding: '25px', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease-out' }}>
          <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px', width: '40px' }}>←</button>
          <h2 style={{ textAlign: 'center', color: DEX_THEMES[activeDex].color, fontWeight: '900', letterSpacing: '1px' }}>{DEX_THEMES[activeDex].name}</h2>
          
          <div style={{ background: 'rgba(255,255,255,0.06)', padding: '25px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)', marginTop: 30 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 15, opacity: 0.5 }}><span>{t.give}</span><span onClick={() => setPayAmount((payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0)).toString())} style={{color: DEX_THEMES[activeDex].color, fontWeight:'bold'}}>{t.max}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '38px', width: '60%', outline: 'none', fontWeight: '800' }} placeholder="0.0"/>
              <button onClick={() => setShowTokenList('pay')} style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '18px', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={payToken.icon} width="22"/> {payToken.symbol}
              </button>
            </div>
          </div>

          <div style={{textAlign:'center', margin:'-18px 0', zIndex: 1001}}><button onClick={()=>{const temp=payToken; setPayToken(receiveToken); setReceiveToken(temp);}} style={{background:'#000', border:`1px solid ${DEX_THEMES[activeDex].color}`, color:'#fff', padding: '12px', borderRadius:'18px', boxShadow: `0 0 15px ${DEX_THEMES[activeDex].color}33`}}>⇅</button></div>

          <div style={{ background: 'rgba(255,255,255,0.06)', padding: '25px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)', marginTop: 5 }}>
            <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: 15 }}>{t.get}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{fontSize: '38px', fontWeight: '800'}}>{payAmount ? ((payAmount * payToken.price) / receiveToken.price).toFixed(6) : '0.0'}</div>
              <button onClick={() => setShowTokenList('receive')} style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '18px', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={receiveToken.icon} width="22"/> {receiveToken.symbol}
              </button>
            </div>
          </div>

          <button onClick={handleSwap} disabled={isPending} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: '24px', borderRadius: '28px', marginTop: 'auto', marginBottom: 20, fontWeight: '900', fontSize: '18px', border: 'none', boxShadow: `0 15px 40px ${DEX_THEMES[activeDex].color}55` }}>
            {isPending ? t.pending : t.swap}
          </button>
        </div>
      )}

      {/* --- CSS ANIMATIONS --- */}
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-20px) translateX(10px); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>

    </div>
  );
}
