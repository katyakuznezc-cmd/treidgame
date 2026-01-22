

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
  const [lang, setLang] = useState('RU');
  const [toast, setToast] = useState(null);
  const [showAd, setShowAd] = useState(false);

  const lvl = Math.floor(xp / 150) + 1;
  const progress = (xp % 150) / 1.5; 
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : 10;

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
  }, [tab, signal]);

  const handleAction = (coinId) => {
    const pos = activePositions[coinId];
    if (pos) {
      // ЗАКРЫТИЕ СДЕЛКИ
      const isWin = signal && pos.signalId === signal.id && signal.sellDexId === selectedDex;
      const pnl = (Number(pos.amt) * ((isWin ? Number(pos.bonus) : -20) * Number(pos.lev)) / 100);
      
      setPendingTrades(prev => ({ ...prev, [coinId]: true }));
      setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
      
      setTimeout(() => {
        setBalance(b => b + Number(pos.amt) + pnl);
        if(isWin) { setXp(x => x + 15); setWinCount(w => w + 1); }
        setHistory(h => [{ coin: coinId, pnl, win: isWin, date: new Date().toLocaleTimeString() }, ...h.slice(0, 10)]);
        setPendingTrades(prev => { const n = {...prev}; delete n[coinId]; return n; });
        setToast({ msg: isWin ? (lang === 'RU' ? "+15 ОПЫТ" : "+15 XP") : (lang === 'RU' ? "УБЫТОК" : "LOSS"), type: isWin ? 'win' : 'loss' });
      }, 1500);
    } else {
      // ОТКРЫТИЕ СДЕЛКИ
      if(tradeAmount > balance || tradeAmount <= 0) return setToast({msg: 'LOW BALANCE', type: 'loss'});
      setBalance(b => b - tradeAmount);
      setActivePositions(p => ({ ...p, [coinId]: { amt: tradeAmount, lev: leverage, dex: selectedDex, signalId: signal?.id, bonus: signal?.bonus } }));
    }
  };

  const t = {
    RU: { mine: 'МАЙНИНГ', trade: 'БИРЖА', logs: 'ИСТОРИЯ', opts: 'ОПЦИИ', prof: 'ПРИБЫЛЬ', buy: 'КУПИТЬ', sell: 'ЗАКРЫТЬ', back: 'НАЗАД' },
    EN: { mine: 'MINING', trade: 'EXCHANGE', logs: 'LOGS', opts: 'OPTS', prof: 'PROFIT', buy: 'BUY', sell: 'CLOSE', back: 'BACK' }
  }[lang];

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
        .sphere { width: 140px; height: 140px; border: 3px solid var(--neon); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 50px; color: var(--neon); margin: 40px auto; cursor: pointer; box-shadow: 0 0 15px rgba(0,217,255,0.1); }
        .nav { height: 70px; display: flex; background: var(--panel); border-top: 1px solid #222; padding-bottom: env(safe-area-inset-bottom); }
        .nav-btn { flex: 1; background: none; border: none; color: #444; font-size: 10px; font-weight: bold; cursor: pointer; }
        .nav-btn.active { color: var(--neon); }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .ad-box { background: #111; border: 2px solid var(--win); padding: 30px; border-radius: 20px; text-align: center; }
        .calc-badge { font-size: 9px; background: #222; padding: 2px 6px; border-radius: 4px; color: var(--win); font-weight: bold; }
      `}</style>

      {showAd && (
        <div className="modal">
          <div className="ad-box">
            <h2 style={{color: 'var(--win)', marginTop: 0}}>QUALIFIED</h2>
            <p>{lang === 'RU' ? '10 сделок закрыто! Доступ в VIP открыт.' : '10 trades closed! VIP access granted.'}</p>
            <button onClick={() => window.open('https://t.me/kriptoalians', '_blank')} style={{background: 'var(--win)', border:'none', padding:'16px', width:'100%', borderRadius:'10px', fontWeight:'bold', cursor:'pointer'}}>JOIN CHANNEL</button>
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
                      <span style={{color:'var(--neon)'}}>{signal.coin}</span>
                      <span style={{color:'var(--win)'}}>+{signal.bonus}%</span>
                    </div>
                    <div style={{fontSize: '16px', fontWeight:'bold', margin:'5px 0'}}>{signal.buyDex} → {signal.sellDexName}</div>
                  </div>
                )}
                {EXCHANGES.map(d => (
                  <div key={d.id} className="dex-item" style={{borderColor: d.color}} onClick={() => setSelectedDex(d.id)}>
                    <span style={{fontWeight:'bold', fontSize: '18px'}}>{d.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', padding:'15px'}}>
                <button onClick={() => setSelectedDex(null)} style={{background:'#222', border:'none', color:'#fff', padding:'10px', borderRadius:'8px', alignSelf:'flex-start', marginBottom:'15px'}}>{t.back}</button>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                  <span style={{fontSize:'12px'}}>AMT:</span>
                  <input type="number" style={{background:'#111', border:'1px solid #333', color:'var(--win)', padding:'8px', width:'100px', borderRadius:'6px'}} value={tradeAmount} onChange={e => setTradeAmount(Number(e.target.value))} />
                </div>
                <div style={{fontSize:'11px', color:'#444', marginBottom:'5px'}}>LEVERAGE: x{leverage}</div>
                <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(Number(e.target.value))} style={{width:'100%', marginBottom:'20px'}} />
                
                {COINS_DATA.map(c => {
                  const pos = activePositions[c.id];
                  const locked = c.lvl > lvl;
                  const estProfit = ((tradeAmount * leverage * (signal?.bonus || 0)) / 100).toFixed(2);

                  return (
                    <div key={c.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px 0', borderBottom:'1px solid #111', opacity: locked ? 0.3 : 1}}>
                      <div>
                        <div style={{fontWeight:'bold'}}>{c.id}/USDT</div>
                        {!locked && !pos && signal?.coin === c.id && (
                          <div className="calc-badge">+{estProfit}$ PROFIT</div>
                        )}
                        {pos && <div style={{fontSize:'9px', color:'var(--win)'}}>OPENED</div>}
                      </div>
                      
                      {locked ? <span>🔒 L{c.lvl}</span> : 
                        pendingTrades[c.id] ? <span>...</span> :
                        <button 
                          style={{background: pos ? 'var(--loss)' : 'var(--win)', color: '#000', border:'none', padding:'10px 15px', borderRadius:'8px', fontWeight:'bold', minWidth:'90px'}}
                          onClick={() => handleAction(c.id)}
                        >
                          {pos ? t.sell : t.buy}
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
            <h3 style={{fontSize: '20px'}}>{t.logs}</h3>
            {history.map((h, i) => (
              <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #111'}}>
                <span>{h.coin}</span>
                <span style={{color: h.win?'var(--win)':'var(--loss)'}}>${h.pnl.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'opts' && (
          <div style={{padding:'20px'}}>
            <h3 style={{fontSize: '20px'}}>{t.opts}</h3>
            <button onClick={() => setSoundEnabled(!soundEnabled)} style={{width:'100%', padding:'15px', background:'#222', color:'#fff', border:'none', borderRadius:'10px', marginBottom:'10px'}}>
              SOUND: {soundEnabled ? 'ON' : 'OFF'}
            </button>
            <button onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')} style={{width:'100%', padding:'15px', background:'#222', color:'#fff', border:'none', borderRadius:'10px', marginBottom:'20px'}}>
              LANG: {lang}
            </button>
            <div style={{textAlign:'center', fontSize:'12px', color:'#444'}}>
              Dev: <a href="https://t.me/vladstelin78" style={{color:'var(--neon)'}}>@vladstelin78</a><br/>
              Creator: <a href="https://t.me/kriptoalians" style={{color:'var(--neon)'}}>@kriptoalians</a>
            </div>
          </div>
        )}
      </div>

      <nav className="nav">
        <button className={`nav-btn ${tab === 'mining' ? 'active' : ''}`} onClick={() => setTab('mining')}>{t.mine}</button>
        <button className={`nav-btn ${tab === 'trade' ? 'active' : ''}`} onClick={() => setTab('trade')}>{t.trade}</button>
        <button className={`nav-btn ${tab === 'awards' ? 'active' : ''}`} onClick={() => setTab('awards')}>{t.logs}</button>
        <button className={`nav-btn ${tab === 'opts' ? 'active' : ''}`} onClick={() => setTab('opts')}>{t.opts}</button>
      </nav>
    </div>
  );
}
