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
  UNISWAP: { name: 'Uniswap', color: '#FF007A' },
  ODOS: { name: 'Odos', color: '#0CF2B0' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0' },
  '1INCH': { name: '1inch', color: '#1B314F' }
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  const [balanceUSDC, setBalanceUSDC] = useState(1000.0);
  const [wallet, setWallet] = useState({});
  const [view, setView] = useState('main'); 
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [txStatus, setTxStatus] = useState(null); // 'sending', 'confirming', null
  const [receipt, setReceipt] = useState(null);
  
  const [payToken, setPayToken] = useState(ASSETS.USDC);
  const [receiveToken, setReceiveToken] = useState(ASSETS.BTC);
  const [payAmount, setPayAmount] = useState('');
  const [showTokenList, setShowTokenList] = useState(null);

  const userId = useMemo(() => {
    const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
    return tg ? (tg.username || tg.id.toString()) : 'Trader_' + Math.floor(Math.random()*999);
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
      setSignal({ coin, buyAt: dexes[0], sellAt: dexes[1], profit: (Math.random()*1.2+2.1).toFixed(2) });
    }
  }, [signal]);

  const currentAvailable = useMemo(() => {
    return payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0);
  }, [payToken, balanceUSDC, wallet]);

  const handleSwap = () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0 || amount > currentAvailable) return;

    setTxStatus('sending');
    
    setTimeout(() => {
      setTxStatus('confirming');
      
      setTimeout(() => {
        let gotAmount = (amount * payToken.price) / receiveToken.price;
        let pnl = null;

        if (receiveToken.symbol === 'USDC' && payToken.symbol !== 'USDC') {
            const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
            const multiplier = isCorrect ? (1 + signal.profit / 100) : 0.985;
            const originalVal = (amount * payToken.price);
            gotAmount = gotAmount * multiplier;
            pnl = gotAmount - originalVal;
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
        if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }, 1500);
    }, 1000);
  };

  return (
    <div style={{ background: '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', alignItems: 'center' }}>
          <div style={{ color: '#0CF2B0', fontWeight: 'bold', fontSize: '12px' }}>NETWORK: POLYGON</div>
          <button onClick={() => setView('settings')} style={{ background: '#111', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px' }}>⚙️</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>
          {view === 'main' && !activeDex && (
            <>
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <h1 style={{ fontSize: '42px', margin: 0 }}>${balanceUSDC.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
                <p style={{ opacity: 0.3 }}>Available Balance</p>
              </div>

              {signal && (
                <div style={{ background: '#111', padding: '15px', borderRadius: '15px', marginBottom: '20px', borderLeft: '4px solid #0CF2B0' }}>
                  <div style={{ fontSize: '10px', color: '#0CF2B0', fontWeight: 'bold' }}>LIVE ARBITRAGE SIGNAL</div>
                  <div style={{ fontWeight: 'bold', margin: '5px 0' }}>{signal.coin.symbol}: {signal.buyAt} → <span style={{color:'#0CF2B0'}}>{signal.sellAt}</span></div>
                  <div style={{ fontSize: '12px' }}>Est. Profit: +{signal.profit}%</div>
                </div>
              )}

              <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '20px', border: '1px solid #1a1a1a', marginBottom: '20px' }}>
                <p style={{ fontSize: '10px', opacity: 0.5, marginBottom: '10px' }}>ASSETS</p>
                {Object.keys(wallet).filter(k => wallet[k] > 0.000001).map(c => (
                  <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #111', alignItems: 'center' }}>
                    <div style={{display:'flex', alignItems:'center', gap: 8}}><img src={ASSETS[c]?.icon} width="18" /> {c}</div>
                    <b>{wallet[c].toFixed(6)}</b>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {Object.keys(DEX_THEMES).map(k => (
                  <button key={k} onClick={() => setActiveDex(k)} style={{ background: '#0a0a0a', border: `1px solid ${DEX_THEMES[k].color}44`, color: '#fff', padding: '25px 0', borderRadius: '20px', fontWeight: 'bold' }}>{DEX_THEMES[k].name}</button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Swap Window */}
        {activeDex && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, padding: '20px' }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px' }}>←</button>
            <h2 style={{ textAlign: 'center', color: DEX_THEMES[activeDex].color }}>{activeDex}</h2>
            
            <div style={{ marginTop: '20px', background: '#0f0f0f', padding: '20px', borderRadius: '25px', border: '1px solid #222' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12px' }}>
                <span style={{opacity: 0.5}}>Pay</span>
                <span onClick={() => setPayAmount(currentAvailable.toString())} style={{color: '#0CF2B0', fontWeight: 'bold', cursor: 'pointer'}}>
                  MAX: {currentAvailable.toFixed(6)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '28px', width: '60%', outline: 'none' }} placeholder="0.0"/>
                <button onClick={() => setShowTokenList('pay')} style={{ background: '#222', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 5 }}>
                   <img src={payToken.icon} width="18" /> {payToken.symbol} ▾
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center', margin: '-15px 0', position: 'relative', zIndex: 2 }}>
              <button onClick={() => { const tmp = payToken; setPayToken(receiveToken); setReceiveToken(tmp); setPayAmount(''); }} style={{ background: '#111', border: '4px solid #000', borderRadius: '12px', padding: '8px', color: '#fff' }}>⇅</button>
            </div>

            <div style={{ background: '#0f0f0f', padding: '20px', borderRadius: '25px', border: '1px solid #222', marginTop: '5px' }}>
              <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '10px' }}>Receive</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '28px' }}>{payAmount ? ((payAmount * payToken.price) / receiveToken.price).toFixed(6) : '0.0'}</div>
                <button onClick={() => setShowTokenList('receive')} style={{ background: '#222', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 5 }}>
                   <img src={receiveToken.icon} width="18" /> {receiveToken.symbol} ▾
                </button>
              </div>
            </div>

            <button onClick={handleSwap} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: '20px', borderRadius: '20px', marginTop: '25px', fontWeight: 'bold', border: 'none' }}>Swap on {activeDex}</button>
          </div>
        )}

        {/* Blockchain Loading Overlay */}
        {txStatus && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '50px', height: '50px', border: '3px solid #333', borderTopColor: '#0CF2B0', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '20px', fontWeight: 'bold', letterSpacing: '1px' }}>
              {txStatus === 'sending' ? 'SENDING TRANSACTION...' : 'CONFIRMING ON POLYGON...'}
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Transaction Receipt (Final Check) */}
        {receipt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#111', width: '100%', borderRadius: '35px', padding: '30px', border: '1px solid #222', textAlign: 'center' }}>
              <div style={{ fontSize: '50px', marginBottom: '10px' }}>{receipt.pnl >= 0 ? '💰' : '✅'}</div>
              <h2 style={{ margin: 0 }}>Swap Completed</h2>
              <div style={{ margin: '25px 0', padding: '20px', background: '#0a0a0a', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 15, marginBottom: '15px' }}>
                  <img src={ASSETS[receipt.from].icon} width="24" /> <b>{receipt.spent.toFixed(4)}</b>
                  <span>→</span>
                  <img src={ASSETS[receipt.to].icon} width="24" /> <b>{receipt.got.toFixed(6)}</b>
                </div>
                {receipt.pnl !== null && (
                  <div style={{ borderTop: '1px solid #222', paddingTop: '15px', marginTop: '15px' }}>
                    <div style={{ fontSize: '12px', opacity: 0.5 }}>PROFIT / LOSS</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: receipt.pnl >= 0 ? '#0CF2B0' : '#FF4B4B' }}>
                      {receipt.pnl >= 0 ? '+' : ''}{receipt.pnl.toFixed(2)} USDC
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setReceipt(null)} style={{ width: '100%', background: '#fff', color: '#000', padding: '18px', borderRadius: '20px', fontWeight: 'bold', border: 'none' }}>DONE</button>
            </div>
          </div>
        )}

        {/* Token Selector & Settings (remains the same) */}
        {showTokenList && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, padding: '20px' }}>
             <button onClick={() => setShowTokenList(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px' }}>×</button>
             <div style={{ marginTop: '20px' }}>
               {Object.values(ASSETS).map(item => (
                 <div key={item.symbol} onClick={() => { if(showTokenList === 'pay') setPayToken(item); else setReceiveToken(item); setShowTokenList(null); setPayAmount(''); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid #111', alignItems: 'center' }}>
                    <div style={{display:'flex', alignItems:'center', gap: 12}}><img src={item.icon} width="28"/> <b>{item.symbol}</b></div>
                    <span style={{opacity: 0.5}}>${item.price.toLocaleString()}</span>
                 </div>
               ))}
             </div>
          </div>
        )}

        {view === 'settings' && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, padding: '20px' }}>
            <button onClick={() => setView('main')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px' }}>←</button>
            <div style={{ marginTop: '30px' }}>
               <div onClick={() => window.open('https://t.me/kriptoalians')} style={{ background: '#111', padding: '20px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', marginBottom: '10px', cursor: 'pointer' }}>
                  <span>Creators</span>
                  <span style={{color: '#0CF2B0'}}>@kriptoalians</span>
               </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
