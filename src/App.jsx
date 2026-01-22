import React, { useState, useEffect } from 'react';

// Конфигурация токенов
const TOKENS = [
  { id: 'KRO', name: 'Cronos', img: 'https://cryptologos.cc/logos/cronos-cro-logo.png', price: 0.15 },
  { id: 'ETH', name: 'Ethereum', img: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', price: 2600 },
  { id: 'SOL', name: 'Solana', img: 'https://cryptologos.cc/logos/solana-sol-logo.png', price: 145 },
  { id: 'USDT', name: 'Tether', img: 'https://cryptologos.cc/logos/tether-usdt-logo.png', price: 1 }
];

export default function App() {
  const [balance, setBalance] = useState(1000.00);
  const [dex, setDex] = useState(null);
  const [valIn, setValIn] = useState('0.0');
  const [signal, setSignal] = useState(null);
  const [walletStep, setWalletStep] = useState('idle'); // idle, pending, sign

  // Исправленный импорт и логика сигналов
  useEffect(() => {
    if (!signal) {
      const targets = ['CRODEX', 'UNISWAP', 'RAYDIUM', 'PANCAKE'];
      setSignal({
        coin: TOKENS[Math.floor(Math.random() * TOKENS.length)].id,
        dex: targets[Math.floor(Math.random() * targets.length)],
        perc: (Math.random() * 4 + 2).toFixed(2)
      });
    }
  }, [signal]);

  const startSwap = () => {
    setWalletStep('pending');
    setTimeout(() => setWalletStep('sign'), 1000);
  };

  const confirmSwap = () => {
    const isWin = dex === signal?.dex;
    const profit = isWin ? (Number(valIn) * (signal.perc / 100)) : -(Number(valIn) * 0.3);
    setBalance(prev => prev + profit);
    setWalletStep('idle');
    setDex(null);
    setSignal(null);
  };

  // --- 🪐 КЛОН CRODEX (КАК НА СКРИНШОТЕ) ---
  const CrodexUI = () => (
    <div style={{
      height: '100%', background: '#12022f linear-gradient(180deg, #12022f 0%, #25085a 100%)',
      position: 'relative', overflow: 'hidden', color: '#fff', fontFamily: 'sans-serif'
    }}>
      {/* Анимированные элементы космоса */}
      <div className="star" style={{top:'10%', left:'20%'}}>✦</div>
      <div className="star" style={{top:'40%', left:'80%'}}>✦</div>
      <div className="ufo" style={{position:'absolute', top:'60%', right:'20%', fontSize:30}}>🛸</div>
      <div className="planet" style={{
        position:'absolute', bottom:'-50px', left:'-50px', width:200, height:200, 
        background:'radial-gradient(circle, #ff00ff, #5500ff)', borderRadius:'50%', opacity:0.6
      }}></div>

      {/* Header */}
      <div style={{padding:'15px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(0,0,0,0.3)'}}>
        <div style={{fontWeight:'bold', letterSpacing:1}}>CRODEX</div>
        <div style={{background:'#2d1070', padding:'6px 15px', borderRadius:10, fontSize:12, border:'1px solid #5d38b0'}}>Подключиться</div>
      </div>

      {/* Widget */}
      <div style={{display:'flex', justifyContent:'center', marginTop:80}}>
        <div style={{
          width:'90%', maxWidth:400, background:'rgba(13, 5, 33, 0.95)', 
          borderRadius:24, padding:20, border:'1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 0 40px rgba(138, 43, 226, 0.3)'
        }}>
          <div style={{marginBottom:20}}>
            <label style={{fontSize:12, opacity:0.6}}>От</label>
            <div style={{display:'flex', justifyContent:'space-between', background:'#0a041a', padding:15, borderRadius:16, marginTop:8}}>
              <input type="number" value={valIn} onChange={e=>setValIn(e.target.value)} style={{background:'none', border:'none', color:'#fff', fontSize:20, width:'60%', outline:'none'}} />
              <div style={{fontWeight:'bold'}}>KRO ▾</div>
            </div>
          </div>
          <div style={{textAlign:'center', margin:'-10px 0', color:'#8a2be2'}}>↓</div>
          <div style={{marginBottom:25}}>
            <label style={{fontSize:12, opacity:0.6}}>К</label>
            <div style={{display:'flex', justifyContent:'space-between', background:'#0a041a', padding:15, borderRadius:16, marginTop:8, border:'1px solid rgba(138,43,226,0.2)'}}>
              <div style={{fontSize:20, color:'#aaa'}}>{signal?.coin || 'Выберите токен'}</div>
              <div style={{color:'#8a2be2'}}>Выберите ▾</div>
            </div>
          </div>
          <button onClick={startSwap} style={{
            width:'100%', padding:18, borderRadius:16, border:'none',
            background:'linear-gradient(90deg, #4b0082, #8a2be2)', color:'#fff',
            fontWeight:'bold', fontSize:16, boxShadow:'0 4px 15px rgba(0,0,0,0.4)'
          }}>Подключить кошелек</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{width:'100vw', height:'100dvh', background:'#000'}}>
      <style>{`
        .star { position:absolute; color:#fff; animation: blink 2s infinite; }
        @keyframes blink { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        .ufo { animation: float 5s infinite ease-in-out; }
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-20px) rotate(10deg); } }
      `}</style>

      {!dex ? (
        <div style={{padding:25, color:'#fff', textAlign:'center'}}>
          <h1 style={{fontSize:42, fontWeight:900, marginBottom:10}}>${balance.toLocaleString()}</h1>
          <p style={{opacity:0.5, marginBottom:40}}>Общий баланс</p>

          <div style={{background:'#111', padding:20, borderRadius:20, border:'1px solid #222', textAlign:'left', marginBottom:30}}>
            <div style={{fontSize:10, color:'#00f2ff'}}>СИГНАЛ АРБИТРАЖА:</div>
            {signal ? (
              <div style={{marginTop:10}}>
                <b style={{fontSize:18}}>КУПИТЬ {signal.coin} НА {signal.dex}</b>
                <div style={{color:'#00ff88'}}>Ожидаемый профит: +{signal.perc}%</div>
              </div>
            ) : "Сканирование..."}
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:15}}>
            {['CRODEX', 'UNISWAP', 'RAYDIUM', 'PANCAKE'].map(id => (
              <button key={id} onClick={()=>setDex(id)} style={{
                background:'#1a1a1a', border:'1px solid #333', color:'#fff', 
                padding:25, borderRadius:20, fontWeight:'bold', fontSize:14
              }}>{id}</button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{height:'100%'}}>
          <button onClick={()=>setDex(null)} style={{position:'absolute', top:15, right:15, zIndex:1000, background:'rgba(0,0,0,0.5)', color:'#fff', border:'none', padding:'6px 12px', borderRadius:8}}>ВЕРНУТЬСЯ</button>
          {dex === 'CRODEX' && <CrodexUI />}
          {dex !== 'CRODEX' && (
            <div style={{padding:40, color:'#fff', textAlign:'center'}}>
              <h2>{dex} INTERFACE</h2>
              <p>Загрузка оригинальных API...</p>
              <button onClick={startSwap} style={{padding:15, width:'100%', background:'#8a2be2', border:'none', color:'#fff', borderRadius:12}}>SWAP</button>
            </div>
          )}
        </div>
      )}

      {/* Окно подтверждения Wallet (имитация MetaMask/Phantom) */}
      {walletStep !== 'idle' && (
        <div style={{position:'absolute', bottom:0, left:0, right:0, background:'#1a1a1a', padding:25, borderRadius:'24px 24px 0 0', zIndex:2000, borderTop:'1px solid #333', color:'#fff'}}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
            <b>Подтверждение транзакции</b>
            <span onClick={()=>setWalletStep('idle')}>✕</span>
          </div>
          <div style={{background:'#111', padding:15, borderRadius:12, marginBottom:20}}>
            <div style={{fontSize:12, opacity:0.5}}>Сеть: Cronos Mainnet</div>
            <div style={{fontSize:18, marginTop:5}}>Сумма: {valIn} KRO</div>
          </div>
          <button onClick={confirmSwap} style={{width:'100%', padding:16, background:'#00ff88', color:'#000', border:'none', borderRadius:12, fontWeight:'bold'}}>
            {walletStep === 'pending' ? 'Ожидание...' : 'ПОДПИСАТЬ'}
          </button>
        </div>
      )}
    </div>
  );
}
