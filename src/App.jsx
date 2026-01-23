
import React, { useState, useEffect } from 'react';

const ASSETS = {
  USDT: { symbol: 'USDT', name: 'Tether', price: 1, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 145.50, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 605.20, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' }
};

const DEXES = ['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'];

export default function ProfessionalArbitrageApp() {
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

  // Сохранение данных
  useEffect(() => {
    localStorage.setItem('arb_balance', balanceUSDT);
    localStorage.setItem('arb_wallet', JSON.stringify(wallet));
  }, [balanceUSDT, wallet]);

  // Генератор сигналов (только на профит)
  useEffect(() => {
    if (!signal) {
      const tokens = [ASSETS.SOL, ASSETS.ETH, ASSETS.BNB];
      const coin = tokens[Math.floor(Math.random() * tokens.length)];
      const shuffled = [...DEXES].sort(() => 0.5 - Math.random());
      const profit = (Math.random() * 2 + 1.2).toFixed(2); // Всегда плюс в сигнале
      setSignal({ coin, buyAt: shuffled[0], sellAt: shuffled[1], profit: parseFloat(profit) });
    }
  }, [signal]);

  const handleMax = () => {
    const val = payToken.symbol === 'USDT' ? balanceUSDT : (wallet[payToken.symbol] || 0);
    setAmount(val.toString());
  };

  const showNotify = (text, type = 'success', time = 3000) => {
    setNotification({ text, type });
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
          showNotify(`Success: ${receiveToken.symbol} received`, 'success', 1000);
        }
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          let prof = isCorrect ? signal.profit : 0; // Либо профит, либо 0 (никаких минусов в тексте)
          
          const finalVal = (num * payToken.price) * (1 + prof/100);
          const diff = finalVal - (num * payToken.price);

          setBalanceUSDT(b => b + finalVal);
          setWallet(w => ({ ...w, [payToken.symbol]: has - num }));
          
          if (diff > 0) showNotify(`Profit: +$${diff.toFixed(2)}`, 'success');
          else showNotify(`Transaction Completed`, 'success');
          
          setSignal(null);
        }
      }
      setIsProcessing(false);
      setAmount('');
    }, 6000);
  };

  // --- UI COMPONENTS ---
  const TokenModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 10000, padding: 20, animation: 'fadeIn 0.2s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20 }}>Select Token</h2>
        <button onClick={() => setShowTokenList(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 30 }}>×</button>
      </div>
      {Object.values(ASSETS).map(t => (
        <div key={t.symbol} onClick={() => { if (selectingFor === 'pay') setPayToken(t); else setReceiveToken(t); setShowTokenList(false); }} 
             style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '15px 0', borderBottom: '1px solid #111' }}>
          <img src={t.icon} width="32" />
          <div style={{ flex: 1 }}><b>{t.symbol}</b></div>
          <div style={{ color: '#39f2af' }}>{t.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[t.symbol] || 0).toFixed(4)}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto', overflow: 'hidden' }}>
      
      {showTokenList && <TokenModal />}

      {notification && (
        <div style={{ position: 'fixed', top: 20, left: '5%', width: '90%', background: notification.type === 'success' ? '#39f2af' : '#444', color: '#000', padding: 15, borderRadius: 15, zIndex: 10001, textAlign: 'center', fontWeight: 'bold', animation: 'slideDown 0.3s' }}>
          {notification.text}
        </div>
      )}

      {/* ГЛАВНЫЙ ЭКРАН */}
      <div style={{ display: activeDex ? 'none' : 'block', padding: 20, animation: 'fadeIn 0.4s' }}>
        <div style={{ textAlign: 'center', margin: '50px 0' }}>
          <h1 style={{ fontSize: 48, fontWeight: 900, marginBottom: 5 }}>${balanceUSDT.toLocaleString(undefined, {maximumFractionDigits: 2})}</h1>
          <div style={{ opacity: 0.4, fontSize: 12, letterSpacing: 2 }}>TOTAL ASSETS</div>
        </div>

        {signal && (
          <div style={{ background: 'linear-gradient(135deg, #111, #161616)', padding: 20, borderRadius: 25, border: '1px solid #222', marginBottom: 30 }}>
            <div style={{ color: '#39f2af', fontSize: 10, fontWeight: 900, marginBottom: 10, letterSpacing: 1 }}>ARBITRAGE OPPORTUNITY</div>
            <div style={{ fontSize: 16 }}>Buy {signal.coin.symbol} @ <span style={{ color: '#ff007a' }}>{signal.buyAt}</span></div>
            <div style={{ fontSize: 16 }}>Sell @ <span style={{ color: '#39f2af' }}>{signal.sellAt}</span> <span style={{ color: '#39f2af' }}>+{signal.profit}%</span></div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
          {DEXES.map(id => (
            <button key={id} onClick={() => setActiveDex(id)} style={{ background: '#111', border: '1px solid #222', padding: 30, borderRadius: 24, color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{id}</button>
          ))}
        </div>
        
        <div style={{ marginTop: 50, textAlign: 'center' }}>
          <a href="https://t.me/kriptoalians" style={{ color: '#333', textDecoration: 'none', fontSize: 11 }}>@KRIPTOALIANS</a>
        </div>
      </div>

      {/* ТЕРМИНАЛЫ БИРЖ */}
      {activeDex && (
        <div style={{ height: '100%', position: 'relative', animation: 'slideIn 0.3s ease-out' }}>
          {/* Стилизация под конкретную биржу */}
          <div style={{ 
            height: '100%', 
            padding: 20,
            background: activeDex === 'UNISWAP' ? '#fff' : (activeDex === 'RAYDIUM' ? '#0c0d21' : (activeDex === 'PANCAKE' ? '#f6f6f9' : '#060814')),
            color: activeDex === 'UNISWAP' || activeDex === 'PANCAKE' ? '#000' : '#fff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
              <b style={{ fontSize: 20 }}>{activeDex}</b>
              <button onClick={() => setActiveDex(null)} style={{ background: 'rgba(128,128,128,0.1)', border: 'none', padding: '8px 16px', borderRadius: 12, color: 'inherit' }}>Exit</button>
            </div>

            <div style={{ 
              background: activeDex === 'UNISWAP' ? '#f7f8fa' : (activeDex === 'RAYDIUM' ? '#14162e' : (activeDex === 'PANCAKE' ? '#fff' : '#131823')),
              padding: 20, borderRadius: 30, boxShadow: activeDex === 'PANCAKE' ? '0 4px 0 #e9eaeb' : 'none',
              border: activeDex === '1INCH' ? '1px solid #21273a' : 'none'
            }}>
              {/* ПОЛЕ PAY */}
              <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : '#000', padding: 15, borderRadius: 20, marginBottom: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.6 }}>
                  <span>You Pay</span>
                  <span onClick={handleMax} style={{ color: '#39f2af', fontWeight: 'bold' }}>MAX</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" style={{ background: 'none', border: 'none', fontSize: 28, color: 'inherit', outline: 'none', width: '60%' }} />
                  <button onClick={() => { setShowTokenList(true); setSelectingFor('pay'); }} style={{ background: 'rgba(128,128,128,0.1)', border: 'none', padding: '5px 12px', borderRadius: 12, color: 'inherit', fontWeight: 'bold' }}>{payToken.symbol} ▾</button>
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: 10, fontSize: 20 }}>↓</div>

              {/* ПОЛЕ RECEIVE */}
              <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : '#000', padding: 15, borderRadius: 20, marginBottom: 25 }}>
                <div style={{ fontSize: 12, opacity: 0.6 }}>You Receive</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <div style={{ fontSize: 28 }}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                  <button onClick={() => { setShowTokenList(true); setSelectingFor('receive'); }} style={{ background: activeDex === 'UNISWAP' ? '#ff007a' : '#39f2af', border: 'none', padding: '5px 12px', borderRadius: 12, color: activeDex === 'UNISWAP' ? '#fff' : '#000', fontWeight: 'bold' }}>{receiveToken.symbol} ▾</button>
                </div>
              </div>

              <button onClick={handleSwap} style={{ 
                width: '100%', padding: 20, borderRadius: 22, border: 'none', fontSize: 18, fontWeight: 900,
                background: activeDex === 'UNISWAP' ? '#ff007a' : (activeDex === 'RAYDIUM' ? '#39f2af' : (activeDex === 'PANCAKE' ? '#1fc7d4' : '#2f8af5')),
                color: activeDex === 'UNISWAP' ? '#fff' : '#000'
              }}>
                {payToken.symbol === 'USDT' ? 'Swap Now' : 'Execute Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ЭКРАН ЗАГРУЗКИ */}
      {isProcessing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 10002, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loader"></div>
          <h2 style={{ marginTop: 20, letterSpacing: 2 }}>PENDING...</h2>
          <p style={{ opacity: 0.4, fontSize: 13 }}>Waiting for block confirmation</p>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        .loader { width: 50px; height: 50px; border: 4px solid #111; border-top-color: #39f2af; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
