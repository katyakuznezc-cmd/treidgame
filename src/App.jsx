import React, { useState, useEffect } from 'react';

const ASSETS = {
  USDT: { symbol: 'USDT', price: 1, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  SOL: { symbol: 'SOL', price: 145.50, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  ETH: { symbol: 'ETH', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  BNB: { symbol: 'BNB', price: 605.20, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  DOGE: { symbol: 'DOGE', price: 0.16, icon: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
  XRP: { symbol: 'XRP', price: 0.62, icon: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
  ADA: { symbol: 'ADA', price: 0.45, icon: 'https://cryptologos.cc/logos/cardano-ada-logo.png' },
  AVAX: { symbol: 'AVAX', price: 35.80, icon: 'https://cryptologos.cc/logos/avalanche-avax-logo.png' },
  MATIC: { symbol: 'MATIC', price: 0.72, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.png' },
  DOT: { symbol: 'DOT', price: 7.10, icon: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png' },
  TRX: { symbol: 'TRX', price: 0.12, icon: 'https://cryptologos.cc/logos/tron-trx-logo.png' }
};

const DEXES = ['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'];

export default function FastTradeApp() {
  const [balanceUSDT, setBalanceUSDT] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('arb_wallet')) || {});
  const [activeDex, setActiveDex] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTrade, setLastTrade] = useState(null);
  const [amount, setAmount] = useState('');
  const [payToken, setPayToken] = useState(ASSETS.USDT);
  const [receiveToken, setReceiveToken] = useState(ASSETS.SOL);

  useEffect(() => {
    localStorage.setItem('arb_balance', balanceUSDT);
    localStorage.setItem('arb_wallet', JSON.stringify(wallet));
  }, [balanceUSDT, wallet]);

  const handleSwap = () => {
    if (!amount || amount <= 0) return;
    setIsProcessing(true);

    // СОКРАЩЕННОЕ ВРЕМЯ: 2000мс (2 секунды)
    setTimeout(() => {
      const num = Number(amount);
      let outAmount = 0;

      if (payToken.symbol === 'USDT') {
        if (balanceUSDT >= num) {
          outAmount = (num / receiveToken.price).toFixed(4);
          setBalanceUSDT(prev => prev - num);
          setWallet(w => ({ ...w, [receiveToken.symbol]: (w[receiveToken.symbol] || 0) + Number(outAmount) }));
          setLastTrade({ from: `${num} USDT`, to: `${outAmount} ${receiveToken.symbol}` });
        }
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          outAmount = (num * payToken.price * 1.025).toFixed(2);
          setBalanceUSDT(prev => prev + Number(outAmount));
          setWallet(w => ({ ...w, [payToken.symbol]: has - num }));
          setLastTrade({ from: `${num} ${payToken.symbol}`, to: `${outAmount} USDT` });
        }
      }

      setIsProcessing(false);
      if (outAmount > 0) {
        setShowReceipt(true);
        setLastTrade(prev => ({ ...prev, hash: '0x' + Math.random().toString(16).slice(2, 12) + '...f2e4', dex: activeDex }));
      }
      setAmount('');
    }, 2000); 
  };

  const getTheme = () => {
    if (activeDex === 'UNISWAP') return { bg: '#fff', text: '#000', card: '#f7f8fa', btn: '#ff007a' };
    if (activeDex === 'PANCAKE') return { bg: '#f6f6f9', text: '#280d5f', card: '#fff', btn: '#1fc7d4' };
    if (activeDex === 'RAYDIUM') return { bg: '#0c0d21', text: '#fff', card: '#14162e', btn: '#39f2af' };
    return { bg: '#060814', text: '#fff', card: '#131823', btn: '#2f8af5' };
  };

  const theme = getTheme();

  return (
    <div style={{ width: '100vw', height: '100dvh', background: activeDex ? theme.bg : '#000', color: activeDex ? theme.text : '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* ЧЕК ТРАНЗАКЦИИ */}
      {showReceipt && lastTrade && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 25 }}>
          <div style={{ background: '#111', width: '100%', borderRadius: 30, padding: 25, border: '1px solid #222', textAlign: 'center', color: '#fff' }}>
            <div style={{ width: 50, height: 50, background: '#39f2af22', color: '#39f2af', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 15px' }}>✓</div>
            <h3 style={{ margin: '0 0 5px' }}>Успешно</h3>
            <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 20 }}>Транзакция подтверждена в {lastTrade.dex}</p>
            <div style={{ background: '#000', borderRadius: 20, padding: 15, marginBottom: 20, textAlign: 'left', fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Отдано:</span><b>{lastTrade.from}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Получено:</span><b style={{ color: '#39f2af' }}>{lastTrade.to}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Hash:</span><code style={{ fontSize: 10, color: '#39f2af' }}>{lastTrade.hash}</code></div>
            </div>
            <button onClick={() => setShowReceipt(false)} style={{ width: '100%', background: '#fff', color: '#000', border: 'none', padding: 15, borderRadius: 15, fontWeight: 'bold' }}>Готово</button>
          </div>
        </div>
      )}

      {/* ГЛАВНЫЙ ЭКРАН */}
      {!activeDex && (
        <div style={{ padding: 25, textAlign: 'center' }}>
          <h1 style={{ fontSize: 42, margin: '40px 0 10px' }}>${balanceUSDT.toFixed(2)}</h1>
          <p style={{ opacity: 0.4, marginBottom: 40, fontSize: 12 }}>ДОСТУПНЫЙ БАЛАНС</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {DEXES.map(d => <button key={d} onClick={() => setActiveDex(d)} style={{ background: '#111', border: '1px solid #222', color: '#fff', padding: 25, borderRadius: 20, fontWeight: 'bold' }}>{d}</button>)}
          </div>
        </div>
      )}

      {/* ТЕРМИНАЛ */}
      {activeDex && (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b style={{ fontSize: 20 }}>{activeDex}</b>
            <button onClick={() => setActiveDex(null)} style={{ background: 'rgba(128,128,128,0.1)', border: 'none', color: 'inherit', padding: '8px 15px', borderRadius: 12 }}>Назад</button>
          </div>
          <div style={{ padding: 15 }}>
            <div style={{ background: theme.card, padding: 20, borderRadius: 30, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
              <div style={{ background: 'rgba(128,128,128,0.08)', padding: 15, borderRadius: 20 }}>
                <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8 }}>ВЫ ОТДАЕТЕ</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" style={{ background: 'none', border: 'none', fontSize: 26, color: 'inherit', outline: 'none', width: '60%' }} />
                  <b>{payToken.symbol}</b>
                </div>
              </div>
              <div style={{ textAlign: 'center', margin: '10px 0', opacity: 0.3 }}>↓</div>
              <div style={{ background: 'rgba(128,128,128,0.08)', padding: 15, borderRadius: 20, marginBottom: 25 }}>
                <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8 }}>ВЫ ПОЛУЧАЕТЕ</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 26 }}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                  <b>{receiveToken.symbol}</b>
                </div>
              </div>
              <button onClick={handleSwap} style={{ width: '100%', padding: 20, borderRadius: 20, border: 'none', background: theme.btn, color: activeDex === 'RAYDIUM' ? '#000' : '#fff', fontWeight: 'bold', fontSize: 16 }}>
                {isProcessing ? 'СЕТЬ ОБРАБАТЫВАЕТ...' : 'ПОДТВЕРДИТЬ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ЛОАДЕР (2 секунды) */}
      {isProcessing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loader"></div>
        </div>
      )}

      <style>{`
        .loader { width: 45px; height: 45px; border: 3px solid #222; border-top-color: #39f2af; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
