import React, { useState, useEffect, useRef } from 'react';

// --- ЕДИНЫЙ КОНФИГ ТРАНЗАКЦИЙ ---
const TX_TYPES = { APPROVE: 'approve', SWAP: 'swap', SUCCESS: 'success' };

export default function CryptoMegaApp() {
  const [balance, setBalance] = useState(1420.65);
  const [activeDex, setActiveDex] = useState(null); // 'UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'
  const [signal, setSignal] = useState(null);
  const [amount, setAmount] = useState('');
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [txStep, setTxStep] = useState('idle');

  // Генератор сигналов (Межбиржевой арбитраж)
  useEffect(() => {
    if (!signal) {
      const dexs = ['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'];
      setSignal({
        coin: 'SOL',
        buyAt: dexs[Math.floor(Math.random() * 4)],
        sellAt: dexs[Math.floor(Math.random() * 4)],
        profit: (Math.random() * 5 + 3).toFixed(2)
      });
    }
  }, [signal]);

  const executeAction = () => {
    setIsWalletOpen(true);
  };

  const confirmTx = () => {
    setTxStep('pending');
    setTimeout(() => {
      const isCorrect = activeDex === signal?.sellAt;
      const change = isCorrect ? (Number(amount) * (signal.profit / 100)) : -(Number(amount) * 0.3);
      setBalance(b => b + change);
      setTxStep('success');
      setTimeout(() => {
        setIsWalletOpen(false);
        setTxStep('idle');
        setActiveDex(null);
        setSignal(null);
        setAmount('');
      }, 1500);
    }, 2000);
  };

  // --- 1. МОДУЛЬ UNISWAP (ETH) ---
  const UniswapModule = () => (
    <div style={{ background: '#FFF', height: '100%', color: '#000', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 24 }}>🦄</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ background: '#F5F6FC', padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>Ethereum</div>
          <div style={{ background: 'rgba(255, 0, 122, 0.1)', color: '#FF007A', padding: '6px 12px', borderRadius: 12, fontWeight: 700 }}>0x7a...4e</div>
        </div>
      </header>
      <div style={{ padding: '20px 10px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 420, border: '1px solid #D9D9D9', borderRadius: 24, padding: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px' }}>
            <div style={{ fontWeight: 600 }}>Swap</div>
            <div style={{ opacity: 0.5 }}>⚙️</div>
          </div>
          <div style={{ background: '#F9F9F9', padding: 16, borderRadius: 16, marginBottom: 4, border: '1px solid transparent' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, opacity: 0.5, marginBottom: 8 }}>
              <span>You pay</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" style={{ background: 'none', border: 'none', fontSize: 32, outline: 'none', width: '60%' }} />
              <button style={{ background: '#FFF', border: '1px solid #D9D9D9', padding: '4px 10px', borderRadius: 16, fontWeight: 'bold' }}>ETH ▾</button>
            </div>
          </div>
          <div style={{ background: '#F9F9F9', padding: 16, borderRadius: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 14, opacity: 0.5, marginBottom: 8 }}>You receive</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 32, color: amount ? '#000' : '#AAA' }}>{amount ? (amount * 2600).toFixed(2) : '0'}</div>
              <button style={{ background: '#FF007A', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: 16, fontWeight: 'bold' }}>USDC ▾</button>
            </div>
          </div>
          <button onClick={executeAction} style={{ width: '100%', padding: 16, background: 'rgba(255, 0, 122, 0.1)', color: '#FF007A', border: 'none', borderRadius: 20, fontWeight: 'bold', fontSize: 18 }}>
            {amount ? 'Swap' : 'Enter an amount'}
          </button>
        </div>
      </div>
    </div>
  );

  // --- 2. МОДУЛЬ RAYDIUM (SOLANA) ---
  const RaydiumModule = () => (
    <div style={{ background: '#0c0d21', height: '100%', color: '#FFF', fontFamily: 'monospace' }}>
      <div style={{ padding: 15, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1a1b36' }}>
        <div style={{ color: '#39F2AF', fontWeight: 'bold' }}>RAYDIUM</div>
        <div style={{ background: '#1a1b36', padding: '5px 10px', borderRadius: 8, fontSize: 10, color: '#39f2af' }}>CONNECT</div>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ background: '#14162e', padding: 20, borderRadius: 20, border: '1px solid #1a1b36' }}>
          <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
            <span style={{ color: '#39F2AF', borderBottom: '2px solid #39F2AF', fontSize: 12 }}>Swap</span>
            <span style={{ opacity: 0.5, fontSize: 12 }}>Liquidity</span>
          </div>
          <div style={{ background: '#050614', padding: 15, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.4 }}><span>From</span> <span>MAX</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#FFF', fontSize: 24, outline: 'none', width: '60%' }} />
              <div style={{ background: '#1a1b36', padding: '5px 10px', borderRadius: 8 }}>USDT ▾</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', margin: '10px 0' }}>🔃</div>
          <div style={{ background: '#050614', padding: 15, borderRadius: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 10, opacity: 0.4 }}>To (Estimated)</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <div style={{ fontSize: 24 }}>{amount ? (amount / 145).toFixed(4) : '0.00'}</div>
              <div style={{ background: '#39F2AF', color: '#000', padding: '5px 10px', borderRadius: 8, fontWeight: 'bold' }}>SOL ▾</div>
            </div>
          </div>
          <button onClick={executeAction} style={{ width: '100%', padding: 15, background: '#39F2AF', color: '#000', border: 'none', borderRadius: 12, fontWeight: 'bold' }}>
            SWAP TOKENS
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
        .loading-spin { width: 40px; height: 40px; border: 4px solid #333; border-top-color: #00ff88; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {!activeDex ? (
        <div style={{ padding: 25, color: '#FFF' }}>
          <div style={{ textAlign: 'center', margin: '40px 0' }}>
            <h1 style={{ fontSize: 44, fontWeight: 900, margin: 0 }}>${balance.toLocaleString()}</h1>
            <p style={{ opacity: 0.5, letterSpacing: 2 }}>PORTFOLIO VALUE</p>
          </div>

          {/* ИНФОРМАЦИЯ О СИГНАЛЕ */}
          <div style={{ background: '#111', padding: 20, borderRadius: 24, border: '1px solid #222', marginBottom: 30 }}>
            <div style={{ color: '#00ff88', fontSize: 10, fontWeight: 'bold', marginBottom: 10 }}>NEW ARBITRAGE SIGNAL</div>
            {signal ? (
              <div>
                <div style={{ fontSize: 18, fontWeight: 'bold' }}>BUY {signal.coin} ON {signal.buyAt}</div>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#ffcc00' }}>SELL ON {signal.sellAt}</div>
                <div style={{ marginTop: 10, color: '#00ff88' }}>Profit Estimate: +{signal.profit}%</div>
              </div>
            ) : "Scanning liquidity pools..."}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            {['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'].map(id => (
              <button key={id} onClick={() => setActiveDex(id)} style={{
                background: '#1a1a1a', border: '1px solid #333', padding: 25, borderRadius: 20, color: '#FFF', fontWeight: 'bold'
              }}>{id}</button>
            ))}
          </div>
          
          <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center' }}>
             <a href="https://t.me/kriptoalians" style={{ color: '#333', textDecoration: 'none', fontSize: 12 }}>BUILD 2.0.4 @KRIPTOALIANS</a>
          </div>
        </div>
      ) : (
        <div style={{ height: '100%' }}>
          <button onClick={() => { setActiveDex(null); setAmount(''); }} style={{ position: 'absolute', top: 15, right: 15, zIndex: 1000, background: 'rgba(0,0,0,0.5)', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: 8 }}>BACK</button>
          {activeDex === 'UNISWAP' && <UniswapModule />}
          {activeDex === 'RAYDIUM' && <RaydiumModule />}
          {['PANCAKE', '1INCH'].includes(activeDex) && (
            <div style={{ padding: 40, color: '#FFF', textAlign: 'center' }}>
              <h2>{activeDex} PROTOCOL</h2>
              <button onClick={executeAction} style={{ width: '100%', padding: 15, background: '#1fc7d4', border: 'none', borderRadius: 12, marginTop: 20 }}>EXECUTE</button>
            </div>
          )}
        </div>
      )}

      {/* --- ГЛОБАЛЬНЫЙ МОДУЛЬ КОШЕЛЬКА (ПОДТВЕРЖДЕНИЕ) --- */}
      {isWalletOpen && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#1c1c1e', width: '100%', padding: 25, borderRadius: '24px 24px 0 0', color: '#FFF' }}>
            {txStep === 'idle' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                  <b style={{ fontSize: 18 }}>Confirm Swap</b>
                  <span onClick={() => setIsWalletOpen(false)}>✕</span>
                </div>
                <div style={{ background: '#2c2c2e', padding: 15, borderRadius: 12, marginBottom: 20 }}>
                  <div style={{ fontSize: 12, opacity: 0.5 }}>Network Fee</div>
                  <div style={{ color: '#00ff88' }}>$2.41 (Fast)</div>
                </div>
                <button onClick={confirmTx} style={{ width: '100%', padding: 16, background: '#34c759', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: 16 }}>CONFIRM & SIGN</button>
              </>
            )}
            {txStep === 'pending' && (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div className="loading-spin" style={{ margin: '0 auto 20px' }}></div>
                <h3>Sending Transaction...</h3>
                <p style={{ opacity: 0.5 }}>Broadcasting to blockchain</p>
              </div>
            )}
            {txStep === 'success' && (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 50, marginBottom: 10 }}>✅</div>
                <h3>Transaction Success!</h3>
                <p style={{ color: '#00ff88' }}>Confirmed in Block #84291</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
