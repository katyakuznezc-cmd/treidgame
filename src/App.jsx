import React, { useState, useEffect, useRef } from 'react';

const COINS_DATA = [
  { id: 'TON', lvl: 1, desc: 'Токен Telegram. Быстрый и волатильный.' },
  { id: 'DOGE', lvl: 1, desc: 'Мем-коин. Зависит от хайпа и Илона Маска.' },
  { id: 'TRX', lvl: 1, desc: 'Сеть Tron. Стабильная монета для переводов.' },
  { id: 'SOL', lvl: 2, desc: 'Высокоскоростной блокчейн нового поколения.' },
  { id: 'ETH', lvl: 3, desc: 'Главный альткоин. База для всех смарт-контрактов.' },
  { id: 'BTC', lvl: 5, desc: 'Цифровое золото. Первая криптовалюта мира.' },
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
  const [tradeAmount, setTradeAmount] = useState(100); 
  const [leverage, setLeverage] = useState(1);
  const [signal, setSignal] = useState(null);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem(`k_hist_${userId}`)) || []);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lang, setLang] = useState('RU');
  const [toast, setToast] = useState(null);
  const [tutorialStep, setTutorialStep] = useState(() => localStorage.getItem('k_tut') ? -1 : 0);

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
  }, [balance, xp, winCount, history, userId]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
      const isWin = Math.random() > 0.15;
      const rate = isWin ? (Math.random() * 2 + 1) : -(Math.random() * 1 + 0.5);
      const pnl = (Number(pos.amt) * (rate * Number(pos.lev)) / 100);
      setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
      setTimeout(() => {
        setBalance(b => Math.max(0, b + Number(pos.amt) + pnl));
        if(isWin) { setXp(x => x + 15); setWinCount(w => w + 1); }
        setHistory(h => [{ coin: coinId, pnl, win: isWin, date: new Date().toLocaleTimeString() }, ...h.slice(0, 10)]);
        setToast({ msg: isWin ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`, type: isWin ? 'win' : 'loss' });
      }, 10000);
    } else {
      if(tradeAmount > balance) return setToast({msg: 'LOW BALANCE', type:'loss'});
      setBalance(b => b - tradeAmount);
      setActivePositions(p => ({ ...p, [coinId]: { amt: tradeAmount, lev: leverage, dex: selectedDex, signalId: signal?.id } }));
    }
  };

  const tutContent = [
    { t: "Твой баланс", c: "Здесь твои деньги. Чем выше баланс, тем больше прибыль!", pos: 'top: 80px; left: 70%;' },
    { t: "Сигналы", c: "Следи за этим блоком. Тут написано, где купить и где продать!", pos: 'top: 180px; left: 50%;' },
    { t: "Биржи", c: "Нажми на биржу, чтобы открыть терминал и выбрать монету.", pos: 'top: 400px; left: 50%;' },
    { t: "Майнинг", c: "Если баланс на нуле — натапай бонус здесь!", pos: 'bottom: 80px; left: 20%;' }
  ];

  return (
    <div className="app-main">
      <style>{`
        :root { --win: #00ff88; --loss: #ff3366; --neon: #00d9ff; --panel: #121214; }
        body { margin: 0; background: #000; color: #eee; font-family: sans-serif; overflow: hidden; }
        .app-main { height: 100vh; display: flex; flex-direction: column; }
        .header { padding: 15px; background: var(--panel); border-bottom: 1px solid #222; }
        .balance { color: var(--win); font-size: 24px; font-weight: 800; }
        .content { flex: 1; overflow-y: auto; }
        .signal-box { background: #00121a; border: 1px solid var(--neon); margin: 10px; padding: 12px; border-radius: 8px; }
        .dex-item { background: #0a0a0a; border: 1px solid #222; margin: 8px 10px; padding: 15px; border-radius: 12px; border-left: 5px solid; cursor: pointer; }
        .nav { height: 70px; display: flex; background: var(--panel); border-top: 1px solid #222; padding-bottom: env(safe-area-inset-bottom); }
        .nav-btn { flex: 1; background: none; border: none; color: #444; font-size: 10px; font-weight: bold; }
        .nav-btn.active { color: var(--neon); }
        .center-toast { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 30px; border-radius: 20px; z-index: 10000; text-align: center; min-width: 250px; color: #000; font-weight: 900; font-size: 24px; box-shadow: 0 0 50px rgba(0,0,0,0.5); }
        
        /* АНИМАЦИЯ ПАЛЬЦА */
        .finger { position: fixed; font-size: 40px; z-index: 25000; pointer-events: none; animation: tap 0.6s infinite alternate; }
        @keyframes tap { from { transform: translateY(0); } to { transform: translateY(20px); } }
        
        .tut-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 20000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .tut-card { background: #1a1a1a; border: 1px solid var(--neon); padding: 25px; border-radius: 15px; width: 100%; max-width: 300px; text-align: center; }
        
        .xp-bar { height: 4px; background: #222; margin-top: 10px; border-radius: 2px; }
        .xp-fill { height: 100%; background: var(--neon); box-shadow: 0 0 10px var(--neon); transition: 0.5s; }
      `}</style>

      {tutorialStep >= 0 && (
        <>
          <div className="finger" style={{ cssText: tutContent[tutorialStep].pos }}>👆</div>
          <div className="tut-overlay">
            <div className="tut-card">
              <h3 style={{color: 'var(--neon)', marginTop: 0}}>{tutContent[tutorialStep].t}</h3>
              <p style={{fontSize: '14px', lineHeight: '1.5'}}>{tutContent[tutorialStep].c}</p>
              <button onClick={() => {
                  if(tutorialStep < tutContent.length - 1) setTutorialStep(s => s + 1);
                  else { setTutorialStep(-1); localStorage.setItem('k_tut', 'done'); }
                }} style={{width: '100%', padding: '12px', background: 'var(--neon)', border: 'none', borderRadius: '8px', fontWeight: 'bold'}}>ДАЛЕЕ</button>
            </div>
          </div>
        </>
      )}

      {toast && <div className="center-toast" style={{background: toast.type==='win'?'var(--win)':'var(--loss)'}}>{toast.msg}</div>}

      <header className="header">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div style={{fontSize:'13px', color:'var(--neon)', fontWeight:'bold'}}>LVL {lvl} <span style={{color:'#444'}}>({winCount%10}/10)</span></div>
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
                    <div style={{fontSize:'10px', color:'var(--neon)', fontWeight:'bold'}}>LIVE SIGNAL</div>
                    <div style={{fontSize: '16px', fontWeight:'bold', margin:'5px 0'}}>{signal.coin}: {signal.buyDex} → {signal.sellDexName}</div>
                    <div style={{fontSize:'10px', color:'var(--win)'}}>EST. PROFIT: +{signal.bonus}%</div>
                  </div>
                )}
                {EXCHANGES.map(d => (
                  <div key={d.id} className="dex-item" style={{borderColor: d.color}} onClick={() => setSelectedDex(d.id)}>
                    <div style={{fontWeight:'bold'}}>{d.name}</div>
                    <div style={{fontSize: '10px', color: '#444'}}>Торговая площадка для арбитража</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{padding:'15px'}}>
                <button onClick={() => setSelectedDex(null)} style={{background:'#222', border:'none', color:'#fff', padding:'8px 15px', borderRadius:'5px', marginBottom:'15px'}}>← НАЗАД</button>
                <div style={{marginBottom:'20px'}}>
                  <div style={{fontSize:'12px', marginBottom: '5px'}}>СУММА (MAX: ${balance.toFixed(0)}):</div>
                  <input type="number" style={{width:'100%', background:'#111', border:'1px solid #333', color:'var(--win)', padding:'12px', borderRadius:'8px', fontSize:'18px'}} value={tradeAmount} onChange={e => setTradeAmount(Number(e.target.value))} />
                  <div style={{display:'flex', gap:'5px', marginTop:'5px'}}>
                    {[25, 50, 100].map(p => <button key={p} onClick={() => setTradeAmount(Number((balance * p / 100).toFixed(2)))} style={{flex:1, background:'#222', border:'none', color:'#ccc', fontSize:'10px', padding:'8px', borderRadius:'4px'}}>{p}%</button>)}
                  </div>
                </div>
                <div style={{marginBottom:'20px'}}>
                  <div style={{fontSize:'11px', color:'#555'}}>КРЕДИТНОЕ ПЛЕЧО: x{leverage}</div>
                  <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(Number(e.target.value))} style={{width:'100%'}} />
                </div>
                {COINS_DATA.map(c => {
                  const pos = activePositions[c.id];
                  const locked = c.lvl > lvl;
                  return (
                    <div key={c.id} style={{padding:'15px 0', borderBottom:'1px solid #111', opacity: locked ? 0.3 : 1}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div>
                            <div style={{fontWeight:'bold'}}>{c.id}/USDT</div>
                            <div style={{fontSize: '9px', color: '#555'}}>{c.desc}</div>
                        </div>
                        {locked ? <span>🔒 L{c.lvl}</span> : 
                          <button style={{background: pos ? 'var(--loss)' : 'var(--win)', color: '#000', border:'none', padding:'10px 20px', borderRadius:'8px', fontWeight:'bold', minWidth:'100px'}} onClick={() => handleAction(c.id)}>
                            {pos ? 'ЗАКРЫТЬ' : 'КУПИТЬ'}
                          </button>
                        }
                      </div>
                      {pos && <div style={{fontSize:'10px', color:'var(--win)', marginTop:'5px', animation:'pulse 1s infinite'}}>ОБРАБОТКА СДЕЛКИ (10s)...</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'mining' && (
          <div style={{flex: 1, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center'}}>
            <div style={{width:'150px', height:'150px', border:'4px solid var(--neon)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'60px', color:'var(--neon)', cursor:'pointer', boxShadow: '0 0 20px rgba(0,217,255,0.2)'}} 
              onClick={(e) => {
                setBalance(b => b + 0.10);
                if(soundEnabled) { sndClick.current.currentTime = 0; sndClick.current.play().catch(()=>{}); }
                // Эффект доллара
                const dol = document.createElement('div');
                dol.innerText = '$';
                dol.style.position = 'fixed'; dol.style.left = e.clientX + 'px'; dol.style.top = e.clientY + 'px';
                dol.style.color = 'var(--win)'; dol.style.fontWeight = 'bold'; dol.style.pointerEvents = 'none';
                dol.style.animation = 'fly 0.5s forwards';
                document.body.appendChild(dol);
                setTimeout(() => dol.remove(), 500);
              }}>$</div>
            <style>{`@keyframes fly { to { transform: translateY(-50px); opacity: 0; } }`}</style>
          </div>
        )}

        {tab === 'opts' && (
          <div style={{padding:'20px'}}>
            <button onClick={() => setTutorialStep(0)} style={{width:'100%', padding:'15px', background:'var(--neon)', color:'#000', border:'none', borderRadius:'10px', marginBottom:'10px', fontWeight:'bold'}}>ПРОЙТИ ОБУЧЕНИЕ</button>
            <button onClick={() => setSoundEnabled(!soundEnabled)} style={{width:'100%', padding:'15px', background:'#222', color:'#fff', border:'none', borderRadius:'10px', marginBottom:'10px'}}>ЗВУК: {soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</button>
            <button onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')} style={{width:'100%', padding:'15px', background:'#222', color:'#fff', border:'none', borderRadius:'10px', marginBottom:'20px'}}>ЯЗЫК: {lang}</button>
            <div style={{textAlign:'center', background:'#111', padding:'20px', borderRadius:'15px'}}>
               <p style={{fontSize:'12px', color:'#555', margin:0}}>CREATORS:</p>
               <a href="https://t.me/kriptoalians" target="_blank" style={{color:'var(--neon)', textDecoration:'none', fontWeight:'bold', fontSize:'18px'}}>@kriptoalians</a>
            </div>
          </div>
        )}
      </div>

      <nav className="nav">
        <button className={`nav-btn ${tab === 'mining' ? 'active' : ''}`} onClick={() => setTab('mining')}>МАЙНИНГ</button>
        <button className={`nav-btn ${tab === 'trade' ? 'active' : ''}`} onClick={() => setTab('trade')}>БИРЖА</button>
        <button className={`nav-btn ${tab === 'opts' ? 'active' : ''}`} onClick={() => setTab('opts')}>ОПЦИИ</button>
      </nav>
    </div>
  );
}
