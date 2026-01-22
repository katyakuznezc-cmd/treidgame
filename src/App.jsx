мimport React, { useState, useEffect } from 'react';

export default function App() {
  const [balance, setBalance] = useState(1250.45);
  const [dex, setDex] = useState(null);
  const [amount, setAmount] = useState('100');
  const [signal, setSignal] = useState(null);
  const [step, setStep] = useState('idle'); // idle, wallet_popup, processing

  // Генерация сигнала для каждой биржи
  useEffect(() => {
    if (!signal) {
      const target = ['RAYDIUM', 'UNISWAP', 'PANCAKE', '1INCH'][Math.floor(Math.random() * 4)];
      setSignal({ coin: 'SOL', dex: target, profit: (Math.random() * 5 + 2).toFixed(2) });
    }
  }, [signal]);

  const handleSwap = () => {
    setStep('wallet_popup');
    setTimeout(() => {
      setStep('processing');
      setTimeout(() => {
        const isWin = dex === signal?.dex;
        if (isWin) setBalance(b => b + (Number(amount) * (signal.profit / 100)));
        else setBalance(b => b - Number(amount));
        setStep('idle'); setDex(null); setSignal(null);
      }, 2000);
    }, 1200);
  };

  // --- 🦄 UNISWAP INTERFACE (ETH) ---
  const UniswapUI = () => (
    <div style={{background: '#FFF', height: '100%', color: '#000', fontFamily: 'Inter, sans-serif'}}>
      <div style={{padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <span style={{fontSize: 24}}>🦄</span>
        <div style={{display: 'flex', gap: 10}}>
          <div style={{background: '#F5F6FC', padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600}}>Tokens</div>
          <div style={{background: 'rgba(255, 0, 122, 0.1)', color: '#FF007A', padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700}}>0x7a...4e</div>
        </div>
      </div>
      <div style={{display: 'flex', justifyContent: 'center', marginTop: 40, padding: '0 10px'}}>
        <div style={{width: '100%', maxWidth: 400, background: '#FFF', border: '1px solid #D9D9D9', borderRadius: 24, padding: 8}}>
          <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 12px'}}>
            <span style={{fontWeight: 600}}>Swap</span>
            <span>⚙️</span>
          </div>
          <div style={{background: '#F9F9F9', padding: 16, borderRadius: 16, marginBottom: 4}}>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{width: '100%', background: 'none', border: 'none', fontSize: 36, outline: 'none'}} />
            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 8}}>
              <span style={{color: '#888'}}>${amount}</span>
              <span style={{background: '#FFF', border: '1px solid #D9D9D9', padding: '4px 8px', borderRadius: 16, fontSize: 14, fontWeight: 600}}>ETH ▾</span>
            </div>
          </div>
          <div style={{background: '#F9F9F9', padding: 16, borderRadius: 16, marginBottom: 10}}>
             <div style={{fontSize: 36, color: '#888'}}>{(Number(amount)/2500).toFixed(4)}</div>
             <div style={{background: '#FF007A', color: '#FFF', padding: '4px 12px', borderRadius: 16, float: 'right', fontWeight: 600}}>{signal?.coin || 'Select'} ▾</div>
             <div style={{clear:'both'}}></div>
          </div>
          <button onClick={handleSwap} style={{width: '100%', padding: 16, background: 'rgba(255, 0, 122, 0.1)', color: '#FF007A', border: 'none', borderRadius: 20, fontWeight: 700, fontSize: 18}}>
            Swap
          </button>
        </div>
      </div>
    </div>
  );

  // --- ☀️ RAYDIUM INTERFACE (SOLANA) ---
  const RaydiumUI = () => (
    <div style={{background: '#0c0d21', height: '100%', color: '#FFF', fontFamily: 'Orbitron, sans-serif'}}>
      <div style={{padding: 15, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1a1b36'}}>
        <div style={{display:'flex', alignItems:'center', gap: 5}}><img src="https://mint.raydium.io/logo.png" width="20"/> <b>RAYDIUM</b></div>
        <div style={{background: '#1a1b36', padding: '4px 10px', borderRadius: 8, fontSize: 10, color: '#39f2af'}}>Connect</div>
      </div>
      <div style={{padding: 20}}>
        <div style={{background: 'rgba(20, 22, 46, 0.8)', padding: 20, borderRadius: 24, border: '1px solid #1a1b36', backdropFilter: 'blur(10px)'}}>
          <div style={{display: 'flex', gap: 15, marginBottom: 20, fontSize: 12}}>
            <span style={{color: '#39f2af', borderBottom: '2px solid #39f2af'}}>Swap</span>
            <span style={{opacity: 0.5}}>Liquidity</span>
          </div>
          <div style={{background: '#050614', padding: 15, borderRadius: 16, border: '1px solid #1a1b36'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.5}}><span>From</span> <span>Balance: {balance.toFixed(2)}</span></div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 10}}>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{background: 'none', border: 'none', color: '#FFF', fontSize: 24, width: '50%', outline: 'none'}} />
              <span style={{background: '#1a1b36', padding: '5px 10px', borderRadius: 12}}>USDT ▾</span>
            </div>
          </div>
          <div style={{textAlign: 'center', margin: '10px 0'}}><div style={{display: 'inline-block', background: '#1a1b36', borderRadius: '50%', padding: 5}}>↓</div></div>
          <div style={{background: '#050614', padding: 15, borderRadius: 16, border: '1px solid #1a1b36', marginBottom: 20}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.5}}><span>To</span></div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 10}}>
              <div style={{fontSize: 24}}>{(Number(amount)/145).toFixed(3)}</div>
              <span style={{background: '#39f2af', color: '#000', padding: '5px 10px', borderRadius: 12, fontWeight: 'bold'}}>{signal?.coin} ▾</span>
            </div>
          </div>
          <button onClick={handleSwap} style={{width: '100%', padding: 18, background: '#39f2af', color: '#000', border: 'none', borderRadius: 12, fontWeight: 900, letterSpacing: 1}}>
            SWAP TOKENS
          </button>
        </div>
      </div>
    </div>
  );

  // --- 🥞 PANCAKESWAP INTERFACE (BSC) ---
  const PancakeUI = () => (
    <div style={{background: '#08060B', height: '100%', color: '#FFF', fontFamily: 'Kanit, sans-serif'}}>
      <div style={{background: '#27262C', padding: 15, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #383241'}}>
        <b style={{color: '#1FC7D4', fontSize: 18}}>PancakeSwap</b>
        <div style={{background: '#1FC7D4', padding: '6px 12px', borderRadius: 16, fontWeight: 'bold', fontSize: 14}}>Connect</div>
      </div>
      <div style={{padding: 20, display: 'flex', justifyContent: 'center'}}>
        <div style={{width: '100%', maxWidth: 400, background: '#27262C', borderRadius: 24, padding: 20, boxShadow: '0 4px 0 rgba(0,0,0,0.2)'}}>
           <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 20}}><b>Swap</b> <span>⚙️</span></div>
           <div style={{background: '#372F47', padding: 16, borderRadius: 16, border: '1px solid #383241'}}>
             <div style={{fontSize: 12, color: '#1FC7D4', fontWeight: 'bold'}}>BNB</div>
             <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{width: '100%', background: 'none', border: 'none', color: '#FFF', fontSize: 20, outline: 'none', marginTop: 5}} />
           </div>
           <div style={{textAlign: 'center', margin: '10px 0', fontSize: 20, color: '#1FC7D4'}}>↓</div>
           <div style={{background: '#372F47', padding: 16, borderRadius: 16, border: '1px solid #383241', marginBottom: 20}}>
             <div style={{fontSize: 12, color: '#1FC7D4', fontWeight: 'bold'}}>{signal?.coin}</div>
             <div style={{fontSize: 20, marginTop: 5}}>{(Number(amount)*1.5).toFixed(2)}</div>
           </div>
           <button onClick={handleSwap} style={{width: '100%', padding: 16, background: '#1FC7D4', color: '#FFF', border: 'none', borderRadius: 16, fontWeight: 'bold', fontSize: 18, boxShadow: '0 -3px 0 rgba(0,0,0,0.2) inset'}}>
             Swap Now
           </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{width: '100vw', height: '100dvh', background: '#000', overflow: 'hidden', position: 'relative'}}>
      {/* МЕНЮ ВЫБОРА */}
      {!dex ? (
        <div style={{padding: 25, color: '#FFF', textAlign: 'center'}}>
          <h1 style={{fontSize: 48, fontWeight: 900, margin: '40px 0'}}>${balance.toLocaleString()}</h1>
          
          <div style={{background: '#111', padding: 20, borderRadius: 20, border: '1px solid #222', textAlign: 'left', marginBottom: 30}}>
            <div style={{fontSize: 10, color: '#00f2ff', fontWeight: 'bold'}}>LIVE SIGNAL</div>
            {signal ? (
              <div style={{marginTop: 10}}>
                <div style={{fontSize: 20, fontWeight: 'bold'}}>SELL {signal.coin} ON {signal.dex}</div>
                <div style={{color: '#00FF88'}}>PROFIT: +{signal.profit}%</div>
              </div>
            ) : 'Scanning...'}
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
            {['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'].map(id => (
              <button key={id} onClick={() => setDex(id)} style={{
                background: '#1a1a1a', border: '1px solid #333', padding: 25, borderRadius: 20, color: '#FFF', fontWeight: 'bold'
              }}>{id}</button>
            ))}
          </div>
          
          <div style={{marginTop: 40}}>
            <a href="https://t.me/kriptoalians" style={{color: '#333', fontSize: 12, textDecoration: 'none'}}>SETTINGS & CREATORS</a>
          </div>
        </div>
      ) : (
        <div style={{height: '100%'}}>
          <button onClick={()=>setDex(null)} style={{position: 'absolute', top: 15, right: 15, zIndex: 1000, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#FFF', padding: '6px 12px', borderRadius: 8}}>EXIT</button>
          {dex === 'UNISWAP' && <UniswapUI />}
          {dex === 'RAYDIUM' && <RaydiumUI />}
          {dex === 'PANCAKE' && <PancakeUI />}
          {dex === '1INCH' && <div style={{color:'#FFF', padding:20}}>1INCH UI LOADING...</div>}
        </div>
      )}

      {/* ИМИТАЦИЯ ОКНА КОШЕЛЬКА */}
      {step === 'wallet_popup' && (
        <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, background: '#111', padding: 25, borderRadius: '24px 24px 0 0', z {zIndex: 2000, borderTop: '1px solid #333'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 20}}>
            <b style={{color:'#FFF'}}>Confirm Swap</b>
            <span style={{color: '#FF4444'}}>✕</span>
          </div>
          <div style={{background: '#1a1a1a', padding: 15, borderRadius: 12, marginBottom: 20, fontSize: 14, color: '#888'}}>
             Estimated Fee: <span style={{color: '#00FF88'}}>$1.42</span>
          </div>
          <button onClick={()=>{}} style={{width: '100%', padding: 16, background: '#00FF88', color: '#000', border: 'none', borderRadius: 12, fontWeight: 'bold'}}>CONFIRM IN WALLET</button>
        </div>
      )}
      
      {step === 'processing' && (
        <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, color:'#FFF'}}>
          <div style={{textAlign:'center'}}>
            <div style={{width:50, height:50, border:'4px solid #00FF88', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 20px'}}></div>
            <b>Transaction Processing...</b>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        body { margin: 0; background: #000; }
      `}</style>
    </div>
  );
}
