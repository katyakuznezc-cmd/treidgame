

import React, { useState, useEffect } from 'react';

// Расширенный список активов
const ASSETS = {
  USDT: { symbol: 'USDT', name: 'Tether', price: 1, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 145.50, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 605.20, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  DOGE: { symbol: 'DOGE', name: 'Dogecoin', price: 0.16, icon: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
  XRP: { symbol: 'XRP', name: 'XRP', price: 0.62, icon: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
  ADA: { symbol: 'ADA', name: 'Cardano', price: 0.45, icon: 'https://cryptologos.cc/logos/cardano-ada-logo.png' },
  AVAX: { symbol: 'AVAX', name: 'Avalanche', price: 35.80, icon: 'https://cryptologos.cc/logos/avalanche-avax-logo.png' },
  MATIC: { symbol: 'MATIC', name: 'Polygon', price: 0.72, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.png' },
  DOT: { symbol: 'DOT', name: 'Polkadot', price: 7.10, icon: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png' },
  TRX: { symbol: 'TRX', name: 'TRON', price: 0.12, icon: 'https://cryptologos.cc/logos/tron-trx-logo.png' }
};

const DEXES = ['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'];

export default function MultiTokenArbApp() {
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

  // Генератор сигналов из расширенного списка (исключая USDT)
  useEffect(() => {
    if (!signal) {
      const availableTokens = Object.values(ASSETS).filter(t => t.symbol !== 'USDT');
      const coin = availableTokens[Math.floor(Math.random() * availableTokens.length)];
      const shuffled = [...DEXES].sort(() => 0.5 - Math.random());
      const profit = (Math.random() * 2 + 1.2).toFixed(2);
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
          showNotify(`Успешно куплено`, 'success', 1200);
        }
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          let prof = isCorrect ? signal.profit : 0;
          const finalVal = (num * payToken.price) * (1 + prof/100);
          const diff = finalVal - (num * payToken.price);
          setBalanceUSDT(b => b + finalVal);
          setWallet(w => ({ ...w, [payToken.symbol]: has - num }));
          if (diff > 0) showNotify(`Профит: +$${diff.toFixed(2)}`, 'success');
          else showNotify(`Сделка завершена`, 'success');
          setSignal(null);
        }
      }
      setIsProcessing(false);
      setAmount('');
    }, 6000);
  };

  const theme = activeDex === 'UNISWAP' || activeDex === 'PANCAKE' 
    ? { bg: activeDex === 'PANCAKE' ? '#f6f6f9' : '#fff', text: '#280d5f', inputBg: activeDex === 'PANCAKE' ? '#eeeaf4' : '#f7f8fa' }
    : { bg: activeDex === 'RAYDIUM' ? '#0c0d21' : '#060814', text: '#fff', inputBg: activeDex === 'RAYDIUM' ? '#14162e' : '#131823' };

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* Список токенов с прокруткой */}
      {showTokenList && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 10000, padding: 25, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, margin: 0 }}>Выберите актив</h2>
            <button onClick={() => setShowTokenList(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 35 }}>&times;</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: 5 }}>
            {Object.values(ASSETS).map(t => (
              <div key={t.symbol} onClick={() => { if (selectingFor === 'pay') setPayToken(t); else setReceiveToken(t); setShowTokenList(false); }} 
                   style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '18px 0', borderBottom: '1px solid #111' }}>
                <img src={t.icon} width="32" height="32" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>{t.symbol}</div>
                  <div style={{ fontSize: 11, opacity: 0.5 }}>{t.name}</div>
                </div>
                <div style={{ color: '#39f2af', textAlign: 'right' }}>
                  <div style={{ fontSize: 14 }}>{t.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[t.symbol] || 0).toFixed(4)}</div>
                  <div style={{ fontSize: 10, opacity: 0.5 }}>${t.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {notification && (
        <div style={{ position: 'fixed', top: 20, left: '5%', width: '90%', background: '#39f2af', color: '#000', padding: 18, borderRadius: 20, zIndex: 10001, textAlign: 'center', fontWeight: '900', animation: 'slideDown 0.3s' }}>
          {notification.text}
        </div>
      )}

      {!activeDex ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 20, boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', margin: '35px 0' }}>
            <h1 style={{ fontSize: 44, fontWeight: 900, margin: 0 }}>${balanceUSDT.toLocaleString(undefined, {maximumFractionDigits: 2})}</h1>
            <div style={{ opacity: 0.4, fontSize: 11, letterSpacing: 2, marginTop: 5 }}>ДОСТУПНЫЙ БАЛАНС</div>
          </div>

          {signal && (
            <div style={{ background: 'linear-gradient(135deg, #121212, #1a1a1a)', padding: 18, borderRadius: 22, border: '1px solid #222', marginBottom: 20 }}>
              <div style={{ color: '#39f2af', fontSize: 9, fontWeight: 900, marginBottom: 8 }}>СИГНАЛ ОБНАРУЖЕН</div>
              <div style={{ fontSize: 16, marginBottom: 4 }}>Купить {signal.coin.symbol} на <span style={{ color: '#ff007a' }}>{signal.buyAt}</span></div>
              <div style={{ fontSize: 16 }}>Продать на <span style={{ color: '#39f2af' }}>{signal.sellAt}</span> <span style={{ color: '#39f2af' }}>+{signal.profit}%</span></div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 'auto' }}>
            {DEXES.map(id => (
              <button key={id} onClick={() => setActiveDex(id)} style={{ background: '#111', border: '1px solid #222', padding: '22px 0', borderRadius: 18, color: '#fff', fontWeight: 'bold' }}>{id}</button>
            ))}
          </div>

          <div style={{ background: 'linear-gradient(90deg, #111, #1a1a1a)', padding: '15px 18px', borderRadius: 22, border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
            <div style={{ flex: 1, paddingRight: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold' }}>⚡️ Хотите реальный профит?</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Напишите менеджеру для перехода на реальный счет</div>
            </div>
            <a href="https://t.me/vladstelin78" style={{ background: '#39f2af', color: '#000', textDecoration: 'none', padding: '10px 15px', borderRadius: 12, fontSize: 11, fontWeight: '900' }}>НАЧАТЬ</a>
          </div>
        </div>
      ) : (
        /* ТЕРМИНАЛ БИРЖИ */
        <div style={{ height: '100%', background: theme.bg, color: theme.text, animation: 'slideIn 0.3s' }}>
          <div style={{ padding: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b style={{ fontSize: 18 }}>{activeDex}</b>
            <button onClick={() => setActiveDex(null)} style={{ background: 'rgba(128,128,128,0.1)', border: 'none', padding: '6px 12px', borderRadius: 10, color: 'inherit' }}>Назад</button>
          </div>

          <div style={{ padding: 15 }}>
            <div style={{ background: activeDex === 'PANCAKE' ? '#fff' : theme.inputBg, padding: 18, borderRadius: 28, boxShadow: activeDex === 'PANCAKE' ? '0 4px 0 #e9eaeb' : 'none' }}>
                <div style={{ background: activeDex === 'PANCAKE' ? '#eeeaf4' : 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.6 }}><span>ВЫ ОТДАЕТЕ</span><span onClick={handleMax} style={{ color: activeDex === 'PANCAKE' ? '#1fc7d4' : '#39f2af', fontWeight: 'bold' }}>МАКС</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" style={{ background: 'none', border: 'none', fontSize: 24, color: theme.text, outline: 'none', width: '60%' }} />
                        <button onClick={() => {setShowTokenList(true); setSelectingFor('pay')}} style={{ background: 'rgba(128,128,128,0.1)', border: 'none', padding: '4px 10px', borderRadius: 10, color: theme.text, fontWeight: 'bold' }}>{payToken.symbol} ▾</button>
                    </div>
                </div>
                <div style={{ textAlign: 'center', margin: '8px 0', fontSize: 18 }}>↓</div>
                <div style={{ background: activeDex === 'PANCAKE' ? '#eeeaf4' : 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 18, marginBottom: 20 }}>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>ВЫ ПОЛУЧАЕТЕ</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                        <div style={{ fontSize: 24 }}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                        <button onClick={() => {setShowTokenList(true); setSelectingFor('receive')}} style={{ background: activeDex === 'UNISWAP' ? '#ff007a' : (activeDex === 'PANCAKE' ? '#1fc7d4' : '#39f2af'), border: 'none', padding: '4px 10px', borderRadius: 10, color: activeDex === 'UNISWAP' ? '#fff' : '#000', fontWeight: 'bold' }}>{receiveToken.symbol} ▾</button>
                    </div>
                </div>
                <button onClick={handleSwap} style={{ width: '100%', padding: 20, borderRadius: 20, border: 'none', fontSize: 16, fontWeight: 900, background: activeDex === 'UNISWAP' ? '#ff007a' : (activeDex === 'PANCAKE' ? '#1fc7d4' : (activeDex === 'RAYDIUM' ? '#39f2af' : '#2f8af5')), color: activeDex === 'UNISWAP' ? '#fff' : '#000' }}>
                   {isProcessing ? 'СИНХРОНИЗАЦИЯ...' : (payToken.symbol === 'USDT' ? 'ОБМЕНЯТЬ' : 'ПРОДАТЬ')}
                </button>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.97)', zIndex: 10002, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loader"></div>
          <h2 style={{ marginTop: 20, fontSize: 18 }}>ОБРАБОТКА...</h2>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        .loader { width: 40px; height: 40px; border: 3px solid #111; border-top-color: #39f2af; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
