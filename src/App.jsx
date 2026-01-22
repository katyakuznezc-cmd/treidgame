import React, { useState, useEffect } from 'react';

const ASSETS = {
  USDT: { symbol: 'USDT', name: 'Tether', price: 1, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 145.50, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 605.20, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' }
};

export default function ArbitrageProApp() {
  // --- СОХРАНЕНИЕ ДАННЫХ ---
  const [balanceUSDT, setBalanceUSDT] = useState(() => {
    const saved = localStorage.getItem('arb_balance');
    return saved ? parseFloat(saved) : 1000.00;
  });
  const [wallet, setWallet] = useState(() => {
    const saved = localStorage.getItem('arb_wallet');
    return saved ? JSON.parse(saved) : {};
  });

  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Terminal states
  const [payToken, setPayToken] = useState(ASSETS.USDT);
  const [receiveToken, setReceiveToken] = useState(ASSETS.SOL);
  const [amount, setAmount] = useState('');
  const [showTokens, setShowTokens] = useState(false);
  const [selectingFor, setSelectingFor] = useState('pay');

  // Сохранение в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('arb_balance', balanceUSDT);
    localStorage.setItem('arb_wallet', JSON.stringify(wallet));
  }, [balanceUSDT, wallet]);

  // Генератор сигналов (Макс +3%, рандомные минусы)
  useEffect(() => {
    if (!signal) {
      const tokens = [ASSETS.SOL, ASSETS.ETH, ASSETS.BNB];
      const coin = tokens[Math.floor(Math.random() * tokens.length)];
      // Шанс 30% на отрицательный сигнал (от -0.5% до -1.5%)
      const isNegative = Math.random() < 0.3;
      const profit = isNegative 
        ? -(Math.random() * 1 + 0.5).toFixed(2) 
        : (Math.random() * 2 + 1).toFixed(2); // Положительный до 3% (1+2)

      setSignal({ coin, buyAt: 'UNISWAP', sellAt: 'RAYDIUM', profit });
    }
  }, [signal]);

  const handleMax = () => {
    const maxVal = payToken.symbol === 'USDT' ? balanceUSDT : (wallet[payToken.symbol] || 0);
    setAmount(maxVal.toString());
  };

  const handleSwap = () => {
    if (!amount || amount <= 0) return;
    setIsProcessing(true);

    setTimeout(() => {
      const numAmount = Number(amount);
      if (payToken.symbol === 'USDT') {
        if (balanceUSDT >= numAmount) {
          setBalanceUSDT(b => b - numAmount);
          setWallet(w => ({ ...w, [receiveToken.symbol]: (w[receiveToken.symbol] || 0) + (numAmount / receiveToken.price) }));
        }
      } else {
        const userHas = wallet[payToken.symbol] || 0;
        if (userHas >= numAmount) {
          const isCorrect = activeDex === signal?.sellAt;
          // Если биржа верная - профит из сигнала, если нет - минус 20% (ошибка)
          const profitMult = isCorrect ? (1 + signal.profit/100) : 0.8;
          setBalanceUSDT(b => b + (numAmount * payToken.price * profitMult));
          setWallet(w => ({ ...w, [payToken.symbol]: userHas - numAmount }));
          setSignal(null);
        }
      }
      setIsProcessing(false);
      setAmount('');
    }, 1200);
  };

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* МЕНЮ НАСТРОЕК */}
      {isSettingsOpen && (
        <div style={{ position: 'fixed', inset: 0, background: '#111', zCenter: 10000, padding: 25 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
            <h2>Настройки</h2>
            <button onClick={() => setIsSettingsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24 }}>×</button>
          </div>
          <div style={{ background: '#1a1a1a', padding: 20, borderRadius: 15, marginBottom: 15, display: 'flex', justifyContent: 'space-between' }}>
            <span>Звуки кликов</span>
            <input type="checkbox" checked={soundEnabled} onChange={() => setSoundEnabled(!soundEnabled)} />
          </div>
          <a href="https://t.me/kriptoalians" target="_blank" style={{ display: 'block', background: '#39f2af', color: '#000', padding: 15, borderRadius: 15, textAlign: 'center', fontWeight: 'bold', textDecoration: 'none' }}>
            Связаться с менеджером
          </a>
        </div>
      )}

      {!activeDex ? (
        <div style={{ padding: 20 }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
            <div onClick={() => setIsSettingsOpen(true)} style={{ fontSize: 20 }}>⚙️</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold' }}>${balanceUSDT.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
              <div style={{ fontSize: 10, color: '#39f2af' }}>ONLINE WALLET</div>
            </div>
          </header>

          <div style={{ background: 'linear-gradient(45deg, #111, #1a1a1a)', padding: 20, borderRadius: 25, border: '1px solid #222', marginBottom: 25 }}>
            <div style={{ color: signal?.profit > 0 ? '#00ff88' : '#ff4444', fontWeight: 'bold', fontSize: 12 }}>
              {signal?.profit > 0 ? '🔥 ВЫГОДНАЯ СВЯЗКА' : '⚠️ РИСКОВАННЫЙ СИГНАЛ'}
            </div>
            <div style={{ marginTop: 10, fontSize: 18 }}>Купи {signal?.coin.symbol} на <span style={{ color: '#ff007a' }}>{signal?.buyAt}</span></div>
            <div style={{ fontSize: 18 }}>Продай на {signal?.sellAt} <b style={{ color: signal?.profit > 0 ? '#00ff88' : '#ff4444' }}>{signal?.profit}%</b></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'].map(id => (
              <button key={id} onClick={() => setActiveDex(id)} style={{ background: '#1a1a1a', border: '1px solid #333', padding: 25, borderRadius: 20, color: '#fff', fontWeight: 'bold' }}>{id}</button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ height: '100%', background: activeDex === 'UNISWAP' ? '#fff' : '#0c0d21', color: activeDex === 'UNISWAP' ? '#000' : '#fff' }}>
          <div style={{ padding: 15, display: 'flex', justifyContent: 'space-between' }}>
            <b>{activeDex} Terminal</b>
            <span onClick={() => setActiveDex(null)}>ЗАКРЫТЬ</span>
          </div>

          <div style={{ padding: 20 }}>
            <div style={{ background: activeDex === 'UNISWAP' ? '#f7f8fa' : '#14162e', padding: 15, borderRadius: 24 }}>
              <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : '#050614', padding: 15, borderRadius: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.5 }}>
                  <span>You pay</span>
                  <span onClick={handleMax} style={{ color: '#39f2af', fontWeight: 'bold' }}>MAX</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" style={{ background: 'none', border: 'none', fontSize: 24, color: 'inherit', width: '60%', outline: 'none' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <img src={payToken.icon} width="18" /> {payToken.symbol}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', margin: '10px 0' }}>↓</div>

              <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : '#050614', padding: 15, borderRadius: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 11, opacity: 0.5 }}>You receive</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <div style={{ fontSize: 24 }}>{amount ? (payToken.symbol === 'USDT' ? (amount / receiveToken.price).toFixed(4) : (amount * payToken.price).toFixed(2)) : '0.0'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <img src={receiveToken.icon} width="18" /> {receiveToken.symbol}
                  </div>
                </div>
              </div>

              <button onClick={handleSwap} style={{ 
                width: '100%', padding: 18, borderRadius: 18, border: 'none', fontWeight: 'bold',
                background: activeDex === 'UNISWAP' ? '#ff007a' : '#39f2af',
                color: activeDex === 'UNISWAP' ? '#fff' : '#000'
              }}>
                {isProcessing ? 'CONFIRMING...' : (payToken.symbol === 'USDT' ? 'SWAP' : 'CLOSE POSITION')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
