

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [signalTimer, setSignalTimer] = useState(0);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lang, setLang] = useState('RU');
  const [toast, setToast] = useState(null);
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
    if (tab === 'trade' && !signal && !isAnalyzing) {
      setIsAnalyzing(true);
      const timer = setTimeout(() => {
        generateSignal();
        setIsAnalyzing(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [tab, signal, isAnalyzing]);

  useEffect(() => {
    if (signalTimer > 0) {
      const t = setInterval(() => setSignalTimer(s => s - 1), 1000);
      return () => clearInterval(t);
    } else { setSignal(null); }
  }, [signalTimer]);

  const generateSignal = () => {
    const avail = COINS_DATA.filter(c => c.lvl <= lvl);
    const coin = avail[Math.floor(Math.random() * avail.length)];
    const d1 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    let d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    while(d2.id === d1.id) d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    setSignal({ 
      coin: coin.id, buyDex: d1.name, sellDexId: d2.id, sellDexName: d2.name, 
      bonus: (Math.random() * 2 + 1).toFixed(2), id: Date.now() 
    });
    setSignalTimer(90);
    if(soundEnabled) { sndBell.current.play().catch(() => {}); }
  };

  const startTutorial = () => {
    setTab('trade');
    setSelectedDex(null);
    setTutStep(0);
  };

  const tutConfig = [
    { t: "Твой баланс", c: "Здесь отображаются твои деньги. Мы выдали тебе $1000 для успешного старта!", ref: "h-bal" },
    { t: "Анализ и Сигналы", c: "Система сканирует биржи. Когда анализ (5 сек) завершится, ты увидишь выгодную сделку!", ref: "s-box" },
    { t: "Выбор площадки", c: "Выбирай любую биржу из списка, чтобы открыть торговый терминал.", ref: "d-list" },
    { t: "Раздел Майнинга", c: "Если баланс станет нулевым, ты всегда можешь заработать кликами здесь.", ref: "n-mine" }
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
      if(tradeAmount > balance) return setToast({msg: 'НЕДОСТАТОЧНО СРЕДСТВ', type:'loss'});
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
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div className="app-main">
      <style>{`
        :root { --win: #00ff88; --loss: #ff3366; --neon: #00d9ff; --panel: #121214; }
        html, body { height: 100%; width: 100%; margin: 0; background: #000; overflow: hidden; color: #eee; font-family: sans-serif; }
        .app-main { height: 100vh; width: 100vw; display: flex; flex-direction: column; position: relative; }
        
        .tut-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; }
        .tut-card { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 85%; max-width: 350px; background: #1a1a1a; border: 2px solid var(--neon); border-radius: 20px; padding: 25px; z-index: 1100; text-align: center; box-shadow: 0 0 30px rgba(0,0,0,0.5); }
        .focus-el { position: relative; z-index: 1005 !important; border: 2px solid #fff !important; box-shadow: 0 0 20px #fff !important; pointer-events: none !important; }

        .header { padding: 15px; background: var(--panel); border-bottom: 1px solid #222; }
        .balance { color: var(--win); font-size: 26px; font-weight: 900; }
        .content { flex: 1; overflow-y: auto; }
        .signal-box { background: #00121a; border: 1px solid var(--neon); margin: 10px; padding: 15px; border-radius: 12px; position: relative; min-height: 80px; display: flex; flex-direction: column; justify-content: center; }
        .dex-item { background: #0a0a0a; border: 1px solid #222; margin: 10px; padding: 18px; border-radius: 12px; cursor: pointer; }
        .nav { height: 75px; display: flex; background: var(--panel); border-top: 1px solid #222; }
        .nav-btn { flex: 1; background: none; border: none; color: #444; font-size: 11px; font-weight: bold; }
        .nav-btn.active { color: var(--neon); }
        .center-toast { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 30px; border-radius: 20px; z-index: 5000; text-align: center; color: #000; font-weight: 900; font-size: 24px; box-shadow: 0 0 50px rgba(0,0,0,1); }
        
        @keyframes fly { to { transform: translateY(-70px); opacity: 0; } }
        @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
      `}</style>

      {tutStep >= 0 && (
        <>
          <div className="tut-overlay"></div>
          <div className="tut-card">
            <h2 style={{color: 'var(--neon)', margin: '0 0 10px 0'}}>{tutConfig[tutStep].t}</h2>
            <p style={{fontSize: '15px', color: '#ccc', lineHeight: '1.4'}}>{tutConfig[tutStep].c}</p>
            <button onClick={() => {
                if(tutStep < tutConfig.length - 1) setTutStep(tutStep + 1);
                else { setTutStep(-1); localStorage.setItem('k_tut', 'done'); }
              }} style={{marginTop: '20px', width: '100%', padding: '15px', background: 'var(--neon)', border: 'none', borderRadius: '12px', fontWeight: 'bold'}}>ПОНЯТНО</button>
          </div>
        </>
      )}

      {toast && <div className="center-toast" style={{background: toast.type==='win'?'var(--win)':'var(--loss)'}}>{toast.msg}</div>}

      <header className={`header ${tutStep === 0 ? 'focus-el' : ''}`}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{fontSize:'12px', color:'#555'}}>ID: {userId}</div>
          <div className="balance">${balance.toFixed(2)}</div>
        </div>
        <div style={{height: 4, background: '#222', marginTop: 10, borderRadius: 2}}>
          <div style={{width: `${progress}%`, height: '100%', background: 'var(--neon)'}}></div>
        </div>
      </header>

      <div className="content">
        {tab === 'trade' && (
          <>
            {!selectedDex ? (
              <div>
                <div className={`signal-box ${tutStep === 1 ? 'focus-el' : ''}`}>
                  {isAnalyzing ? (
                    <div style={{textAlign:'center', color:'var(--neon)', fontWeight:'bold', animation:'pulse 1s infinite'}}>АНАЛИЗ РЫНКА...</div>
                  ) : signal ? (
                    <>
                      <span style={{position:'absolute', top:5, right:10, color:'var(--loss)', fontSize:'10px'}}>{signalTimer}s</span>
                      <div style={{fontSize: '18px', fontWeight:'bold'}}>{signal.coin}: {signal.buyDex} → {signal.sellDexName}</div>
                      <div style={{fontSize:'11px', color:'var(--win)'}}>ПРИБЫЛЬ: +{signal.bonus}%</div>
                    </>
                  ) : <div style={{textAlign:'center', color:'#333'}}>ПОИСК СДЕЛКИ...</div>}
                </div>
                <div className={`${tutStep === 2 ? 'focus-el' : ''}`}>
                  {EXCHANGES.map(d => (
                    <div key={d.id} className="dex-item" style={{borderLeft: `5px solid ${d.color}`}} onClick={() => setSelectedDex(d.id)}>
                      <div style={{fontWeight:'bold'}}>{d.name}</div>
                      <div style={{fontSize: '10px', color: '#444'}}>Торговый терминал</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{padding:'15px'}}>
                <button onClick={() => setSelectedDex(null)} style={{background:'#222', border:'none', color:'#fff', padding:'10px 20px', borderRadius:'10px', marginBottom:'20px', fontWeight:'bold'}}>← К СПИСКУ БИРЖ</button>
                <div style={{background:'#0a0a0a', padding:'15px', borderRadius:'12px', border:'1px solid #222', marginBottom:'20px'}}>
                   <div style={{fontSize:'12px', color:'#555'}}>ПРОГНОЗ ДОХОДА:</div>
                   <div style={{fontSize:'22px', fontWeight:'bold', color:'var(--win)'}}>
                     +${((tradeAmount * leverage * (signal?.bonus || 1.5)) / 100).toFixed(2)}
                   </div>
                </div>
                
                <div style={{marginBottom: 20}}>
                   <div style={{fontSize: 12, marginBottom: 5}}>СУММА: ${tradeAmount} / ПЛЕЧО: x{leverage}</div>
                   <input type="range" min="10" max={balance} value={tradeAmount} onChange={e => setTradeAmount(Number(e.target.value))} style={{width:'100%', accentColor:'var(--neon)'}} />
                   <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(Number(e.target.value))} style={{width:'100%', marginTop: 10, accentColor:'var(--neon)'}} />
                </div>

                {COINS_DATA.map(c => {
                  const pos = activePositions[c.id];
                  const pTime = pendingTime[c.id];
                  const locked = c.lvl > lvl;
                  return (
                    <div key={c.id} style={{padding:'15px 0', borderBottom:'1px solid #111', opacity: locked ? 0.3 : 1}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div>
                            <div style={{fontWeight:'bold'}}>{c.id}/USDT <span style={{fontSize:11, color:'var(--neon)'}}>${prices[c.id]}</span></div>
                        </div>
                        {locked ? <span>🔒 Lvl {c.lvl}</span> : 
                          <button disabled={pTime > 0} style={{background: pTime ? '#333' : (pos ? 'var(--loss)' : 'var(--win)'), color: '#000', border:'none', padding:'10px 20px', borderRadius:'8px', fontWeight:'bold', minWidth:'100px'}} onClick={() => handleAction(c.id)}>
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
            <div style={{width:'180px', height:'180px', border:'5px solid var(--neon)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'80px', color:'var(--neon)', cursor:'pointer', boxShadow: '0 0 20px rgba(0,217,255,0.2)'}} 
              onClick={(e) => {
                setBalance(b => b + 0.25);
                if(soundEnabled) { sndClick.current.currentTime = 0; sndClick.current.play().catch(()=>{}); }
                const dol = document.createElement('div');
                dol.innerText = '$'; dol.style.position = 'fixed'; dol.style.left = e.clientX + 'px'; dol.style.top = e.clientY + 'px';
                dol.style.color = 'var(--win)'; dol.style.fontWeight = 'bold'; dol.style.fontSize = '24px'; dol.style.pointerEvents = 'none'; dol.style.animation = 'fly 0.6s forwards';
                document.body.appendChild(dol); setTimeout(() => dol.remove(), 600);
              }}>$</div>
              <p style={{marginTop: 20, color: '#444'}}>КЛИКАЙ ДЛЯ ЗАРАБОТКА</p>
          </div>
        )}

        {tab === 'opts' && (
          <div style={{padding:'20px'}}>
            <button onClick={startTutorial} style={{width:'100%', padding:'18px', background:'var(--neon)', color:'#000', border:'none', borderRadius:'12px', marginBottom:'12px', fontWeight:'bold', fontSize: '14px'}}>ПЕРЕЗАПУСТИТЬ ОБУЧЕНИЕ</button>
            <button onClick={() => setSoundEnabled(!soundEnabled)} style={{width:'100%', padding:'18px', background:'#222', color:'#fff', border:'none', borderRadius:'12px', marginBottom:'12px'}}>ЗВУК: {soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</button>
            <button onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')} style={{width:'100%', padding:'18px', background:'#222', color:'#fff', border:'none', borderRadius:'12px', marginBottom:'20px'}}>ЯЗЫК: {lang}</button>
            <div style={{textAlign:'center', background:'#111', padding:'30px', borderRadius:'20px', border: '1px solid #222'}}>
               <p style={{fontSize:'12px', color:'#444', marginBottom: 10}}>НАШ ТЕЛЕГРАМ:</p>
               <a href="https://t.me/kriptoalians" target="_blank" rel="noreferrer" style={{color:'var(--neon)', textDecoration:'none', fontWeight:'bold', fontSize:'22px'}}>@kriptoalians</a>
            </div>
          </div>
        )}
      </div>

      <nav className="nav">
        <button id="n-mine" className={`nav-btn ${tab === 'mining' ? 'active' : ''} ${tutStep === 3 ? 'focus-el' : ''}`} onClick={() => setTab('mining')}>МАЙНИНГ</button>
        <button className={`nav-btn ${tab === 'trade' ? 'active' : ''}`} onClick={() => setTab('trade')}>БИРЖА</button>
        <button className={`nav-btn ${tab === 'opts' ? 'active' : ''}`} onClick={() => setTab('opts')}>НАСТРОЙКИ</button>
      </nav>
    </div>
  );
}
