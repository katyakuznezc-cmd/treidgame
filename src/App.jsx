

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
  const [tradeAmount, setTradeAmount] = useState('50');
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

  // Сохранение данных
  useEffect(() => {
    localStorage.setItem('k_uid', userId);
    localStorage.setItem(`k_bal_${userId}`, balance);
    localStorage.setItem(`k_xp_${userId}`, xp);
    localStorage.setItem(`k_hist_${userId}`, JSON.stringify(history));
    
    // Реклама при достижении 2 уровня
    if (lvl === 2 && !localStorage.getItem('ad_shown_2')) {
      setShowAd(true);
      localStorage.setItem('ad_shown_2', 'true');
    }
  }, [balance, xp, history, userId, lvl]);

  // Функция генерации сигнала
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
      bonus: (Math.random() * 8 + 5).toFixed(1), 
      id: Date.now() 
    });
    if(soundEnabled) { sndBell.current.currentTime = 0; sndBell.current.play().catch(() => {}); }
  };

  // Генерируем сигнал СРАЗУ при переходе на вкладку Трейдинг
  useEffect(() => {
    if (tab === 'trade' && !signal) {
      generateSignal();
    }
    const itv = setInterval(() => { if(tab === 'trade') generateSignal() }, 40000);
    return () => clearInterval(itv);
  }, [tab, lvl]);

  const openTrade = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (amt > balance) return setToast({msg: "МАЛО СРЕДСТВ", type: "loss"});
    setBalance(b => b - amt);
    setActivePositions(p => ({ ...p, [coinId]: { amt, lev: leverage, dex: selectedDex, signalId: signal?.id } }));
    setToast({ msg: "ОРДЕР ОТКРЫТ", type: "info" });
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const isWin = signal && p.signalId === signal.id && signal.sellDexId === selectedDex;
    const pnl = (p.amt * ((isWin ? parseFloat(signal.bonus) : -20) * p.lev) / 100);
    
    setPendingTrades(prev => ({ ...prev, [coinId]: true }));
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    
    setTimeout(() => {
      setBalance(b => b + p.amt + pnl);
      setXp(x => x + 80);
      setHistory(h => [{ coin: coinId, pnl, win: isWin, date: new Date().toLocaleTimeString() }, ...h.slice(0, 10)]);
      setPendingTrades(prev => { const n = {...prev}; delete n[coinId]; return n; });
      setToast({ msg: isWin ? `ПРОФИТ +$${pnl.toFixed(2)}` : `УБЫТОК $${pnl.toFixed(2)}`, type: isWin ? 'win' : 'loss' });
    }, 6000);
  };

  return (
    <div className="app-container">
      <style>{`
        :root { --win: #00ff88; --loss: #ff3366; --neon: #00d9ff; --panel: #121214; }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: #080808; color: #eee; font-family: sans-serif; overflow: hidden; }
        .app-container { height: 100vh; display: flex; flex-direction: column; }
        
        .header { padding: 15px; background: var(--panel); border-bottom: 1px solid #222; }
        .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .balance { color: var(--win); font-size: 22px; font-weight: bold; }
        .xp-bg { height: 4px; background: #222; border-radius: 2px; }
        .xp-fill { height: 100%; background: var(--neon); box-shadow: 0 0 10px var(--neon); transition: 0.3s; }

        .signal-card { background: rgba(0, 217, 255, 0.1); border: 1px solid var(--neon); margin: 10px; padding: 12px; border-radius: 8px; position: relative; }
        .signal-timer { position: absolute; bottom: 0; left: 0; height: 2px; background: var(--neon); animation: progress 40s linear forwards; }
        @keyframes progress { from { width: 100%; } to { width: 0%; } }

        .btn-buy { background: linear-gradient(135deg, #00ff88, #00bd65); color: #000; border: none; padding: 10px; border-radius: 6px; font-weight: bold; width: 90px; }
        .btn-close { background: linear-gradient(135deg, #ff3366, #c21a44); color: #fff; border: none; padding: 10px; border-radius: 6px; font-weight: bold; width: 90px; }
        .btn-exit { background: var(--loss); color: #fff; border: none; padding: 8px 15px; border-radius: 4px; font-weight: bold; font-size: 11px; }

        .dex-item { background: var(--panel); padding: 20px; margin: 10px; border-radius: 12px; border-left: 5px solid; display: flex; justify-content: space-between; align-items: center; }
        .pair-row { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #1a1a1d; }

        .nav-bar { height: 70px; display: flex; background: var(--panel); border-top: 1px solid #222; }
        .nav-btn { flex: 1; background: none; border: none; color: #444; font-weight: bold; font-size: 11px; }
        .nav-btn.active { color: var(--neon); border-top: 2px solid var(--neon); }

        .sphere { width: 140px; height: 140px; border: 2px solid var(--neon); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 50px; color: var(--neon); margin: 60px auto; cursor: pointer; box-shadow: 0 0 20px rgba(0,217,255,0.2); }
        .sphere:active { transform: scale(0.95); }

        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-content { background: #1a1a1d; padding: 30px; border-radius: 20px; border: 1px solid var(--neon); text-align: center; }
        
        .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); padding: 12px 20px; border-radius: 8px; z-index: 2000; font-weight: bold; }
        .toast.win { background: var(--win); color: #000; }
        .toast.loss { background: var(--loss); color: #fff; }
        .toast.info { background: var(--neon); color: #000; }
      `}</style>

      {showAd && (
        <div className="modal">
          <div className="modal-content">
            <h2 style={{color: 'var(--win)'}}>УРОВЕНЬ 2 ДОСТИГНУТ!</h2>
            <p>Теперь ты понимаешь, как работает арбитраж. Хочешь торговать по-настоящему?</p>
            <button 
              onClick={() => window.open('https://t.me/kriptoalians', '_blank')}
              style={{background: 'var(--win)', border: 'none', padding: '15px 25px', borderRadius: '10px', fontWeight: 'bold', margin: '10px'}}
            >НАЧАТЬ ЗАРАБАТЫВАТЬ</button>
            <br/>
            <button onClick={() => setShowAd(false)} style={{background: 'none', border: 'none', color: '#555', textDecoration: 'underline'}}>Позже</button>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`} onClick={() => setToast(null)}>{toast.msg}</div>}

      <header className="header">
        <div className="header-top">
          <div style={{color: 'var(--neon)', fontWeight: 'bold'}}>LVL {lvl}</div>
          <div className="balance">${balance.toFixed(2)}</div>
        </div>
        <div className="xp-bg"><div className="xp-fill" style={{width: `${progress}%`}}></div></div>
      </header>

      <main style={{flex: 1, overflowY: 'auto'}}>
        {tab === 'trade' && (
          <>
            {signal && (
              <div className="signal-card">
                <div style={{fontSize: '10px', color: 'var(--neon)'}}>СИГНАЛ ОБ АРБИТРАЖЕ:</div>
                <div style={{fontWeight: 'bold'}}>
                  {signal.buyDex} → {signal.sellDexName} | {signal.coin} <span style={{color: 'var(--win)'}}>+{signal.bonus}%</span>
                </div>
                <div className="signal-timer" key={signal.id}></div>
              </div>
            )}

            {!selectedDex ? (
              EXCHANGES.map(d => (
                <div key={d.id} className="dex-item" style={{borderColor: d.color}} onClick={() => setSelectedDex(d.id)}>
                  <span style={{fontSize: '18px', fontWeight: 'bold'}}>{d.name}</span>
                  <span style={{fontSize: '10px', color: '#555'}}>ВХОД →</span>
                </div>
              ))
            ) : (
              <div style={{background: '#000', height: '100%'}}>
                <div style={{padding: '10px', display: 'flex', justifyItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #222'}}>
                  <button className="btn-exit" onClick={() => setSelectedDex(null)}>✖ ВЫХОД</button>
                  <div style={{fontSize: '11px'}}>
                    ЛЕВЕРЕДЖ: x{leverage}
                    <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(e.target.value)} style={{width: '60px', marginLeft: '10px'}} />
                  </div>
                </div>
                {COINS_DATA.map(c => {
                  const pos = activePositions[c.id];
                  const locked = c.lvl > lvl;
                  return (
                    <div key={c.id} className="pair-row" style={{opacity: locked ? 0.3 : 1}}>
                      <div>
                        <div style={{fontWeight: 'bold'}}>{c.id}/USDT</div>
                        <div style={{fontSize: '10px', color: '#555'}}>LVL {c.lvl}</div>
                      </div>
                      {locked ? <span>🔒</span> : 
                        pendingTrades[c.id] ? <span style={{fontSize: '10px'}}>ОБРАБОТКА...</span> :
                        <button 
                          className={pos ? "btn-close" : "btn-buy"} 
                          onClick={() => pos ? closeTrade(c.id) : openTrade(c.id)}
                        >{pos ? 'CLOSE' : 'BUY'}</button>
                      }
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {tab === 'mining' && (
          <div style={{textAlign: 'center'}}>
            <div className="sphere" onClick={() => {
              setBalance(b => b + 0.05);
              setXp(x => x + 2);
              if(soundEnabled) { sndClick.current.currentTime = 0; sndClick.current.play().catch(()=>{}); }
            }}>$</div>
            <p style={{color: '#444', fontSize: '12px'}}>МАЙНИНГ ОПЫТА АКТИВЕН</p>
          </div>
        )}

        {tab === 'awards' && (
          <div style={{padding: '20px'}}>
            <h3 style={{color: 'var(--neon)'}}>ИСТОРИЯ СДЕЛОК</h3>
            {history.map((h, i) => (
              <div key={i} style={{display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #111'}}>
                <span>{h.coin}</span>
                <span style={{color: h.win ? 'var(--win)' : 'var(--loss)'}}>{h.win?'+':''}${h.pnl.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'settings' && (
          <div style={{padding: '20px'}}>
            <button onClick={() => setSoundEnabled(!soundEnabled)} style={{width: '100%', padding: '15px', background: '#222', color: '#fff', border: 'none', borderRadius: '8px'}}>
              ЗВУК: {soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}
            </button>
            <div style={{marginTop: '20px', textAlign: 'center'}}>
              <a href="https://t.me/kriptoalians" target="_blank" style={{color: 'var(--neon)', textDecoration: 'none'}}>@kriptoalians</a>
            </div>
          </div>
        )}
      </main>

      <nav className="nav-bar">
        <button className={`nav-btn ${tab === 'mining' ? 'active' : ''}`} onClick={() => setTab('mining')}>MINE</button>
        <button className={`nav-btn ${tab === 'trade' ? 'active' : ''}`} onClick={() => setTab('trade')}>EXCHANGE</button>
        <button className={`nav-btn ${tab === 'awards' ? 'active' : ''}`} onClick={() => setTab('awards')}>LOGS</button>
        <button className={`nav-btn ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>OPTS</button>
      </nav>
    </div>
  );
}
