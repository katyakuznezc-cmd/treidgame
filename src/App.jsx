import React, { useState, useEffect, useRef } from 'react';

const COINS = [
  { id: 'SOL', price: 145.2, name: 'Solana' }, { id: 'ETH', price: 2640, name: 'Ethereum' }, 
  { id: 'BNB', price: 590, name: 'Binance Coin' }, { id: 'BTC', price: 96000, name: 'Bitcoin' }
];

export default function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('st_bal')) || 1000.00);
  const [selectedDex, setSelectedDex] = useState(null);
  const [amount, setAmount] = useState(100);
  const [activeTrade, setActiveTrade] = useState(false);
  const [signal, setSignal] = useState(null);
  const [clicks, setClicks] = useState([]);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    if (!signal && !activeTrade) {
      const timer = setTimeout(() => {
        const coin = COINS[Math.floor(Math.random() * COINS.length)];
        const target = ['RAYDIUM', 'UNISWAP', 'PANCAKE', '1INCH'][Math.floor(Math.random() * 4)];
        setSignal({ coin: coin.id, sellDex: target, perc: (Math.random() * 3 + 2).toFixed(2) });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [signal, activeTrade]);

  const executeSwap = () => {
    if (balance < amount) return;
    setActiveTrade(true);
    setTimeout(() => {
      const isWin = selectedDex === signal?.sellDex;
      const profit = isWin ? (amount * (parseFloat(signal.perc) / 100)) : -(amount * 0.25);
      setBalance(b => b - (isWin ? 0 : amount) + (isWin ? profit : 0));
      setActiveTrade(false); setSignal(null); setSelectedDex(null); setIsApproved(false);
    }, 2500);
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

  // --- 1. RAYDIUM (SOLANA STYLE) ---
  const RaydiumUI = () => (
    <div style={{background: '#0c0d21', height: '100%', padding: 15, color: '#fff', fontSize: '14px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:25}}>
        <div style={{display:'flex', alignItems:'center', gap: 8}}><div style={{width:24, height:24, background:'#39f2af', borderRadius:'50%'}}/> <b>Raydium</b></div>
        <div style={{background:'#1a1b36', padding:'6px 12px', borderRadius:20, fontSize:12, color:'#39f2af'}}>vlad..78</div>
      </div>
      <div style={{background: '#14162e', padding: 20, borderRadius: 20, border: '1px solid #1a1b36'}}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:12}}><span style={{opacity:0.6}}>Swap</span> <span style={{color:'#39f2af'}}>Auto ⚙️</span></div>
        <div style={{background: '#050614', padding: 15, borderRadius: 12, marginBottom: 4}}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}><small style={{opacity:0.4}}>From</small> <small style={{opacity:0.4}}>Balance: {balance.toFixed(2)}</small></div>
          <div style={{display:'flex', justifyContent:'space-between'}}><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{background:'none', border:'none', color:'#fff', fontSize: 22, outline:'none', width:'50%'}} /> <button style={{background:'#1a1b36', border:'none', color:'#fff', borderRadius:8, padding:'4px 8px'}}>USDC ▾</button></div>
        </div>
        <div style={{height:30, display:'flex', justifyContent:'center', alignItems:'center'}}><div style={{background:'#1a1b36', width:30, height:30, borderRadius:8, display:'flex', justifyContent:'center', alignItems:'center'}}>↓</div></div>
        <div style={{background: '#050614', padding: 15, borderRadius: 12, marginBottom: 20}}>
           <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}><small style={{opacity:0.4}}>To</small></div>
           <div style={{display:'flex', justifyContent:'space-between'}}><div style={{fontSize: 22}}>{(amount / 145).toFixed(4)}</div> <button style={{background:'#39f2af', border:'none', color:'#000', borderRadius:8, padding:'4px 8px'}}>{signal?.coin || 'SOL'} ▾</button></div>
        </div>
        <button onClick={executeSwap} style={{width:'100%', padding: 16, background: '#39f2af', color: '#000', border: 'none', borderRadius: 12, fontWeight: '900', letterSpacing: 1}}>
          {activeTrade ? 'SWAPPING...' : 'SWAP'}
        </button>
      </div>
    </div>
  );

  // --- 2. UNISWAP (ETH STYLE) ---
  const UniswapUI = () => (
    <div style={{background: '#190a24', height: '100%', padding: 15, color: '#fff'}}>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:30}}>
        <div style={{fontSize:22, color:'#ff007a'}}>🦄</div>
        <div style={{display:'flex', gap:8}}><div style={{background:'#212429', padding:'6px 12px', borderRadius:16, fontSize:12}}>0x78..3c</div></div>
      </div>
      <div style={{maxWidth: 420, margin: '0 auto', background: '#212429', padding: 12, borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)'}}>
        <div style={{display:'flex', justifyContent:'space-between', padding: '0 8px 12px'}}><b>Swap</b> <span>⚙️</span></div>
        <div style={{background: '#2c2f36', padding: 16, borderRadius: 16, marginBottom: 4, position: 'relative'}}>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{width:'100%', background:'none', border:'none', color:'#fff', fontSize: 28, outline: 'none'}} />
          <div style={{display:'flex', justifyContent:'space-between', marginTop: 10}}><span style={{opacity:0.5}}>${amount}</span> <span style={{background:'#190a24', padding:'4px 12px', borderRadius:20}}>ETH ▾</span></div>
        </div>
        <div style={{background: '#2c2f36', padding: 16, borderRadius: 16, marginBottom: 12}}>
          <div style={{fontSize: 28, color: signal?.coin ? '#fff' : '#565a69'}}>{signal?.coin || '0'}</div>
          <div style={{display:'flex', justifyContent:'space-between', marginTop: 10}}><span style={{color:'#ff007a'}}>{signal?.perc}%</span> <span style={{background:'#ff007a', padding:'4px 12px', borderRadius:20}}>{signal?.coin || 'Select'} ▾</span></div>
        </div>
        <button onClick={isApproved ? executeSwap : () => setIsApproved(true)} style={{width:'100%', padding: 20, background: 'rgba(255, 0, 122, 0.15)', color: '#ff007a', border: 'none', borderRadius: 20, fontWeight: 'bold', fontSize: 18}}>
          {activeTrade ? 'Processing...' : isApproved ? 'Swap' : 'Approve ETH'}
        </button>
      </div>
    </div>
  );

  // --- 3. PANCAKESWAP (BSC STYLE) ---
  const PancakeUI = () => (
    <div style={{background: '#08060b', height: '100%', padding: 15, color: '#fff'}}>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
        <b style={{color:'#1fc7d4'}}>🥞 PancakeSwap</b>
        <div style={{background:'#27262c', padding:'5px 10px', borderRadius:10, fontSize:12, border:'2px solid #1fc7d4'}}>Connect</div>
      </div>
      <div style={{background: '#27262c', borderRadius: 24, padding: 20, borderBottom: '4px solid rgba(0,0,0,0.3)'}}>
        <div style={{display:'flex', justifyContent:'space-between', borderBottom:'1px solid #383241', paddingBottom:15, marginBottom:15}}>
          <b style={{fontSize:18}}>Swap</b>
          <div style={{display:'flex', gap:10}}>📈 ⚙️ 🕒</div>
        </div>
        <div style={{background: '#372f47', padding: 16, borderRadius: 16, marginBottom: 4}}>
           <div style={{display:'flex', justifyContent:'space-between', fontSize:12, color:'#1fc7d4', marginBottom:8}}><b>BNB</b> <small>Balance: {balance.toFixed(2)}</small></div>
           <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{width:'100%', background:'none', border:'none', color:'#fff', fontSize: 20, outline: 'none'}} />
        </div>
        <div style={{textAlign:'center', color:'#1fc7d4', margin:'-10px 0', fontSize:20, zIndex:2, position:'relative'}}>↓</div>
        <div style={{background: '#372f47', padding: 16, borderRadius: 16, marginBottom: 20}}>
           <div style={{display:'flex', justifyContent:'space-between', fontSize:12, color:'#1fc7d4', marginBottom:8}}><b>{signal?.coin || 'CAKE'}</b></div>
           <div style={{fontSize: 20}}>{(amount * 0.85).toFixed(2)}</div>
        </div>
        <button onClick={executeSwap} style={{width:'100%', padding: 15, background: '#1fc7d4', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 'bold', boxShadow: '0 -3px 0 rgba(0,0,0,0.2) inset', fontSize:16}}>
          {activeTrade ? 'Loading...' : 'Swap Now'}
        </button>
      </div>
    </div>
  );

  // --- 4. 1INCH (DARK AGGREGATOR STYLE) ---
  const OneInchUI = () => (
    <div style={{background: '#060e17', height: '100%', padding: 15, color: '#fff'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:25}}>
        <div style={{display:'flex', alignItems:'center', gap:6}}><div style={{width:24, height:24, background:'#2b6aff', borderRadius:'50%'}}/> 1inch</div>
        <div style={{background:'#111d2c', padding:'6px 12px', borderRadius:12, fontSize:12}}>Ethereum ▾</div>
      </div>
      <div style={{background: '#111d2c', padding: 16, borderRadius: 16, border: '1px solid #1e2d3d'}}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}><span style={{fontSize:12, opacity:0.6}}>You sell</span> <span style={{fontSize:12, color:'#2b6aff'}}>Max</span></div>
        <div style={{display:'flex', justifyContent:'space-between', background:'#0a141d', padding:12, borderRadius:12, marginBottom:4}}>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{background:'none', border:'none', color:'#fff', fontSize: 20, outline:'none', width:'50%'}} />
          <div style={{display:'flex', alignItems:'center', gap:5}}>USDT <small>▾</small></div>
        </div>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:10, marginTop:15}}><span style={{fontSize:12, opacity:0.6}}>You buy</span></div>
        <div style={{display:'flex', justifyContent:'space-between', background:'#0a141d', padding:12, borderRadius:12, marginBottom:20}}>
          <div style={{fontSize: 20}}>{signal?.coin || 'ETH'}</div>
          <div style={{display:'flex', alignItems:'center', gap:5}}><span style={{color:'#2b6aff'}}>Select token</span> <small>▾</small></div>
        </div>
        <div style={{borderTop:'1px solid #1e2d3d', paddingTop:15, marginBottom:15}}>
          <div style={{display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:5}}><span style={{opacity:0.5}}>Rate</span> <span>1 USDT = 0.0003 ETH</span></div>
          <div style={{display:'flex', justifyContent:'space-between', fontSize:11}}><span style={{opacity:0.5}}>Route</span> <span style={{color:'#2b6aff'}}>1inch Prop ➔ Uniswap</span></div>
        </div>
        <button onClick={executeSwap} style={{width:'100%', padding: 16, background: '#2b6aff', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 'bold'}}>
          {activeTrade ? 'Routing...' : 'Swap via 1inch'}
        </button>
      </div>
    </div>
  );

  return (
    <div onPointerDown={handleGlobalClick} style={{width:'100vw', height:'100dvh', background:'#000', color:'#fff', fontFamily:'"Inter", sans-serif', overflow:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        .dollar { position:absolute; color:#00ff88; font-weight:900; animation:pop 0.6s forwards; z-index:999; pointer-events:none; font-size:28px; text-shadow: 0 0 10px #00ff88; }
        @keyframes pop { 0%{opacity:1; transform:translateY(0)} 100%{opacity:0; transform:translateY(-100px)} }
      `}</style>
      
      {clicks.map(c => <div key={c.id} className="dollar" style={{left:c.x-10, top:c.y-20}}>$</div>)}

      {!selectedDex ? (
        <div style={{padding: 20, animation: 'fadeIn 0.3s'}}>
          <div style={{textAlign:'center', marginBottom: 30, background: 'linear-gradient(180deg, #111 0%, #000 100%)', padding: '30px 0', borderRadius: 20}}>
            <small style={{opacity: 0.4, letterSpacing: 2}}>PORTFOLIO VALUE</small>
            <h1 style={{fontSize: 40, margin: '10px 0', fontWeight: '900'}}>${balance.toLocaleString()}</h1>
          </div>

          <div style={{background:'#111', padding: 20, borderRadius: 16, marginBottom: 30, border: '1px solid #222'}}>
            <div style={{fontSize: 10, color:'#ffcc00', fontWeight:'bold', marginBottom:8}}>LIVE MARKET OPPORTUNITY</div>
            {signal ? (
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                   <div style={{fontSize:18, fontWeight:'900'}}>{signal.coin}</div>
                   <div style={{fontSize:12, color:'#00ff88'}}>+ {signal.perc}% arbitrage</div>
                </div>
                <div style={{textAlign:'right'}}>
                   <div style={{fontSize:10, opacity:0.5}}>Target DEX:</div>
                   <div style={{color:'#ffcc00', fontWeight:'bold'}}>{signal.sellDex}</div>
                </div>
              </div>
            ) : "Scanning protocols..."}
          </div>

          <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
            {['RAYDIUM', 'UNISWAP', 'PANCAKE', '1INCH'].map(dex => (
              <div key={dex} onClick={()=>setSelectedDex(dex)} style={{padding: 25, background: '#111', borderRadius: 16, border: '1px solid #222', textAlign:'center', transition:'0.2s', active: {transform: 'scale(0.95)'}}}>
                <b style={{fontSize: 13, letterSpacing:1}}>{dex}</b>
              </div>
            ))}
          </div>
          
          <div style={{marginTop: 40, textAlign:'center'}}>
            <a href="https://t.me/kriptoalians" style={{color: '#333', fontSize: 10, textDecoration: 'none'}}>SETTINGS & CREATORS @KRIPTOALIANS</a>
          </div>
        </div>
      ) : (
        <div style={{height: '100%'}}>
          {selectedDex === 'RAYDIUM' && <RaydiumUI />}
          {selectedDex === 'UNISWAP' && <UniswapUI />}
          {selectedDex === 'PANCAKE' && <PancakeUI />}
          {selectedDex === '1INCH' && <OneInchUI />}
        </div>
      )}
    </div>
  );
}
