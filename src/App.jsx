

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
  const [balance, setBalance] = useState(() => Number(localStorage.getItem(`k_bal_${userId}`)) || 500.00);
  const [xp, setXp] = useState(() => Number(localStorage.getItem(`k_xp_${userId}`)) || 0);
  const [winCount, setWinCount] = useState(() => Number(localStorage.getItem(`k_wins_${userId}`)) || 0);
  
  const [tab, setTab] = useState('trade'); 
  const [selectedDex, setSelectedDex] = useState(null);
  const [activePositions, setActivePositions] = useState({});
  const [pendingTrades, setPendingTrades] = useState({});
  const [tradeAmount, setTradeAmount] = useState(100); 
  const [leverage, setLeverage] = useState(1);
  const [signal, setSignal] = useState(null);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem(`k_hist_${userId}`)) || []);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toast, setToast] = useState(null);
  const [showAd, setShowAd] = useState(false);

  // Расчет уровня и макс плеча
  const lvl = Math.floor(xp / 150) + 1;
  const progress = (xp % 150) / 1.5; 
  const maxLev = lvl >= 5 ? 50 : 10; // Исправлено: теперь переменная определена

  const sndClick = useRef(new Audio('https://www.fesliyanstudios.com/play-mp3/6510'));
  const sndBell = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  useEffect(() => {
    localStorage.setItem(`k_bal_${userId}`, balance);
    localStorage.setItem(`k_xp_${userId}`, xp);
    localStorage.setItem(`k_wins_${userId}`, winCount);
    localStorage.setItem(`k_hist_${userId}`, JSON.stringify(history));
    localStorage.setItem('k_uid', userId);

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
    if (!p) return;
    const isWin = signal && p.signalId === signal.id && signal.sellDexId === selectedDex;
    const pnl = (Number(p.amt) * ((isWin ? Number(p.bonus) : -20) * Number(p.lev)) / 100);
    
    setPendingTrades(prev => ({ ...prev, [coinId]: true }));
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    
    setTimeout(() => {
      setBalance(b => b + Number(p.amt) + pnl);
      if(isWin) {
        setXp(x => x + 15); 
        setWinCount(w => w + 1);
      }
      setHistory(h => [{ coin: coinId, pnl, win: isWin, date: new Date().toLocaleTimeString() }, ...h.slice(0, 10)]);
      setPendingTrades(prev => { const n = {...prev}; delete n[coinId]; return n; });
      setToast({ msg: isWin ? "+15 XP" : "LIQUIDATION", type: isWin ? 'win' : 'loss' });
    }, 2000);
  };

  return (
    <div className="app-main">
      <style>{`
        :root { --win: #00ff88; --loss: #ff3366; --neon: #00d9ff; --panel: #121214; }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: #000; color: #eee; font-family: sans-serif; overflow: hidden; }
        .app-main { height: 100vh; width: 100vw; display: flex; flex-direction: column; background: #000; }
        .header { padding: 15px; background: var(--panel); border-bottom: 1px solid #222; }
        .balance { color: var(--win); font-size: 24px; font-weight: 800; }
        .xp-bar { height: 4px; background: #222; margin-top: 10px; border-radius: 2px; }
        .xp-fill { height: 100%; background: var(--neon); box-shadow: 0 0 10px var(--neon); transition: 0.5s; }
        .content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
        .signal-box { background: #00121a; border: 1px solid var(--neon); margin: 10px; padding: 12px; border-radius: 8px; }
        .dex-item { background: #0a0a0a; border: 1px solid #222; margin: 8px 10px; padding: 20px; border-radius: 12px; border-left: 5px solid; cursor: pointer; }
        .sphere { width: 140px; height: 140px; border: 3px solid var(--neon); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 50px; color: var(--neon); margin: 60px auto; cursor: pointer; transition: 0.1s; }
        .trade-terminal { display: flex; flex-direction: column; padding: 15px; background: #000; min-height: 100%; }
        .input-sum { background: #111; border: 1px solid #333; color: var(--win); padding: 8px; width: 100px; border-radius: 6px; outline: none; }
        .pair-row { display: flex; justify-content: space-between; align-items: center; padding: 18px 0; border-bottom: 1px solid #111; }
        .nav { height: 70px; display: flex; background: var(--panel); border-top: 1px solid #222; }
        .nav-btn { flex: 1; background: none; border: none; color: #444; font-size: 11px; font-weight: bold; cursor: pointer; }
        .nav-btn.active { color: var(--neon); }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .ad-box { background: #111; border: 2px solid var(--win); padding: 30px; border-radius: 20px; text-align: center; }
      `}</style>

      {showAd && (
        <div className="modal">
          <div className="ad-box">
            <h2 style={{color: 'var(--win)', marginTop: 0}}>ПРОФИЛЬ ПОДТВЕРЖДЕН</h2>
            <p>Вы успешно закрыли 10 сделок. Теперь вы допущены в закрытое комьюнити.</p>
            <button onClick={() => window.open('https://t.me/vladstelin78', '_blank')} style={{background: 'var(--win)', border:'none', padding:'16px', width:'100%', borderRadius:'10px', fontWeight:'bold', cursor:'pointer'}}>ВСТУПИТЬ В VIP</button>
          </div>
        </div>
      )}

      {toast && <div style={{position:'fixed', top:'20px', left:'50%', transform:'translateX(-50%)', padding:'12px 25px', borderRadius:'8px', zIndex:10000, fontWeight:'bold', background: toast.type==='win'?'var(--win)':'var(--loss)', color:'#000'}}>{toast.msg}</div>}

      <header className="header">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{fontSize:'13px', color:'var(--neon)', fontWeight:'bold'}}>LVL {lvl} <span style={{color:'#444', marginLeft:'5px'}}>({winCount % 10}/10)</span></div>
          <div className="balance">${balance.toFixed(2)}</div>
        </div>
        <div className="xp-bar"><div className="xp-fill" style={{width: `${progress}%`}}></div></div>
      </header>

      <div className="content">
        {tab === 'trade' && (
          <>
            {!selectedDex ? (
              <div style={{paddingTop: '10px'}}>
                {signal && (
                  <div className="signal-box">
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px'}}>
                      <span style={{color:'var(--neon)'}}>СИГНАЛ: {signal.coin}</span>
                      <span style={{color:'var(--win)'}}>+{signal.bonus}%</span>
                    </div>
                    <div style={{fontSize: '16px', fontWeight:'bold', margin:'8px 0'}}>{signal.buyDex} → {signal.sellDexName}</div>
                  </div>
                )}
                {EXCHANGES.map(d => (
                  <div key={d.id} className="dex-item" style={{borderColor: d.color}} onClick={() => setSelectedDex(d.id)}>
                    <span style={{fontWeight:'bold', fontSize: '18px'}}>{d.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="trade-terminal">
                <button onClick={() => setSelectedDex(null)} style={{background:'#222', border:'none', color:'#fff', padding:'10px', borderRadius:'8px', alignSelf:'flex-start', marginBottom:'15px'}}>← НАЗАД</button>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                  <span style={{fontSize:'12px'}}>СУММА:</span>
                  <input type="number" className="input-sum" value={tradeAmount} onChange={e => setTradeAmount(Number(e.target.value))} />
                </div>
                <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(Number(e.target.value))} style={{width:'100%', marginBottom:'20px'}} />
                {COINS_DATA.map(c => {
                  const pos = activePositions[c.id];
                  const locked = c.lvl > lvl;
                  return (
                    <div key={c.id} className="pair-row" style={{opacity: locked ? 0.3 : 1}}>
                      <b>{c.id}/USDT</b>
                      {locked ? <span>🔒 L{c.lvl}</span> : 
                        <button 
                          style={{background: pos ? 'var(--loss)' : 'var(--win)', color: '#000', border:'none', padding:'10px 20px', borderRadius:'8px', fontWeight:'bold'}}
                          onClick={() => {
                            if(pos) closeTrade(c.id);
                            else {
                              if(tradeAmount > balance) return;
                              setBalance(b => b - tradeAmount);
                              setActivePositions(p => ({ ...p, [c.id]: { amt: tradeAmount, lev: leverage, dex: selectedDex, signalId: signal?.id, bonus: signal?.bonus } }));
                            }
                          }}
                        >
                          {pos ? 'SELL' : 'BUY'}
                        </button>
                      }
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'mining' && (
          <div style={{flex: 1, display:'flex', flexDirection:'column', justifyContent:'center'}}>
            <div className="sphere" onClick={() => {
              setBalance(b => b + 0.05);
              if(soundEnabled) { sndClick.current.currentTime = 0; sndClick.current.play().catch(()=>{}); }
            }}>$</div>
          </div>
        )}

        {tab === 'awards' && (
          <div style={{padding:'20px'}}>
            <h3 style={{fontSize: '20px'}}>HISTORY</h3>
            {history.map((h, i) => (
              <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #111'}}>
                <span>{h.coin}</span>
                <span style={{color: h.win?'var(--win)':'var(--loss)'}}>${h.pnl.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="nav">
        <button className={`nav-btn ${tab === 'mining' ? 'active' : ''}`} onClick={() => setTab('mining')}>MINE</button>
        <button className={`nav-btn ${tab === 'trade' ? 'active' : ''}`} onClick={() => setTab('trade')}>EXCHANGE</button>
        <button className={`nav-btn ${tab === 'awards' ? 'active' : ''}`} onClick={() => setTab('awards')}>LOGS</button>
      </nav>
    </div>
  );
}
