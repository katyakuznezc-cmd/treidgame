import React, { useState, useEffect } from 'react';

const ASSETS = {
  USDT: { symbol: 'USDT', name: 'Tether', price: 1, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 145.50, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 605.20, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' }
};

export default function UltimateArbitrageApp() {
  // Сохранение данных
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
  const [notification, setNotification] = useState(null); // { type: 'success'|'error', text: '' }
  
  const [payToken, setPayToken] = useState(ASSETS.USDT);
  const [receiveToken, setReceiveToken] = useState(ASSETS.SOL);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    localStorage.setItem('arb_balance', balanceUSDT);
    localStorage.setItem('arb_wallet', JSON.stringify(wallet));
  }, [balanceUSDT, wallet]);

  // Генератор сигналов (Макс +3%, минусы до -1.5%)
  useEffect(() => {
    if (!signal) {
      const tokens = [ASSETS.SOL, ASSETS.ETH, ASSETS.BNB];
      const coin = tokens[Math.floor(Math.random() * tokens.length)];
      const isNegative = Math.random() < 0.3;
      const profit = isNegative 
        ? -(Math.random() * 1 + 0.5).toFixed(2) 
        : (Math.random() * 2 + 1).toFixed(2);
      setSignal({ coin, buyAt: 'UNISWAP', sellAt: 'RAYDIUM', profit: parseFloat(profit) });
    }
  }, [signal]);

  const handleMax = () => {
    const maxVal = payToken.symbol === 'USDT' ? balanceUSDT : (wallet[payToken.symbol] || 0);
    setAmount(maxVal.toString());
  };

  const showNotify = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSwap = () => {
    if (!amount || amount <= 0) return;
    setIsProcessing(true);

    // Задержка закрытия сделки — 6 секунд
    setTimeout(() => {
      const numAmount = Number(amount);
      
      if (payToken.symbol === 'USDT') {
        // ЛОГИКА ПОКУПКИ
        if (balanceUSDT >= numAmount) {
          setBalanceUSDT(b => b - numAmount);
          setWallet(w => ({ ...w, [receiveToken.symbol]: (w[receiveToken.symbol] || 0) + (numAmount / receiveToken.price) }));
          showNotify('success', `Куплено ${receiveToken.symbol}`);
        }
      } else {
        // ЛОГИКА ПРОДАЖИ (ЗАКРЫТИЕ СДЕЛКИ)
        const userHas = wallet[payToken.symbol] || 0;
        if (userHas >= numAmount) {
          const isCorrectDex = activeDex === signal?.sellAt;
          
          // Рандомный шанс (20%), что цена изменится в минус за 6 секунд
          const isSlippage = Math.random() < 0.20;
          let finalProfit = isCorrectDex ? signal.profit : -20;
          
          if (isSlippage) {
            finalProfit = -(Math.random() * 1.5).toFixed(2); // Резкий минус до 1.5%
          }

          const profitMult = (1 + finalProfit/100);
          const resultUSDT = numAmount * payToken.price * profitMult;
          const diff = resultUSDT - (numAmount * payToken.price);

          setBalanceUSDT(b => b + resultUSDT);
          setWallet(w => ({ ...w, [payToken.symbol]: userHas - numAmount }));
          
          if (diff >= 0) {
            showNotify('success', `Сделка закрыта! Профит: +$${diff.toFixed(2)}`);
          } else {
            showNotify('error', `Проскальзывание! Убыток: $${diff.toFixed(2)}`);
          }
          setSignal(null);
        }
      }
      setIsProcessing(false);
      setAmount('');
    }, 6000); // 6 секунд ожидания
  };

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      
      {/* УВЕДОМЛЕНИЕ (на 3 секунды) */}
      {notification && (
        <div style={{
          position: 'fixed', top: 20, left: '5%', width: '90%', 
          background: notification.type === 'success' ? '#00ff88' : '#ff4444',
          color: '#000', padding: '15px', borderRadius: '12px', textAlign: 'center',
          fontWeight: 'bold', zIndex: 10000, boxShadow: '0 5px 20px rgba(0,0,0,0.5)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {notification.text}
        </div>
      )}

      {/* ГЛАВНЫЙ ЭКРАН */}
      {!activeDex ? (
        <div style={{ padding: 20 }}>
          <header style={{ textAlign: 'center', margin: '30px 0' }}>
            <h1 style={{ fontSize: 42, fontWeight: 900 }}>${balanceUSDT.toLocaleString(undefined, {maximumFractionDigits: 2})}</h1>
            <p style={{ opacity: 0.5, fontSize: 12 }}>ДОСТУПНЫЙ БАЛАНС</p>
          </header>

          <div style={{ background: '#111', padding: 20, borderRadius: 24, border: '1px solid #222', marginBottom: 20 }}>
            <div style={{ color: '#00ff88', fontSize: 10, fontWeight: 'bold' }}>СИГНАЛ ОТ МЕНЕДЖЕРА</div>
            {signal && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 18 }}>Купи {signal.coin.symbol} на <span style={{ color: '#ff007a' }}>{signal.buyAt}</span></div>
                <div style={{ fontSize: 18 }}>Продай на {signal.sellAt} <b style={{ color: signal.profit > 0 ? '#00ff88' : '#ff4444' }}>{signal.profit}%</b></div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'].map(id => (
              <button key={id} onClick={() => setActiveDex(id)} style={{ background: '#1a1a1a', border: '1px solid #333', padding: 20, borderRadius: 15, color: '#fff', fontWeight: 'bold' }}>{id}</button>
            ))}
          </div>
        </div>
      ) : (
        /* ТЕРМИНАЛ БИРЖИ */
        <div style={{ height: '100%', background: activeDex === 'UNISWAP' ? '#fff' : '#0c0d21', color: activeDex === 'UNISWAP' ? '#000' : '#fff' }}>
          <div style={{ padding: 15, display: 'flex', justifyContent: 'space-between' }}>
            <b>{activeDex} V3</b>
            <span onClick={() => setActiveDex(null)} style={{ cursor: 'pointer' }}>ВЫХОД</span>
          </div>

          <div style={{ padding: 20 }}>
            <div style={{ background: activeDex === 'UNISWAP' ? '#f7f8fa' : '#14162e', padding: 15, borderRadius: 24 }}>
              <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : '#050614', padding: 15, borderRadius: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span>Отдаете</span>
                  <span onClick={handleMax} style={{ color: '#39f2af', fontWeight: 'bold', cursor: 'pointer' }}>MAX</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ background: 'none', border: 'none', fontSize: 24, color: 'inherit', width: '60%', outline: 'none' }} placeholder="0.0" />
                  <div>{payToken.symbol}</div>
                </div>
              </div>

              <div style={{ textAlign: 'center', margin: '10px 0' }}>↓</div>

              <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : '#050614', padding: 15, borderRadius: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 11, opacity: 0.5 }}>Получаете (эстимейт)</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <div style={{ fontSize: 24 }}>{amount ? (payToken.symbol === 'USDT' ? (amount / receiveToken.price).toFixed(4) : (amount * payToken.price).toFixed(2)) : '0.0'}</div>
                  <div>{receiveToken.symbol}</div>
                </div>
              </div>

              <button onClick={handleSwap} disabled={isProcessing} style={{ 
                width: '100%', padding: 18, borderRadius: 18, border: 'none', fontWeight: 'bold',
                background: isProcessing ? '#333' : (activeDex === 'UNISWAP' ? '#ff007a' : '#39f2af'),
                color: isProcessing ? '#888' : (activeDex === 'UNISWAP' ? '#fff' : '#000')
              }}>
                {isProcessing ? 'ОЖИДАНИЕ ПОДТВЕРЖДЕНИЯ (6s)...' : 'СОВЕРШИТЬ ОБМЕН'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ЭКРАН ЗАГРУЗКИ (6 СЕКУНД) */}
      {isProcessing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div className="loader"></div>
          <h2 style={{ marginTop: 20 }}>Обработка транзакции...</h2>
          <p style={{ opacity: 0.5 }}>Проверка ликвидности в сети</p>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { transform: translateY(-100px); } to { transform: translateY(0); } }
        .loader { width: 50px; height: 50px; border: 5px solid #333; border-top-color: #39f2af; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
