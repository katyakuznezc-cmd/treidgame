import React, { useState, useEffect, useRef } from 'react';

const COINS_DATA = [
  { id: 'TON', lvl: 1, base: 5.4 },
  { id: 'DOGE', lvl: 1, base: 0.15 },
  { id: 'TRX', lvl: 1, base: 0.12 },
  { id: 'SOL', lvl: 2, base: 145 },
  { id: 'ETH', lvl: 3, base: 2800 },
  { id: 'BTC', lvl: 5, base: 95000 },
];

const EXCHANGES = [
  { id: '1inch', name: '1INCH', color: '#00ccff' },
  { id: 'uniswap', name: 'UNISWAP', color: '#ff007a' },
  { id: 'sushiswap', name: 'SUSHI', color: '#fa52a0' },
  { id: 'pancakeswap', name: 'PANCAKE', color: '#d1884f' }
];

export default function App() {
  const [userId] = useState(() => localStorage.getItem('k_uid') || 'ID' + Math.floor(Math.random() * 999999));
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem(`k_bal_${userId}`)) || 500.00);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem(`k_xp_${userId}`)) || 0);
  const [winCount, setWinCount] = useState(() => parseInt(localStorage.getItem(`k_wins_${userId}`)) || 0);
  
  const [tab, setTab] = useState('trade'); 
  const [selectedDex, setSelectedDex] = useState(null);
  const [activePositions, setActivePositions] = useState({});
  const [pendingTrades, setPendingTrades] = useState({});
  const [tradeAmount, setTradeAmount] = useState('100');
  const [leverage, setLeverage] = useState(1);
  const [signal, setSignal] = useState(null);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem(`k_hist_${userId}`)) || []);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toast, setToast] = useState(null);
  const [showAd, setShowAd] = useState(false);

  const lvl = Math.floor(xp / 150) + 1;
  const progress = (xp % 150) / 1.5; 

  const sndClick = useRef(new Audio('https://www.fesliyanstudios.com/play-mp3/6510'));
  const sndBell = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  useEffect(() => {
    localStorage.setItem(`k_bal_${userId}`, balance);
    localStorage.setItem(`k_xp_${userId}`, xp);
    localStorage.setItem(`k_wins_${userId}`, winCount);
    localStorage.setItem(`k_hist_${userId}`, JSON.stringify(history));

    if (lvl >= 2 && !localStorage.getItem('ad_pro_shown')) {
      setShowAd(true);
      localStorage.setItem('ad_pro_shown', 'true');
    }
  }, [balance, xp, winCount, history, lvl, userId]);

  const generateSignal = () => {
    const avail = COINS_DATA.filter(c => c.lvl <= lvl);
    const coin = avail[Math.floor(Math.random() * avail.length)];
    const d1 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    let d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    while(d2.id === d1.id) d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    
    setSignal({ 
      coin: coin.id, buyDex: d1.name, sellDexId: d2.id, sellDexName: d2.name, 
      bonus: (Math.random() * 4 + 4).toFixed(1), id: Date.now() 
    });
    if(soundEnabled) { sndBell.current.play().catch(() => {}); }
  };

  useEffect(() => {
    if (tab === 'trade' && !signal) generateSignal();
    const itv = setInterval(() => { if(tab === 'trade') generateSignal() }, 25000);
    return () => clearInterval(itv);
  }, [tab, lvl, signal]);

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const isWin = signal && p.signalId === signal.id && signal.sellDexId === selectedDex;
    const pnl = (p.amt * ((isWin ? parseFloat(p.bonus) : -20) * p.lev) / 100);
    
    setPendingTrades(prev => ({ ...prev, [coinId]: true }));
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    
    setTimeout(() => {
      setBalance(b => b + p.amt + pnl);
      if(isWin) {
        setXp(x => x + 15); 
        setWinCount(w => w + 1);
      }
      setHistory(h => [{ coin: coinId, pnl, win: isWin, date: new Date().toLocaleTimeString() }, ...h.slice(0, 10)]);
      setPendingTrades(prev => { const n = {...prev}; delete n[coinId]; return n; });
      setToast({ msg: isWin ? "+15 XP ПОЛУЧЕНО" : "УБЫТОК (0 XP)", type: isWin ? 'win' : 'loss' });
    }, 3000);
  };

  return (
    <div className="app-main">
      <style>{`
        :root { --win: #00ff88; --loss: #ff3366; --neon: #00d9ff; --panel: #121214; }
        body { margin: 0; background: #000; color: #eee; font-family: sans-serif; overflow: hidden; }
        .app-main { height: 100vh; display: flex; flex-direction: column; position: relative; }
        .header { padding: 15px; background: var(--panel); border-bottom: 1px solid #222; z-index: 10; }
        .balance { color: var(--win); font-size: 24px; font-weight: bold; }
        .xp-bar { height: 4px; background: #222; margin-top: 10px; border-radius: 2px; }
        .xp-fill { height: 100%; background: var(--neon); box-shadow: 0 0 10px var(--neon); transition: 0.5s; }
        
        .signal-box { background: rgba(0,217,255,0.05); border: 1px solid var(--neon); margin: 10px; padding: 12px; border-radius: 8px; }
        .dex-item { background: #0a0a0a; border: 1px solid #222; margin: 8px 12px; padding: 18px; border-radius: 10px; border-left: 5px solid; cursor: pointer; display: block; }
        
        .sphere { width: 140px; height: 140px; border: 2px solid var(--neon); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 50px; color: var(--neon); margin: 60px auto; cursor: pointer; box-shadow: 0 0 15px rgba(0,217,255,0.2); }
        .sphere:active { transform: scale(0.95); }

        .trade-terminal { background: #000; flex: 1; display: flex; flex-direction: column; padding: 10px; overflow-y: auto; }
        .input-sum { background: #111; border: 1px solid #333; color: var(--win); padding: 5px; width: 80px; border-radius: 4px; font-size: 14px; }
        
        .pair-row { display: flex; justify-content: space-between; align-items: center; padding: 15px 5px; border-bottom: 1px solid #111; }
        .btn-action { border: none; padding: 12px 0; border-radius: 6px; font-weight: bold; width: 90px; font-size: 11px; cursor: pointer; }

        .nav { height: 65px; display: flex; background: var(--panel); border-top: 1px solid #222; }
        .nav-btn { flex: 1; background: none; border: none; color: #444; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .nav-btn.active { color: var(--neon); }

        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .ad-box { background: #111; border: 2px solid var(--win); padding: 25px; border-radius: 15px; text-align: center; }
        .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); padding: 10px 20px; border-radius: 5px; z-index: 2000; font-weight: bold; font-size: 12px; }
      `}</style>

      {showAd && (
        <div className="modal">
          <div className="ad-box">
            <h2 style={{color: 'var(--win)', margin: '0 0 15px'}}>КВАЛИФИКАЦИЯ ПРОЙДЕНА</h2>
            <p style={{fontSize: '14px', lineHeight: '1.4'}}>Вы совершили 10 успешных сделок и достигли 2 уровня. Пора торговать по-настоящему!</p>
            <button onClick={() => window.open('https://t.me/kriptoalians', '_blank')} style={{background: 'var(--win)', border:'none', padding:'15px', width:'100%', borderRadius:'8px', fontWeight:'bold', marginTop: '15px', color: '#000'}}>ВСТУПИТЬ В VIP ГРУППУ</button>
          </div>
        </div>
      )}

      {toast && <div className="toast" style={{background: toast.type==='win'?'var(--win)':'var(--loss)', color: toast.type==='win'?'#000':'#fff'}}>{toast.msg}</div>}

      <header className="header">
        <div style={{display:'flex', justifyItems:'center', justifyContent:'space-between', alignItems:'baseline'}}>
          <div style={{fontSize:'12px', color:'var(--neon)', fontWeight:'bold'}}>LVL {lvl} <span style={{color:'#444', marginLeft: '5px'}}>({winCount % 10}/10)</span></div>
          <div className="balance">${balance.toFixed(2)}</div>
        </div>
        <div className="xp-bar"><div className="xp-fill" style={{width: `${progress}%`}}></div></div>
      </header>

      <main style={{flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column'}}>
        {tab === 'trade' && (
          <>
            {signal && (
              <div className="signal-box">
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'10px', fontWeight:'bold'}}>
                  <span style={{color:'var(--neon)'}}>LIVE SIGNAL: {signal.coin}</span>
                  <span style={{color:'var(--win)'}}>+{signal.bonus}% PROFIT</span>
                </div>
                <div style={{fontSize: '14px', fontWeight:'bold', margin:'6px 0'}}>{signal.buyDex} → {signal.sellDexName}</div>
              </div>
            )}

            {!selectedDex ? (
              <div style={{paddingTop: '10px'}}>
                {EXCHANGES.map(d => (
                  <div key={d.id} className="dex-item" style={{borderColor: d.color}} onClick={() => setSelectedDex(d.id)}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span style={{fontWeight:'bold', fontSize: '16px'}}>{d.name}</span>
                      <span style={{fontSize: '10px', color: '#444'}}>АРБИТРАЖ ДОСТУПЕН →</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="trade-terminal">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom: '15px', borderBottom: '1px solid #222'}}>
                  <button onClick={() => setSelectedDex(null)} style={{background:'#222', border:'none', color:'#fff', padding:'8px 12px', borderRadius:'6px', fontSize:'11px'}}>← К СПИСКУ</button>
                  <div style={{display:'flex', alignItems:'center', gap: '10px'}}>
                    <span style={{fontSize:'11px', color: '#555'}}>СУММА:</span>
                    <input type="number" className="input-sum" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} />
                  </div>
                </div>
                
                <div style={{padding: '15px 0'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px'}}>
                    <span>ЛЕВЕРЕДЖ: x{leverage}</span>
                    <span style={{color: '#444'}}>MAX: x{maxLev}</span>
                  </div>
                  <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(e.target.value)} style={{width:'100%'}} />
                </div>

                {COINS_DATA.map(c => {
                  const pos = activePositions[c.id];
                  const locked = c.lvl > lvl;
                  return (
                    <div key={c.id} className="pair-row" style={{opacity: locked ? 0.3 : 1}}>
                      <div>
                        <div style={{fontWeight:'bold', fontSize: '15px'}}>{c.id}/USDT</div>
                        {pos && <div style={{fontSize:'10px', color:'var(--win)'}}>PROFIT: +${(pos.amt * (pos.bonus/100) * leverage * 0.4).toFixed(2)}</div>}
                      </div>
                      {locked ? <span style={{fontSize: '12px'}}>🔒 LVL {c.lvl}</span> : 
                        pendingTrades[c.id] ? <span style={{fontSize: '11px', color: '#555'}}>ОБРАБОТКА...</span> :
                        <button 
                          className="btn-action" 
                          style={{background: pos ? 'var(--loss)' : 'var(--win)', color: pos ? '#fff' : '#000'}}
                          onClick={() => {
                            if(pos) closeTrade(c.id);
                            else {
                              if(parseFloat(tradeAmount) > balance) return setToast({msg: 'НЕДОСТАТОЧНО СРЕДСТВ', type: 'loss'});
                              setBalance(b => b - parseFloat(tradeAmount));
                              setActivePositions(p => ({ ...p, [c.id]: { amt: parseFloat(tradeAmount), lev: leverage, dex: selectedDex, signalId: signal?.id, bonus: signal?.bonus } }));
                            }
                          }}
                        >
                          {pos ? 'ЗАКРЫТЬ' : 'КУПИТЬ'}
                        </button>
                      }
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {tab === 'mining' && (
          <div style={{flex: 1, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center'}}>
            <div className="sphere" onClick={() => {
              setBalance(b => b + 0.05);
              if(soundEnabled) { sndClick.current.currentTime = 0; sndClick.current.play().catch(()=>{}); }
            }}>$</div>
            <p style={{color:'#333', fontSize:'12px', letterSpacing: '1px'}}>КЛИКАЙ ДЛЯ ПОПОЛНЕНИЯ БАЛАНСА</p>
          </div>
        )}

        {tab === 'awards' && (
          <div style={{padding:'20px'}}>
            <h3 style={{fontSize: '18px', marginBottom: '20px'}}>ИСТОРИЯ ОПЕРАЦИЙ</h3>
            {history.length === 0 && <div style={{color: '#444'}}>Сделок пока нет...</div>}
            {history.map((h, i) => (
              <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #111', fontSize:'13px'}}>
                <span>{h.coin}</span>
                <span style={{color: h.win?'var(--win)':'var(--loss)', fontWeight: 'bold'}}>{h.win ? '+' : ''}${h.pnl.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </main>

      <nav className="nav">
        <button className={`nav-btn ${tab === 'mining' ? 'active' : ''}`} onClick={() => {setTab('mining'); setSelectedDex(null);}}>MINE</button>
        <button className={`nav-btn ${tab === 'trade' ? 'active' : ''}`} onClick={() => setTab('trade')}>EXCHANGE</button>
        <button className={`nav-btn ${tab === 'awards' ? 'active' : ''}`} onClick={() => {setTab('awards'); setSelectedDex(null);}}>LOGS</button>
      </nav>
    </div>
  );
}
