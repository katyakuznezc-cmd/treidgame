import React, { useState, useEffect } from 'react';

const ASSETS = {
  USDT: { symbol: 'USDT', name: 'Tether', price: 1, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 145.50, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 605.20, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' }
};

export default function MegaArbitrageApp() {
  const [balanceUSDT, setBalanceUSDT] = useState(3000.00);
  const [wallet, setWallet] = useState({}); // Хранилище: { SOL: 2.5, ETH: 0.1 }
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Состояния для терминала
  const [payToken, setPayToken] = useState(ASSETS.USDT);
  const [receiveToken, setReceiveToken] = useState(ASSETS.SOL);
  const [amount, setAmount] = useState('');
  const [showTokens, setShowTokens] = useState(false);
  const [selectingFor, setSelectingFor] = useState('pay');

  useEffect(() => {
    if (!signal) {
      const coins = [ASSETS.SOL, ASSETS.ETH, ASSETS.BNB];
      const coin = coins[Math.floor(Math.random() * coins.length)];
      const profit = (Math.random() * 4 + 4).toFixed(2);
      setSignal({ coin, buyAt: 'UNISWAP', sellAt: 'RAYDIUM', profit });
    }
  }, [signal]);

  const handleSwap = () => {
    if (!amount || amount <= 0) return;
    setIsProcessing(true);

    setTimeout(() => {
      const numAmount = Number(amount);
      
      // Логика ПОКУПКИ (платим USDT)
      if (payToken.symbol === 'USDT') {
        if (balanceUSDT >= numAmount) {
          const qty = numAmount / receiveToken.price;
          setBalanceUSDT(b => b - numAmount);
          setWallet(w => ({ ...w, [receiveToken.symbol]: (w[receiveToken.symbol] || 0) + qty }));
        }
      } 
      // Логика ПРОДАЖИ (платим токеном)
      else {
        const userHas = wallet[payToken.symbol] || 0;
        if (userHas >= numAmount) {
          const isCorrect = activeDex === signal?.sellAt;
          const profitMult = isCorrect ? (1 + signal.profit/100) : 0.7;
          const returnUSDT = (numAmount * payToken.price) * profitMult;
          
          setBalanceUSDT(b => b + returnUSDT);
          setWallet(w => ({ ...w, [payToken.symbol]: userHas - numAmount }));
          if (isCorrect) setSignal(null);
        }
      }
      setIsProcessing(false);
      setAmount('');
    }, 1500);
  };

  const TokenModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: '#111', zIndex: 9999, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <b>Выберите актив</b>
        <span onClick={() => setShowTokens(false)} style={{ cursor: 'pointer', fontSize: 24 }}>×</span>
      </div>
      {Object.values(ASSETS).map(t => (
        <div key={t.symbol} onClick={() => {
          if (selectingFor === 'pay') setPayToken(t); else setReceiveToken(t);
          setShowTokens(false);
        }} style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '15px 0', borderBottom: '1px solid #222' }}>
          <img src={t.icon} width="32" />
          <div>
            <div style={{ fontWeight: 'bold' }}>{t.symbol}</div>
            <div style={{ fontSize: 12, opacity: 0.5 }}>Баланс: {t.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[t.symbol] || 0).toFixed(4)}</div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', color: '#fff', overflow: 'hidden' }}>
      {showTokens && <TokenModal />}
      
      {!activeDex ? (
        <div style={{ padding: 20 }}>
          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <h1 style={{ fontSize: 44, fontWeight: 900 }}>${balanceUSDT.toLocaleString()}</h1>
            <div style={{ color: '#00ff88', fontSize: 12 }}>WALLET ACTIVE • {Object.keys(wallet).filter(k => wallet[k] > 0).length} ASSETS</div>
          </div>

          {signal && (
            <div style={{ background: '#111', border: '1px solid #222', padding: 15, borderRadius: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: '#00ff88', fontWeight: 'bold' }}>LIVE ARBITRAGE</div>
              <div style={{ marginTop: 10 }}>Купи <b>{signal.coin.symbol}</b> на <span style={{ color: '#ff007a' }}>{signal.buyAt}</span></div>
              <div>Продай на <span style={{ color: '#39f2af' }}>{signal.sellAt}</span> <b style={{ color: '#00ff88' }}>+{signal.profit}%</b></div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'].map(id => (
              <button key={id} onClick={() => {
                setActiveDex(id);
                setPayToken(ASSETS.USDT);
                setReceiveToken(id === 'RAYDIUM' ? ASSETS.SOL : ASSETS.ETH);
              }} style={{ background: '#1a1a1a', border: '1px solid #333', padding: 20, borderRadius: 15, color: '#fff', fontWeight: 'bold' }}>{id}</button>
            ))}
          </div>
        </div>
      ) : (
        /* ДИНАМИЧЕСКИЙ ТЕРМИНАЛ БИРЖИ */
        <div style={{ 
          height: '100%', 
          background: activeDex === 'UNISWAP' ? '#fff' : (activeDex === 'RAYDIUM' ? '#0c0d21' : (activeDex === 'PANCAKE' ? '#eaf2f6' : '#131823')),
          color: activeDex === 'UNISWAP' || activeDex === 'PANCAKE' ? '#000' : '#fff'
        }}>
          <div style={{ padding: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
            <b style={{ fontSize: 18 }}>{activeDex}</b>
            <button onClick={() => setActiveDex(null)} style={{ background: 'rgba(128,128,128,0.1)', border: 'none', padding: '5px 12px', borderRadius: 8, color: 'inherit' }}>BACK</button>
          </div>

          <div style={{ padding: 20 }}>
            <div style={{ 
              background: activeDex === 'UNISWAP' ? '#f7f8fa' : (activeDex === 'RAYDIUM' ? '#14162e' : '#fff'),
              padding: 15, borderRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              {/* ПОЛЕ ВВОДА */}
              <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : 'rgba(0,0,0,0.05)', padding: 15, borderRadius: 16 }}>
                <div style={{ fontSize: 11, opacity: 0.5 }}>You pay</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" style={{ background: 'none', border: 'none', fontSize: 26, width: '60%', color: 'inherit', outline: 'none' }} />
                  <button onClick={() => { setShowTokens(true); setSelectingFor('pay'); }} style={{ background: 'rgba(128,128,128,0.1)', border: 'none', padding: '6px 12px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 5, color: 'inherit' }}>
                    <img src={payToken.icon} width="18" /> {payToken.symbol} ▾
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'center', margin: '5px 0', fontSize: 20 }}>↓</div>

              {/* ПОЛЕ ВЫВОДА */}
              <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : 'rgba(0,0,0,0.05)', padding: 15, borderRadius: 16, marginBottom: 15 }}>
                <div style={{ fontSize: 11, opacity: 0.5 }}>You receive</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <div style={{ fontSize: 26 }}>{amount ? (payToken.symbol === 'USDT' ? (amount / receiveToken.price).toFixed(4) : (amount * payToken.price).toFixed(2)) : '0.0'}</div>
                  <button onClick={() => { setShowTokens(true); setSelectingFor('receive'); }} style={{ background: activeDex === 'UNISWAP' ? '#ff007a' : (activeDex === 'RAYDIUM' ? '#39f2af' : '#7645d9'), border: 'none', padding: '6px 12px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 5, color: activeDex === 'RAYDIUM' ? '#000' : '#fff' }}>
                    <img src={receiveToken.icon} width="18" /> {receiveToken.symbol} ▾
                  </button>
                </div>
              </div>

              <button onClick={handleSwap} style={{ 
                width: '100%', padding: 18, borderRadius: 16, border: 'none', fontWeight: 'bold', fontSize: 16,
                background: activeDex === 'UNISWAP' ? 'rgba(255,0,122,0.1)' : (activeDex === 'RAYDIUM' ? '#39f2af' : '#7645d9'),
                color: activeDex === 'UNISWAP' ? '#ff007a' : (activeDex === 'RAYDIUM' ? '#000' : '#fff')
              }}>
                {isProcessing ? 'CONFIRMING...' : (payToken.symbol === 'USDT' ? 'BUY ASSET' : 'SELL ASSET')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isProcessing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loader"></div></div>}
      <style>{`.loader { width: 40px; height: 40px; border: 4px solid #333; border-top-color: #00ff88; border-radius: 50%; animation: s 1s linear infinite; } @keyframes s { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
