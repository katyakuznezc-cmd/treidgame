import React, { useState, useEffect } from 'react';

// --- Константы активов ---
const ASSETS = {
  USDT: { symbol: 'USDT', name: 'Tether', price: 1, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 145.50, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 605.20, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  DOGE: { symbol: 'DOGE', name: 'Dogecoin', price: 0.16, icon: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
  XRP: { symbol: 'XRP', name: 'XRP', price: 0.62, icon: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
  ADA: { symbol: 'ADA', name: 'Cardano', price: 0.45, icon: 'https://cryptologos.cc/logos/cardano-ada-logo.png' }
};

const DEXES = ['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'];

export default function FullArbitrageApp() {
  const [balanceUSDT, setBalanceUSDT] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('arb_wallet')) || {});
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('arb_history')) || []);
  
  const [activeDex, setActiveDex] = useState(null);
  const [view, setView] = useState('main'); // 'main' или 'history'
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
    localStorage.setItem('arb_history', JSON.stringify(history));
  }, [balanceUSDT, wallet, history]);

  // Генератор сигналов
  useEffect(() => {
    if (!signal) {
      const available = Object.values(ASSETS).filter(t => t.symbol !== 'USDT');
      const coin = available[Math.floor(Math.random() * available.length)];
      const shuffled = [...DEXES].sort(() => 0.5 - Math.random());
      const profit = (Math.random() * 1.5 + 1.5).toFixed(2);
      setSignal({ coin, buyAt: shuffled[0], sellAt: shuffled[1], profit: parseFloat(profit) });
    }
  }, [signal]);

  const showNotify = (text) => {
    setNotification(text);
    setTimeout(() => setNotification(null), 3000);
  };

  const addToHistory = (type, details, value) => {
    const entry = {
      id: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type, // 'BUY' или 'SELL'
      details,
      value
    };
    setHistory(prev => [entry, ...prev].slice(0, 50)); // Храним последние 50 сделок
  };

  const handleSwap = () => {
    if (!amount || amount <= 0) return;
    setIsProcessing(true);

    setTimeout(() => {
      const num = Number(amount);
      if (payToken.symbol === 'USDT') {
        if (balanceUSDT >= num) {
          const received = num / receiveToken.price;
          setBalanceUSDT(b => b - num);
          setWallet(w => ({ ...w, [receiveToken.symbol]: (w[receiveToken.symbol] || 0) + received }));
          addToHistory('BUY', `Куплено ${receiveToken.symbol}`, `-$${num.toFixed(2)}`);
          showNotify(`Успешно куплено ${receiveToken.symbol}`);
        }
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          let prof = isCorrect ? signal.profit : 0;
          const finalVal = (num * payToken.price) * (1 + prof/100);
          
          setBalanceUSDT(b => b + finalVal);
          setWallet(w => ({ ...w, [payToken.symbol]: has - num }));
          addToHistory('SELL', `Продажа ${payToken.symbol} (${activeDex})`, `+$${finalVal.toFixed(2)}`);
          showNotify(prof > 0 ? `Профит: +$${(finalVal - num * payToken.price).toFixed(2)}` : "Сделка завершена");
          setSignal(null);
        }
      }
      setIsProcessing(false);
      setAmount('');
    }, 5000);
  };

  const theme = activeDex === 'UNISWAP' || activeDex === 'PANCAKE' 
    ? { bg: activeDex === 'PANCAKE' ? '#f6f6f9' : '#fff', text: '#280d5f', input: activeDex === 'PANCAKE' ? '#eeeaf4' : '#f7f8fa' }
    : { bg: activeDex === 'RAYDIUM' ? '#0c0d21' : '#060814', text: '#fff', input: 'rgba(255,255,255,0.05)' };

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* Уведомления */}
      {notification && (
        <div style={{ position: 'fixed', top: 20, width: '90%', left: '5%', background: '#39f2af', color: '#000', padding: 15, borderRadius: 15, zIndex: 10001, textAlign: 'center', fontWeight: 'bold', animation: 'slideDown 0.3s' }}>{notification}</div>
      )}

      {/* Экран истории */}
      {view === 'history' && (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 20, animation: 'fadeIn 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0 }}>История сделок</h2>
            <button onClick={() => setView('main')} style={{ background: '#111', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: 10 }}>Закрыть</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {history.length === 0 && <div style={{ textAlign: 'center', opacity: 0.3, marginTop: 50 }}>История пуста</div>}
            {history.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #111' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 'bold' }}>{item.details}</div>
                  <div style={{ fontSize: 10, opacity: 0.5 }}>{item.time} • {item.type === 'BUY' ? 'Покупка' : 'Продажа'}</div>
                </div>
                <div style={{ color: item.value.startsWith('+') ? '#39f2af' : '#fff', fontWeight: 'bold' }}>{item.value}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setHistory([])} style={{ marginTop: 10, background: 'none', border: 'none', color: '#ff4d4d', fontSize: 12 }}>Очистить всё</button>
        </div>
      )}

      {/* Главный экран */}
      {view === 'main' && !activeDex && (
        <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setView('history')} style={{ background: '#111', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 10, fontSize: 12 }}>📜 История</button>
          </div>
          
          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <h1 style={{ fontSize: 42, fontWeight: 900, margin: 0 }}>${balanceUSDT.toLocaleString(undefined, {maximumFractionDigits: 2})}</h1>
            <div style={{ opacity: 0.4, fontSize: 11, letterSpacing: 2 }}>ДЕМО БАЛАНС</div>
          </div>

          {signal && (
            <div style={{ background: 'linear-gradient(135deg, #121212, #1a1a1a)', padding: 18, borderRadius: 22, border: '1px solid #222', marginBottom: 20 }}>
              <div style={{ color: '#39f2af', fontSize: 10, fontWeight: 900, marginBottom: 8 }}>АКТУАЛЬНАЯ СВЯЗКА</div>
              <div style={{ fontSize: 16 }}>Купи {signal.coin.symbol} на <span style={{ color: '#ff007a' }}>{signal.buyAt}</span></div>
              <div style={{ fontSize: 16 }}>Продай на <span style={{ color: '#39f2af' }}>{signal.sellAt}</span> <span style={{ color: '#39f2af' }}>+{signal.profit}%</span></div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 'auto' }}>
            {DEXES.map(id => (
              <button key={id} onClick={() => setActiveDex(id)} style={{ background: '#111', border: '1px solid #222', padding: '25px 0', borderRadius: 18, color: '#fff', fontWeight: 'bold' }}>{id}</button>
            ))}
          </div>

          {/* Баннер к менеджеру */}
          <div style={{ background: 'linear-gradient(90deg, #111, #1a1a1a)', padding: '15px 18px', borderRadius: 22, border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, paddingRight: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold' }}>💰 Хочешь реальный доход?</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Напиши @vladstelin78 для доступа к реальным торгам</div>
            </div>
            <a href="https://t.me/vladstelin78" style={{ background: '#39f2af', color: '#000', textDecoration: 'none', padding: '10px 15px', borderRadius: 12, fontSize: 11, fontWeight: '900' }}>НАЧАТЬ</a>
          </div>
        </div>
      )}

      {/* Терминал обмена */}
      {activeDex && view === 'main' && (
        <div style={{ height: '100%', background: theme.bg, color: theme.text, animation: 'slideIn 0.3s' }}>
          <div style={{ padding: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b style={{ fontSize: 18 }}>{activeDex}</b>
            <button onClick={() => setActiveDex(null)} style={{ background: 'rgba(128,128,128,0.1)', border: 'none', padding: '6px 12px', borderRadius: 10, color: 'inherit' }}>Назад</button>
          </div>
          <div style={{ padding: 15 }}>
            <div style={{ background: activeDex === 'PANCAKE' ? '#fff' : theme.input, padding: 20, borderRadius: 28 }}>
                <div style={{ background: activeDex === 'PANCAKE' ? '#eeeaf4' : 'rgba(0,0,0,0.1)', padding: 15, borderRadius: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.6 }}><span>ВЫ ОТДАЕТЕ</span><span onClick={() => setAmount(payToken.symbol === 'USDT' ? balanceUSDT : (wallet[payToken.symbol] || 0))} style={{ color: '#39f2af', fontWeight: 'bold' }}>МАКС</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" style={{ background: 'none', border: 'none', fontSize: 24, color: 'inherit', outline: 'none' }} />
                        <button onClick={() => {setShowTokenList(true); setSelectingFor('pay')}} style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 'bold' }}>{payToken.symbol} ▾</button>
                    </div>
                </div>
                <div style={{ textAlign: 'center', margin: '10px 0' }}>↓</div>
                <div style={{ background: activeDex === 'PANCAKE' ? '#eeeaf4' : 'rgba(0,0,0,0.1)', padding: 15, borderRadius: 18, marginBottom: 20 }}>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>ВЫ ПОЛУЧАЕТЕ</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                        <div style={{ fontSize: 24 }}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                        <button onClick={() => {setShowTokenList(true); setSelectingFor('receive')}} style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 'bold' }}>{receiveToken.symbol} ▾</button>
                    </div>
                </div>
                <button onClick={handleSwap} style={{ width: '100%', padding: 20, borderRadius: 20, border: 'none', fontSize: 16, fontWeight: 900, background: activeDex === 'UNISWAP' ? '#ff007a' : '#39f2af', color: activeDex === 'UNISWAP' ? '#fff' : '#000' }}>
                   {isProcessing ? 'СИНХРОНИЗАЦИЯ...' : 'ПОДТВЕРДИТЬ'}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Список токенов */}
      {showTokenList && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 10002, padding: 20, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><h3>Выберите токен</h3><button onClick={() => setShowTokenList(false)} style={{ color: '#fff', background: 'none', border: 'none', fontSize: 30 }}>&times;</button></div>
          {Object.values(ASSETS).map(t => (
            <div key={t.symbol} onClick={() => { if (selectingFor === 'pay') setPayToken(t); else setReceiveToken(t); setShowTokenList(false); }} style={{ display: 'flex', gap: 15, padding: '15px 0', borderBottom: '1px solid #111' }}>
              <img src={t.icon} width="30" height="30" />
              <div style={{ flex: 1 }}><b>{t.symbol}</b></div>
              <div style={{ color: '#39f2af' }}>{t.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[t.symbol] || 0).toFixed(4)}</div>
            </div>
          ))}
        </div>
      )}

      {isProcessing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 10003, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loader"></div>
          <div style={{ marginTop: 20, letterSpacing: 1 }}>ОЖИДАНИЕ БЛОКЧЕЙНА...</div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        .loader { width: 40px; height: 40px; border: 3px solid #111; border-top-color: #39f2af; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
