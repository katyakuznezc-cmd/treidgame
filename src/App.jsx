import React, { useState, useEffect } from 'react';

const ASSETS = {
  USDT: { symbol: 'USDT', name: 'Tether', price: 1, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 145.50, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 605.20, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' }
};

export default function ArbitrageMaster() {
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
      const isNegative = Math.random() < 0.25;
      const profit = isNegative ? -(Math.random() * 1.5).toFixed(2) : (Math.random() * 2 + 1).toFixed(2);
      setSignal({ coin, buyAt: 'UNISWAP', sellAt: 'RAYDIUM', profit: parseFloat(profit) });
    }
  }, [signal]);

  // Умная кнопка MAX: берет баланс того токена, который сейчас в поле "Pay"
  const handleMax = () => {
    if (payToken.symbol === 'USDT') {
      setAmount(balanceUSDT.toString());
    } else {
      const tokenBal = wallet[payToken.symbol] || 0;
      setAmount(tokenBal.toString());
    }
  };

  const showNotify = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSwap = () => {
    if (!amount || amount <= 0) return;
    setIsProcessing(true);

    // Ровно 6 секунд обработки
    setTimeout(() => {
      const numAmount = Number(amount);
      
      if (payToken.symbol === 'USDT') {
        // ПОКУПКА
        if (balanceUSDT >= numAmount) {
          const received = numAmount / receiveToken.price;
          setBalanceUSDT(b => b - numAmount);
          setWallet(w => ({ ...w, [receiveToken.symbol]: (w[receiveToken.symbol] || 0) + received }));
          showNotify('success', `Куплено ${received.toFixed(4)} ${receiveToken.symbol}`);
        } else {
          showNotify('error', 'Недостаточно USDT!');
        }
      } else {
        // ПРОДАЖА
        const userHas = wallet[payToken.symbol] || 0;
        if (userHas >= numAmount) {
          const isCorrectDex = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          const slippageEvent = Math.random() < 0.2; // Риск просадки
          
          let resultProfit = isCorrectDex ? signal.profit : -10; 
          if (slippageEvent) resultProfit = -(Math.random() * 1.5);

          const finalUSDT = (numAmount * payToken.price) * (1 + resultProfit/100);
          const diff = finalUSDT - (numAmount * payToken.price);

          setBalanceUSDT(b => b + finalUSDT);
          setWallet(w => ({ ...w, [payToken.symbol]: userHas - numAmount }));
          
          if (diff >= 0) {
            showNotify('success', `Сделка закрыта: +$${diff.toFixed(2)} (${resultProfit}%)`);
          } else {
            showNotify('error', `Отрицательный результат: $${diff.toFixed(2)} (${resultProfit}%)`);
          }
          setSignal(null); // Генерируем новый сигнал
        } else {
          showNotify('error', `У вас нет столько ${payToken.symbol}`);
        }
      }

      setIsProcessing(false); // ОСТАНОВКА ЗАГРУЗКИ
      setAmount('');
    }, 6000);
  };

  const TokenSelector = () => (
    <div style={{ position: 'fixed', inset: 0, background: '#111', zIndex: 9999, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2>Выберите токен</h2>
        <button onClick={() => setShowTokenList(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 30 }}>×</button>
      </div>
      {Object.values(ASSETS).map(t => (
        <div key={t.symbol} onClick={() => {
          if (selectingFor === 'pay') setPayToken(t); else setReceiveToken(t);
          setShowTokenList(false);
        }} style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '15px 0', borderBottom: '1px solid #222' }}>
          <img src={t.icon} width="30" />
          <div style={{ flex: 1 }}><b>{t.symbol}</b></div>
          <div style={{ color: '#39f2af' }}>
            {t.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[t.symbol] || 0).toFixed(4)}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', color: '#fff', fontFamily: 'sans-serif' }}>
      
      {showTokenList && <TokenSelector />}

      {/* УВЕДОМЛЕНИЕ */}
      {notification && (
        <div style={{ position: 'fixed', top: 20, left: '5%', width: '90%', background: notification.type === 'success' ? '#39f2af' : '#ff4444', color: '#000', padding: 15, borderRadius: 12, zIndex: 10000, textAlign: 'center', fontWeight: 'bold' }}>
          {notification.text}
        </div>
      )}

      {!activeDex ? (
        <div style={{ padding: 20 }}>
          <div style={{ textAlign: 'center', margin: '40px 0' }}>
            <h1 style={{ fontSize: 40, fontWeight: 900 }}>${balanceUSDT.toLocaleString(undefined, {maximumFractionDigits: 2})}</h1>
            <p style={{ opacity: 0.5 }}>ВАШ БАЛАНС</p>
          </div>

          <div style={{ background: '#111', padding: 20, borderRadius: 24, border: '1px solid #222', marginBottom: 25 }}>
            <span style={{ color: '#39f2af', fontSize: 10, fontWeight: 'bold' }}>СИГНАЛ ОБНАРУЖЕН</span>
            {signal && (
              <div style={{ marginTop: 10 }}>
                <div>Купи {signal.coin.symbol} на <span style={{ color: '#ff007a' }}>{signal.buyAt}</span></div>
                <div>Продай на {signal.sellAt} <b style={{ color: signal.profit > 0 ? '#39f2af' : '#ff4444' }}>{signal.profit}%</b></div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'].map(id => (
              <button key={id} onClick={() => setActiveDex(id)} style={{ background: '#1a1a1a', border: '1px solid #333', padding: 25, borderRadius: 20, color: '#fff', fontWeight: 'bold' }}>{id}</button>
            ))}
          </div>
          
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <a href="https://t.me/kriptoalians" style={{ color: '#333', textDecoration: 'none', fontSize: 12 }}>MANAGER @KRIPTOALIANS</a>
          </div>
        </div>
      ) : (
        /* ТЕРМИНАЛ */
        <div style={{ height: '100%', background: activeDex === 'UNISWAP' ? '#fff' : '#0c0d21', color: activeDex === 'UNISWAP' ? '#000' : '#fff' }}>
          <div style={{ padding: 15, display: 'flex', justifyContent: 'space-between' }}>
            <b>{activeDex} EXCHANGE</b>
            <span onClick={() => setActiveDex(null)}>ВЫХОД</span>
          </div>

          <div style={{ padding: 20 }}>
            <div style={{ background: activeDex === 'UNISWAP' ? '#f7f8fa' : '#14162e', padding: 15, borderRadius: 24 }}>
              
              <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : '#050614', padding: 15, borderRadius: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span>Вы отдаете</span>
                  <span onClick={handleMax} style={{ color: '#39f2af', fontWeight: 'bold', cursor: 'pointer' }}>MAX</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" style={{ background: 'none', border: 'none', fontSize: 24, color: 'inherit', width: '60%', outline: 'none' }} />
                  <button onClick={() => { setShowTokenList(true); setSelectingFor('pay'); }} style={{ background: 'rgba(128,128,128,0.1)', border: 'none', padding: '5px 10px', borderRadius: 10, color: 'inherit' }}>
                    {payToken.symbol} ▾
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'center', margin: '10px 0' }}>↓</div>

              <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : '#050614', padding: 15, borderRadius: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 12, opacity: 0.5 }}>Вы получаете (эстимейт)</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <div style={{ fontSize: 24 }}>{amount ? (payToken.symbol === 'USDT' ? (amount / receiveToken.price).toFixed(4) : (amount * payToken.price).toFixed(2)) : '0.0'}</div>
                  <button onClick={() => { setShowTokenList(true); setSelectingFor('receive'); }} style={{ background: activeDex === 'UNISWAP' ? '#ff007a' : '#39f2af', border: 'none', padding: '5px 10px', borderRadius: 10, color: activeDex === 'UNISWAP' ? '#fff' : '#000' }}>
                    {receiveToken.symbol} ▾
                  </button>
                </div>
              </div>

              <button onClick={handleSwap} disabled={isProcessing} style={{ 
                width: '100%', padding: 20, borderRadius: 20, border: 'none', fontWeight: 'bold', fontSize: 16,
                background: isProcessing ? '#444' : (activeDex === 'UNISWAP' ? '#ff007a' : '#39f2af'),
                color: isProcessing ? '#888' : (activeDex === 'UNISWAP' ? '#fff' : '#000')
              }}>
                {isProcessing ? 'ТРАНЗАКЦИЯ В ОБРАБОТКЕ...' : (payToken.symbol === 'USDT' ? 'КУПИТЬ' : 'ПРОДАТЬ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ФИНАЛЬНЫЙ ЛОАДЕР */}
      {isProcessing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loader"></div>
          <h2 style={{ marginTop: 25 }}>Ожидание сети...</h2>
          <p style={{ opacity: 0.4 }}>Это может занять до 6 секунд</p>
        </div>
      )}

      <style>{`.loader { width: 50px; height: 50px; border: 5px solid #222; border-top-color: #39f2af; border-radius: 50%; animation: s 1s linear infinite; } @keyframes s { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
