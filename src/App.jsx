import React, { useState, useEffect } from 'react';

// Конфигурация активов для списков выбора
const ASSETS = [
  { id: 'USDT', name: 'Tether USD', img: 'https://cryptologos.cc/logos/tether-usdt-logo.png', price: 1 },
  { id: 'SOL', name: 'Solana', img: 'https://cryptologos.cc/logos/solana-sol-logo.png', price: 145 },
  { id: 'ETH', name: 'Ethereum', img: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', price: 2600 },
  { id: 'BNB', name: 'BNB', img: 'https://cryptologos.cc/logos/bnb-bnb-logo.png', price: 600 }
];

export default function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('st_bal')) || 1000.00);
  const [dex, setDex] = useState(null); // Текущая открытая биржа
  const [amount, setAmount] = useState('100');
  const [signal, setSignal] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, loading, confirming, success
  const [showTokens, setShowTokens] = useState(false);

  // Имитация сканера сигналов
  useEffect(() => {
    if (!signal && status === 'idle') {
      const timer = setTimeout(() => {
        const coin = ASSETS[Math.floor(Math.random() * 3) + 1];
        const target = ['RAYDIUM', 'UNISWAP', 'PANCAKE', '1INCH'][Math.floor(Math.random() * 4)];
        setSignal({ coin: coin.id, sellDex: target, perc: (Math.random() * 5 + 3).toFixed(2) });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [signal, status]);

  const executeTrade = () => {
    setStatus('loading');
    setTimeout(() => {
      setStatus('confirming');
      setTimeout(() => {
        const isWin = dex === signal?.sellDex;
        const profit = isWin ? (Number(amount) * (parseFloat(signal.perc) / 100)) : -(Number(amount) * 0.4);
        setBalance(prev => prev + profit);
        setStatus('success');
        setTimeout(() => { setDex(null); setStatus('idle'); setSignal(null); }, 2000);
      }, 2000);
    }, 1500);
  };

  // --- UI RAYDIUM (Solana) ---
  const RaydiumUI = () => (
    <div style={{background: '#0c0d21', height: '100%', color: '#fff', fontFamily: 'Inter, sans-serif'}}>
      <header style={{padding: 15, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1a1b36'}}>
        <div style={{display:'flex', alignItems:'center', gap: 8}}><img src="https://mint.raydium.io/logo.png" width="20"/> <b>Raydium</b></div>
        <div style={{display:'flex', gap: 10, fontSize: 12}}><span>RPC: 12ms</span> <span style={{color:'#39f2af'}}>vlad..78</span></div>
      </header>
      <div style={{padding: 20}}>
        <div style={{background: '#14162e', padding: 20, borderRadius: 20, border: '1px solid #1a1b36'}}>
          <div style={{display:'flex', gap: 15, marginBottom: 15, fontSize: 13}}>
            <span style={{color: '#39f2af', borderBottom: '2px solid #39f2af'}}>Swap</span>
            <span style={{opacity: 0.5}}>Liquidity</span>
            <span style={{opacity: 0.5}}>Portfolio</span>
          </div>
          <div style={{background: '#050614', padding: 15, borderRadius: 12, marginBottom: 5}}>
            <div style={{display:'flex', justifyContent:'space-between', fontSize: 11, opacity: 0.4, marginBottom: 10}}><span>From</span> <span>Balance: {balance.toFixed(2)}</span></div>
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{background:'none', border:'none', color:'#fff', fontSize: 20, outline:'none', width:'50%'}} />
              <button style={{background:'#1a1b36', border:'none', color:'#fff', padding:'5px 10px', borderRadius:8}}>USDT ▾</button>
            </div>
          </div>
          <div style={{textAlign:'center', margin:'10px 0', color:'#39f2af'}}>↓</div>
          <div style={{background: '#050614', padding: 15, borderRadius: 12, marginBottom: 15}}>
             <div style={{display:'flex', justifyContent:'space-between', fontSize: 11, opacity: 0.4, marginBottom: 10}}><span>To (Estimated)</span></div>
             <div style={{display:'flex', justifyContent:'space-between'}}>
                <div style={{fontSize: 20}}>{(Number(amount)/145).toFixed(4)}</div>
                <button style={{background:'#39f2af', border:'none', color:'#000', padding:'5px 10px', borderRadius:8, fontWeight:'bold'}}>{signal?.coin || 'SOL'} ▾</button>
             </div>
          </div>
          <button onClick={executeTrade} style={{width:'100%', padding: 15, background:'#39f2af', color:'#000', border:'none', borderRadius:12, fontWeight:'bold'}}>
            {status === 'idle' ? 'Swap Tokens' : 'Processing...'}
          </button>
        </div>
      </div>
    </div>
  );

  // --- UI UNISWAP (Ethereum) ---
  const UniswapUI = () => (
    <div style={{background: '#fff', height: '100%', color: '#000'}}>
      <header style={{padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{fontSize: 24}}>🦄</div>
        <div style={{background: '#f5f6fc', padding: '8px 16px', borderRadius: 12, color: '#ff007a', fontWeight: 'bold'}}>0x78..3c</div>
      </header>
      <div style={{display: 'flex', justifyContent: 'center', paddingTop: 40}}>
        <div style={{width: '90%', maxWidth: 400, background: '#fff', border: '1px solid #d9d9d9', borderRadius: 24, padding: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.05)'}}>
           <div style={{display:'flex', justifyContent:'space-between', marginBottom: 12, padding:'0 5px'}}><b>Swap</b> <span>⚙️</span></div>
           <div style={{background: '#f9f9f9', padding: 16, borderRadius: 16, marginBottom: 4}}>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{width:'100%', background:'none', border:'none', fontSize: 32, outline:'none'}} placeholder="0" />
              <div style={{textAlign:'right', fontWeight:'bold'}}>ETH ▾</div>
           </div>
           <div style={{background: '#f9f9f9', padding: 16, borderRadius: 16, marginBottom: 12}}>
              <div style={{fontSize: 32, color: '#888'}}>{signal?.coin || '0'}</div>
              <div style={{background: '#ff007a', color: '#fff', padding: '4px 12px', borderRadius: 20, float: 'right', fontWeight: 'bold'}}>{signal?.coin || 'Select'} ▾</div>
              <div style={{clear:'both'}}></div>
           </div>
           <button onClick={executeTrade} style={{width:'100%', padding: 16, background: 'rgba(255, 0, 122, 0.1)', color: '#ff007a', border: 'none', borderRadius: 20, fontWeight: 'bold', fontSize: 18}}>
             {status === 'idle' ? 'Swap' : 'Confirming...'}
           </button>
        </div>
      </div>
    </div>
  );

  // --- UI PANCAKESWAP (BSC) ---
  const PancakeUI = () => (
    <div style={{background: '#08060b', height: '100%', color: '#fff', fontFamily: 'sans-serif'}}>
      <nav style={{background: '#27262c', padding: 15, display: 'flex', justifyContent: 'space-between'}}>
        <b style={{color: '#1fc7d4'}}>🥞 PancakeSwap</b>
        <button style={{background: '#1fc7d4', border: 'none', borderRadius: 12, color: '#fff', padding: '5px 15px', fontWeight: 'bold'}}>Connect</button>
      </nav>
      <div style={{padding: 20, display: 'flex', justifyContent: 'center'}}>
        <div style={{width: '100%', background: '#27262c', borderRadius: 24, padding: 20, borderBottom: '4px solid rgba(0,0,0,0.2)'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #383241', paddingBottom: 15, marginBottom: 15}}>
            <b style={{fontSize: 18}}>Swap</b>
            <span>⚙️ 🕒</span>
          </div>
          <div style={{background: '#372f47', padding: 16, borderRadius: 16, marginBottom: 4}}>
             <div style={{fontSize: 12, color: '#1fc7d4', marginBottom: 5}}>BNB</div>
             <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{width:'100%', background:'none', border:'none', color:'#fff', fontSize: 18, outline:'none'}} />
          </div>
          <div style={{textAlign: 'center', margin: '-10px 0', fontSize: 20, zIndex: 10, position: 'relative'}}>↓</div>
          <div style={{background: '#372f47', padding: 16, borderRadius: 16, marginBottom: 20}}>
             <div style={{fontSize: 12, color: '#1fc7d4', marginBottom: 5}}>{signal?.coin || 'CAKE'}</div>
             <div style={{fontSize: 18}}>{(Number(amount) * 1.5).toFixed(2)}</div>
          </div>
          <button onClick={executeTrade} style={{width:'100%', padding: 15, background: '#1fc7d4', border: 'none', borderRadius: 16, color: '#fff', fontWeight: 'bold', fontSize: 16}}>
            {status === 'idle' ? 'Swap Now' : 'Loading...'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{width: '100vw', height: '100dvh', background: '#000', overflow: 'hidden', position: 'relative'}}>
      {/* Главный Хаб */}
      {!dex ? (
        <div style={{padding: 20, color: '#fff'}}>
          <div style={{textAlign: 'center', margin: '40px 0'}}>
            <h1 style={{fontSize: 40, margin: 0}}>${balance.toLocaleString()}</h1>
            <p style={{opacity: 0.5}}>TOTAL ASSETS</p>
          </div>

          <div style={{background: '#111', padding: 20, borderRadius: 20, border: '1px solid #222', marginBottom: 30}}>
            <div style={{fontSize: 10, color: '#00f2ff', fontWeight: 'bold'}}>ARBITRAGE SCANNER</div>
            {signal ? (
              <div style={{marginTop: 10}}>
                <div style={{fontSize: 18, fontWeight: 'bold'}}>{signal.coin} Opportunity</div>
                <div style={{color: '#00ff88'}}>Target DEX: {signal.sellDex} (+{signal.perc}%)</div>
              </div>
            ) : "Searching market gaps..."}
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
            {['RAYDIUM', 'UNISWAP', 'PANCAKE', '1INCH'].map(name => (
              <button key={name} onClick={()=>setDex(name)} style={{
                background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: 25, borderRadius: 15, fontWeight: 'bold'
              }}>{name}</button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{height: '100%'}}>
          <button onClick={()=>setDex(null)} style={{position: 'absolute', top: 15, right: 15, zIndex: 100, background: 'rgba(0,0,0,0.3)', border: 'none', color: '#fff', borderRadius: 8, padding: '5px 10px'}}>CLOSE</button>
          {dex === 'RAYDIUM' && <RaydiumUI />}
          {dex === 'UNISWAP' && <UniswapUI />}
          {dex === 'PANCAKE' && <PancakeUI />}
          {dex === '1INCH' && (
             <div style={{background: '#060e17', height: '100%', color: '#fff', padding: 20}}>
               <h2>1inch Aggregator</h2>
               <div style={{background: '#111d2c', padding: 20, borderRadius: 16}}>
                 <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{width:'100%', background:'#0a141d', border:'none', padding:15, color:'#fff', borderRadius:12}} />
                 <button onClick={executeTrade} style={{width:'100%', padding:15, background:'#2b6aff', color:'#fff', border:'none', marginTop:20, borderRadius:12}}>Swap via 1inch</button>
               </div>
             </div>
          )}
        </div>
      )}

      {/* Модальное окно подтверждения (как в кошельке) */}
      {status === 'confirming' && (
        <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, background: '#111', padding: 25, borderRadius: '24px 24px 0 0', zIndex: 1000, borderTop: '1px solid #333'}}>
          <h3 style={{color: '#fff', margin: '0 0 15px 0'}}>Confirm Transaction</h3>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 20, color: '#aaa', fontSize: 14}}>
            <span>Network Fee</span> <span>~$2.54</span>
          </div>
          <button style={{width: '100%', padding: 15, background: '#00ff88', color: '#000', border: 'none', borderRadius: 12, fontWeight: 'bold'}}>CONFIRM IN WALLET</button>
        </div>
      )}
    </div>
  );
}
