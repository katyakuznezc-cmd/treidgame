import React, { useState, useEffect, useRef } from 'react';

// Конфигурация сетей и активов
const NETWORKS = {
  ETH: { name: 'Ethereum', color: '#627EEA', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  SOL: { name: 'Solana', color: '#14F195', logo: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  BSC: { name: 'BNB Chain', color: '#F3BA2F', logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' }
};

export default function App() {
  const [balance, setBalance] = useState(1240.50);
  const [activeDex, setActiveDex] = useState(null);
  const [amount, setAmount] = useState('');
  const [signal, setSignal] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, wallet_approval, mining, success
  const [clicks, setClicks] = useState([]);

  // Реальный генератор сигналов (Межбиржевой арбитраж)
  useEffect(() => {
    if (!signal && status === 'idle') {
      const timer = setTimeout(() => {
        const pairs = [
          { coin: 'SOL', buy: 'UNISWAP', sell: 'RAYDIUM', profit: 4.2 },
          { coin: 'ETH', buy: 'PANCAKE', sell: 'UNISWAP', profit: 3.8 },
          { coin: 'BNB', buy: '1INCH', sell: 'PANCAKE', profit: 5.1 }
        ];
        setSignal(pairs[Math.floor(Math.random() * pairs.length)]);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [signal, status]);

  const handleAction = () => {
    if (!amount || amount <= 0) return;
    setStatus('wallet_approval');
    
    // Имитация задержки сети и подтверждения
    setTimeout(() => {
      setStatus('mining');
      setTimeout(() => {
        const isCorrectDex = activeDex === signal?.sell;
        const result = isCorrectDex ? (Number(amount) * (signal.profit / 100)) : -(Number(amount) * 0.25);
        setBalance(prev => prev + result);
        setStatus('success');
        setTimeout(() => { setStatus('idle'); setActiveDex(null); setSignal(null); setAmount(''); }, 2000);
      }, 2500);
    }, 1500);
  };

  // --- 1. ТЕРМИНАЛ UNISWAP (v3 Interface) ---
  const UniswapUI = () => (
    <div style={{background: '#FFF', height: '100%', color: '#000', fontFamily: 'Inter, sans-serif'}}>
      <nav style={{padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <span style={{fontSize: 24}}>🦄</span>
        <div style={{display: 'flex', gap: 10}}>
          <div style={{background: '#F5F6FC', padding: '8px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600}}>Tokens</div>
          <div style={{background: 'rgba(255, 0, 122, 0.1)', color: '#FF007A', padding: '8px 12px', borderRadius: 12, fontWeight: 'bold'}}>0x...42e</div>
        </div>
      </nav>
      <div style={{padding: '40px 10px', display: 'flex', justifyContent: 'center'}}>
        <div style={{width: '100%', maxWidth: 420, background: '#FFF', border: '1px solid #d9d9d9', borderRadius: 24, padding: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.05)'}}>
          <div style={{display:'flex', justifyContent:'space-between', padding: '10px'}}><b>Swap</b> <span style={{opacity: 0.5}}>⚙️</span></div>
          <div style={{background: '#f9f9f9', padding: 16, borderRadius: 16, marginBottom: 4}}>
            <div style={{fontSize: 12, opacity: 0.5, marginBottom: 8}}>You pay</div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <input type="number" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)} style={{background:'none', border:'none', fontSize: 32, outline:'none', width: '60%'}} />
              <div style={{background: '#FFF', border: '1px solid #d9d9d9', padding: '4px 10px', borderRadius: 16, fontWeight: 'bold'}}>ETH ▾</div>
            </div>
          </div>
          <div style={{background: '#f9f9f9', padding: 16, borderRadius: 16, marginBottom: 12}}>
            <div style={{fontSize: 12, opacity: 0.5, marginBottom: 8}}>You receive</div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <div style={{fontSize: 32, color: amount ? '#000' : '#888'}}>{amount ? (amount * 2600).toFixed(2) : '0'}</div>
              <div style={{background: '#FF007A', color: '#FFF', padding: '4px 12px', borderRadius: 16, fontWeight: 'bold'}}>{signal?.coin || 'USDT'} ▾</div>
            </div>
          </div>
          <button onClick={handleAction} style={{width: '100%', padding: 18, background: 'rgba(255, 0, 122, 0.15)', color: '#FF007A', border: 'none', borderRadius: 20, fontWeight: 'bold', fontSize: 18}}>
            {status === 'idle' ? 'Swap' : 'Confirming...'}
          </button>
        </div>
      </div>
    </div>
  );

  // --- 2. ТЕРМИНАЛ RAYDIUM (Solana Glassmorphism) ---
  const RaydiumUI = () => (
    <div style={{background: '#0c0d21', height: '100%', color: '#FFF', fontFamily: 'monospace'}}>
      <header style={{padding: 15, borderBottom: '1px solid #1a1b36', display: 'flex', justifyContent: 'space-between', alignItems:'center'}}>
        <div style={{color: '#39F2AF', fontWeight: 'bold', letterSpacing: 1}}>RAYDIUM</div>
        <div style={{background: '#1a1b36', padding: '5px 10px', borderRadius: 8, fontSize: 10, color: '#39f2af'}}>SOL: $145.2</div>
      </header>
      <div style={{padding: 20}}>
        <div style={{background: 'rgba(20, 22, 46, 0.9)', padding: 20, borderRadius: 20, border: '1px solid #1a1b36', backdropFilter: 'blur(10px)'}}>
          <div style={{display:'flex', gap: 15, marginBottom: 20, fontSize: 12}}>
            <span style={{color: '#39F2AF', borderBottom: '2px solid #39F2AF'}}>Swap</span>
            <span style={{opacity: 0.4}}>Liquidity</span>
          </div>
          <div style={{background: '#050614', padding: 15, borderRadius: 12, marginBottom: 5}}>
            <div style={{display:'flex', justifyContent:'space-between', fontSize: 10, opacity: 0.4}}><span>From</span> <span>Balance: {balance.toFixed(2)}</span></div>
            <div style={{display:'flex', justifyContent:'space-between', marginTop: 10}}>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{background:'none', border:'none', color:'#FFF', fontSize: 24, outline:'none', width: '50%'}} />
              <div style={{background: '#1a1b36', padding: '5px 10px', borderRadius: 8}}>USDC ▾</div>
            </div>
          </div>
          <div style={{textAlign: 'center', margin: '10px 0', color: '#39F2AF'}}>↓</div>
          <div style={{background: '#050614', padding: 15, borderRadius: 12, marginBottom: 20}}>
            <div style={{fontSize: 10, opacity: 0.4}}>To (Estimated)</div>
            <div style={{display:'flex', justifyContent:'space-between', marginTop: 10}}>
              <div style={{fontSize: 24}}>{amount ? (amount / 145).toFixed(4) : '0.00'}</div>
              <div style={{background: '#39f2af', color: '#000', padding: '5px 10px', borderRadius: 8, fontWeight: 'bold'}}>{signal?.coin || 'SOL'} ▾</div>
            </div>
          </div>
          <button onClick={handleAction} style={{width: '100%', padding: 15, background: '#39F2AF', color: '#000', border: 'none', borderRadius: 12, fontWeight: 'bold'}}>
            {status === 'idle' ? 'SWAP TOKENS' : 'PROCESSING...'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{width: '100vw', height: '100dvh', background: '#000', overflow: 'hidden', position: 'relative'}}>
      {/* ГЛАВНЫЙ ЭКРАН ХАБА */}
      {!activeDex ? (
        <div style={{padding: 25, color: '#FFF'}}>
          <header style={{textAlign: 'center', margin: '30px 0'}}>
            <h1 style={{fontSize: 48, fontWeight: 900, margin: 0}}>${balance.toLocaleString()}</h1>
            <p style={{opacity: 0.4, letterSpacing: 2, fontSize: 12}}>NET WORTH</p>
          </header>

          {/* СЕКЦИЯ СИГНАЛОВ */}
          <div style={{background: '#111', padding: 20, borderRadius: 24, border: '1px solid #222', marginBottom: 25}}>
            <div style={{display:'flex', alignItems:'center', gap: 8, marginBottom: 15}}>
              <div style={{width: 8, height: 8, background: '#00ff88', borderRadius: '50%', animation: 'pulse 1.5s infinite'}}></div>
              <span style={{fontSize: 10, fontWeight: 'bold', color: '#00ff88'}}>LIVE ARBITRAGE SCANNER</span>
            </div>
            {signal ? (
              <div>
                <div style={{fontSize: 20, fontWeight: 'bold'}}>BUY {signal.coin} ON {signal.buy}</div>
                <div style={{fontSize: 20, fontWeight: 'bold', color: '#ffcc00'}}>SELL ON {signal.sell}</div>
                <div style={{marginTop: 10, fontSize: 14, color: '#00ff88'}}>Expected Profit: +{signal.profit}%</div>
              </div>
            ) : "Scanning pools for liquidity gaps..."}
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15}}>
            {['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'].map(id => (
              <button key={id} onClick={() => setActiveDex(id)} style={{
                background: '#1a1a1a', border: '1px solid #333', padding: 25, borderRadius: 20, color: '#FFF', fontWeight: 'bold'
              }}>{id}</button>
            ))}
          </div>
          
          <div style={{position: 'absolute', bottom: 30, width: '100%', left: 0, textAlign: 'center'}}>
             <a href="https://t.me/kriptoalians" style={{color: '#333', textDecoration: 'none', fontSize: 12}}>DEVELOPED BY @KRIPTOALIANS</a>
          </div>
        </div>
      ) : (
        <div style={{height: '100%'}}>
          <button onClick={()=>setActiveDex(null)} style={{position: 'absolute', top: 15, right: 15, zIndex: 1000, background: 'rgba(0,0,0,0.5)', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: 8}}>EXIT</button>
          {activeDex === 'UNISWAP' && <UniswapUI />}
          {activeDex === 'RAYDIUM' && <RaydiumUI />}
          {/* Аналогично прописываются Pancake и 1inch */}
          {['PANCAKE', '1INCH'].includes(activeDex) && (
            <div style={{padding: 40, color:'#FFF', textAlign:'center'}}>
              <h2>{activeDex} Engine</h2>
              <p>Interface Protocol 4.0</p>
              <button onClick={handleAction} style={{width:'100%', padding:20, background:'#1fc7d4', border:'none', borderRadius:16, color:'#FFF', fontWeight:'bold'}}>EXECUTE SWAP</button>
            </div>
          )}
        </div>
      )}

      {/* ИМИТАЦИЯ ПОДТВЕРЖДЕНИЯ КОШЕЛЬКА */}
      {status === 'wallet_approval' && (
        <div style={{position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'flex-end'}}>
          <div style={{background: '#1c1c1e', width: '100%', padding: 30, borderRadius: '24px 24px 0 0', borderTop: '1px solid #333', color: '#FFF', animation: 'slideUp 0.3s forwards'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom: 20}}>
              <b style={{fontSize: 18}}>Confirm Transaction</b>
              <span onClick={()=>setStatus('idle')}>✕</span>
            </div>
            <div style={{background: '#2c2c2e', padding: 15, borderRadius: 12, marginBottom: 20}}>
              <div style={{fontSize: 12, opacity: 0.5}}>Network Fee (Gas)</div>
              <div style={{color: '#00ff88', fontWeight: 'bold'}}>$1.45 — Fast</div>
            </div>
            <button onClick={handleAction} style={{width: '100%', padding: 18, background: '#34c759', color: '#FFF', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: 16}}>SIGN & SEND</button>
          </div>
        </div>
      )}

      {/* ЭКРАН ТРАНЗАКЦИИ В БЛОКЧЕЙНЕ */}
      {status === 'mining' && (
        <div style={{position: 'absolute', inset: 0, background: '#000', zIndex: 10001, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#FFF'}}>
           <div className="loader"></div>
           <h2 style={{marginTop: 20}}>Broadcasting to Network...</h2>
           <p style={{opacity: 0.5, fontSize: 12}}>Waiting for block confirmation</p>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .loader { width: 50px; height: 50px; border: 3px solid #333; border-top: 3px solid #00ff88; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
