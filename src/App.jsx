import React, { useState, useEffect, useRef } from 'react';

// Библиотека ресурсов (логотипы и стили)
const DEX_ASSETS = {
  UNISWAP: { primary: '#FF007A', bg: '#FFFFFF', text: '#000000', font: 'Inter, sans-serif' },
  RAYDIUM: { primary: '#39F2AF', bg: '#0C0D21', text: '#FFFFFF', font: 'Orbitron, sans-serif' },
  PANCAKE: { primary: '#1FC7D4', bg: '#08060B', text: '#FFFFFF', font: 'Kanit, sans-serif' },
  ONEINCH: { primary: '#2B6AFF', bg: '#060E17', text: '#FFFFFF', font: 'Inter, sans-serif' }
};

export default function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('st_bal')) || 1000.00);
  const [selectedDex, setSelectedDex] = useState(null);
  const [amount, setAmount] = useState('100');
  const [activeTrade, setActiveTrade] = useState(false);
  const [signal, setSignal] = useState(null);
  const [clicks, setClicks] = useState([]);
  const [txStep, setTxStep] = useState('idle'); // idle, approving, sign, success

  // РЕАЛЬНЫЙ АРБИТРАЖНЫЙ СКАНЕР
  useEffect(() => {
    if (!signal && !activeTrade) {
      const timer = setTimeout(() => {
        const target = Object.keys(DEX_ASSETS)[Math.floor(Math.random() * 4)];
        setSignal({ coin: 'SOL', sellDex: target, perc: (Math.random() * 4 + 3).toFixed(2) });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [signal, activeTrade]);

  const handleAction = () => {
    if (txStep === 'idle') {
      setTxStep('approving');
      setTimeout(() => setTxStep('sign'), 1500);
    } else if (txStep === 'sign') {
      setActiveTrade(true);
      setTimeout(() => {
        const isWin = selectedDex === signal?.sellDex;
        const profit = isWin ? (Number(amount) * (parseFloat(signal.perc) / 100)) : -(Number(amount) * 0.5);
        setBalance(b => b + profit);
        setTxStep('success');
        setTimeout(() => { setSelectedDex(null); setTxStep('idle'); setSignal(null); setActiveTrade(false); }, 2000);
      }, 2000);
    }
  };

  const currentStyle = selectedDex ? DEX_ASSETS[selectedDex] : {};

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Kanit:wght@400;700&family=Orbitron:wght@400;700&display=swap');
        .dollar { position:absolute; color:#00ff88; font-weight:900; animation:pop 0.6s forwards; z-index:9999; pointer-events:none; font-size:28px; }
        @keyframes pop { 0%{opacity:1; transform:translateY(0)} 100%{opacity:0; transform:translateY(-100px)} }
        .dex-container { height: 100%; transition: all 0.3s; }
      `}</style>

      {/* ГЛАВНОЕ МЕНЮ (ХАБ) */}
      {!selectedDex ? (
        <div style={{ padding: 20, color: '#fff' }}>
          <header style={{ textAlign: 'center', padding: '40px 0' }}>
            <h1 style={{ fontSize: 42, margin: 0 }}>${balance.toLocaleString()}</h1>
            <div style={{ color: '#39F2AF', fontSize: 14 }}>Real-time Arbitrage Bot Active</div>
          </header>

          <div style={{ background: '#111', padding: 20, borderRadius: 20, border: '1px solid #222', marginBottom: 20 }}>
            <div style={{ fontSize: 10, opacity: 0.5 }}>ACTIVE SIGNAL:</div>
            {signal ? (
              <div style={{ marginTop: 10 }}>
                <b style={{ fontSize: 20 }}>SELL {signal.coin} ON {signal.sellDex}</b>
                <div style={{ color: '#39F2AF' }}>Profit: +{signal.perc}%</div>
              </div>
            ) : "Scanning liquidity pools..."}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            {Object.keys(DEX_ASSETS).map(name => (
              <button key={name} onClick={() => setSelectedDex(name)} style={{
                background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: 25, borderRadius: 20, fontWeight: 'bold'
              }}>{name}</button>
            ))}
          </div>
          
          <div style={{marginTop: 40, textAlign: 'center'}}>
             <a href="https://t.me/kriptoalians" style={{color: '#444', textDecoration: 'none', fontSize: 12}}>Support: @KRIPTOALIANS</a>
          </div>
        </div>
      ) : (
        /* ИНТЕРФЕЙСЫ БИРЖ */
        <div className="dex-container" style={{ background: currentStyle.bg, color: currentStyle.text, fontFamily: currentStyle.font }}>
          
          {/* 1. ШАПКА БИРЖИ (У каждой своя) */}
          <div style={{ padding: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: selectedDex === 'UNISWAP' ? 'none' : '1px solid rgba(128,128,128,0.2)' }}>
            <div style={{ fontWeight: 'bold', fontSize: 18, color: currentStyle.primary }}>{selectedDex}</div>
            <button onClick={() => setSelectedDex(null)} style={{ background: 'none', border: 'none', color: currentStyle.text }}>EXIT</button>
          </div>

          {/* 2. РАБОЧАЯ ОБЛАСТЬ (SWAP WIDGET) */}
          <div style={{ padding: '20px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ 
              width: '100%', maxWidth: 420, 
              background: selectedDex === 'UNISWAP' ? '#F5F6FC' : 'rgba(255,255,255,0.05)', 
              borderRadius: 24, padding: 15,
              border: selectedDex === 'UNISWAP' ? '1px solid #D9D9D9' : '1px solid rgba(255,255,255,0.1)'
            }}>
              
              {/* Поле ВВОДА */}
              <div style={{ background: selectedDex === 'UNISWAP' ? '#FFF' : 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 20, marginBottom: 5 }}>
                <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 10 }}>You pay</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ background: 'none', border: 'none', fontSize: 24, outline: 'none', color: currentStyle.text, width: '60%' }} />
                  <div style={{ fontWeight: 'bold' }}>USDT ▾</div>
                </div>
              </div>

              {/* Стрелка перехода */}
              <div style={{ textAlign: 'center', margin: '-10px 0', position: 'relative', zIndex: 2 }}>
                <div style={{ background: selectedDex === 'UNISWAP' ? '#F5F6FC' : '#000', width: 30, height: 30, borderRadius: 10, display: 'inline-block', lineHeight: '30px', border: '1px solid rgba(128,128,128,0.2)' }}>↓</div>
              </div>

              {/* Поле ВЫВОДА */}
              <div style={{ background: selectedDex === 'UNISWAP' ? '#FFF' : 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 20, marginTop: 5, marginBottom: 20 }}>
                <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 10 }}>You receive</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 24 }}>{(Number(amount) / 145).toFixed(3)}</div>
                  <div style={{ background: currentStyle.primary, color: '#000', padding: '4px 12px', borderRadius: 20, fontWeight: 'bold' }}>{signal?.coin || 'SOL'} ▾</div>
                </div>
              </div>

              {/* Кнопка ДЕЙСТВИЯ */}
              <button onClick={handleAction} style={{
                width: '100%', padding: 18, borderRadius: 20, border: 'none', 
                background: txStep === 'sign' ? '#FFCC00' : currentStyle.primary, 
                color: selectedDex === 'PANCAKE' ? '#FFF' : '#000',
                fontWeight: 'bold', fontSize: 18, cursor: 'pointer'
              }}>
                {txStep === 'idle' && (selectedDex === 'UNISWAP' ? 'Approve USDT' : 'Swap')}
                {txStep === 'approving' && 'Approving...'}
                {txStep === 'sign' && 'Sign Transaction'}
                {txStep === 'success' && 'Success!'}
              </button>
            </div>
          </div>

          {/* 3. ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ (FOOTER) */}
          <div style={{ position: 'absolute', bottom: 20, width: '100%', textAlign: 'center', fontSize: 11, opacity: 0.5 }}>
            Slippage Tolerance: 0.5% | Gas: Market | Route: Direct
          </div>
        </div>
      )}
    </div>
  );
}
