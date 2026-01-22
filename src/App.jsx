import React, { useState, useEffect } from 'react';

// Константы для имитации реальных данных
const TOKENS = [
  { id: 'SOL', name: 'Solana', price: 145, img: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  { id: 'ETH', name: 'Ethereum', price: 2600, img: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { id: 'USDT', name: 'Tether', price: 1, img: 'https://cryptologos.cc/logos/tether-usdt-logo.png' }
];

export default function App() {
  const [balance, setBalance] = useState(2000.00); // USDT
  const [holdings, setHoldings] = useState({ id: null, amount: 0 }); // Купленный актив
  const [activeDex, setActiveDex] = useState(null);
  const [val, setVal] = useState('');
  const [signal, setSignal] = useState(null);
  const [txStep, setTxStep] = useState('idle');

  // Генератор сигналов
  useEffect(() => {
    if (!signal) {
      const dexs = ['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'];
      setSignal({
        coin: 'SOL',
        buy: dexs[Math.floor(Math.random() * 2)],
        sell: dexs[Math.floor(Math.random() * 2) + 2],
        profit: (Math.random() * 5 + 3).toFixed(2)
      });
    }
  }, [signal]);

  // Глобальная логика обмена (Buy/Sell)
  const handleSwap = () => {
    if (!val || val <= 0) return;
    setTxStep('confirm');
  };

  const finalConfirm = () => {
    setTxStep('processing');
    setTimeout(() => {
      if (!holdings.id) {
        // ПОКУПКА
        const amount = Number(val) / 145;
        setBalance(prev => prev - Number(val));
        setHoldings({ id: 'SOL', amount });
      } else {
        // ПРОДАЖА
        const isWin = activeDex === signal?.sell;
        const profitMult = isWin ? (1 + signal.profit / 100) : 0.7;
        setBalance(prev => prev + (holdings.amount * 145 * profitMult));
        setHoldings({ id: null, amount: 0 });
      }
      setTxStep('idle');
      setVal('');
    }, 2000);
  };

  // --- 1. КЛОН UNISWAP (Светлая тема, розовый акцент) ---
  const UniswapUI = () => (
    <div style={{ background: '#FFF', height: '100%', color: '#000', fontFamily: '"Inter", sans-serif' }}>
      <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 24 }}>🦄</span>
        <div style={{ background: '#F5F6FC', padding: '6px 12px', borderRadius: 12, color: '#FF007A', fontWeight: 'bold', fontSize: 13 }}>0x78...3c</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40, paddingInline: 10 }}>
        <div style={{ width: '100%', maxWidth: 420, background: '#FFF', border: '1px solid #D9D9D9', borderRadius: 24, padding: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px' }}><b>Обмен</b> <span>⚙️</span></div>
          <div style={{ background: '#F9F9F9', padding: 16, borderRadius: 16, marginBottom: 4 }}>
            <div style={{ fontSize: 13, opacity: 0.5 }}>{holdings.id ? 'Вы продаете' : 'Вы платите'}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <input type="number" value={holdings.id ? holdings.amount.toFixed(4) : val} onChange={e => setVal(e.target.value)} placeholder="0" style={{ background: 'none', border: 'none', fontSize: 32, outline: 'none', width: '60%' }} />
              <div style={{ background: '#FFF', border: '1px solid #D9D9D9', padding: '4px 10px', borderRadius: 16, fontWeight: 'bold' }}>{holdings.id || 'USDT'} ▾</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '-14px 0', zIndex: 2, position: 'relative' }}>
            <div style={{ background: '#F9F9F9', border: '4px solid #FFF', borderRadius: 10, padding: 4 }}>↓</div>
          </div>
          <div style={{ background: '#F9F9F9', padding: 16, borderRadius: 16, marginTop: 4, marginBottom: 12 }}>
            <div style={{ fontSize: 13, opacity: 0.5 }}>Вы получаете</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <div style={{ fontSize: 32, color: '#888' }}>{holdings.id ? (holdings.amount * 145).toFixed(2) : (val / 145).toFixed(4)}</div>
              <div style={{ background: '#FF007A', color: '#FFF', padding: '6px 14px', borderRadius: 16, fontWeight: 'bold', fontSize: 14 }}>{holdings.id ? 'USDT' : 'SOL'} ▾</div>
            </div>
          </div>
          <button onClick={handleSwap} style={{ width: '100%', padding: 16, background: 'rgba(255, 0, 122, 0.1)', color: '#FF007A', border: 'none', borderRadius: 20, fontWeight: 'bold', fontSize: 18 }}>
            {holdings.id ? 'Продать' : 'Купить'}
          </button>
        </div>
      </div>
    </div>
  );

  // --- 2. КЛОН RAYDIUM (Темная тема, Solana стиль) ---
  const RaydiumUI = () => (
    <div style={{ background: '#0c0d21', height: '100%', color: '#FFF', fontFamily: 'monospace' }}>
      <div style={{ padding: 15, borderBottom: '1px solid #1a1b36', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#39F2AF', fontWeight: 'bold', fontSize: 18 }}>RAYDIUM</div>
        <div style={{ background: '#1a1b36', padding: '6px 12px', borderRadius: 10, color: '#39F2AF', fontSize: 12 }}>Connect</div>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ background: 'rgba(20, 22, 46, 0.8)', padding: 20, borderRadius: 24, border: '1px solid #1a1b36', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', gap: 20, marginBottom: 20, fontSize: 13 }}>
            <span style={{ color: '#39F2AF', borderBottom: '2px solid #39F2AF', paddingBottom: 5 }}>Swap</span>
            <span style={{ opacity: 0.5 }}>Liquidity</span>
          </div>
          <div style={{ background: '#050614', padding: 16, borderRadius: 16, border: '1px solid #1a1b36' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.4 }}><span>From</span> <span>Баланс: {holdings.id ? holdings.amount.toFixed(2) : balance.toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <input type="number" value={holdings.id ? holdings.amount.toFixed(4) : val} onChange={e => setVal(e.target.value)} style={{ background: 'none', border: 'none', color: '#FFF', fontSize: 26, outline: 'none', width: '50%' }} placeholder="0.0" />
              <div style={{ background: '#1a1b36', padding: '6px 12px', borderRadius: 12, fontSize: 14 }}>{holdings.id || 'USDT'} ▾</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', margin: '12px 0' }}><span style={{ background: '#1a1b36', borderRadius: '50%', padding: 8 }}>↓</span></div>
          <div style={{ background: '#050614', padding: 16, borderRadius: 16, border: '1px solid #1a1b36', marginBottom: 24 }}>
            <div style={{ fontSize: 11, opacity: 0.4 }}>To (Estimated)</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <div style={{ fontSize: 26 }}>{holdings.id ? (holdings.amount * 145).toFixed(2) : (val / 145).toFixed(4)}</div>
              <div style={{ background: '#39F2AF', color: '#000', padding: '6px 12px', borderRadius: 12, fontWeight: 'bold', fontSize: 14 }}>{holdings.id ? 'USDT' : 'SOL'} ▾</div>
            </div>
          </div>
          <button onClick={handleSwap} style={{ width: '100%', padding: 18, background: '#39F2AF', color: '#000', border: 'none', borderRadius: 12, fontWeight: '900', fontSize: 16, letterSpacing: 1 }}>
            {holdings.id ? 'CONFIRM SELL' : 'SWAP TOKENS'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      {!activeDex ? (
        <div style={{ padding: 25, color: '#FFF' }}>
          <header style={{ textAlign: 'center', margin: '40px 0' }}>
            <h1 style={{ fontSize: 48, fontWeight: 900 }}>${balance.toLocaleString()}</h1>
            {holdings.amount > 0 && <div style={{ color: '#39F2AF', fontSize: 14 }}>В ПОРТФЕЛЕ: {holdings.amount.toFixed(3)} SOL</div>}
          </header>

          <div style={{ background: '#111', padding: 20, borderRadius: 24, border: '1px solid #222', marginBottom: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00ff88', fontSize: 10, fontWeight: 'bold' }}>
               <div style={{ width: 8, height: 8, background: '#00ff88', borderRadius: '50%' }}></div> LIVE SIGNAL
            </div>
            {signal ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 'bold' }}>КУПИ НА <span style={{ color: '#FF007A' }}>{signal.buy}</span></div>
                <div style={{ fontSize: 18, fontWeight: 'bold' }}>ПРОДАЙ НА <span style={{ color: '#39F2AF' }}>{signal.sell}</span></div>
                <div style={{ marginTop: 8, color: '#00ff88', fontWeight: 'bold' }}>ПРОФИТ: +{signal.profit}%</div>
              </div>
            ) : "Scanning pools..."}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            {['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'].map(dex => (
              <button key={dex} onClick={() => setActiveDex(dex)} style={{ background: '#1a1a1a', border: '1px solid #333', padding: 25, borderRadius: 20, color: '#FFF', fontWeight: 'bold' }}>{dex}</button>
            ))}
          </div>
          
          <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center' }}>
            <a href="https://t.me/kriptoalians" style={{ color: '#333', textDecoration: 'none', fontSize: 11 }}>CREATORS @KRIPTOALIANS</a>
          </div>
        </div>
      ) : (
        <div style={{ height: '100%' }}>
          <button onClick={() => setActiveDex(null)} style={{ position: 'absolute', top: 15, right: 15, zIndex: 1000, background: 'rgba(0,0,0,0.5)', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: 8 }}>ЗАКРЫТЬ</button>
          {activeDex === 'UNISWAP' && <UniswapUI />}
          {activeDex === 'RAYDIUM' && <RaydiumUI />}
          {['PANCAKE', '1INCH'].includes(activeDex) && (
            <div style={{ padding: 40, color: '#FFF', textAlign: 'center' }}>
              <h2>{activeDex} Interface</h2>
              <button onClick={handleSwap} style={{ width: '100%', padding: 20, background: '#39F2AF', border: 'none', borderRadius: 15, color: '#000', fontWeight: 'bold', marginTop: 20 }}>
                {holdings.id ? 'SELL' : 'BUY'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Экраны состояний */}
      {txStep === 'confirm' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#1c1c1e', width: '100%', padding: 25, borderRadius: '24px 24px 0 0', color: '#FFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}><b>Подтверждение</b> <span onClick={() => setTxStep('idle')}>✕</span></div>
            <div style={{ background: '#2c2c2e', padding: 15, borderRadius: 12, marginBottom: 20 }}>
               <div style={{ fontSize: 12, opacity: 0.5 }}>Комиссия сети (Gas)</div>
               <div style={{ color: '#00ff88' }}>$1.42</div>
            </div>
            <button onClick={finalConfirm} style={{ width: '100%', padding: 16, background: '#34c759', border: 'none', borderRadius: 12, fontWeight: 'bold' }}>ПОДПИСАТЬ ТРАНЗАКЦИЮ</button>
          </div>
        </div>
      )}

      {txStep === 'processing' && (
        <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 10001, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
           <div style={{ width: 50, height: 50, border: '3px solid #333', borderTopColor: '#39f2af', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
           <h3 style={{ marginTop: 20 }}>Выполнение обмена...</h3>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type="number"]::-webkit-inner-spin-button { display: none; }
      `}</style>
    </div>
  );
}
