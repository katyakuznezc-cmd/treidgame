import React, { useState, useEffect } from 'react';

const ASSETS = {
  USDT: { symbol: 'USDT', name: 'Tether', price: 1, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 145.50, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 605.20, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  CRO: { symbol: 'CRO', name: 'Cronos', price: 0.16, icon: 'https://cryptologos.cc/logos/cronos-cro-logo.png' }
};

export default function ProfessionalArbitrage() {
  // --- STATE: ХРАНЕНИЕ ---
  const [balanceUSDT, setBalanceUSDT] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('arb_wallet')) || {});
  
  // --- STATE: ИНТЕРФЕЙС ---
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showTokenList, setShowTokenList] = useState(false);
  const [selectingFor, setSelectingFor] = useState('pay'); // 'pay' or 'receive'

  // --- STATE: ТЕРМИНАЛ ---
  const [payToken, setPayToken] = useState(ASSETS.USDT);
  const [receiveToken, setReceiveToken] = useState(ASSETS.SOL);
  const [amount, setAmount] = useState('');

  // Синхронизация с памятью
  useEffect(() => {
    localStorage.setItem('arb_balance', balanceUSDT);
    localStorage.setItem('arb_wallet', JSON.stringify(wallet));
  }, [balanceUSDT, wallet]);

  // Генератор сигналов (Макс +3%, Рандомный минус)
  useEffect(() => {
    if (!signal) {
      const tokens = [ASSETS.SOL, ASSETS.ETH, ASSETS.BNB, ASSETS.CRO];
      const coin = tokens[Math.floor(Math.random() * tokens.length)];
      const isNegative = Math.random() < 0.25;
      const profit = isNegative ? -(Math.random() * 1.5).toFixed(2) : (Math.random() * 2 + 1).toFixed(2);
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

    // Имитация блокчейна (6 секунд)
    setTimeout(() => {
      const numAmount = Number(amount);
      
      if (payToken.symbol === 'USDT') {
        if (balanceUSDT >= numAmount) {
          setBalanceUSDT(b => b - numAmount);
          setWallet(w => ({ ...w, [receiveToken.symbol]: (w[receiveToken.symbol] || 0) + (numAmount / receiveToken.price) }));
          showNotify('success', `Успешно куплено ${receiveToken.symbol}`);
        } else { showNotify('error', 'Недостаточно USDT'); }
      } else {
        const userHas = wallet[payToken.symbol] || 0;
        if (userHas >= numAmount) {
          // Логика проскальзывания и профита
          const isCorrectDex = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          const slippageChance = Math.random() < 0.2; // 20% шанс просадки за 6 сек
          
          let resultProfit = isCorrectDex ? signal.profit : -15; // Штраф за неверную биржу
          if (isSlippageChance && isCorrectDex) resultProfit = -(Math.random() * 1.5);

          const finalAmountUSDT = (numAmount * payToken.price) * (1 + resultProfit/100);
          const diff = finalAmountUSDT - (numAmount * payToken.price);

          setBalanceUSDT(b => b + finalAmountUSDT);
          setWallet(w => ({ ...w, [payToken.symbol]: userHas - numAmount }));
          
          if (diff >= 0) showNotify('success', `Профит: +$${diff.toFixed(2)}`);
          else showNotify('error', `Убыток (Slippage): $${diff.toFixed(2)}`);
          
          setSignal(null);
        } else { showNotify('error', 'Недостаточно токенов'); }
      }
      setIsProcessing(false);
      setAmount('');
    }, 6000);
  };

  // --- КОМПОНЕНТ: ВЫБОР МОНЕТЫ ---
  const TokenSelector = () => (
    <div style={{ position: 'fixed', inset: 0, background: '#111', zIndex: 9999, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3>Выберите токен</h3>
        <button onClick={() => setShowTokenList(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 30 }}>×</button>
      </div>
      {Object.values(ASSETS).map(t => (
        <div key={t.symbol} onClick={() => {
          if (selectingFor === 'pay') setPayToken(t); else setReceiveToken(t);
          setShowTokenList(false);
        }} style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '15px 0', borderBottom: '1px solid #222', cursor: 'pointer' }}>
          <img src={t.icon} width="35" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold' }}>{t.symbol}</div>
            <div style={{ fontSize: 12, opacity: 0.5 }}>{t.name}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12 }}>
            <div>${t.price}</div>
            <div style={{ color: '#39f2af' }}>
              Баланс: {t.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[t.symbol] || 0).toFixed(4)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      
      {showTokenList && <TokenSelector />}

      {/* Уведомление */}
      {notification && (
        <div style={{ position: 'fixed', top: 20, left: '5%', width: '90%', background: notification.type === 'success' ? '#39f2af' : '#ff4444', color: '#000', padding: 15, borderRadius: 12, zIndex: 10000, textAlign: 'center', fontWeight: 'bold' }}>
          {notification.text}
        </div>
      )}

      {!activeDex ? (
        <div style={{ padding: 20 }}>
          <header style={{ textAlign: 'center', margin: '30px 0' }}>
            <h1 style={{ fontSize: 45, fontWeight: 900 }}>${balanceUSDT.toLocaleString(undefined, {maximumFractionDigits: 2})}</h1>
            <p style={{ opacity: 0.5 }}>TOTAL BALANCE</p>
          </header>

          <div style={{ background: '#111', padding: 20, borderRadius: 24, border: '1px solid #222', marginBottom: 25 }}>
            <div style={{ color: '#39f2af', fontSize: 10, fontWeight: 'bold', marginBottom: 10 }}>NEW SIGNAL</div>
            {signal && (
              <>
                <div style={{ fontSize: 18 }}>Купи <b>{signal.coin.symbol}</b> на <span style={{ color: '#ff007a' }}>{signal.buyAt}</span></div>
                <div style={{ fontSize: 18 }}>Продай на {signal.sellAt} <b style={{ color: signal.profit > 0 ? '#39f2af' : '#ff4444' }}>{signal.profit}%</b></div>
              </>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            {['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'].map(dex => (
              <button key={dex} onClick={() => setActiveDex(dex)} style={{ background: '#1a1a1a', border: '1px solid #333', padding: 25, borderRadius: 20, color: '#fff', fontWeight: 'bold' }}>{dex}</button>
            ))}
          </div>
          
          <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center' }}>
            <a href="https://t.me/kriptoalians" style={{ color: '#333', textDecoration: 'none', fontSize: 12 }}>MANAGER @KRIPTOALIANS</a>
          </div>
        </div>
      ) : (
        /* ДИНАМИЧЕСКИЙ ТЕРМИНАЛ */
        <div style={{ height: '100%', background: activeDex === 'UNISWAP' ? '#fff' : (activeDex === 'RAYDIUM' ? '#0c0d21' : '#131823'), color: activeDex === 'UNISWAP' ? '#000' : '#fff' }}>
          <div style={{ padding: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b style={{ fontSize: 20 }}>{activeDex}</b>
            <span onClick={() => setActiveDex(null)} style={{ cursor: 'pointer', opacity: 0.6 }}>ЗАКРЫТЬ</span>
          </div>

          <div style={{ padding: 20 }}>
            <div style={{ background: activeDex === 'UNISWAP' ? '#f7f8fa' : '#1a1b36', padding: 15, borderRadius: 28 }}>
              {/* PAY FIELD */}
              <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : '#050614', padding: 18, borderRadius: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
                  <span>Вы отдаете</span>
                  <span onClick={handleMax} style={{ color: '#39f2af', fontWeight: 'bold', cursor: 'pointer' }}>MAX</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" style={{ background: 'none', border: 'none', fontSize: 28, color: 'inherit', width: '60%', outline: 'none' }} />
                  <button onClick={() => { setShowTokenList(true); setSelectingFor('pay'); }} style={{ background: 'rgba(128,128,128,0.1)', border: 'none', padding: '6px 12px', borderRadius: 15, color: 'inherit', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold' }}>
                    <img src={payToken.icon} width="20" /> {payToken.symbol} ▾
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'center', margin: '5px 0', fontSize: 24 }}>↓</div>

              {/* RECEIVE FIELD */}
              <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : '#050614', padding: 18, borderRadius: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 12, marginBottom: 10, opacity: 0.5 }}>Вы получаете</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 28 }}>{amount ? (payToken.symbol === 'USDT' ? (amount / receiveToken.price).toFixed(4) : (amount * payToken.price).toFixed(2)) : '0.0'}</div>
                  <button onClick={() => { setShowTokenList(true); setSelectingFor('receive'); }} style={{ background: activeDex === 'UNISWAP' ? '#ff007a' : '#39f2af', border: 'none', padding: '6px 12px', borderRadius: 15, color: activeDex === 'UNISWAP' ? '#fff' : '#000', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold' }}>
                    <img src={receiveToken.icon} width="20" /> {receiveToken.symbol} ▾
                  </button>
                </div>
              </div>

              <button onClick={handleSwap} disabled={isProcessing} style={{ 
                width: '100%', padding: 20, borderRadius: 20, border: 'none', fontWeight: 900, fontSize: 18,
                background: isProcessing ? '#444' : (activeDex === 'UNISWAP' ? '#ff007a' : '#39f2af'),
                color: activeDex === 'UNISWAP' ? '#fff' : '#000'
              }}>
                {isProcessing ? 'ТРАНЗАКЦИЯ В СЕТИ...' : 'ПОДТВЕРДИТЬ ОБМЕН'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOADER SCREEN */}
      {isProcessing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loader"></div>
          <h2 style={{ marginTop: 25 }}>Обработка ордера...</h2>
          <p style={{ opacity: 0.4 }}>Ожидание подтверждения от блокчейна</p>
        </div>
      )}

      <style>{`
        .loader { width: 55px; height: 55px; border: 6px solid #222; border-top-color: #39f2af; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
