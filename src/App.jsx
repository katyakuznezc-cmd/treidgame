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

export default function FullRestoredApp() {
  const [balanceUSDT, setBalanceUSDT] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('arb_wallet')) || {});
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('arb_history')) || []);
  const [activeDex, setActiveDex] = useState(null);
  const [view, setView] = useState('main');
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTrade, setLastTrade] = useState(null);
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
      const profit = (Math.random() * 1.5 + 1.5).toFixed(2);
      setSignal({ coin, buyAt: shuffled[0], sellAt: shuffled[1], profit: parseFloat(profit) });
    }
  }, [signal]);

  const handleSwap = () => {
    if (!amount || amount <= 0) return;
    setIsProcessing(true);
    
    setTimeout(() => {
      const num = Number(amount);
      let success = false;
      let outStr = "";

      if (payToken.symbol === 'USDT') {
        if (balanceUSDT >= num) {
          const received = (num / receiveToken.price).toFixed(4);
          setBalanceUSDT(b => b - num);
          setWallet(w => ({ ...w, [receiveToken.symbol]: (w[receiveToken.symbol] || 0) + Number(received) }));
          outStr = `${received} ${receiveToken.symbol}`;
          setHistory(h => [{ id: Date.now(), details: `Покупка ${receiveToken.symbol}`, valStr: `-$${num.toFixed(2)}`, isPlus: false }, ...h]);
          success = true;
        }
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          const isCorrect = activeDex === signal?.sellAt && payToken.symbol === signal?.coin.symbol;
          const profMult = isCorrect ? (1 + signal.profit/100) : 1.0;
          const finalVal = (num * payToken.price) * profMult;
          setBalanceUSDT(b => b + finalVal);
          setWallet(w => ({ ...w, [payToken.symbol]: has - num }));
          outStr = `${finalVal.toFixed(2)} USDT`;
          setHistory(h => [{ id: Date.now(), details: `Продажа ${payToken.symbol}`, valStr: `+$${finalVal.toFixed(2)}`, isPlus: true }, ...h]);
          if (isCorrect) setSignal(null);
          success = true;
        }
      }

      setIsProcessing(false);
      if (success) {
        setLastTrade({ from: `${num} ${payToken.symbol}`, to: outStr, dex: activeDex, hash: '0x' + Math.random().toString(16).slice(2, 12) });
        setShowReceipt(true);
      }
      setAmount('');
    }, 2000);
  };

  const theme = activeDex === 'PANCAKE' ? { bg: '#f6f6f9', text: '#280d5f', card: '#fff', btn: '#1fc7d4' } :
                activeDex === 'UNISWAP' ? { bg: '#fff', text: '#000', card: '#f7f8fa', btn: '#ff007a' } :
                activeDex === 'RAYDIUM' ? { bg: '#0c0d21', text: '#fff', card: '#14162e', btn: '#39f2af' } :
                { bg: '#060814', text: '#fff', card: '#131823', btn: '#2f8af5' };

  return (
    <div style={{ width: '100vw', height: '100dvh', background: activeDex ? theme.bg : '#000', color: activeDex ? theme.text : '#fff', fontFamily: 'sans-serif', overflow: 'hidden', boxSizing: 'border-box' }}>
      
      {/* ЧЕК */}
      {showReceipt && lastTrade && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 25 }}>
          <div style={{ background: '#111', width: '100%', borderRadius: 30, padding: 25, border: '1px solid #222', textAlign: 'center', color: '#fff' }}>
            <div style={{ width: 50, height: 50, background: '#39f2af22', color: '#39f2af', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 15px' }}>✓</div>
            <h3 style={{ margin: '0 0 5px' }}>Выполнено</h3>
            <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 20 }}>Транзакция в {lastTrade.dex} завершена</p>
            <div style={{ background: '#000', borderRadius: 20, padding: 15, marginBottom: 20, textAlign: 'left', fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Отдано:</span><b>{lastTrade.from}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Получено:</span><b style={{ color: '#39f2af' }}>{lastTrade.to}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Hash:</span><code style={{ fontSize: 9, color: '#39f2af' }}>{lastTrade.hash}</code></div>
            </div>
            <button onClick={() => setShowReceipt(false)} style={{ width: '100%', background: '#fff', color: '#000', border: 'none', padding: 15, borderRadius: 15, fontWeight: 'bold' }}>Закрыть чек</button>
          </div>
        </div>
      )}

      {/* СПИСОК ТОКЕНОВ */}
      {showTokenList && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 5000, padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><h3>Выберите токен</h3><button onClick={() => setShowTokenList(false)} style={{ color: '#fff', background: 'none', border: 'none', fontSize: 30 }}>&times;</button></div>
          <div style={{ overflowY: 'auto' }}>
            {Object.values(ASSETS).map(t => (
              <div key={t.symbol} onClick={() => { if (selectingFor === 'pay') setPayToken(t); else setReceiveToken(t); setShowTokenList(false); }} 
                   style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '15px 0', borderBottom: '1px solid #111' }}>
                <img src={t.icon} width="30" />
                <div style={{ flex: 1 }}><b>{t.symbol}</b></div>
                <div style={{ color: '#39f2af' }}>{t.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[t.symbol] || 0).toFixed(4)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ГЛАВНЫЙ ЭКРАН */}
      {view === 'main' && !activeDex && (
        <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setView('history')} style={{ background: '#111', color: '#fff', border: '1px solid #222', padding: '8px 12px', borderRadius: 10, fontSize: 12 }}>📜 История</button>
          </div>
          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <h1 style={{ fontSize: 42, margin: 0 }}>${balanceUSDT.toLocaleString(undefined, {maximumFractionDigits: 2})}</h1>
            <div style={{ opacity: 0.4, fontSize: 11 }}>ДЕМО СЧЕТ</div>
          </div>
          {signal && (
            <div style={{ background: '#111', padding: 18, borderRadius: 20, border: '1px solid #222', marginBottom: 20 }}>
              <div style={{ color: '#39f2af', fontSize: 10, fontWeight: 'bold', marginBottom: 5 }}>🔥 АКТУАЛЬНЫЙ СИГНАЛ</div>
              <div style={{ fontSize: 15 }}>Купи {signal.coin.symbol} на {signal.buyAt}</div>
              <div style={{ fontSize: 15 }}>Продай на {signal.sellAt} <span style={{ color: '#39f2af' }}>+{signal.profit}%</span></div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 'auto' }}>
            {DEXES.map(d => <button key={d} onClick={() => setActiveDex(d)} style={{ background: '#111', border: '1px solid #222', color: '#fff', padding: '22px 0', borderRadius: 18, fontWeight: 'bold' }}>{d}</button>)}
          </div>
          <div style={{ background: 'linear-gradient(90deg, #111, #1a1a1a)', padding: 15, borderRadius: 20, border: '1px solid #222', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 'bold' }}>Зарабатывай по-настоящему</div><div style={{ fontSize: 10, opacity: 0.5 }}>Свяжись с @vladstelin78</div></div>
            <a href="https://t.me/vladstelin78" style={{ background: '#39f2af', color: '#000', textDecoration: 'none', padding: '10px 15px', borderRadius: 10, fontSize: 11, fontWeight: 'bold' }}>НАЧАТЬ</a>
          </div>
        </div>
      )}

      {/* ИСТОРИЯ */}
      {view === 'history' && (
        <div style={{ height: '100%', padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><h2>История</h2><button onClick={() => setView('main')} style={{ color: '#fff', background: '#222', border: 'none', padding: '8px 15px', borderRadius: 10 }}>Назад</button></div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {history.map(h => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #111' }}>
                <div>{h.details}</div><div style={{ color: h.isPlus ? '#39f2af' : '#ff4d4d', fontWeight: 'bold' }}>{h.valStr}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ТЕРМИНАЛ */}
      {activeDex && (
        <div style={{ height: '100%', background: theme.bg, color: theme.text, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b style={{ fontSize: 18 }}>{activeDex}</b>
            <button onClick={() => setActiveDex(null)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', color: 'inherit', padding: '6px 12px', borderRadius: 10 }}>Назад</button>
          </div>
          <div style={{ padding: 15 }}>
            <div style={{ background: theme.card, padding: 20, borderRadius: 30 }}>
              <div style={{ background: 'rgba(128,128,128,0.08)', padding: 15, borderRadius: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.6 }}><span>ОТДАЕТЕ</span><span onClick={() => setAmount(payToken.symbol === 'USDT' ? balanceUSDT : (wallet[payToken.symbol] || 0))} style={{ color: '#39f2af', fontWeight: 'bold' }}>МАКС</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" style={{ background: 'none', border: 'none', fontSize: 26, color: 'inherit', outline: 'none', width: '60%' }} />
                  <button onClick={() => {setShowTokenList(true); setSelectingFor('pay')}} style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 'bold' }}>{payToken.symbol} ▾</button>
                </div>
              </div>
              <div style={{ textAlign: 'center', margin: '10px 0', opacity: 0.3 }}>↓</div>
              <div style={{ background: 'rgba(128,128,128,0.08)', padding: 15, borderRadius: 20, marginBottom: 25 }}>
                <div style={{ fontSize: 10, opacity: 0.6 }}>ПОЛУЧАЕТЕ</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <div style={{ fontSize: 26 }}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                  <button onClick={() => {setShowTokenList(true); setSelectingFor('receive')}} style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 'bold' }}>{receiveToken.symbol} ▾</button>
                </div>
              </div>
              <button onClick={handleSwap} style={{ width: '100%', padding: 20, borderRadius: 20, border: 'none', background: theme.btn, color: activeDex === 'RAYDIUM' ? '#000' : '#fff', fontWeight: 'bold', fontSize: 16 }}>
                {isProcessing ? 'ОБРАБОТКА...' : 'ПОДТВЕРДИТЬ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loader"></div>
        </div>
      )}

      <style>{`
        .loader { width: 40px; height: 40px; border: 3px solid #222; border-top-color: #39f2af; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
