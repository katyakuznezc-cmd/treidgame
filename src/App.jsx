import React, { useState, useEffect, useRef } from 'react';

// Реальные данные для имитации функционала
const ASSETS = [
  { id: 'SOL', name: 'Solana', price: 145, img: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  { id: 'ETH', name: 'Ethereum', price: 2650, img: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { id: 'TON', name: 'Toncoin', price: 5.4, img: 'https://cryptologos.cc/logos/toncoin-ton-logo.png' },
  { id: 'BNB', name: 'BNB', price: 590, img: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' }
];

export default function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('st_bal')) || 1000.00);
  const [selectedDex, setSelectedDex] = useState(null);
  const [amount, setAmount] = useState('100');
  const [activeTrade, setActiveTrade] = useState(false);
  const [signal, setSignal] = useState(null);
  const [clicks, setClicks] = useState([]);
  const [isApproved, setIsApproved] = useState(false);
  const [isWalletConfirm, setIsWalletConfirm] = useState(false);

  // Поиск сигнала (Межбиржевой арбитраж)
  useEffect(() => {
    if (!signal && !activeTrade) {
      const timer = setTimeout(() => {
        const coin = ASSETS[Math.floor(Math.random() * ASSETS.length)];
        const target = ['RAYDIUM', 'UNISWAP', 'PANCAKE', '1INCH'][Math.floor(Math.random() * 4)];
        setSignal({ coin: coin.id, sellDex: target, perc: (Math.random() * 6 + 2).toFixed(2) });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [signal, activeTrade]);

  const runTransaction = () => {
    setIsWalletConfirm(true); // Имитация всплывающего окна кошелька
    setTimeout(() => {
      setIsWalletConfirm(false);
      setActiveTrade(true);
      setTimeout(() => {
        const isWin = selectedDex === signal?.sellDex;
        const profit = isWin ? (Number(amount) * (parseFloat(signal.perc) / 100)) : -(Number(amount) * 0.4);
        setBalance(b => b + profit);
        setActiveTrade(false); setSignal(null); setSelectedDex(null); setIsApproved(false);
      }, 2000);
    }, 1500);
  };

  const handleGlobalClick = (e) => {
    const x = e.clientX || e.touches?.[0].clientX;
    const y = e.clientY || e.touches?.[0].clientY;
    if (x) {
      const id = Date.now();
      setClicks(prev => [...prev, { id, x, y }]);
      setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 600);
    }
  };

  // --- 1. RAYDIUM TERMINAL (SOLANA) ---
  const Raydium = () => (
    <div style={{background: '#0c0d21', height: '100%', color: '#fff', fontFamily: 'monospace'}}>
      <header style={{padding: 15, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1a1b36'}}>
        <div style={{color: '#39f2af', fontWeight: 'bold'}}>RAYDIUM</div>
        <div style={{fontSize: 10, opacity: 0.5}}>0.5% Slippage ⚙️</div>
      </header>
      <div style={{padding: 20}}>
        <div style={{background: '#14162e', padding: 20, borderRadius: 16}}>
          <label style={{fontSize: 10, opacity: 0.5}}>YOU PAY</label>
          <div style={{display:'flex', justifyContent:'space-between', margin: '10px 0'}}>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{background:'none', border:'none', color:'#fff', fontSize: 24, outline:'none', width: '50%'}} />
            <span style={{background: '#050614', padding: '5px 10px', borderRadius: 8}}>USDC ▾</span>
          </div>
          <div style={{textAlign:'center', color: '#39f2af'}}>↓</div>
          <label style={{fontSize: 10, opacity: 0.5}}>YOU RECEIVE</label>
          <div style={{display:'flex', justifyContent:'space-between', margin: '10px 0'}}>
            <div style={{fontSize: 24}}>{(Number(amount)/145).toFixed(3)}</div>
            <span style={{background: '#39f2af', color: '#000', padding: '5px 10px', borderRadius: 8, fontWeight:'bold'}}>{signal?.coin || 'SOL'} ▾</span>
          </div>
          <button onClick={runTransaction} style={{width:'100%', padding: 15, background:'#39f2af', color:'#000', border:'none', borderRadius: 12, fontWeight:'bold', marginTop: 15}}>
            {activeTrade ? 'CONFIRMING...' : 'SWAP'}
          </button>
        </div>
      </div>
    </div>
  );

  // --- 2. UNISWAP TERMINAL (ETHEREUM) ---
  const Uniswap = () => (
    <div style={{background: '#fff', height: '100%', color: '#000', fontFamily: 'sans-serif'}}>
      <header style={{padding: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <span style={{fontSize: 24}}>🦄</span>
        <button style={{background: '#f5f6fc', border: 'none', padding: '8px 12px', borderRadius: 12, fontWeight: 'bold', color: '#ff007a'}}>Connect</button>
      </header>
      <div style={{padding: 10, display: 'flex', justifyContent: 'center'}}>
        <div style={{width: '100%', maxWidth: 400, background: '#fff', border: '1px solid #d9d9d9', borderRadius: 24, padding: 12}}>
          <div style={{background: '#f9f9f9', padding: 15, borderRadius: 16, marginBottom: 5}}>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{width: '100%', background: 'none', border: 'none', fontSize: 28, outline: 'none'}} />
            <div style={{textAlign:'right', fontWeight:'bold'}}>ETH ▾</div>
          </div>
          <div style={{background: '#f9f9f9', padding: 15, borderRadius: 16, marginBottom: 15}}>
            <div style={{fontSize: 28, color: '#888'}}>{signal?.coin || '0.0'}</div>
            <div style={{textAlign:'right', background:'#ff007a', color:'#fff', padding:'4px 10px', borderRadius:20, display:'inline-block', float:'right', fontSize:12}}>{signal?.coin || 'Select'} ▾</div>
            <div style={{clear:'both'}}></div>
          </div>
          <button onClick={isApproved ? runTransaction : () => setIsApproved(true)} style={{width:'100%', padding: 18, background: 'rgba(255, 0, 122, 0.1)', color: '#ff007a', border: 'none', borderRadius: 20, fontWeight: 'bold', fontSize: 18}}>
            {isApproved ? 'Swap' : 'Approve ETH'}
          </button>
        </div>
      </div>
    </div>
  );

  // --- 3. PANCAKESWAP TERMINAL (BSC) ---
  const Pancake = () => (
    <div style={{background: '#08060b', height: '100%', color: '#fff'}}>
      <header style={{padding: 15, display: 'flex', justifyContent: 'space-between', background: '#27262c'}}>
        <b style={{color: '#1fc7d4'}}>🥞 Pancake</b>
        <span>⚙️ 🕒</span>
      </header>
      <div style={{padding: 20}}>
        <div style={{background: '#27262c', padding: 20, borderRadius: 24, borderBottom: '4px solid rgba(0,0,0,0.2)'}}>
          <div style={{background: '#372f47', padding: 15, borderRadius: 16, marginBottom: 10}}>
             <small style={{color: '#1fc7d4'}}>BNB</small>
             <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{width:'100%', background:'none', border:'none', color:'#fff', fontSize: 18, outline:'none'}} />
          </div>
          <div style={{textAlign:'center', fontSize: 20, color: '#1fc7d4'}}>↓</div>
          <div style={{background: '#372f47', padding: 15, borderRadius: 16, marginBottom: 20}}>
             <small style={{color: '#1fc7d4'}}>{signal?.coin || 'CAKE'}</small>
             <div style={{fontSize: 18}}>{(Number(amount) * 1.5).toFixed(2)}</div>
          </div>
          <button onClick={runTransaction} style={{width:'100%', padding: 15, background:'#1fc7d4', color:'#fff', border:'none', borderRadius: 16, fontWeight:'bold', boxShadow: '0 -3px 0 rgba(0,0,0,0.2) inset'}}>
            Swap Now
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div onPointerDown={handleGlobalClick} style={{width:'100vw', height:'100dvh', background: '#000', overflow: 'hidden', position: 'relative'}}>
      <style>{`
        .dollar { position:absolute; color:#00ff88; font-weight:900; animation:pop 0.6s forwards; z-index:9999; pointer-events:none; font-size:28px; }
        @keyframes pop { 0%{opacity:1; transform:translateY(0)} 100%{opacity:0; transform:translateY(-100px)} }
        .wallet-popup { position:absolute; bottom:20px; left:10px; right:10px; background:#111; border:1px solid #333; border-radius:20px; padding:20px; z-index:10000; animation: slideUp 0.3s forwards; }
        @keyframes slideUp { from {transform: translateY(100%);} to {transform: translateY(0);} }
      `}</style>
      
      {clicks.map(c => <div key={c.id} className="dollar" style={{left:c.x-10, top:c.y-20}}>$</div>)}

      {/* Окно подтверждения кошелька (как в реале) */}
      {isWalletConfirm && (
        <div className="wallet-popup">
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:15}}>
             <b>Confirm Transaction</b>
             <span style={{color: '#ff4444'}}>✕</span>
          </div>
          <div style={{fontSize: 12, opacity: 0.6, marginBottom: 20}}>Network Fee: ~$2.45</div>
          <button style={{width:'100%', padding: 15, background:'#00ff88', color:'#000', border:'none', borderRadius:12, fontWeight:'bold'}}>CONFIRM IN WALLET</button>
        </div>
      )}

      {!selectedDex ? (
        <div style={{padding: 20, color: '#fff'}}>
          <div style={{textAlign: 'center', margin: '40px 0'}}>
            <h1 style={{fontSize: 40, margin: 0}}>${balance.toLocaleString()}</h1>
            <div style={{color: '#00ff88', fontSize: 12}}>+ 12.4% Today</div>
          </div>

          {/* Панель сигналов */}
          <div style={{background: '#111', padding: 20, borderRadius: 16, border: '1px solid #222', marginBottom: 30}}>
            <div style={{fontSize: 10, color: '#ffcc00'}}>ALGO-SIGNAL v4.2</div>
            {signal ? (
              <div style={{marginTop: 10}}>
                <span style={{fontSize: 18, fontWeight:'bold'}}>ARBITRAGE: {signal.coin}</span>
                <div style={{color: '#00ff88'}}>SELL ON: {signal.sellDex} (+{signal.perc}%)</div>
              </div>
            ) : "Scanning pools..."}
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15}}>
            {['RAYDIUM', 'UNISWAP', 'PANCAKE', '1INCH'].map(dex => (
              <button key={dex} onClick={()=>setSelectedDex(dex)} style={{background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: 25, borderRadius: 16, fontWeight: 'bold'}}>
                {dex}
              </button>
            ))}
          </div>

          <div style={{position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center'}}>
             <a href="https://t.me/kriptoalians" style={{color: '#333', fontSize: 10, textDecoration: 'none'}}>SETTINGS & CREATORS @KRIPTOALIANS</a>
          </div>
        </div>
      ) : (
        <div style={{height: '100%'}}>
          <button onClick={()=>setSelectedDex(null)} style={{position: 'absolute', top: 15, right: 15, zIndex: 10, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: 8}}>EXIT</button>
          {selectedDex === 'RAYDIUM' && <Raydium />}
          {selectedDex === 'UNISWAP' && <Uniswap />}
          {selectedDex === 'PANCAKE' && <Pancake />}
          {selectedDex === '1INCH' && (
            <div style={{padding: 40, color:'#fff', textAlign:'center'}}>
              <h2>1INCH Terminal</h2>
              <p>Aggregation Protocol Active</p>
              <button onClick={runTransaction} style={{width:'100%', padding:20, background:'#2b6aff', border:'none', color:'#fff', borderRadius:12}}>SWAP VIA 1INCH</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
