import React, { useState, useEffect } from 'react';

const ASSETS = {
  USDT: { symbol: 'USDT', name: 'Tether', price: 1, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 145.50, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  BNB: { symbol: 'BNB', name: 'BNB Chain', price: 605.20, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  DOGE: { symbol: 'DOGE', name: 'Dogecoin', price: 0.16, icon: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
  XRP: { symbol: 'XRP', name: 'XRP', price: 0.62, icon: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
  ADA: { symbol: 'ADA', name: 'Cardano', price: 0.45, icon: 'https://cryptologos.cc/logos/cardano-ada-logo.png' },
  AVAX: { symbol: 'AVAX', name: 'Avalanche', price: 35.80, icon: 'https://cryptologos.cc/logos/avalanche-avax-logo.png' },
  MATIC: { symbol: 'MATIC', name: 'Polygon', price: 0.72, icon: 'https://cryptologos.cc/logos/polygon-matic-logo.png' },
  DOT: { symbol: 'DOT', name: 'Polkadot', price: 7.10, icon: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png' },
  TRX: { symbol: 'TRX', name: 'TRON', price: 0.12, icon: 'https://cryptologos.cc/logos/tron-trx-logo.png' }
};

const DEXES = ['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'];

export default function ActionArbApp() {
  const [balanceUSDT, setBalanceUSDT] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('arb_wallet')) || {});
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('arb_history')) || []);
  const [activeDex, setActiveDex] = useState(null);
  const [view, setView] = useState('main');
  const [signal, setSignal] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');
  const [processBar, setProcessBar] = useState(0);
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
      setSignal({ coin, buyAt: shuffled[0], sellAt: shuffled[1], profit: parseFloat((Math.random() * 1.5 + 1.5).toFixed(2)) });
    }
  }, [signal]);

  const handleSwap = () => {
    if (!amount || amount <= 0) return;
    setIsProcessing(true);
    setProcessBar(0);
    
    const steps = ["Инициализация...", "Поиск ликвидности...", "Подтверждение блока...", "Завершение..."];
    let stepIdx = 0;

    const interval = setInterval(() => {
        stepIdx++;
        setProcessBar(prev => prev + 25);
        if(stepIdx < steps.length) setProcessStep(steps[stepIdx]);
    }, 500);

    const cPay = payToken, cRec = receiveToken, cAmt = Number(amount);

    setTimeout(() => {
      clearInterval(interval);
      let success = false, outStr = "", profitDone = 0;
      
      if (cPay.symbol === 'USDT') {
        if (balanceUSDT >= cAmt) {
          const recVal = (cAmt / cRec.price).toFixed(4);
          setBalanceUSDT(b => b - cAmt);
          setWallet(w => ({ ...w, [cRec.symbol]: (w[cRec.symbol] || 0) + Number(recVal) }));
          outStr = `${recVal} ${cRec.symbol}`;
          setHistory(h => [{ id: Date.now(), details: `Купил ${cRec.symbol}`, valStr: `-$${cAmt.toFixed(2)}`, isPlus: false }, ...h]);
          success = true;
        }
      } else {
        const has = wallet[cPay.symbol] || 0;
        if (has >= cAmt) {
          const isCorrect = activeDex === signal?.sellAt && cPay.symbol === signal?.coin.symbol;
          const finalVal = (cAmt * cPay.price) * (isCorrect ? (1 + signal.profit/100) : 1.0);
          if (isCorrect) profitDone = finalVal - (cAmt * cPay.price);
          setBalanceUSDT(b => b + finalVal);
          setWallet(w => ({ ...w, [cPay.symbol]: has - cAmt }));
          outStr = `${finalVal.toFixed(2)} USDT`;
          setHistory(h => [{ id: Date.now(), details: `Продал ${cPay.symbol}`, valStr: `+$${finalVal.toFixed(2)}`, isPlus: true }, ...h]);
          if (isCorrect) setSignal(null);
          success = true;
        }
      }

      setIsProcessing(false);
      if (success) {
        setLastTrade({ 
            from: `${cAmt} ${cPay.symbol}`, 
            to: outStr, 
            dex: activeDex, 
            profit: profitDone > 0 ? profitDone.toFixed(2) : null,
            hash: '0x' + Math.random().toString(16).slice(2, 10) 
        });
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
    <div style={{ width: '100vw', height: '100dvh', background: activeDex ? theme.bg : '#000', color: activeDex ? theme.text : '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* ЧЕК С ЭФФЕКТОМ ВЗРЫВА ПРОФИТА */}
      {showReceipt && lastTrade && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 25 }}>
          <div style={{ background: '#111', width: '100%', borderRadius: 30, padding: '30px 25px', border: '1px solid #222', textAlign: 'center', color: '#fff', position: 'relative' }}>
            {lastTrade.profit && (
                <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', background: '#39f2af', color: '#000', padding: '8px 20px', borderRadius: 20, fontWeight: '900', fontSize: 18, animation: 'boom 0.5s ease-out' }}>
                   +${lastTrade.profit} PROFIT!
                </div>
            )}
            <div style={{ width: 60, height: 60, background: '#39f2af22', color: '#39f2af', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 15px' }}>✓</div>
            <h3 style={{ margin: 0, fontSize: 22 }}>Сделка закрыта</h3>
            <p style={{ fontSize: 13, opacity: 0.5, marginBottom: 25 }}>Через протокол {lastTrade.dex}</p>
            
            <div style={{ background: '#000', borderRadius: 20, padding: 20, marginBottom: 25, textAlign: 'left', border: '1px solid #222' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ opacity: 0.4 }}>Отдано:</span><b>{lastTrade.from}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ opacity: 0.4 }}>Получено:</span><b style={{ color: '#39f2af' }}>{lastTrade.to}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.4 }}>Хеш:</span><code style={{ fontSize: 10, color: '#39f2af' }}>{lastTrade.hash}</code>
              </div>
            </div>
            <button onClick={() => setShowReceipt(false)} style={{ width: '100%', background: '#fff', color: '#000', border: 'none', padding: 18, borderRadius: 18, fontWeight: 'bold', fontSize: 16 }}>ПРОДОЛЖИТЬ</button>
          </div>
        </div>
      )}

      {/* СПИСОК ТОКЕНОВ */}
      {showTokenList && (
        <div style={{ position: 'fixed', inset: 0, background: '#080808', zIndex: 11000, padding: 25, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
            <h2 style={{ margin: 0 }}>Токены</h2>
            <button onClick={() => setShowTokenList(false)} style={{ color: '#fff', background: 'none', border: 'none', fontSize: 40 }}>&times;</button>
          </div>
          <div style={{ overflowY: 'auto' }}>
            {Object.values(ASSETS).map(t => (
              <div key={t.symbol} onClick={() => { if (selectingFor === 'pay') setPayToken(t); else setReceiveToken(t); setShowTokenList(false); }} 
                   style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '18px 0', borderBottom: '1px solid #151515' }}>
                <img src={t.icon} width="35" height="35" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: 17 }}>{t.symbol}</div>
                  <div style={{ fontSize: 12, opacity: 0.4 }}>{t.name}</div>
                </div>
                <div style={{ fontWeight: 'bold', color: '#39f2af' }}>{t.symbol === 'USDT' ? balanceUSDT.toFixed(2) : (wallet[t.symbol] || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ГЛАВНЫЙ ЭКРАН */}
      {view === 'main' && !activeDex && (
        <div style={{ padding: 25, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setView('history')} style={{ background: '#111', color: '#fff', border: '1px solid #222', padding: '10px 18px', borderRadius: 12, fontSize: 13 }}>История</button>
          </div>
          <div style={{ textAlign: 'center', margin: '45px 0' }}>
            <h1 style={{ fontSize: 50, margin: 0 }}>${balanceUSDT.toLocaleString(undefined, {maximumFractionDigits: 2})}</h1>
            <div style={{ opacity: 0.4, fontSize: 12, marginTop: 8, letterSpacing: 1 }}>МОЙ БАЛАНС</div>
          </div>
          {signal && (
            <div style={{ background: '#111', padding: 20, borderRadius: 25, border: '1px solid #222', marginBottom: 30, animation: 'pulse 2s infinite' }}>
              <div style={{ color: '#39f2af', fontSize: 11, fontWeight: 'bold', marginBottom: 8 }}>SIGNAL: ACTIVE</div>
              <div style={{ fontSize: 16 }}>Buy {signal.coin.symbol} on {signal.buyAt}</div>
              <div style={{ fontSize: 16 }}>Sell on {signal.sellAt} <span style={{ color: '#39f2af' }}>+{signal.profit}%</span></div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 'auto' }}>
            {DEXES.map(d => <button key={d} onClick={() => setActiveDex(d)} style={{ background: '#111', border: '1px solid #222', color: '#fff', padding: '28px 0', borderRadius: 22, fontWeight: 'bold', fontSize: 15 }}>{d}</button>)}
          </div>
          <div style={{ background: 'linear-gradient(90deg, #111, #1a1a1a)', padding: 20, borderRadius: 25, border: '1px solid #222', display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 'bold' }}>Хочешь реальную прибыль?</div><div style={{ fontSize: 11, opacity: 0.5 }}>Пиши @vladstelin78</div></div>
            <a href="https://t.me/vladstelin78" style={{ background: '#39f2af', color: '#000', textDecoration: 'none', padding: '12px 20px', borderRadius: 15, fontSize: 12, fontWeight: '900' }}>GO!</a>
          </div>
        </div>
      )}

      {/* ТЕРМИНАЛ */}
      {activeDex && (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b style={{ fontSize: 22 }}>{activeDex}</b>
            <button onClick={() => setActiveDex(null)} style={{ background: 'rgba(128,128,128,0.1)', border: 'none', color: 'inherit', padding: '10px 20px', borderRadius: 15 }}>Назад</button>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ background: theme.card, padding: 25, borderRadius: 35 }}>
              <div style={{ background: 'rgba(128,128,128,0.08)', padding: 20, borderRadius: 25 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.5 }}><span>SELL</span><span onClick={() => setAmount(payToken.symbol === 'USDT' ? balanceUSDT : (wallet[payToken.symbol] || 0))} style={{ color: '#39f2af', fontWeight: 'bold' }}>MAX</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" style={{ background: 'none', border: 'none', fontSize: 30, color: 'inherit', outline: 'none', width: '60%' }} />
                  <button onClick={() => {setShowTokenList(true); setSelectingFor('pay')}} style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 'bold', fontSize: 20 }}>{payToken.symbol} ▾</button>
                </div>
              </div>
              <div style={{ textAlign: 'center', margin: '15px 0', opacity: 0.2, fontSize: 30 }}>↓</div>
              <div style={{ background: 'rgba(128,128,128,0.08)', padding: 20, borderRadius: 25, marginBottom: 30 }}>
                <div style={{ fontSize: 11, opacity: 0.5 }}>BUY</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                  <div style={{ fontSize: 30 }}>{amount ? (payToken.symbol === 'USDT' ? (amount/receiveToken.price).toFixed(4) : (amount*payToken.price).toFixed(2)) : '0.0'}</div>
                  <button onClick={() => {setShowTokenList(true); setSelectingFor('receive')}} style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 'bold', fontSize: 20 }}>{receiveToken.symbol} ▾</button>
                </div>
              </div>
              <button onClick={handleSwap} style={{ width: '100%', padding: 22, borderRadius: 25, border: 'none', background: theme.btn, color: (activeDex === 'RAYDIUM' || activeDex === 'PANCAKE') ? '#000' : '#fff', fontWeight: 'bold', fontSize: 18 }}>
                {isProcessing ? 'ПОДТВЕРЖДЕНИЕ...' : 'ОБМЕНЯТЬ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ПРОГРЕСС-БАР ЗАГРУЗКИ */}
      {isProcessing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 12000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: '100%', maxWidth: 300 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, fontSize: 14, letterSpacing: 1 }}>
                <span>{processStep}</span>
                <span>{processBar}%</span>
             </div>
             <div style={{ width: '100%', height: 6, background: '#222', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ width: `${processBar}%`, height: '100%', background: '#39f2af', transition: 'width 0.3s' }}></div>
             </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
        @keyframes boom { 0% { transform: translateX(-50%) scale(0); } 70% { transform: translateX(-50%) scale(1.2); } 100% { transform: translateX(-50%) scale(1); } }
      `}</style>
    </div>
  );
}
