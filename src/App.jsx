import React, { useState, useEffect } from 'react';

const ASSETS = {
  USDT: { symbol: 'USDT', name: 'Tether', price: 1, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 145.50, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 605.20, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' }
};

const DEXES = ['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'];

export default function ArbitrageUltraApp() {
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

  // ГЕНЕРАТОР РАНДОМНЫХ СИГНАЛОВ
  useEffect(() => {
    if (!signal) {
      const tokens = [ASSETS.SOL, ASSETS.ETH, ASSETS.BNB];
      const coin = tokens[Math.floor(Math.random() * tokens.length)];
      
      // Выбираем две разные случайные биржи
      const shuffledDex = [...DEXES].sort(() => 0.5 - Math.random());
      const buyAt = shuffledDex[0];
      const sellAt = shuffledDex[1];

      const isNegative = Math.random() < 0.25;
      const profit = isNegative ? -(Math.random() * 1.5).toFixed(2) : (Math.random() * 2 + 1).toFixed(2);
      
      setSignal({ coin, buyAt, sellAt, profit: parseFloat(profit) });
    }
  }, [signal]);

  const handleMax = () => {
    const maxVal = payToken.symbol === 'USDT' ? balanceUSDT : (wallet[payToken.symbol] || 0);
    setAmount(maxVal.toString());
  };

  const showNotify = (type, text, duration = 3500) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), duration);
  };

  const handleSwap = () => {
    if (!amount || amount <= 0) return;
    setIsProcessing(true);

    setTimeout(() => {
      const numAmount = Number(amount);
      
      if (payToken.symbol === 'USDT') {
        // ПОКУПКА
        if (balanceUSDT >= numAmount) {
          const received = numAmount / receiveToken.price;
          setBalanceUSDT(b => b - numAmount);
          setWallet(w => ({ ...w, [receiveToken.symbol]: (w[receiveToken.symbol] || 0) + received }));
          // Сообщение о покупке исчезает быстро (1.2 сек)
          showNotify('success', `Куплено ${receiveToken.symbol}`, 1200);
        } else {
          showNotify('error', 'Недостаточно USDT');
        }
      } else {
        // ПРОДАЖА
        const userHas = wallet[payToken.symbol] || 0;
        if (userHas >= numAmount) {
          const isCorrectDex = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          const slippage = Math.random() < 0.2; 
          
          let resProfit = isCorrectDex ? signal.profit : -15; 
          if (slippage && isCorrectDex) resProfit = -(Math.random() * 1.5);

          const finalUSDT = (numAmount * payToken.price) * (1 + resProfit/100);
          const diff = finalUSDT - (numAmount * payToken.price);

          setBalanceUSDT(b => b + finalUSDT);
          setWallet(w => ({ ...w, [payToken.symbol]: userHas - numAmount }));
          
          if (diff >= 0) showNotify('success', `Профит: +$${diff.toFixed(2)} (${resProfit}%)`);
          else showNotify('error', `Убыток: $${diff.toFixed(2)} (${resProfit}%)`);
          
          setSignal(null); 
        } else {
          showNotify('error', 'Недостаточно токенов');
        }
      }
      setIsProcessing(false);
      setAmount('');
    }, 6000);
  };

  const TokenSelector = () => (
    <div style={{ position: 'fixed', inset: 0, background: '#111', zIndex: 9999, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2>Токены</h2>
        <button onClick={() => setShowTokenList(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 32 }}>×</button>
      </div>
      {Object.values(ASSETS).map(t => (
        <div key={t.symbol} onClick={() => {
          if (selectingFor === 'pay') setPayToken(t); else setReceiveToken(t);
          setShowTokenList(false);
        }} style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '18px 0', borderBottom: '1px solid #222' }}>
          <img src={t.icon} width="30" />
          <div style={{ flex: 1 }}><b>{t.symbol}</b></div>
          <div style={{ color: '#39f2af', fontSize: 14 }}>
            {t.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[t.symbol] || 0).toFixed(4)}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', color: '#fff', fontFamily: 'system-ui' }}>
      
      {showTokenList && <TokenSelector />}

      {notification && (
        <div style={{ position: 'fixed', top: 20, left: '5%', width: '90%', background: notification.type === 'success' ? '#39f2af' : '#ff4444', color: '#000', padding: 15, borderRadius: 12, zIndex: 10000, textAlign: 'center', fontWeight: 'bold' }}>
          {notification.text}
        </div>
      )}

      {!activeDex ? (
        <div style={{ padding: 20 }}>
          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <h1 style={{ fontSize: 44, fontWeight: 900 }}>${balanceUSDT.toLocaleString(undefined, {maximumFractionDigits: 2})}</h1>
            <p style={{ opacity: 0.5, fontSize: 12, letterSpacing: 1 }}>WALLET ASSETS</p>
          </div>

          {signal && (
            <div style={{ background: 'linear-gradient(135deg, #111, #1a1a1a)', padding: 20, borderRadius: 24, border: '1px solid #333', marginBottom: 25 }}>
              <div style={{ color: '#39f2af', fontSize: 10, fontWeight: 900, marginBottom: 10 }}>LIVE ARBITRAGE SIGNAL</div>
              <div style={{ fontSize: 17 }}>1. Купи {signal.coin.symbol} на <b style={{ color: '#ff007a' }}>{signal.buyAt}</b></div>
              <div style={{ fontSize: 17 }}>2. Продай на <b style={{ color: '#39f2af' }}>{signal.sellAt}</b> <span style={{ color: signal.profit > 0 ? '#39f2af' : '#ff4444' }}>({signal.profit}%)</span></div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {DEXES.map(id => (
              <button key={id} onClick={() => setActiveDex(id)} style={{ background: '#111', border: '1px solid #222', padding: 25, borderRadius: 20, color: '#fff', fontWeight: 'bold' }}>{id}</button>
            ))}
          </div>
          
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <a href="https://t.me/kriptoalians" style={{ color: '#222', textDecoration: 'none', fontSize: 11 }}>SUPPORT @KRIPTOALIANS</a>
          </div>
        </div>
      ) : (
        <div style={{ height: '100%', background: activeDex === 'UNISWAP' ? '#fff' : '#0c0d21', color: activeDex === 'UNISWAP' ? '#000' : '#fff' }}>
          <div style={{ padding: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
            <b style={{ fontSize: 18 }}>{activeDex}</b>
            <span onClick={() => setActiveDex(null)} style={{ opacity: 0.5, fontSize: 14 }}>ЗАКРЫТЬ</span>
          </div>

          <div style={{ padding: 20 }}>
            <div style={{ background: activeDex === 'UNISWAP' ? '#f7f8fa' : '#14162e', padding: 15, borderRadius: 24 }}>
              
              <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : '#050614', padding: 15, borderRadius: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 8 }}>
                  <span>ОТДАЕТЕ</span>
                  <span onClick={handleMax} style={{ color: '#39f2af', fontWeight: 900, cursor: 'pointer' }}>MAX</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" style={{ background: 'none', border: 'none', fontSize: 26, color: 'inherit', width: '60%', outline: 'none' }} />
                  <button onClick={() => { setShowTokenList(true); setSelectingFor('pay'); }} style={{ background: 'rgba(128,128,128,0.05)', border: 'none', padding: '5px 10px', borderRadius: 10, color: 'inherit', fontWeight: 'bold' }}>{payToken.symbol} ▾</button>
                </div>
              </div>

              <div style={{ textAlign: 'center', margin: '8px 0', fontSize: 20 }}>↓</div>

              <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : '#050614', padding: 15, borderRadius: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8 }}>ПОЛУЧАЕТЕ</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 26 }}>{amount ? (payToken.symbol === 'USDT' ? (amount / receiveToken.price).toFixed(4) : (amount * payToken.price).toFixed(2)) : '0.0'}</div>
                  <button onClick={() => { setShowTokenList(true); setSelectingFor('receive'); }} style={{ background: activeDex === 'UNISWAP' ? '#ff007a' : '#39f2af', border: 'none', padding: '5px 10px', borderRadius: 10, color: activeDex === 'UNISWAP' ? '#fff' : '#000', fontWeight: 'bold' }}>{receiveToken.symbol} ▾</button>
                </div>
              </div>

              <button onClick={handleSwap} disabled={isProcessing} style={{ 
                width: '100%', padding: 20, borderRadius: 20, border: 'none', fontWeight: 900, fontSize: 16,
                background: isProcessing ? '#222' : (activeDex === 'UNISWAP' ? '#ff007a' : '#39f2af'),
                color: isProcessing ? '#555' : (activeDex === 'UNISWAP' ? '#fff' : '#000'),
                transition: '0.2s'
              }}>
                {isProcessing ? 'CONFIRMING...' : (payToken.symbol === 'USDT' ? 'КУПИТЬ' : 'ПРОДАТЬ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loader"></div>
          <h2 style={{ marginTop: 25, letterSpacing: 1 }}>ОБРАБОТКА...</h2>
          <p style={{ opacity: 0.4, fontSize: 13 }}>Ожидание подтверждения валидаторов</p>
        </div>
      )}

      <style>{`.loader { width: 50px; height: 50px; border: 5px solid #111; border-top-color: #39f2af; border-radius: 50%; animation: s 0.8s linear infinite; } @keyframes s { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
