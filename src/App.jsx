

import React, { useState, useEffect, useRef } from 'react';

const COINS_DATA = [
  { id: 'TON', lvl: 1, base: 5.4 },
  { id: 'DOGE', lvl: 1, base: 0.15 },
  { id: 'TRX', lvl: 1, base: 0.12 },
  { id: 'SOL', lvl: 3, base: 145 },
  { id: 'ETH', lvl: 5, base: 2800 },
  { id: 'ADA', lvl: 7, base: 0.45 },
  { id: 'XRP', lvl: 8, base: 0.62 },
  { id: 'BTC', lvl: 10, base: 95000 },
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
  const [tab, setTab] = useState('mining');
  const [selectedDex, setSelectedDex] = useState(null);
  const [activePositions, setActivePositions] = useState({});
  const [pendingTrades, setPendingTrades] = useState({});
  const [tradeAmount, setTradeAmount] = useState('100'); // ПОЛЕ ДЛЯ ВВОДА
  const [leverage, setLeverage] = useState(1);
  const [signal, setSignal] = useState(null);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem(`k_hist_${userId}`)) || []);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toast, setToast] = useState(null);
  const [showAd, setShowAd] = useState(false);

  const lvl = Math.floor(Math.sqrt(xp / 150)) + 1;
  const progress = ((xp - (Math.pow(lvl - 1, 2) * 150)) / ((Math.pow(lvl, 2) * 150) - (Math.pow(lvl - 1, 2) * 150))) * 100;
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : 10;

  const sndClick = useRef(new Audio('https://www.fesliyanstudios.com/play-mp3/6510'));
  const sndBell = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  useEffect(() => {
    localStorage.setItem('k_uid', userId);
    localStorage.setItem(`k_bal_${userId}`, balance);
    localStorage.setItem(`k_xp_${userId}`, xp);
    localStorage.setItem(`k_hist_${userId}`, JSON.stringify(history));
    if (lvl === 2 && !localStorage.getItem('ad_shown_2')) {
      setShowAd(true);
      localStorage.setItem('ad_shown_2', 'true');
    }
  }, [balance, xp, history, userId, lvl]);

  const generateSignal = () => {
    const avail = COINS_DATA.filter(c => c.lvl <= lvl);
    const coin = avail[Math.floor(Math.random() * avail.length)];
    const d1 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    let d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    while(d2.id === d1.id) d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    
    setSignal({ 
      coin: coin.id, 
      buyDex: d1.name, 
      sellDexId: d2.id, 
      sellDexName: d2.name, 
      bonus: (Math.random() * 5 + 5).toFixed(1), 
      id: Date.now() 
    });
    if(soundEnabled) { sndBell.current.currentTime = 0; sndBell.current.play().catch(() => {}); }
  };

  useEffect(() => {
    if (tab === 'trade' && !signal) generateSignal();
    const itv = setInterval(() => { if(tab === 'trade') generateSignal() }, 30000);
    return () => clearInterval(itv);
  }, [tab]);

  const openTrade = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (isNaN(amt) || amt <= 0) return setToast({msg: "НЕВЕРНАЯ СУММА", type: "loss"});
    if (amt > balance) return setToast({msg: "МАЛО СРЕДСТВ", type: "loss"});
    
    setBalance(b => b - amt);
    setActivePositions(p => ({ ...p, [coinId]: { amt, lev: leverage, dex: selectedDex, signalId: signal?.id, bonus: signal?.bonus } }));
    setToast({ msg: "СДЕЛКА ОТКРЫТА", type: "info" });
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const isWin = signal && p.signalId === signal.id && signal.sellDexId === selectedDex;
    const pnl = (p.amt * ((isWin ? parseFloat(p.bonus) : -15) * p.lev) / 100);
    
    setPendingTrades(prev => ({ ...prev, [coinId]: true }));
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    
    setTimeout(() => {
      setBalance(b => b + p.amt + pnl);
      setXp(x => x + 100);
      setHistory(h => [{ coin: coinId, pnl, win: isWin, date: new Date().toLocaleTimeString() }, ...h.slice(0, 10)]);
      setPendingTrades(prev => { const n = {...prev}; delete n[coinId]; return n; });
      setToast({ msg: isWin ? "ПРОФИТ ВЫПЛАЧЕН" : "ЛИКВИДАЦИЯ", type: isWin ? 'win' : 'loss' });
    }, 4000);
  };

  return (
    <div className="app-main">
      <style>{`
        :root { --win: #00ff88; --loss: #ff3366; --neon: #00d9ff; --panel: #121214; }
        body { margin: 0; background: #000; color: #eee; font-family: 'Roboto Mono', monospace; overflow: hidden; }
        .app-main { height: 100vh; display: flex; flex-direction: column; }
        
        .header { padding: 12px 15px; background: var(--panel); border-bottom: 1px solid #222; }
        .header-top { display: flex; justify-content: space-between; align-items: baseline; }
        .balance { color: var(--win); font-size: 24px; font-weight: 800; }
        .xp-bar { height: 3px; background: #222; margin-top: 8px; border-radius: 2px; }
        .xp-progress { height: 100%; background: var(--neon); transition: 0.5s; }

        .signal-banner { background: #00151a; border: 1px solid var(--neon); margin: 10px; padding: 12px; border-radius: 6px; }
        .calc-info { font-size: 10px; color: #555; margin-top: 4px; border-top: 1px solid #1a3a40; padding-top: 4px; }

        .dex-card { background: #0a0a0a; border: 1px solid #222; margin: 8px 12px; padding: 18px; border-radius: 10px; display: flex; justify-content: space-between; }
        
        .trade-controls { padding: 12px; background: #000; display: flex; flex-direction: column; gap: 10px; border-bottom: 1px solid #222; }
        .input-sum { background: #111; border: 1px solid #333; color: var(--win); padding: 8px; border-radius: 4px; width: 100px; font-weight: bold; }

        .pair-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 15px; border-bottom: 1px solid #111; }
        .btn-action { border: none; padding: 12px 0; border-radius: 6px; font-weight: 900; width: 85px; text-transform: uppercase; font-size: 11px; }
        .btn-buy { background: var(--win); color: #000; }
        .btn-close { background: var(--loss); color: #fff; }
        .btn-back { background: #222; color: #fff; border: 1px solid #444; padding: 6px 12px; border-radius: 4px; font-size: 10px; }

        .nav { height: 65px; display: flex; background: var(--panel); border-top: 1px solid #222; }
        .nav-item { flex: 1; background: none; border: none; color: #444; font-size: 10px; font-weight: bold; }
        .nav-item.active { color: var(--neon); }

        .modal-ad { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 30px; }
        .ad-box { background: #0a0a0a; border: 2px solid var(--win); padding: 25px; border-radius: 15px; text-align: center; }
        .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); padding: 12px 20px; border-radius: 6px; z-index: 20000; font-weight: bold; font-size: 12px; }
        
        .sphere { width: 140px; height: 140px; border: 2px solid var(--neon); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 50px; color: var(--neon); margin: 60px auto; cursor: pointer; box-shadow: 0 0 20px rgba(0,217,255,0.2); }
      `}</style>

      {showAd && (
        <div className="modal-ad">
          <div className="ad-box">
            <h2 style={{color: 'var(--win)', margin: '0 0 10px'}}>LVL 2: ПРОФИ</h2>
            <p style={{fontSize: '13px'}}>Вы освоили базу. Готовы к реальным сделкам?</p>
            <button onClick={() => window.open('https://t.me/kriptoalians', '_blank')} style={{background: 'var(--win)', border:'none', padding:'15px', width:'100%', borderRadius:'8px', fontWeight:'bold'}}>ВСТУПИТЬ В КАНАЛ</button>
            <button onClick={() => setShowAd(false)} style={{background:'none', border:'none', color:'#555', marginTop:'15px'}}>Закрыть</button>
          </div>
        </div>
      )}

      {toast && <div className={`toast`} style={{background: toast.type === 'win' ? 'var(--win)' : toast.type === 'loss' ? 'var(--loss)' : 'var(--neon)', color: '#000'}}>{toast.msg}</div>}

      <header className="header">
        <div className="header-top">
          <div style={{fontSize: '11px', color: '#555'}}>MASTER ARBITRAGE</div>
          <div className="balance">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
        </div>
        <div className="xp-bar"><div className="xp-progress" style={{width: `${progress}%`}}></div></div>
      </header>

      <main style={{flex: 1, overflowY: 'auto'}}>
        {tab === 'trade' && (
          <>
            {signal && (
              <div className="signal-banner">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{fontSize: '10px', color: 'var(--neon)', fontWeight: 'bold'}}>LIVE SIGNAL</span>
                  <span style={{fontSize: '10px', color: 'var(--win)'}}>+{signal.bonus}% PROFIT</span>
                </div>
                <div style={{fontSize: '13px', margin: '5px 0', fontWeight: 'bold'}}>
                  {signal.buyDex} <span style={{color: '#555'}}>→</span> {signal.sellDexName} : {signal.coin}
                </div>
                <div className="calc-info">
                  ПРОГНОЗ: ${(parseFloat(tradeAmount || 0) * leverage).toFixed(0)} → <span style={{color: 'var(--win)'}}>${(parseFloat(tradeAmount || 0) * leverage * (1 + signal.bonus/100)).toFixed(0)}</span>
                </div>
              </div>
            )}

            {!selectedDex ? (
              EXCHANGES.map(d => (
                <div key={d.id} className="dex-card" style={{borderLeft: `5px solid ${d.color}`}} onClick={() => setSelectedDex(d.id)}>
                  <div>
                    <div style={{fontWeight: 'bold', fontSize: '16px'}}>{d.name}</div>
                    <div style={{fontSize: '9px', color: '#444'}}>NETWORK: ACTIVE</div>
                  </div>
                  {Object.values(activePositions).some(p => p.dex === d.id) && <span style={{color: 'var(--win)', fontSize: '10px'}}>● В СДЕЛКЕ</span>}
                </div>
              ))
            ) : (
              <div style={{background: '#000', height: '100%'}}>
                <div className="trade-controls">
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <button className="btn-back" onClick={() => setSelectedDex(null)}>← НАЗАД</button>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span style={{fontSize: '10px', color: '#555'}}>СУММА:</span>
                      <input 
                        type="number" 
                        className="input-sum" 
                        value={tradeAmount} 
                        onChange={(e) => setTradeAmount(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <div style={{fontSize: '9px', color: '#555', marginBottom: '4px'}}>ПЛЕЧО: x{leverage} (LIMIT x{maxLev})</div>
                    <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(e.target.value)} style={{width: '100%'}} />
                  </div>
                </div>
                {COINS_DATA.map(c => {
                  const pos = activePositions[c.id];
                  const locked = c.lvl > lvl;
                  return (
                    <div key={c.id} className="pair-item" style={{opacity: locked ? 0.3 : 1}}>
                      <div>
                        <div style={{fontWeight: 'bold', fontSize: '15px'}}>{c.id}/USDT</div>
                        {pos && <div style={{fontSize: '9px', color: 'var(--win)'}}>LIVE: +${(pos.amt * (pos.bonus/100) * leverage * 0.4).toFixed(2)}</div>}
                        {!pos && <div style={{fontSize: '9px', color: '#444'}}>LVL {c.lvl}</div>}
                      </div>
                      {locked ? <span>🔒</span> : 
                        pendingTrades[c.id] ? <span style={{fontSize: '11px', color: '#555'}}>Wait...</span> :
                        <button className={`btn-action ${pos ? 'btn-close' : 'btn-buy'}`} onClick={() => pos ? closeTrade(c.id) : openTrade(c.id)}>
                          {pos ? 'SELL' : 'BUY'}
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
          <div style={{height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
            <div className="sphere" onClick={() => {
              setBalance(b => b + 0.1); setXp(x => x + 2);
              if(soundEnabled) { sndClick.current.currentTime = 0; sndClick.current.play().catch(()=>{}); }
            }}>$</div>
            <div style={{marginTop: '20px', color: '#333', fontSize: '10px'}}>КЛИКАЙ ДЛЯ ОПЫТА</div>
          </div>
        )}

        {tab === 'awards' && (
          <div style={{padding: '20px'}}>
            <h3 style={{fontSize: '14px'}}>ИСТОРИЯ</h3>
            {history.map((h, i) => (
              <div key={i} style={{display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #111', fontSize: '12px'}}>
                <span>{h.coin}</span>
                <span style={{color: h.win ? 'var(--win)' : 'var(--loss)'}}>${h.pnl.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'settings' && (
          <div style={{padding: '20px'}}>
            <div style={{background: '#0a0a0a', padding: '20px', borderRadius: '12px', border: '1px solid #222'}}>
              <button onClick={() => setSoundEnabled(!soundEnabled)} style={{width: '100%', padding: '10px', background: '#222', color: '#fff', border: 'none', borderRadius: '5px', marginBottom: '20px'}}>ЗВУК: {soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</button>
              <div style={{fontSize: '10px', color: '#444'}}>ID: {userId}</div>
              <div style={{marginTop: '15px'}}><a href="https://t.me/kriptoalians" target="_blank" style={{color: 'var(--neon)', textDecoration: 'none'}}>SUPPORT: @kriptoalians</a></div>
            </div>
          </div>
        )}
      </main>

      <nav className="nav">
        <button className={`nav-item ${tab === 'mining' ? 'active' : ''}`} onClick={() => setTab('mining')}>MINE</button>
        <button className={`nav-item ${tab === 'trade' ? 'active' : ''}`} onClick={() => setTab('trade')}>EXCHANGE</button>
        <button className={`nav-item ${tab === 'awards' ? 'active' : ''}`} onClick={() => setTab('awards')}>LOGS</button>
        <button className={`nav-item ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>OPTS</button>
      </nav>
    </div>
  );
}
