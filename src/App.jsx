import React, { useState, useEffect } from 'react';

const ASSETS = {
  USDT: { symbol: 'USDT', name: 'Tether', price: 1, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 145.50, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 605.20, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' }
};

const DEXES = ['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'];

export default function ExactDesignApp() {
  const [balanceUSDT, setBalanceUSDT] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('arb_wallet')) || {});
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showTokenList, setShowTokenList] = useState(false);
  const [selectingFor, setSelectingFor] = useState('pay');
  const [payToken, setPayToken] = useState(ASSETS.USDT);
  const [receiveToken, setReceiveToken] = useState(ASSETS.SOL);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    localStorage.setItem('arb_balance', balanceUSDT);
    localStorage.setItem('arb_wallet', JSON.stringify(wallet));
  }, [balanceUSDT, wallet]);

  useEffect(() => {
    if (!signal) {
      const tokens = [ASSETS.SOL, ASSETS.ETH, ASSETS.BNB];
      const coin = tokens[Math.floor(Math.random() * tokens.length)];
      const shuffled = [...DEXES].sort(() => 0.5 - Math.random());
      const profit = (Math.random() < 0.3 ? -(Math.random() * 1.5) : (Math.random() * 2 + 1)).toFixed(2);
      setSignal({ coin, buyAt: shuffled[0], sellAt: shuffled[1], profit: parseFloat(profit) });
    }
  }, [signal]);

  const handleMax = () => {
    const val = payToken.symbol === 'USDT' ? balanceUSDT : (wallet[payToken.symbol] || 0);
    setAmount(val.toString());
  };

  const showNotify = (type, text, time = 3500) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), time);
  };

  const handleSwap = () => {
    if (!amount || amount <= 0) return;
    setIsProcessing(true);
    setTimeout(() => {
      const num = Number(amount);
      if (payToken.symbol === 'USDT') {
        if (balanceUSDT >= num) {
          setBalanceUSDT(b => b - num);
          setWallet(w => ({ ...w, [receiveToken.symbol]: (w[receiveToken.symbol] || 0) + (num / receiveToken.price) }));
          showNotify('success', `Bought ${receiveToken.symbol}`, 1200);
        }
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          const slip = Math.random() < 0.2;
          let prof = isCorrect ? signal.profit : -15;
          if (slip && isCorrect) prof = -(Math.random() * 1.5);
          const final = (num * payToken.price) * (1 + prof/100);
          setBalanceUSDT(b => b + final);
          setWallet(w => ({ ...w, [payToken.symbol]: has - num }));
          showNotify(prof > 0 ? 'success' : 'error', prof > 0 ? `Profit: +$${(final - num * payToken.price).toFixed(2)}` : `Loss: $${(final - num * payToken.price).toFixed(2)}`);
          setSignal(null);
        }
      }
      setIsProcessing(false);
      setAmount('');
    }, 6000);
  };

  // --- RENDERING DEX ---
  const renderDexTerminal = () => {
    switch(activeDex) {
      case 'UNISWAP':
        return (
          <div style={{ background: '#fff', height: '100%', color: '#000', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Uniswap_Logo.svg" width="30" />
              <button onClick={() => setActiveDex(null)} style={{ border: 'none', background: '#f7f8fa', padding: '8px 15px', borderRadius: 12 }}>Close</button>
            </div>
            <div style={{ background: '#f7f8fa', padding: 12, borderRadius: 24, border: '1px solid #edeeef' }}>
               <div style={{ background: '#fff', padding: 16, borderRadius: 20, marginBottom: 4 }}>
                  <div style={{ fontSize: 14, color: '#565a69', display: 'flex', justifyContent: 'space-between' }}>You pay <span onClick={handleMax} style={{ color: '#ff007a', cursor: 'pointer', fontWeight: 'bold' }}>MAX</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" style={{ border: 'none', fontSize: 32, width: '60%', outline: 'none' }} />
                    <button onClick={() => {setShowTokenList(true); setSelectingFor('pay')}} style={{ background: '#edeeef', border: 'none', borderRadius: 16, padding: '4px 8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 5 }}>{payToken.symbol} ▾</button>
                  </div>
               </div>
               <div style={{ background: '#fff', padding: 16, borderRadius: 20 }}>
                  <div style={{ fontSize: 14, color: '#565a69' }}>You receive</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                    <div style={{ fontSize: 32, color: amount ? '#000' : '#565a69' }}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0'}</div>
                    <button onClick={() => {setShowTokenList(true); setSelectingFor('receive')}} style={{ background: '#ff007a', color: '#fff', border: 'none', borderRadius: 16, padding: '4px 12px', fontWeight: 'bold' }}>{receiveToken.symbol} ▾</button>
                  </div>
               </div>
               <button onClick={handleSwap} style={{ width: '100%', marginTop: 12, padding: 16, borderRadius: 20, border: 'none', background: 'rgba(255, 0, 122, 0.1)', color: '#ff007a', fontSize: 20, fontWeight: 'bold' }}>Swap</button>
            </div>
          </div>
        );
      case 'RAYDIUM':
        return (
          <div style={{ background: '#0c0d21', height: '100%', color: '#fff', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, borderBottom: '1px solid #1c1e3d', pb: 10 }}>
              <span style={{ color: '#39f2af', fontWeight: 'bold', fontSize: 20 }}>RAYDIUM</span>
              <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: '1px solid #39f2af', color: '#39f2af', borderRadius: 8 }}>Esc</button>
            </div>
            <div style={{ background: '#14162e', padding: 20, borderRadius: 20, border: '1px solid #1c1e3d' }}>
              <div style={{ background: '#0c0d21', padding: 15, borderRadius: 15, border: '1px solid #1c1e3d' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}><span>From</span><span onClick={handleMax} style={{ color: '#39f2af' }}>MAX</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, outline: 'none' }} />
                  <span onClick={() => {setShowTokenList(true); setSelectingFor('pay')}} style={{ color: '#39f2af' }}>{payToken.symbol}</span>
                </div>
              </div>
              <div style={{ textAlign: 'center', margin: '10px 0', color: '#39f2af' }}>⇅</div>
              <div style={{ background: '#0c0d21', padding: 15, borderRadius: 15, border: '1px solid #1c1e3d' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>To</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <div style={{ fontSize: 24 }}>{amount ? '≈ '+(payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.00'}</div>
                  <span onClick={() => {setShowTokenList(true); setSelectingFor('receive')}} style={{ color: '#39f2af' }}>{receiveToken.symbol}</span>
                </div>
              </div>
              <button onClick={handleSwap} style={{ width: '100%', marginTop: 20, padding: 15, borderRadius: 12, border: 'none', background: 'linear-gradient(90deg, #39f2af, #2ba583)', color: '#000', fontWeight: 'bold' }}>Swap Tokens</button>
            </div>
          </div>
        );
      case 'PANCAKE':
        return (
          <div style={{ background: '#eaf2f6', height: '100%', color: '#280d5f', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
              <span style={{ fontWeight: 900, color: '#d18c47' }}>🥞 PancakeSwap</span>
              <button onClick={() => setActiveDex(null)} style={{ background: '#7a6eaa', color: '#fff', border: 'none', borderRadius: 12, padding: '5px 10px' }}>Back</button>
            </div>
            <div style={{ background: '#fff', borderRadius: 32, padding: 24, boxShadow: '0 4px 0 #e9eaeb' }}>
               <h3 style={{ margin: '0 0 20px 0' }}>Swap</h3>
               <div style={{ background: '#eeeaf4', padding: 16, borderRadius: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ fontWeight: 'bold' }}>{payToken.symbol}</span><span onClick={handleMax} style={{ color: '#1fc7d4', fontWeight: 900 }}>MAX</span></div>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" style={{ background: 'none', border: 'none', fontSize: 20, width: '100%', marginTop: 8, outline: 'none', color: '#280d5f' }} />
               </div>
               <div style={{ textAlign: 'center', color: '#1fc7d4', padding: 10 }}>↓</div>
               <div style={{ background: '#eeeaf4', padding: 16, borderRadius: 16, marginBottom: 20 }}>
                  <div style={{ fontWeight: 'bold', fontSize: 12 }}>{receiveToken.symbol}</div>
                  <div style={{ fontSize: 20, marginTop: 8 }}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
               </div>
               <button onClick={handleSwap} style={{ width: '100%', padding: 16, borderRadius: 16, border: 'none', background: '#1fc7d4', color: '#fff', fontWeight: 'bold', fontSize: 16, boxShadow: '0 -3px 0 rgba(0,0,0,0.1) inset' }}>Swap Now</button>
            </div>
          </div>
        );
      case '1INCH':
        return (
          <div style={{ background: '#060814', height: '100%', color: '#fff', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
              <span style={{ fontWeight: 'bold', letterSpacing: 1 }}>1INCH NETWORK</span>
              <span onClick={() => setActiveDex(null)} style={{ color: '#2f8af5' }}>Close</span>
            </div>
            <div style={{ background: '#131823', border: '1px solid #21273a', borderRadius: 16, padding: 16 }}>
               <div style={{ border: '1px solid #21273a', borderRadius: 12, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.5, fontSize: 11 }}><span>You sell</span><span onClick={handleMax} style={{ color: '#2f8af5' }}>MAX</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, width: '60%', outline: 'none' }} />
                    <button onClick={() => {setShowTokenList(true); setSelectingFor('pay')}} style={{ background: '#1b2231', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: 8 }}>{payToken.symbol} ▾</button>
                  </div>
               </div>
               <div style={{ border: '1px solid #21273a', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                  <div style={{ opacity: 0.5, fontSize: 11 }}>You buy</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                    <div style={{ fontSize: 22 }}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                    <button onClick={() => {setShowTokenList(true); setSelectingFor('receive')}} style={{ background: '#2f8af5', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: 8 }}>{receiveToken.symbol} ▾</button>
                  </div>
               </div>
               <button onClick={handleSwap} style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: '#2f8af5', color: '#fff', fontWeight: 'bold' }}>Give Permission to Swap</button>
            </div>
          </div>
        );
      default: return null;
    }
  }

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {showTokenList && (
        <div style={{ position: 'fixed', inset: 0, background: '#111', zIndex: 9999, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><h3>Choose Asset</h3><button onClick={() => setShowTokenList(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 30 }}>×</button></div>
          {Object.values(ASSETS).map(t => (
            <div key={t.symbol} onClick={() => { if (selectingFor === 'pay') setPayToken(t); else setReceiveToken(t); setShowTokenList(false); }} style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '15px 0', borderBottom: '1px solid #222' }}>
              <img src={t.icon} width="30" />
              <div style={{ flex: 1 }}>{t.symbol}</div>
              <div style={{ color: '#39f2af' }}>{t.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[t.symbol] || 0).toFixed(4)}</div>
            </div>
          ))}
        </div>
      )}

      {notification && (
        <div style={{ position: 'fixed', top: 15, left: '5%', width: '90%', background: notification.type === 'success' ? '#39f2af' : '#ff4444', color: '#000', padding: 12, borderRadius: 10, zIndex: 10000, textAlign: 'center', fontWeight: 'bold' }}>{notification.text}</div>
      )}

      {!activeDex ? (
        <div style={{ padding: 20 }}>
          <div style={{ textAlign: 'center', margin: '40px 0' }}>
            <h1 style={{ fontSize: 40, fontWeight: 900 }}>${balanceUSDT.toLocaleString(undefined, {maximumFractionDigits: 2})}</h1>
            <p style={{ opacity: 0.5 }}>BALANCE</p>
          </div>
          {signal && (
            <div style={{ background: '#111', padding: 20, borderRadius: 20, border: '1px solid #222', marginBottom: 20 }}>
              <div style={{ color: '#39f2af', fontSize: 11, fontWeight: 'bold', marginBottom: 5 }}>SIGNAL</div>
              <div>Buy <b>{signal.coin.symbol}</b> on <span style={{ color: '#ff007a' }}>{signal.buyAt}</span></div>
              <div>Sell on <span style={{ color: '#39f2af' }}>{signal.sellAt}</span> <span style={{ color: signal.profit > 0 ? '#39f2af' : '#ff4444' }}>({signal.profit}%)</span></div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {DEXES.map(id => <button key={id} onClick={() => setActiveDex(id)} style={{ background: '#111', border: '1px solid #333', padding: 25, borderRadius: 20, color: '#fff', fontWeight: 'bold' }}>{id}</button>)}
          </div>
          <div style={{ textAlign: 'center', marginTop: 40 }}><a href="https://t.me/kriptoalians" style={{ color: '#333', fontSize: 12, textDecoration: 'none' }}>SUPPORT</a></div>
        </div>
      ) : renderDexTerminal()}

      {isProcessing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loader"></div>
          <h3 style={{ marginTop: 20 }}>Broadcasting Transaction...</h3>
        </div>
      )}
      <style>{`.loader { width: 45px; height: 45px; border: 4px solid #333; border-top-color: #39f2af; border-radius: 50%; animation: s 1s linear infinite; } @keyframes s { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
