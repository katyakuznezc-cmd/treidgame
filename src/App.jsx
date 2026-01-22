import React, { useState, useEffect } from 'react';

// --- ДАННЫЕ И ТОКЕНЫ ---
const TOKENS = {
  USDT: { symbol: 'USDT', name: 'Tether USD', icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png', price: 1 },
  SOL: { symbol: 'SOL', name: 'Solana', icon: 'https://cryptologos.cc/logos/solana-sol-logo.png', price: 145.20 },
  ETH: { symbol: 'ETH', name: 'Ethereum', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', price: 2640.15 },
  CRO: { symbol: 'CRO', name: 'Cronos', icon: 'https://cryptologos.cc/logos/cronos-cro-logo.png', price: 0.16 }
};

export default function ProExchangeApp() {
  // Global States
  const [balance, setBalance] = useState(5000.00);
  const [walletHoldings, setWalletHoldings] = useState({}); // { 'SOL': 10.5 }
  const [activeDex, setActiveDex] = useState(null);
  const [signal, setSignal] = useState(null);
  const [clicks, setClicks] = useState([]);

  // Exchange Local States
  const [payAmount, setPayAmount] = useState('');
  const [tokenFrom, setTokenFrom] = useState(TOKENS.USDT);
  const [tokenTo, setTokenTo] = useState(TOKENS.SOL);
  const [slippage, setSlippage] = useState('0.5');
  const [isTokenSelectOpen, setIsTokenSelectOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [txStatus, setTxStatus] = useState('idle');

  // Глобальный эффект сигнала
  useEffect(() => {
    if (!signal) {
      const dexs = ['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'];
      setSignal({
        coin: 'SOL',
        buy: dexs[0],
        sell: dexs[1],
        profit: (Math.random() * 5 + 4).toFixed(2)
      });
    }
  }, [signal]);

  // Звук и Визуал (из сохраненных инструкций)
  const handleInteraction = (e) => {
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    setClicks(prev => [...prev, { id: Date.now(), x, y }]);
    setTimeout(() => setClicks(p => p.slice(1)), 600);
  };

  // ЛОГИКА ТРАНЗАКЦИИ (Buy/Sell)
  const executeSwap = () => {
    if (!payAmount || payAmount <= 0) return;
    setTxStatus('approving');
    
    setTimeout(() => {
      setTxStatus('signing');
      setTimeout(() => {
        const isBuying = tokenFrom.symbol === 'USDT';
        const isWinningMove = (isBuying && activeDex === signal?.buy) || (!isBuying && activeDex === signal?.sell);
        const profitMult = isWinningMove ? (1 + signal.profit / 100) : 0.75;

        if (isBuying) {
          const receiveQty = (Number(payAmount) / tokenTo.price) * profitMult;
          setBalance(b => b - Number(payAmount));
          setWalletHoldings(h => ({ ...h, [tokenTo.symbol]: (h[tokenTo.symbol] || 0) + receiveQty }));
        } else {
          const receiveUSDT = (Number(payAmount) * tokenFrom.price) * profitMult;
          setBalance(b => b + receiveUSDT);
          setWalletHoldings(h => ({ ...h, [tokenFrom.symbol]: (h[tokenFrom.symbol] || 0) - Number(payAmount) }));
        }

        setTxStatus('success');
        setTimeout(() => { setTxStatus('idle'); setPayAmount(''); }, 2000);
      }, 1500);
    }, 1000);
  };

  // --- 🦄 UNISWAP INTERFACE (V3) ---
  const UniswapUI = () => (
    <div className="dex-container" style={{background: '#FFF', height: '100%', color: '#000', fontFamily: 'Inter, sans-serif'}}>
      <header style={{padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{fontSize: 24}}>🦄</div>
        <div style={{display: 'flex', gap: 10}}>
          <div style={{background: '#F5F6FC', padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600}}>Ethereum</div>
          <div style={{background: 'rgba(255, 0, 122, 0.1)', color: '#FF007A', padding: '6px 12px', borderRadius: 12, fontWeight: 'bold'}}>0x...{balance.toFixed(0)}</div>
        </div>
      </header>

      <div style={{display: 'flex', justifyContent: 'center', marginTop: 30, padding: 10}}>
        <div style={{width: '100%', maxWidth: 420, border: '1px solid #D9D9D9', borderRadius: 24, padding: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.05)'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', padding: '10px 12px'}}>
            <div style={{display: 'flex', gap: 15, fontWeight: 600}}><span>Swap</span> <span style={{opacity: 0.4}}>Tokens</span></div>
            <span onClick={() => setIsSettingsOpen(true)}>⚙️</span>
          </div>

          <div style={{background: '#F9F9F9', padding: 16, borderRadius: 16, border: '1px solid transparent', marginBottom: 4}}>
            <div style={{fontSize: 14, opacity: 0.5, marginBottom: 8}}>Sell</div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <input type="number" placeholder="0" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{background: 'none', border: 'none', fontSize: 36, width: '60%', outline: 'none'}} />
              <button onClick={() => setIsTokenSelectOpen('from')} style={{background: '#FFF', border: '1px solid #D9D9D9', padding: '4px 10px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 5, fontWeight: 'bold'}}>
                <img src={tokenFrom.icon} width="20"/> {tokenFrom.symbol} ▾
              </button>
            </div>
            <div style={{fontSize: 12, opacity: 0.4, marginTop: 5}}>Balance: {tokenFrom.symbol === 'USDT' ? balance.toFixed(2) : (walletHoldings[tokenFrom.symbol] || 0).toFixed(4)}</div>
          </div>

          <div style={{background: '#F9F9F9', padding: 16, borderRadius: 16}}>
            <div style={{fontSize: 14, opacity: 0.5, marginBottom: 8}}>Buy</div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <div style={{fontSize: 36, color: payAmount ? '#000' : '#888'}}>{payAmount ? (payAmount / tokenTo.price).toFixed(5) : '0'}</div>
              <button onClick={() => setIsTokenSelectOpen('to')} style={{background: '#FF007A', color: '#FFF', border: 'none', padding: '6px 14px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 5, fontWeight: 'bold'}}>
                <img src={tokenTo.icon} width="20"/> {tokenTo.symbol} ▾
              </button>
            </div>
          </div>

          <button onClick={executeSwap} style={{width: '100%', padding: 16, background: 'rgba(255, 0, 122, 0.1)', color: '#FF007A', border: 'none', borderRadius: 20, fontWeight: 'bold', fontSize: 18, marginTop: 10}}>
             {txStatus === 'idle' ? (payAmount ? 'Swap' : 'Enter amount') : 'Processing...'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div onPointerDown={handleInteraction} style={{width: '100vw', height: '100dvh', background: '#000', color: '#FFF', overflow: 'hidden', position: 'relative'}}>
      {/* Click Dollars Effect */}
      {clicks.map(c => <div key={c.id} className="dollar-pop" style={{left: c.x, top: c.y}}>$</div>)}

      {!activeDex ? (
        <div style={{padding: 20}}>
          <div style={{textAlign: 'center', margin: '40px 0'}}>
             <h1 style={{fontSize: 50, fontWeight: 900, margin: 0}}>${balance.toLocaleString()}</h1>
             <p style={{opacity: 0.5, letterSpacing: 3}}>ARBITRAGE HUB</p>
          </div>

          <div className="signal-card" style={{background: '#111', padding: 20, borderRadius: 24, border: '1px solid #222', marginBottom: 30}}>
             <div style={{display: 'flex', gap: 8, alignItems: 'center', color: '#00FF88', fontSize: 10, fontWeight: 'bold', marginBottom: 15}}>
               <div className="pulse-dot"></div> ACTIVE SIGNAL
             </div>
             {signal && (
               <>
                 <div style={{fontSize: 20, fontWeight: 900}}>BUY ON <span style={{color: '#FF007A'}}>{signal.buy}</span></div>
                 <div style={{fontSize: 20, fontWeight: 900, color: '#39F2AF'}}>SELL ON {signal.sell}</div>
                 <div style={{marginTop: 10, fontSize: 14, color: '#00FF88'}}>PROFIT: +{signal.profit}%</div>
               </>
             )}
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15}}>
            {['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'].map(id => (
              <button key={id} onClick={() => setActiveDex(id)} style={{background: '#1a1a1a', border: '1px solid #333', padding: 25, borderRadius: 20, color: '#FFF', fontWeight: 'bold'}}>{id}</button>
            ))}
          </div>
          
          <div style={{position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center'}}>
             <a href="https://t.me/kriptoalians" style={{color: '#333', textDecoration: 'none', fontSize: 12}}>SETTINGS & CREATORS</a>
          </div>
        </div>
      ) : (
        <div style={{height: '100%'}}>
           <button onClick={() => setActiveDex(null)} style={{position: 'absolute', top: 15, right: 15, zIndex: 1000, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#FFF', padding: '6px 12px', borderRadius: 8}}>EXIT</button>
           {activeDex === 'UNISWAP' && <UniswapUI />}
           {activeDex === 'RAYDIUM' && (
             <div style={{background: '#0c0d21', height: '100%', padding: 20}}>
               <h2 style={{color: '#39F2AF'}}>RAYDIUM V2</h2>
               {/* Здесь верстка Raydium аналогично Uniswap, но в темных тонах */}
               <button onClick={executeSwap} style={{width: '100%', background: '#39F2AF', padding: 20, borderRadius: 12, color: '#000', fontWeight: 'bold'}}>EXECUTE SOLANA SWAP</button>
             </div>
           )}
        </div>
      )}

      {/* MODALS */}
      {txStatus !== 'idle' && (
        <div className="modal-overlay">
           <div className="modal-content">
              {txStatus === 'approving' && <p>Approving Token Spending...</p>}
              {txStatus === 'signing' && <p>Waiting for Wallet Signature...</p>}
              {txStatus === 'success' && <p style={{color: '#00FF88'}}>Transaction Confirmed!</p>}
              <div className="loader"></div>
           </div>
        </div>
      )}

      <style>{`
        .dollar-pop { position: absolute; color: #00FF88; font-weight: bold; animation: popUp 0.6s ease-out forwards; pointer-events: none; }
        @keyframes popUp { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-50px); } }
        .pulse-dot { width: 8px; height: 8px; background: #00FF88; borderRadius: 50%; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }
        .modal-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justifyContent: center; }
        .modal-content { text-align: center; }
        .loader { width: 40px; height: 40px; border: 4px solid #333; border-top-color: #00FF88; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
