import React, { useState, useEffect } from 'react';

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

export default function ProfessionalFixApp() {
  const [balanceUSDT, setBalanceUSDT] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('arb_wallet')) || {});
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('arb_history')) || []);
  const [activeDex, setActiveDex] = useState(null);
  const [view, setView] = useState('main');
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
    localStorage.setItem('arb_history', JSON.stringify(history));
  }, [balanceUSDT, wallet, history]);

  useEffect(() => {
    if (!signal) {
      const available = Object.values(ASSETS).filter(t => t.symbol !== 'USDT');
      const coin = available[Math.floor(Math.random() * available.length)];
      const shuffled = [...DEXES].sort(() => 0.5 - Math.random());
      const profit = (Math.random() * 1.6 + 1.4).toFixed(2);
      setSignal({ coin, buyAt: shuffled[0], sellAt: shuffled[1], profit: parseFloat(profit) });
    }
  }, [signal]);

  const addToHistory = (details, valStr, isPlus) => {
    const entry = { id: Date.now(), time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), details, valStr, isPlus };
    setHistory(h => [entry, ...h].slice(0, 30));
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
          addToHistory(`Покупка ${receiveToken.symbol}`, `-$${num.toFixed(2)}`, false);
          setNotification("Успешно куплено");
        }
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          const prof = isCorrect ? signal.profit : 0;
          const finalVal = (num * payToken.price) * (1 + prof/100);
          setBalanceUSDT(b => b + finalVal);
          setWallet(w => ({ ...w, [payToken.symbol]: has - num }));
          addToHistory(`Продажа ${payToken.symbol}`, `+$${finalVal.toFixed(2)}`, true);
          setNotification(prof > 0 ? `Профит: +$${(finalVal - num * payToken.price).toFixed(2)}` : "Сделка завершена");
          setSignal(null);
        }
      }
      setIsProcessing(false);
      setAmount('');
      setTimeout(() => setNotification(null), 3000);
    }, 6000);
  };

  const theme = activeDex === 'PANCAKE' ? { bg: '#f6f6f9', text: '#280d5f', card: '#fff', input: '#eeeaf4' } :
                activeDex === 'UNISWAP' ? { bg: '#fff', text: '#000', card: '#f7f8fa', input: '#fff' } :
                activeDex === 'RAYDIUM' ? { bg: '#0c0d21', text: '#fff', card: '#14162e', input: 'rgba(0,0,0,0.3)' } :
                { bg: '#060814', text: '#fff', card: '#131823', input: 'rgba(255,255,255,0.05)' };

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden', boxSizing: 'border-box' }}>
      
      {/* Список токенов */}
      {showTokenList && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 2000, padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3>Выберите актив</h3>
            <button onClick={() => setShowTokenList(false)} style={{ color: '#fff', background: 'none', border: 'none', fontSize: 30 }}>&times;</button>
          </div>
          <div style={{ overflowY: 'auto' }}>
            {Object.values(ASSETS).map(t => (
              <div key={t.symbol} onClick={() => { if (selectingFor === 'pay') setPayToken(t); else setReceiveToken(t); setShowTokenList(false); }} 
                   style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '15px 0', borderBottom: '1px solid #111' }}>
                <img src={t.icon} width="30" height="30" />
                <div style={{ flex: 1 }}><b>{t.symbol}</b></div>
                <div style={{ color: '#39f2af', fontSize: 13 }}>{t.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[t.symbol] || 0).toFixed(4)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Уведомления */}
      {notification && (
        <div style={{ position: 'fixed', top: 20, left: '5%', width: '90%', background: '#39f2af', color: '#000', padding: 15, borderRadius: 15, zIndex: 3000, textAlign: 'center', fontWeight: 'bold' }}>{notification}</div>
      )}

      {/* Экран Истории */}
      {view === 'history' && (
        <div style={{ height: '100%', padding: 20, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0 }}>История сделок</h2>
            <button onClick={() => setView('main')} style={{ color: '#fff', background: '#222', border: 'none', padding: '8px 15px', borderRadius: 10 }}>Назад</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {history.map(h => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #111' }}>
                <div><div>{h.details}</div><div style={{ fontSize: 10, opacity: 0.5 }}>{h.time}</div></div>
                <div style={{ color: h.isPlus ? '#39f2af' : '#ff4d4d', fontWeight: 'bold' }}>{h.valStr}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Главный экран */}
      {view === 'main' && !activeDex && (
        <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button onClick={() => setView('history')} style={{ background: '#111', color: '#fff', border: '1px solid #222', padding: '8px 12px', borderRadius: 10, fontSize: 12 }}>📜 История</button>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <h1 style={{ fontSize: 42, margin: 0 }}>${balanceUSDT.toLocaleString(undefined, {maximumFractionDigits: 2})}</h1>
            <div style={{ opacity: 0.4, fontSize: 11 }}>ДЕМО БАЛАНС</div>
          </div>
          {signal && (
            <div style={{ background: '#111', padding: 18, borderRadius: 20, border: '1px solid #222', marginBottom: 20 }}>
              <div style={{ color: '#39f2af', fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>СИГНАЛ</div>
              <div style={{ fontSize: 15 }}>Купи {signal.coin.symbol} на {signal.buyAt}</div>
              <div style={{ fontSize: 15 }}>Продай на {signal.sellAt} <span style={{ color: '#39f2af' }}>+{signal.profit}%</span></div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 'auto' }}>
            {DEXES.map(d => <button key={d} onClick={() => setActiveDex(d)} style={{ background: '#111', border: '1px solid #222', color: '#fff', padding: '20px 0', borderRadius: 15, fontWeight: 'bold' }}>{d}</button>)}
          </div>
          <div style={{ background: 'linear-gradient(90deg, #111, #1a1a1a)', padding: 15, borderRadius: 20, border: '1px solid #222', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 'bold' }}>Зарабатывай реально</div><div style={{ fontSize: 10, opacity: 0.5 }}>Свяжись с @vladstelin78</div></div>
            <a href="https://t.me/vladstelin78" style={{ background: '#39f2af', color: '#000', textDecoration: 'none', padding: '10px 15px', borderRadius: 10, fontSize: 11, fontWeight: 'bold' }}>НАЧАТЬ</a>
          </div>
        </div>
      )}

      {/* Терминал биржи */}
      {activeDex && view === 'main' && (
        <div style={{ height: '100%', background: theme.bg, color: theme.text, animation: 'slideIn 0.3s', boxSizing: 'border-box' }}>
          <div style={{ padding: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b style={{ fontSize: 18 }}>{activeDex}</b>
            <button onClick={() => setActiveDex(null)} style={{ background: 'rgba(0,0,0,0.1)', border: 'none', color: 'inherit', padding: '6px 12px', borderRadius: 10 }}>Назад</button>
          </div>
          <div style={{ padding: 15 }}>
            <div style={{ background: theme.card, padding: 18, borderRadius: 28, boxSizing: 'border-box' }}>
              <div style={{ background: theme.input, padding: 15, borderRadius: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.7 }}><span>ОТДАЕТЕ</span><span onClick={() => setAmount(payToken.symbol === 'USDT' ? balanceUSDT : (wallet[payToken.symbol] || 0))} style={{ color: '#39f2af', fontWeight: 'bold' }}>МАКС</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" 
                         style={{ background: 'none', border: 'none', fontSize: 24, color: 'inherit', outline: 'none', width: '60%', padding: 0 }} />
                  <button onClick={() => {setShowTokenList(true); setSelectingFor('pay')}} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', padding: '5px 10px', borderRadius: 10, color: 'inherit', fontWeight: 'bold' }}>{payToken.symbol} ▾</button>
                </div>
              </div>
              <div style={{ textAlign: 'center', margin: '10px 0' }}>↓</div>
              <div style={{ background: theme.input, padding: 15, borderRadius: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 10, opacity: 0.7 }}>ПОЛУЧАЕТЕ</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
                  <div style={{ fontSize: 24, overflow: 'hidden' }}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                  <button onClick={() => {setShowTokenList(true); setSelectingFor('receive')}} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', padding: '5px 10px', borderRadius: 10, color: 'inherit', fontWeight: 'bold' }}>{receiveToken.symbol} ▾</button>
                </div>
              </div>
              <button onClick={handleSwap} style={{ width: '100%', padding: 20, borderRadius: 20, border: 'none', fontSize: 16, fontWeight: 'bold', background: activeDex === 'UNISWAP' ? '#ff007a' : (activeDex === 'PANCAKE' ? '#1fc7d4' : '#39f2af'), color: activeDex === 'UNISWAP' ? '#fff' : '#000' }}>
                {isProcessing ? 'ОБРАБОТКА...' : 'ПОДТВЕРДИТЬ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Лоадер */}
      {isProcessing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 5000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loader"></div>
          <div style={{ marginTop: 20 }}>ТРАНЗАКЦИЯ В СЕТИ...</div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .loader { width: 40px; height: 40px; border: 3px solid #111; border-top-color: #39f2af; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
