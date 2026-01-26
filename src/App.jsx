import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update, serverTimestamp } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCKmEa1B4xOdMdNGXBDK2LeOhBQoMqWv40",
  authDomain: "treidgame-b2ae0.firebaseapp.com",
  projectId: "treidgame-b2ae0",
  storageBucket: "treidgame-b2ae0.firebasestorage.app",
  messagingSenderId: "985305772375",
  appId: "1:985305772375:web:08d9b482a6f9d3cd748e12"
};

const ASSETS = {
  USDC: { symbol: 'USDC', price: 1, icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=024', color: '#2775CA' },
  BTC: { symbol: 'BTC', price: 65000.00, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=024', color: '#F7931A' },
  ETH: { symbol: 'ETH', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=024', color: '#627EEA' },
  LINK: { symbol: 'LINK', price: 18.20, icon: 'https://cryptologos.cc/logos/chainlink-link-logo.svg?v=024', color: '#2A5ADA' },
  AAVE: { symbol: 'AAVE', price: 145.50, icon: 'https://cryptologos.cc/logos/aave-aave-logo.svg?v=024', color: '#B6509E' },
  CRV: { symbol: 'CRV', price: 0.55, icon: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.svg?v=024', color: '#F41B1B' },
  WPOL: { symbol: 'WPOL', price: 0.72, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg?v=024', color: '#8247E5' }
};

const DEX_THEMES = {
  UNISWAP: { name: 'Uniswap', color: '#FF007A' },
  ODOS: { name: 'Odos', color: '#0CF2B0' },
  SUSHI: { name: 'SushiSwap', color: '#FA52A0' },
  '1INCH': { name: '1inch', color: '#1B314F' }
};

export default function App() {
  const [balanceUSDC, setBalanceUSDC] = useState(() => Number(localStorage.getItem('arb_balance_usdc')) || 1000.00);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('arb_wallet_v4')) || {});
  const [view, setView] = useState('main'); 
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [showTokenList, setShowTokenList] = useState(false);
  const [selectingFor, setSelectingFor] = useState('pay');
  const [payToken, setPayToken] = useState(ASSETS.USDC);
  const [receiveToken, setReceiveToken] = useState(ASSETS.BTC);
  const [amount, setAmount] = useState('');

  const userId = useMemo(() => {
    try {
      const tg = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tg) return tg.username || tg.id.toString();
    } catch (e) {}
    return localStorage.getItem('arb_user_id') || 'Trader_' + Math.floor(Math.random() * 9999);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const app = initializeApp(firebaseConfig);
        const db = getDatabase(app);
        const userRef = ref(db, 'players/' + userId);
        onValue(userRef, (s) => {
          if (s.exists()) {
            setBalanceUSDC(s.val().balanceUSDC || 1000);
            setWallet(s.val().wallet || {});
          }
        });
        const interval = setInterval(() => {
          update(userRef, { balanceUSDC, wallet, username: userId, lastSeen: serverTimestamp() });
          localStorage.setItem('arb_balance_usdc', balanceUSDC);
          localStorage.setItem('arb_wallet_v4', JSON.stringify(wallet));
        }, 4000);
        return () => clearInterval(interval);
      } catch (e) {}
    }, 1000);
  }, [balanceUSDC, wallet, userId]);

  useEffect(() => {
    if (!signal) {
      const keys = Object.keys(ASSETS).filter(k => k !== 'USDC');
      const coin = ASSETS[keys[Math.floor(Math.random() * keys.length)]];
      const dexes = Object.keys(DEX_THEMES);
      const buyAt = dexes[Math.floor(Math.random() * dexes.length)];
      let sellAt = dexes[Math.floor(Math.random() * dexes.length)];
      while (sellAt === buyAt) sellAt = dexes[Math.floor(Math.random() * dexes.length)];
      setSignal({ coin, buyAt, sellAt, profit: (Math.random() * 1.5 + 1.5).toFixed(2) });
    }
  }, [signal]);

  const handleTrade = () => {
    const num = Number(amount);
    const currentOwned = payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0);
    
    if (!num || num <= 0 || num > currentOwned) return alert('Check amount');
    
    setIsProcessing(true);
    setTimeout(() => {
      let receiptData = {};
      
      if (payToken.symbol === 'USDC') {
        // КУПИТЬ МОНЕТУ
        const bought = num / receiveToken.price;
        setBalanceUSDC(prev => prev - num);
        setWallet(prev => ({ ...prev, [receiveToken.symbol]: (prev[receiveToken.symbol] || 0) + bought }));
        receiptData = { type: 'buy', pay: num, get: bought, asset: receiveToken.symbol, profit: 0 };
      } else {
        // ПРОДАТЬ МОНЕТУ
        const isOk = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
        const mult = isOk ? (1 + signal.profit / 100) : (1 - (Math.random() * 0.015));
        const usdcGained = (num * payToken.price) * mult;
        const profitValue = usdcGained - (num * payToken.price);

        setBalanceUSDC(prev => prev + usdcGained);
        setWallet(prev => ({ ...prev, [payToken.symbol]: (prev[payToken.symbol] || 0) - num }));
        receiptData = { type: 'sell', pay: num, get: usdcGained, asset: payToken.symbol, profit: profitValue, isOk };
        setSignal(null);
      }
      
      setReceipt(receiptData);
      setIsProcessing(false);
      setAmount('');
      setActiveDex(null);
    }, 1500);
  };

  const currentPayBalance = payToken.symbol === 'USDC' ? balanceUSDC : (wallet[payToken.symbol] || 0);

  return (
    <div style={{ background: '#000', height: '100vh', width: '100vw', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto', position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        
        {/* Main View */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <h1 style={{ fontSize: '42px', margin: 0 }}>${balanceUSDC.toLocaleString(undefined, {minimumFractionDigits: 2})}</h1>
            <p style={{ opacity: 0.4, fontSize: '11px' }}>USDC BALANCE</p>
          </div>

          <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '18px', border: '1px solid #1a1a1a', marginBottom: '20px' }}>
            <p style={{ fontSize: '10px', color: '#0CF2B0', fontWeight: 'bold', margin: '0 0 10px 0' }}>WALLET ASSETS</p>
            {Object.keys(wallet).filter(k => wallet[k] > 0.0000001).map(c => (
              <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #111' }}>
                <div style={{display:'flex', alignItems:'center', gap: 8}}><img src={ASSETS[c].icon} width="18"/> {c}</div>
                <b>{wallet[c].toFixed(6)}</b>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {Object.keys(DEX_THEMES).map(k => (
              <button key={k} onClick={() => setActiveDex(k)} style={{ background: '#0a0a0a', border: `1px solid ${DEX_THEMES[k].color}44`, color: '#fff', padding: '25px 0', borderRadius: '18px', fontWeight: 'bold' }}>{DEX_THEMES[k].name}</button>
            ))}
          </div>
        </div>

        {/* Swap Overlay */}
        {activeDex && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, padding: '20px' }}>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>←</button>
            <h2 style={{textAlign:'center', color: DEX_THEMES[activeDex].color}}>{activeDex} Swap</h2>
            
            <div style={{ background: '#0f0f0f', padding: '20px', borderRadius: '20px', border: '1px solid #222', marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.6, marginBottom: 10 }}>
                <span>Pay</span>
                <span onClick={() => setAmount(currentPayBalance.toString())} style={{ color: DEX_THEMES[activeDex].color, fontWeight:'bold', cursor:'pointer' }}>
                  MAX: {currentPayBalance.toFixed(6)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '28px', width: '60%', outline: 'none' }} placeholder="0.0"/>
                <button onClick={() => {setSelectingFor('pay'); setShowTokenList(true)}} style={{ background: '#222', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '10px', display:'flex', alignItems:'center', gap:5 }}>
                  <img src={payToken.icon} width="18"/> {payToken.symbol}
                </button>
              </div>
            </div>

            <div style={{ textAlign:'center', padding: '10px', opacity: 0.3 }}>↓</div>

            <div style={{ background: '#0f0f0f', padding: '20px', borderRadius: '20px', border: '1px solid #222' }}>
              <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: 10 }}>Receive (Est.)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{fontSize: '28px'}}>{amount ? (payToken.symbol === 'USDC' ? (amount/receiveToken.price).toFixed(6) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                <button onClick={() => {setSelectingFor('receive'); setShowTokenList(true)}} style={{ background: '#222', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '10px', display:'flex', alignItems:'center', gap:5 }}>
                  <img src={receiveToken.icon} width="18"/> {receiveToken.symbol}
                </button>
              </div>
            </div>

            <button onClick={handleTrade} style={{ width: '100%', background: DEX_THEMES[activeDex].color, color: '#fff', padding: '20px', borderRadius: '20px', fontWeight: 'bold', marginTop: '30px', border: 'none' }}>
              Confirm Transaction
            </button>
          </div>
        )}

        {/* RECEIPT MODAL (Чек) */}
        {receipt && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zInterval: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
            <div style={{ background: '#111', width: '100%', borderRadius: '25px', padding: '25px', border: '1px solid #222', textAlign: 'center' }}>
              <div style={{ fontSize: '50px' }}>{receipt.profit >= 0 ? '✅' : '📉'}</div>
              <h2 style={{ margin: '10px 0' }}>{receipt.type === 'buy' ? 'Purchase' : 'Sale'} Done</h2>
              <div style={{ margin: '20px 0', textAlign: 'left', background: '#000', padding: 15, borderRadius: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
                  <span style={{opacity: 0.5}}>Spent:</span>
                  <span>{receipt.type === 'buy' ? receipt.pay.toFixed(2) + ' USDC' : receipt.pay.toFixed(6) + ' ' + receipt.asset}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
                  <span style={{opacity: 0.5}}>Received:</span>
                  <span>{receipt.type === 'buy' ? receipt.get.toFixed(6) + ' ' + receipt.asset : receipt.get.toFixed(2) + ' USDC'}</span>
                </div>
                {receipt.type === 'sell' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #222', fontWeight: 'bold' }}>
                    <span>Profit:</span>
                    <span style={{ color: receipt.profit >= 0 ? '#0CF2B0' : '#ff4d4d' }}>{receipt.profit >= 0 ? '+' : ''}${receipt.profit.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <button onClick={() => setReceipt(null)} style={{ width: '100%', background: '#fff', color: '#000', padding: '15px', borderRadius: '15px', border: 'none', fontWeight: 'bold' }}>Close</button>
            </div>
          </div>
        )}

        {/* Token Selector */}
        {showTokenList && (
          <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, padding: 20 }}>
             <button onClick={() => setShowTokenList(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px' }}>×</button>
             <div style={{marginTop: 20}}>
               {Object.values(ASSETS).map(t => (
                 <div key={t.symbol} onClick={() => { selectingFor === 'pay' ? setPayToken(t) : setReceiveToken(t); setShowTokenList(false); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #111', alignItems: 'center' }}>
                   <div style={{display:'flex', alignItems:'center', gap: 10}}><img src={t.icon} width="24"/> <span>{t.symbol}</span></div>
                   <span>${t.price}</span>
                 </div>
               ))}
             </div>
          </div>
        )}

        {isProcessing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>TRANSACTION IN PROGRESS...</div>}
      </div>
    </div>
  );
}
