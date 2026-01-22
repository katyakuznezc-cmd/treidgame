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
  
  const [tab, setTab] = useState('trade'); // Стартуем сразу с трейда
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

  // Каждые 150 XP — новый уровень (150 / 15 XP за сделку = 10 сделок)
  const lvl = Math.floor(xp / 150) + 1;
  const progress = (xp % 150) / 1.5; // Процент до некст уровня

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
  }, [balance, xp, winCount, history, lvl]);

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
  }, [tab, lvl]);

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const isWin = signal && p.signalId === signal.id && signal.sellDexId === selectedDex;
    const pnl = (p.amt * ((isWin ? parseFloat(p.bonus) : -20) * p.lev) / 100);
    
    setPendingTrades(prev => ({ ...prev, [coinId]: true }));
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    
    setTimeout(() => {
      setBalance(b => b + p.amt + pnl);
      if(isWin) {
        setXp(x => x + 15); // ОПЫТ ТОЛЬКО ЗА ВИН
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
        .app-main { height: 100vh; display: flex; flex-direction: column; }
        .header { padding: 15px; background: var(--panel); border-bottom: 1px solid #222; }
        .balance { color: var(--win); font-size: 24px; font-weight: bold; }
        .xp-bar { height: 4px; background: #222; margin-top: 10px; border-radius: 2px; }
        .xp-fill { height: 100%; background: var(--neon); box-shadow: 0 0 10px var(--neon); transition: 0.5s; }
        .signal-box { background: rgba(0,217,255,0.05); border: 1px solid var(--neon); margin: 10px; padding: 12px; border-radius: 8px; }
        .dex-item { background: #0a0a0a; border: 1px solid #222; margin: 8px 12px; padding: 15px; border-radius: 10px; border-left: 5px solid; }
        .input-sum { background: #111; border: 1px solid #333; color: var(--win); padding: 5px; width: 60px; border-radius: 4px; }
        .btn-action { border: none; padding: 10px 0; border-radius: 6px; font-weight: bold; width: 80px; font-size: 11px; }
        .nav { height: 60px; display: flex; background: var(--panel); border-top: 1px solid #222; }
        .nav-btn { flex: 1; background: none; border: none; color: #444; font-size: 10px; font-weight: bold; }
        .nav-btn.active { color: var(--neon); }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .ad-box { background: #111; border: 2px solid var(--win); padding: 25px; border-radius: 15px; text-align: center; }
        .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); padding: 10px 20px; border-radius: 5px; z-index: 2000; font-weight: bold; }
      `}</style>

      {showAd && (
        <div className="modal">
          <div className="ad-box">
            <h2 style={{color: 'var(--win)'}}>ВЫ ПРОШЛИ ПРОВЕРКУ</h2>
            <p>10 сделок закрыто в плюс. Вы готовы к реальному рынку в нашем сообществе.</p>
            <button onClick={() => window.open('https://t.me/kriptoalians', '_blank')} style={{background: 'var(--win)', border:'none', padding:'15px', width:'100%', borderRadius:'8px', fontWeight:'bold'}}>ПОЛУЧИТЬ ДОСТУП</button>
          </div>
        </div>
      )}

      {toast && <div className="toast" style={{background: toast.type==='win'?'var(--win)':'var(--loss)', color:'#000'}}>{toast.msg}</div>}

      <header className="header">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
          <div style={{fontSize:'12px', color:'var(--neon)'}}>LVL {lvl} <span style={{color:'#444'}}>({winCount % 10}/10 к некст LVL)</span></div>
          <div className="balance">${balance.toFixed(2)}</div>
        </div>
        <div className="xp-bar"><div className="xp-fill" style={{width: `${progress}%`}}></div></div>
      </header>

      <main style={{flex: 1, overflowY: 'auto'}}>
        {tab === 'trade' && (
          <>
            {signal && (
              <div className="signal-box">
                <div style={{fontSize:'10px', color:'var(--neon)'}}>СИГНАЛ: {signal.coin} (+{signal.bonus}%)</div>
                <div style={{fontWeight:'bold', margin:'4px 0'}}>{signal.buyDex} → {signal.sellDexName}</div>
                <div style={{fontSize:'10px', color:'#555'}}>ПРИБЫЛЬ: <span style={{color:'var(--win)'}}>+${(tradeAmount * leverage * signal.bonus/100).toFixed(2)}</span></div>
              </div>
            )}
            {!selectedDex ? EXCHANGES.map(d => (
              <div key={d.id} className="dex-item" style={{borderColor: d.color}} onClick={() => setSelectedDex(d.id)}>
                <span style={{fontWeight:'bold'}}>{d.name}</span>
              </div>
            )) : (
              <div style={{padding:'10px'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                  <button onClick={() => setSelectedDex(null)} style={{background:'#222', border:'none', color:'#fff', padding:'5px 10px', borderRadius:'4px', fontSize:'11px'}}>← НАЗАД</button>
                  <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                    <input type="number" className="input-sum" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} />
                    <span style={{fontSize:'11px'}}>x{leverage}</span>
                  </div>
                </div>
                <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(e.target.value)} style={{width:'100%', marginBottom:'15px'}} />
                {COINS_DATA.map(c => {
                  const pos = activePositions[c.id];
                  const locked = c.lvl > lvl;
                  return (
                    <div key={c.id} style={{display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #111', opacity: locked?0.3:1}}>
                      <div><b>{c.id}/USDT</b>{pos && <div style={{fontSize:'9px', color:'var(--win)'}}>В СДЕЛКЕ...</div>}</div>
                      {locked ? <span>🔒 LVL {c.lvl}</span> : pendingTrades[c.id] ? <span>ОЖИДАНИЕ...</span> :
                        <button className={`btn-action`} style={{background: pos?'var(--loss)':'var(--win)', color: pos?'#fff':'#000'}} onClick={() => {
                          if(pos) closeTrade(c.id);
                          else {
                            if(tradeAmount > balance) return;
                            setBalance(b => b - tradeAmount);
                            setActivePositions(p => ({ ...p, [c.id]: { amt: tradeAmount, lev: leverage, dex: selectedDex, signalId: signal?.id, bonus: signal?.bonus } }));
                          }
                        }}>{pos ? 'SELL' : 'BUY'}</button>
                      }
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
        {tab === 'mining' && (
          <div style={{height:'100%', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center'}}>
            <div style={{width:'150px', height:'150px', border:'2px solid #222', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'40px', cursor:'pointer'}} onClick={() => {
              setBalance(b => b + 0.02);
              if(soundEnabled) { sndClick.current.currentTime = 0; sndClick.current.play().catch(()=>{}); }
            }}>$</div>
            <p style={{color:'#333', marginTop:'15px', fontSize:'12px'}}>ЗДЕСЬ ТОЛЬКО ДЕНЬГИ. ОПЫТ — В ТРЕЙДЕ.</p>
          </div>
        )}
        {tab === 'awards' && (
          <div style={{padding:'20px'}}>
            <h3>ЛОГИ (WINS: {winCount})</h3>
            {history.map((h, i) => <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #111', fontSize:'12px'}}><span>{h.coin}</span><span style={{color: h.win?'var(--win)':'var(--loss)'}}>${h.pnl.toFixed(2)}</span></div>)}
          </div>
        )}
      </main>

      <nav className="nav">
        <button className={`nav-btn ${tab === 'mining' ? 'active' : ''}`} onClick={() => setTab('mining')}>MINE</button>
        <button className={`nav-btn ${tab === 'trade' ? 'active' : ''}`} onClick={() => setTab('trade')}>EXCHANGE</button>
        <button className={`nav-btn ${tab === 'awards' ? 'active' : ''}`} onClick={() => setTab('awards')}>LOGS</button>
      </nav>
    </div>
  );
}
