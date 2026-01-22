import React, { useState, useEffect } from 'react';

// Константы для имитации реальных данных блокчейна
const DEX_CONFIG = {
  UNISWAP: {
    theme: '#FF007A',
    bg: '#FFFFFF',
    text: '#000000',
    header: '🦄 Uniswap',
    network: 'Ethereum',
    buttonStyle: { borderRadius: '20px', fontWeight: '600' }
  },
  RAYDIUM: {
    theme: '#39F2AF',
    bg: '#0C0D21',
    text: '#FFFFFF',
    header: 'RAYDIUM',
    network: 'Solana',
    buttonStyle: { borderRadius: '12px', fontWeight: '900', letterSpacing: '1px' }
  },
  PANCAKE: {
    theme: '#1FC7D4',
    bg: '#08060B',
    text: '#FFFFFF',
    header: '🥞 PancakeSwap',
    network: 'BNB Smart Chain',
    buttonStyle: { borderRadius: '16px', fontWeight: 'bold', boxShadow: '0 -3px 0 rgba(0,0,0,0.2) inset' }
  }
};

export default function App() {
  const [balance, setBalance] = useState(1500.00);
  const [activeDex, setActiveDex] = useState(null);
  const [amount, setAmount] = useState('0.0');
  const [signal, setSignal] = useState(null);
  const [txState, setTxState] = useState('idle'); // idle, approving, sign, success
  const [clicks, setClicks] = useState([]);

  useEffect(() => {
    if (!signal) {
      setSignal({
        pair: 'USDT/SOL',
        targetDex: 'RAYDIUM',
        profit: (Math.random() * 4 + 2).toFixed(2)
      });
    }
  }, [signal]);

  const handleGlobalClick = (e) => {
    const x = e.clientX || e.touches?.[0].clientX;
    const y = e.clientY || e.touches?.[0].clientY;
    const id = Date.now();
    setClicks(prev => [...prev, { id, x, y }]);
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 700);
  };

  const processTrade = () => {
    if (txState === 'idle') {
      setTxState('approving');
      setTimeout(() => setTxState('sign'), 1200);
    } else if (txState === 'sign') {
      setTxState('pending');
      setTimeout(() => {
        const isCorrect = activeDex === signal?.targetDex;
        const result = isCorrect ? (Number(amount) * (signal.profit / 100)) : -(Number(amount) * 0.2);
        setBalance(b => b + result);
        setTxState('success');
        setTimeout(() => { setActiveDex(null); setTxState('idle'); setSignal(null); }, 1500);
      }, 2000);
    }
  };

  // --- 1. КЛОН UNISWAP (ETH STYLE) ---
  const UniswapUI = () => (
    <div style={{ background: '#FFF', height: '100%', color: '#000', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 28 }}>🦄</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ background: '#F5F6FC', padding: '6px 12px', borderRadius: 12, fontSize: 12 }}>Ethereum ▾</div>
          <div style={{ background: 'rgba(255, 0, 122, 0.1)', color: '#FF007A', padding: '6px 12px', borderRadius: 12, fontWeight: 'bold' }}>0x7a...4e</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40, padding: 12 }}>
        <div style={{ width: '100%', maxWidth: 420, border: '1px solid #D9D9D9', borderRadius: 24, padding: 8 }}>
          <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between' }}><b>Swap</b> <span>⚙️</span></div>
          <div style={{ background: '#F9F9F9', padding: 16, borderRadius: 16, marginBottom: 4 }}>
            <div style={{ fontSize: 12, opacity: 0.5 }}>You pay</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ background: 'none', border: 'none', fontSize: 32, width: '60%', outline: 'none' }} />
              <div style={{ background: '#FFF', border: '1px solid #D9D9D9', padding: '4px 8px', borderRadius: 16, fontWeight: 'bold' }}>ETH ▾</div>
            </div>
          </div>
          <div style={{ background: '#F9F9F9', padding: 16, borderRadius: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.5 }}>You receive</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 32, color: '#888' }}>{(Number(amount) * 26.4).toFixed(2)}</div>
              <div style={{ background: '#FF007A', color: '#FFF', padding: '4px 12px', borderRadius: 16, fontWeight: 'bold' }}>USDT ▾</div>
            </div>
          </div>
          <button onClick={processTrade} style={{ width: '100%', padding: 18, background: 'rgba(255, 0, 122, 0.15)', color: '#FF007A', border: 'none', borderRadius: 20, fontWeight: 'bold', fontSize: 18 }}>
            {txState === 'idle' ? 'Swap' : txState === 'approving' ? 'Approving...' : 'Confirm Swap'}
          </button>
        </div>
      </div>
    </div>
  );

  // --- 2. КЛОН RAYDIUM (SOLANA STYLE) ---
  const RaydiumUI = () => (
    <div style={{ background: '#0c0d21', height: '100%', color: '#FFF', fontFamily: 'monospace' }}>
      <div style={{ padding: 15, borderBottom: '1px solid #1a1b36', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ color: '#39F2AF', fontWeight: 'bold' }}>RAYDIUM</div>
        <div style={{ color: '#39F2AF', fontSize: 12 }}>Connect ▾</div>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ background: '#14162e', padding: 20, borderRadius: 16, border: '1px solid #1a1b36' }}>
          <div style={{ display: 'flex', gap: 15, marginBottom: 20, fontSize: 12 }}>
            <span style={{ color: '#39F2AF', borderBottom: '2px solid #39F2AF' }}>Swap</span>
            <span style={{ opacity: 0.5 }}>Liquidity</span>
          </div>
          <div style={{ background: '#050614', padding: 15, borderRadius: 12, border: '1px solid #1a1b36' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.4 }}><span>From</span> <span>Bal: {balance.toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#FFF', fontSize: 24, outline: 'none', width: '60%' }} />
              <div style={{ background: '#1a1b36', padding: '5px 10px', borderRadius: 8 }}>USDC ▾</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', margin: '10px 0', color: '#39F2AF' }}>↓</div>
          <div style={{ background: '#050614', padding: 15, borderRadius: 12, border: '1px solid #1a1b36', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.4 }}><span>To (Est.)</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <div style={{ fontSize: 24 }}>{(Number(amount) / 145).toFixed(4)}</div>
              <div style={{ background: '#39F2AF', color: '#000', padding: '5px 10px', borderRadius: 8, fontWeight: 'bold' }}>SOL ▾</div>
            </div>
          </div>
          <button onClick={processTrade} style={{ width: '100%', padding: 15, background: '#39F2AF', color: '#000', border: 'none', borderRadius: 8, fontWeight: 'bold', letterSpacing: 1 }}>
            {txState === 'idle' ? 'SWAP TOKENS' : 'PROCESSING...'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div onPointerDown={handleGlobalClick} style={{ width: '100vw', height: '100dvh', background: '#000', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        .dollar { position:absolute; color:#00ff88; font-weight:900; animation:pop 0.6s forwards; z-index:9999; pointer-events:none; font-size:24px; }
        @keyframes pop { 0%{opacity:1; transform:translateY(0)} 100%{opacity:0; transform:translateY(-80px)} }
      `}</style>

      {clicks.map(c => <div key={c.id} className="dollar" style={{ left: c.x - 10, top: c.y - 10 }}>$</div>)}

      {!activeDex ? (
        <div style={{ padding: 25, color: '#FFF' }}>
          <div style={{ textAlign: 'center', margin: '40px 0' }}>
            <h1 style={{ fontSize: 44, margin: 0, fontWeight: 900 }}>${balance.toLocaleString()}</h1>
            <p style={{ opacity: 0.4, letterSpacing: 2, fontSize: 12 }}>WALLET BALANCE</p>
          </div>

          <div style={{ background: '#111', padding: 20, borderRadius: 20, border: '1px solid #222', marginBottom: 30 }}>
            <div style={{ fontSize: 10, color: '#00f2ff', fontWeight: 'bold' }}>ARBITRAGE ALERT</div>
            {signal ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 'bold' }}>{signal.pair} Opportunitity</div>
                <div style={{ color: '#00ff88' }}>Target: {signal.targetDex} (+{signal.profit}%)</div>
              </div>
            ) : "Scanning..."}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {Object.keys(DEX_CONFIG).map(id => (
              <button key={id} onClick={() => setActiveDex(id)} style={{ background: '#1a1a1a', border: '1px solid #333', padding: 25, borderRadius: 20, color: '#FFF', fontWeight: 'bold' }}>{id}</button>
            ))}
          </div>

          <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center' }}>
            <a href="https://t.me/kriptoalians" style={{ color: '#333', textDecoration: 'none', fontSize: 10 }}>CREATORS @KRIPTOALIANS</a>
          </div>
        </div>
      ) : (
        <div style={{ height: '100%' }}>
          <button onClick={() => setActiveDex(null)} style={{ position: 'absolute', top: 15, right: 15, zIndex: 1000, background: 'rgba(0,0,0,0.5)', color: '#FFF', border: 'none', borderRadius: 8, padding: '6px 12px' }}>BACK</button>
          {activeDex === 'UNISWAP' && <UniswapUI />}
          {activeDex === 'RAYDIUM' && <RaydiumUI />}
          {activeDex === 'PANCAKE' && (
            <div style={{ padding: 20, color: '#FFF' }}>
              <h2>PancakeSwap Module</h2>
              <button onClick={processTrade} style={{ width: '100%', padding: 20, background: '#1fc7d4', border: 'none', borderRadius: 16 }}>Swap Now</button>
            </div>
          )}
        </div>
      )}

      {/* КЛОН ПОДТВЕРЖДЕНИЯ КОШЕЛЬКА */}
      {txState === 'sign' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#1a1a1a', width: '100%', padding: 30, borderRadius: '24px 24px 0 0', borderTop: '1px solid #333', color: '#FFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <b>Sign Transaction</b>
              <span onClick={() => setTxState('idle')}>✕</span>
            </div>
            <div style={{ background: '#111', padding: 15, borderRadius: 12, marginBottom: 25, fontSize: 14 }}>
              <div style={{ opacity: 0.5 }}>Network Fee:</div>
              <div style={{ color: '#00ff88', fontWeight: 'bold' }}>$2.15 (Market)</div>
            </div>
            <button onClick={processTrade} style={{ width: '100%', padding: 18, background: '#00ff88', color: '#000', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: 16 }}>
              CONFIRM & SIGN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
