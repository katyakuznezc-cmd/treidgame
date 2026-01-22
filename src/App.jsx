

import React, { useState, useEffect, useRef } from 'react';

const COINS_DATA = [
  { id: 'TON', lvl: 1, base: 5.42, desc: 'Токен Telegram.' },
  { id: 'DOGE', lvl: 1, base: 0.15, desc: 'Мем-коин.' },
  { id: 'TRX', lvl: 1, base: 0.12, desc: 'Сеть Tron.' },
  { id: 'SOL', lvl: 2, base: 145.3, desc: 'Скоростной блокчейн.' },
  { id: 'ETH', lvl: 3, base: 2800, desc: 'Смарт-контракты.' },
  { id: 'BTC', lvl: 5, base: 95000, desc: 'Цифровое золото.' },
];

const EXCHANGES = [
  { id: '1inch', name: '1INCH', color: '#00ccff' },
  { id: 'uniswap', name: 'UNISWAP', color: '#ff007a' },
  { id: 'sushiswap', name: 'SUSHI', color: '#fa52a0' },
  { id: 'pancakeswap', name: 'PANCAKE', color: '#d1884f' }
];

export default function App() {
  const [userId] = useState(() => localStorage.getItem('k_uid') || 'ID' + Math.floor(Math.random() * 999999));
  const [balance, setBalance] = useState(() => Number(localStorage.getItem(`k_bal_${userId}`)) || 1000.00);
  const [xp, setXp] = useState(() => Number(localStorage.getItem(`k_xp_${userId}`)) || 0);
  const [winCount, setWinCount] = useState(() => Number(localStorage.getItem(`k_wins_${userId}`)) || 0);
  
  const [prices, setPrices] = useState(() => COINS_DATA.reduce((acc, c) => ({ ...acc, [c.id]: c.base }), {}));
  const [tab, setTab] = useState('trade'); 
  const [selectedDex, setSelectedDex] = useState(null);
  const [activePositions, setActivePositions] = useState({});
  const [pendingTime, setPendingTime] = useState({});
  const [tradeAmount, setTradeAmount] = useState(100); 
  const [leverage, setLeverage] = useState(1);
  const [signal, setSignal] = useState(null);
  const [signalTimer, setSignalTimer] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toast, setToast] = useState(null);

  // СИСТЕМА ОБУЧЕНИЯ
  const [tutStep, setTutStep] = useState(() => localStorage.getItem('k_tut') ? -1 : 0);

  const lvl = Math.floor(xp / 150) + 1;
  const progress = (xp % 150) / 1.5; 
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : 10;

  const sndClick = useRef(new Audio('https://www.fesliyanstudios.com/play-mp3/6510'));
  const sndBell = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  useEffect(() => {
    const itv = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          next[id] = Number((next[id] * (1 + (Math.random() * 0.004 - 0.002))).toFixed(id === 'BTC' ? 1 : 3));
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(itv);
  }, []);

  useEffect(() => {
    localStorage.setItem(`k_bal_${userId}`, balance);
    localStorage.setItem(`k_xp_${userId}`, xp);
    localStorage.setItem(`k_wins_${userId}`, winCount);
    localStorage.setItem('k_uid', userId);
  }, [balance, xp, winCount, userId]);

  useEffect(() => {
    if (signalTimer > 0) {
      const t = setInterval(() => setSignalTimer(s => s - 1), 1000);
      return () => clearInterval(t);
    } else { setSignal(null); }
  }, [signalTimer]);

  const startTutorial = () => {
    setTab('trade');
    setSelectedDex(null);
    setTutStep(0);
  };

  const tutMessages = [
    { t: "Твой капитал", c: "Здесь отображается текущий баланс. Мы выдали тебе $1000 для старта!", target: "h-bal" },
    { t: "Уровень и опыт", c: "Чем больше сделок, тем выше уровень. Новые уровни открывают BTC и плечо x100.", target: "h-xp" },
    { t: "Сигналы", c: "Это сердце игры. Здесь написано, на какой бирже купить монету, а на какой продать с прибылью. Сигнал живет 90 сек.", target: "s-box" },
    { t: "Выбор биржи", c: "Нажимай на любую биржу, чтобы зайти в торговый терминал площадки.", target: "d-list" },
    { t: "Кнопки добычи", c: "Если баланс станет нулевым, переходи в раздел Майнинг и натапай себе на новую сделку.", target: "n-mine" }
  ];

  const handleAction = (coinId) => {
    const pos = activePositions[coinId];
    if (pos) {
      setPendingTime(prev => ({ ...prev, [coinId]: 10 }));
      const timer = setInterval(() => {
        setPendingTime(prev => {
          const newTime = prev[coinId] - 1;
          if (newTime <= 0) {
            clearInterval(timer);
            completeTrade(coinId, pos);
            return { ...prev, [coinId]: null };
          }
          return { ...prev, [coinId]: newTime };
        });
      }, 1000);
      setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
    } else {
      if(tradeAmount > balance) return setToast({msg: 'LOW BALANCE', type:'loss'});
      setBalance(b => b - tradeAmount);
      setActivePositions(p => ({ ...p, [coinId]: { amt: tradeAmount, lev: leverage, dex: selectedDex, bonus: signal?.bonus || 1.5 } }));
    }
  };

  const completeTrade = (coinId, pos) => {
    const isWin = Math.random() > 0.15;
    const rate = isWin ? (Math.random() * 2 + 1) : -(Math.random() * 1 + 0.5);
    const pnl = (Number(pos.amt) * (rate * Number(pos.lev)) / 100);
    setBalance(b => Math.max(0, b + Number(pos.amt) + pnl));
    if(isWin) { setXp(x => x + 15); setWinCount(w => w + 1); }
    setToast({ msg: isWin ? `ПРИБЫЛЬ: +$${pnl.toFixed(2)}` : `УБЫТОК: -$${Math.abs(pnl).toFixed(2)}`, type: isWin ? 'win' : 'loss' });
  };

  return (
    <div className="app-main">
      <style>{`
        :root { --win: #00ff88; --loss: #ff3366; --neon: #00d9ff; --panel: #121214; }
        html, body { height: 100%; width: 100%; margin: 0; background: #000; overflow: hidden; color: #eee; font-family: 'Segoe UI', sans-serif; }
        .app-main { height: 100vh; width: 100vw; display: flex; flex-direction: column; position: relative; }
        
        /* Стили обучения */
        .tut-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; pointer-events: none; }
        .tut-highlight { position: absolute; box-shadow: 0 0 0 9999px rgba(0,0,0,0.7), 0 0 20px var(--neon); border: 2px solid #fff; border-radius: 10px; z-index: 1001; transition: 0.3s; pointer-events: none; }
        .tut-card { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 400px; background: #1a1a1a; border: 2px solid var(--neon); border-radius: 20px; padding: 25px; z-index: 1002; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,1); }
        
        .header { padding: 15px; background: var(--panel); border-bottom: 1px solid #222; position: relative; }
        .balance { color: var(--win); font-size: 26px; font-weight: 900; }
        .content { flex: 1; overflow-y: auto; padding-bottom: 20px; }
        .signal-box { background: #00121a; border: 1px solid var(--neon); margin: 10px; padding: 15px; border-radius: 12px; position: relative; }
        .dex-item { background: #0a0a0a; border: 1px solid #222; margin: 10px; padding: 20px; border-radius: 15px; cursor: pointer; transition: 0.2s; }
        .dex-item:active { transform: scale(0.97); }
        .nav { height: 75px; display: flex; background: var(--panel); border-top: 1px solid #222; }
        .nav-btn { flex: 1; background: none; border: none; color: #444; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .nav-btn.active { color: var(--neon); }
        .center-toast { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 40px; border-radius: 30px; z-index: 5000; text-align: center; color: #000; font-weight: 900; font-size: 32px; box-shadow: 0 0 100px rgba(0,0,0,1); }
      `}</style>

      {/* РЕНДЕР ОБУЧЕНИЯ */}
      {tutStep >= 0 && (
        <>
          <div className="tut-overlay"></div>
          {/* Здесь логика подсветки будет зависеть от активного элемента, но для прототипа используем фиксированные подсказки */}
          <div className="tut-card">
            <h2 style={{color: 'var(--neon)', margin: '0 0 10px 0'}}>{tutMessages[tutStep].t}</h2>
            <p style={{fontSize: '15px', lineHeight: '1.4', color: '#ccc'}}>{tutMessages[tutStep].c}</p>
            <button 
              onClick={() => {
                if(tutStep < tutMessages.length - 1) setTutStep(tutStep + 1);
                else { setTutStep(-1); localStorage.setItem('k_tut', 'done'); }
              }}
              style={{marginTop: '20px', width: '100%', padding: '15px', background: 'var(--neon)', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px'}}
            >
              ПОНЯТНО, ДАЛЕЕ
            </button>
          </div>
        </>
      )}

      {toast && <div className="center-toast" style={{background: toast.type==='win'?'var(--win)':'var(--loss)'}}>{toast.msg}</div>}

      <header className="header">
        <div id="h-bal" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{fontSize:'12px', color:'#555'}}>ID: {userId}</div>
          <div className="balance">${balance.toFixed(2)}</div>
        </div>
        <div id="h-xp" style={{marginTop: 10}}>
          <div style={{fontSize:'10px', color:'var(--neon)', marginBottom: 5}}>LEVEL {lvl} ({winCount%10}/10 сделок до бонуса)</div>
          <div style={{height: 4, background: '#222', borderRadius: 2}}><div style={{width: `${progress}%`, height: '100%', background: 'var(--neon)', boxShadow: '0 0 10px var(--neon)'}}></div></div>
        </div>
      </header>

      <div className="content">
        {tab === 'trade' && (
          <>
            {!selectedDex ? (
              <div id="d-list">
                {signal ? (
                  <div id="s-box" className="signal-box">
                    <span style={{position:'absolute', top:8, right:12, color:'var(--loss)', fontSize:'12px', fontWeight:'bold'}}>{signalTimer}s</span>
                    <div style={{fontSize:'11px', color:'var(--neon)', fontWeight:'bold', letterSpacing: 1}}>LIVE SIGNAL</div>
                    <div style={{fontSize: '20px', fontWeight:'bold', margin: '5px 0'}}>{signal.coin}: {signal.buyDex} → {signal.sellDexName}</div>
                    <div style={{fontSize:'12px', color:'var(--win)'}}>ОЖИДАЕМАЯ ПРИБЫЛЬ: +{signal.bonus}%</div>
                  </div>
                ) : (
                  <div className="signal-box" style={{borderColor:'#333', textAlign:'center', color:'#444'}}>АНАЛИЗ РЫНКА...</div>
                )}
                {EXCHANGES.map(d => (
                  <div key={d.id} className="dex-item" style={{borderLeft: `6px solid ${d.color}`}} onClick={() => setSelectedDex(d.id)}>
                    <div style={{fontWeight:'bold', fontSize: '18px'}}>{d.name}</div>
                    <div style={{fontSize: '11px', color: '#555', marginTop: 4}}>Открыть пары и начать торговлю</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{padding:'15px'}}>
                <button onClick={() => setSelectedDex(null)} style={{background:'#222', border:'none', color:'#fff', padding:'12px 20px', borderRadius:'10px', marginBottom:'20px', fontWeight:'bold'}}>← НАЗАД К БИРЖАМ</button>
                
                <div style={{background:'#0a0a0a', padding: '20px', borderRadius: '15px', border: '1px solid #222', marginBottom: '20px'}}>
                   <div style={{fontSize:'12px', color:'#555', marginBottom: 5}}>ПРОГНОЗ ПРИБЫЛИ:</div>
                   <div style={{fontSize:'24px', fontWeight:'bold', color:'var(--win)'}}>
                     +${((tradeAmount * leverage * (signal?.bonus || 1.8)) / 100).toFixed(2)}
                   </div>
                </div>

                <div style={{marginBottom:'25px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom: 10}}>
                    <span>СУММА СДЕЛКИ:</span>
                    <span style={{color:'var(--win)'}}>${tradeAmount}</span>
                  </div>
                  <input type="range" min="10" max={balance} value={tradeAmount} onChange={e => setTradeAmount(Number(e.target.value))} style={{width:'100%', accentColor: 'var(--neon)'}} />
                  <div style={{display:'flex', gap: 8, marginTop: 12}}>
                    {[25, 50, 100].map(p => <button key={p} onClick={() => setTradeAmount(Number((balance * p / 100).toFixed(2)))} style={{flex:1, background:'#1a1a1a', border:'1px solid #333', color:'#eee', padding:'10px', borderRadius:'8px', fontSize: '12px'}}>{p}%</button>)}
                  </div>
                </div>

                <div style={{marginBottom:'25px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom: 10}}>
                    <span>ПЛЕЧО (LEVERAGE):</span>
                    <span style={{color:'var(--neon)'}}>x{leverage}</span>
                  </div>
                  <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(Number(e.target.value))} style={{width:'100%', accentColor: 'var(--neon)'}} />
                </div>

                {COINS_DATA.map(c => {
                  const pos = activePositions[c.id];
                  const pTime = pendingTime[c.id];
                  const locked = c.lvl > lvl;
                  return (
                    <div key={c.id} style={{padding:'18px 0', borderBottom:'1px solid #111', opacity: locked ? 0.3 : 1}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div>
                            <div style={{fontWeight:'bold', fontSize:'17px'}}>{c.id}/USDT <span style={{fontSize: 12, color: 'var(--neon)', marginLeft: 8}}>${prices[c.id]}</span></div>
                            <div style={{fontSize: '10px', color: '#444', marginTop: 2}}>{c.desc}</div>
                        </div>
                        {locked ? <div style={{fontSize: 12, color: '#444'}}>Lvl {c.lvl} 🔒</div> : 
                          <button disabled={pTime > 0} style={{background: pTime ? '#222' : (pos ? 'var(--loss)' : 'var(--win)'), color: '#000', border:'none', padding:'12px 25px', borderRadius:'10px', fontWeight:'bold', minWidth:'100px'}} onClick={() => handleAction(c.id)}>
                            {pTime ? `${pTime}s` : (pos ? 'ПРОДАТЬ' : 'КУПИТЬ')}
                          </button>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'mining' && (
          <div style={{height:'100%', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center'}}>
            <div className="tap-target" style={{width:'200px', height:'200px', border:'6px solid var(--neon)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'90px', color:'var(--neon)', cursor:'pointer', boxShadow: '0 0 40px rgba(0,217,255,0.2)'}} 
              onClick={(e) => {
                setBalance(b => b + 0.20);
                if(soundEnabled) { sndClick.current.currentTime = 0; sndClick.current.play().catch(()=>{}); }
                const dol = document.createElement('div');
                dol.innerText = '$'; dol.style.position = 'fixed'; dol.style.left = e.clientX + 'px'; dol.style.top = e.clientY + 'px';
                dol.style.color = 'var(--win)'; dol.style.fontWeight = 'bold'; dol.style.fontSize = '24px'; dol.style.animation = 'fly 0.6s forwards';
                document.body.appendChild(dol); setTimeout(() => dol.remove(), 600);
              }}>$</div>
            <p style={{marginTop: 30, color: '#444', fontWeight: 'bold'}}>ТАПАЙ ДЛЯ ЗАРАБОТКА</p>
          </div>
        )}

        {tab === 'opts' && (
          <div style={{padding:'20px'}}>
            <button onClick={startTutorial} style={{width:'100%', padding:'18px', background:'var(--neon)', color:'#000', border:'none', borderRadius:'12px', marginBottom:'12px', fontWeight:'bold', fontSize: '15px'}}>ПЕРЕЗАПУСТИТЬ ОБУЧЕНИЕ</button>
            <button onClick={() => setSoundEnabled(!soundEnabled)} style={{width:'100%', padding:'18px', background:'#1a1a1a', border: '1px solid #333', color:'#fff', borderRadius:'12px', marginBottom:'12px'}}>ЗВУК: {soundEnabled ? 'ВКЛЮЧЕН' : 'ВЫКЛЮЧЕН'}</button>
            
            <div style={{textAlign:'center', background:'#0a0a0a', padding:'30px', borderRadius:'20px', marginTop: 20, border: '1px solid #111'}}>
               <p style={{fontSize:'12px', color:'#444', marginBottom: 10, letterSpacing: 1}}>ОФИЦИАЛЬНЫЙ КАНАЛ:</p>
               <a href="https://t.me/kriptoalians" target="_blank" style={{color:'var(--neon)', textDecoration:'none', fontWeight:'bold', fontSize:'22px', display: 'block'}}>@kriptoalians</a>
               <p style={{fontSize: 10, color: '#222', marginTop: 15}}>v2.1 Build 2026</p>
            </div>
          </div>
        )}
      </div>

      <nav className="nav">
        <button id="n-mine" className={`nav-btn ${tab === 'mining' ? 'active' : ''}`} onClick={() => setTab('mining')}>Майнинг</button>
        <button id="n-trade" className={`nav-btn ${tab === 'trade' ? 'active' : ''}`} onClick={() => setTab('trade')}>Биржа</button>
        <button id="n-opts" className={`nav-btn ${tab === 'opts' ? 'active' : ''}`} onClick={() => setTab('opts')}>Опции</button>
      </nav>
      <style>{`@keyframes fly { to { transform: translateY(-80px); opacity: 0; } }`}</style>
    </div>
  );
}
