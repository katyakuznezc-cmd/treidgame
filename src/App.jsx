import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const EXCHANGES = [
  { id: '1inch', name: '1inch', color: '#00ccff' },
  { id: 'uniswap', name: 'Uniswap v3', color: '#ff007a' },
  { id: 'sushiswap', name: 'SushiSwap', color: '#fa52a0' },
  { id: 'pancakeswap', name: 'PancakeSwap', color: '#d1884f' }
];

const ALL_COINS = [
  { id: 'TON', lvl: 1, base: 5.4 }, { id: 'ARB', lvl: 1, base: 1.1 },
  { id: 'DOGE', lvl: 2, base: 0.15 }, { id: 'MATIC', lvl: 3, base: 0.7 },
  { id: 'ETH', lvl: 4, base: 3400 }, { id: 'SOL', lvl: 5, base: 145 },
  { id: 'BNB', lvl: 8, base: 580 }, { id: 'BTC', lvl: 10, base: 67000 }
];

const ACHIEVEMENTS = [
  { id: 'first_k', title: 'Первый косарь', desc: 'Баланс $1,000', goal: 1000, type: 'balance', reward: 100 },
  { id: 'tapper_100', title: 'Кликер-про', desc: '100 тапов', goal: 100, type: 'taps', reward: 250 },
  { id: 'lvl_5', title: 'Эксперт', desc: 'Достигни 5 уровня', goal: 5, type: 'level', reward: 1000 },
  { id: 'whale', title: 'КИТ', desc: 'Баланс $100,000', goal: 100000, type: 'balance', reward: 5000 },
  { id: 'millionaire', title: 'Миллионер', desc: 'Баланс $1,000,000', goal: 1000000, type: 'balance', reward: 50000 }
];

export default function App() {
  // --- Состояния ---
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 100);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
  const [taps, setTaps] = useState(() => parseInt(localStorage.getItem('k_taps')) || 0);
  const [claimed, setClaimed] = useState(() => JSON.parse(localStorage.getItem('k_claimed') || '[]'));
  const [tradeLogs, setTradeLogs] = useState(() => JSON.parse(localStorage.getItem('k_logs') || '[]'));
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('k_tut_done'));
  const [tutStep, setTutStep] = useState(0);
  const [soundOn, setSoundOn] = useState(() => JSON.parse(localStorage.getItem('k_snd') ?? 'true'));
  const [tab, setTab] = useState('mining');
  const [selectedDex, setSelectedDex] = useState(null);
  const [activePositions, setActivePositions] = useState({});
  const [tradeAmount, setTradeAmount] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [signal, setSignal] = useState(null);
  const [livePrices, setLivePrices] = useState({});
  const [isGreedMode, setIsGreedMode] = useState(false);
  const [tapAnims, setTapAnims] = useState([]);

  const tapAudio = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));
  const currentLvl = Math.floor(Math.sqrt(xp / 50)) + 1;
  const maxLev = currentLvl >= 5 ? 100 : currentLvl >= 3 ? 50 : 10;

  // --- Эффекты сохранения ---
  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
    localStorage.setItem('k_taps', taps);
    localStorage.setItem('k_claimed', JSON.stringify(claimed));
    localStorage.setItem('k_logs', JSON.stringify(tradeLogs));
  }, [balance, xp, taps, claimed, tradeLogs]);

  // --- Логика Extreme Greed ---
  useEffect(() => {
    const itv = setInterval(() => {
      if (!isGreedMode && Math.random() > 0.85) {
        setIsGreedMode(true);
        setTimeout(() => setIsGreedMode(false), 25000);
      }
    }, 50000);
    return () => clearInterval(itv);
  }, [isGreedMode]);

  // --- Главный Таймер (Ликвидация и Выплаты) ---
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setActivePositions(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          const pos = next[id];
          if ((now - pos.startTime) / 1000 >= 120) {
            if (pos.status === 'closed') {
              setBalance(b => b + pos.finalAmount);
              setTradeLogs(l => [{id:Date.now(), coin:id, pnl:(pos.finalAmount-pos.margin).toFixed(2), isWin:pos.isWin, time:new Date().toLocaleTimeString().slice(0,5)}, ...l].slice(0,10));
              if (pos.isWin) setXp(x => x + 50);
            } else {
              setTradeLogs(l => [{id:Date.now(), coin:id, pnl:`-${pos.margin}`, isWin:false, time:'LIQ'}, ...l].slice(0,10));
            }
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [signal]);

  // --- Проверка достижений ---
  useEffect(() => {
    ACHIEVEMENTS.forEach(ach => {
      if (!claimed.includes(ach.id)) {
        const isDone = (ach.type === 'balance' && balance >= ach.goal) || 
                       (ach.type === 'taps' && taps >= ach.goal) || 
                       (ach.type === 'level' && currentLvl >= ach.goal);
        if (isDone) {
          setClaimed(p => [...p, ach.id]);
          setBalance(b => b + ach.reward);
        }
      }
    });
  }, [balance, taps, currentLvl, claimed]);

  // --- Геймплейные функции ---
  const handleTap = (e) => {
    setBalance(b => b + 0.1);
    setTaps(t => t + 1);
    if (soundOn) { tapAudio.current.currentTime = 0; tapAudio.current.play().catch(()=>{}); }
    const touch = e.touches ? e.touches[0] : e;
    const id = Date.now();
    setTapAnims(p => [...p, { id, x: touch.clientX, y: touch.clientY }]);
    setTimeout(() => setTapAnims(p => p.filter(a => a.id !== id)), 800);
  };

  const openPos = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (!amt || amt > balance) return;
    setBalance(b => b - amt);
    setActivePositions(p => ({ ...p, [coinId]: { margin: amt, lev: leverage, startTime: Date.now(), status: 'open' } }));
    setTradeAmount('');
  };

  const closePos = (coinId) => {
    const pos = activePositions[coinId];
    if (!pos || pos.status === 'closed') return;
    const isSignalMatch = signal && coinId === signal.coin && Date.now() < signal.expires;
    const failThreshold = isGreedMode ? 0.4 : 0.2;
    const isWin = isSignalMatch ? (Math.random() > failThreshold) : (Math.random() > 0.85);
    const mult = isGreedMode && isWin ? 2.5 : 1.0;
    const pnlPercent = ((isWin ? parseFloat(signal?.profit || 5) : -30) * mult) / 100;
    setActivePositions(p => ({ ...p, [coinId]: { ...pos, status: 'closed', finalAmount: Math.max(0, pos.margin + (pos.margin * pos.lev * pnlPercent)), isWin } }));
  };

  const shareResults = () => {
    const text = `Мой профит в KriptoAlians: $${balance.toFixed(0)}!\nИграй: https://t.me/kriptoalians`;
    navigator.clipboard.writeText(text);
    alert("Скопировано!");
  };

  return (
    <div className="app-container">
      {tapAnims.map(a => <div key={a.id} className="tap-dollar" style={{left:a.x, top:a.y}}>$</div>)}
      
      <header className="main-header">
        <div className="lvl-info"><span>LVL {currentLvl}</span><div className="xp-mini"><div className="xp-fill" style={{width:`${(xp%100)}%`}}></div></div></div>
        <div className="balance-box"><div className="bal-val">${balance.toLocaleString(undefined, {minimumFractionDigits:2})}</div></div>
      </header>

      <main className="content">
        {tab === 'mining' && (
          <div className="page-mining">
            <div className="tap-circle" onClick={handleTap}>$</div>
            <p className="neon-text">ТАПАЙ МОНЕТУ</p>
          </div>
        )}

        {tab === 'trade' && (
          <div className={`page-trade ${isGreedMode ? 'greed-bg' : ''}`}>
            {showTutorial && (
              <div className="tut-overlay">
                <div className="tut-card">
                  <h3>{["СИГНАЛЫ","АРБИТРАЖ","РИСКИ","ЛИКВИДАЦИЯ","ШАНСЫ"][tutStep]}</h3>
                  <p>{["Смотри на сигнал сверху!","Продавай на нужной бирже!","Плечо x100 только с LVL 5!","У тебя 120 секунд на сделку!","1 из 5 сделок - риск!"][tutStep]}</p>
                  <button onClick={() => tutStep < 4 ? setTutStep(s=>s+1) : (setShowTutorial(false), localStorage.setItem('k_tut_done','t'))}>ДАЛЕЕ</button>
                </div>
              </div>
            )}
            
            {!selectedDex ? (
              <div className="dex-list">
                {EXCHANGES.map(d => <div key={d.id} className="dex-card" onClick={()=>setSelectedDex(d.id)} style={{borderColor:d.color}}>{d.name}</div>)}
              </div>
            ) : (
              <div className={`dex-terminal ${isGreedMode ? 'greed-on' : ''}`}>
                {isGreedMode && <div className="greed-alert">🤑 EXTREME GREED: X2.5 PROFIT! 🤑</div>}
                <div className="term-top">
                  <button onClick={()=>setSelectedDex(null)} className="back-btn">←</button>
                  <input type="number" placeholder="USD" value={tradeAmount} onChange={e=>setTradeAmount(e.target.value)} />
                  <div className="lev-box">
                    <span>x{leverage}</span>
                    <input type="range" min="1" max={maxLev} value={leverage} onChange={e=>setLeverage(parseInt(e.target.value))} />
                  </div>
                </div>
                <div className="term-body">
                  <div className="coin-side">
                    {ALL_COINS.map(c => {
                      const pos = activePositions[c.id];
                      const tLeft = pos ? Math.max(0, 120 - Math.floor((Date.now()-pos.startTime)/1000)) : null;
                      return (
                        <div key={c.id} className={`coin-item ${pos?'active-pos':''}`}>
                          <div className="c-info">
                            <b>{c.id}</b>
                            {pos ? <small className="timer">⏳ {tLeft}s {pos.status==='closed'&&'| FIXED'}</small> : <small>$5.40</small>}
                          </div>
                          <button className={`btn-trade ${pos?.status}`} onClick={()=>pos?closePos(c.id):openPos(c.id)} disabled={pos?.status==='closed'}>
                            {pos ? (pos.status==='closed'?'WAIT':'CLOSE') : 'OPEN'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="orderbook-side">
                    <div className="diary-section">
                      <div className="diary-head"><span>ДНЕВНИК</span><button onClick={shareResults}>📢</button></div>
                      {tradeLogs.map(l=><div key={l.id} className="log-row"><span>{l.coin}</span><span className={l.isWin?'grn':'red'}>{l.isWin?'+':''}{l.pnl}$</span></div>)}
                    </div>
                  </div>
                </div>
                {signal && <div className="signal-mini">{signal.coin} ➔ {signal.sell} <b className="grn">+{signal.profit}%</b></div>}
              </div>
            )}
          </div>
        )}

        {tab === 'achievements' && (
          <div className="page-achievements">
            <h2 className="neon-text">🏆 ТРОФЕИ</h2>
            <div className="ach-grid">
              {ACHIEVEMENTS.map(a => (
                <div key={a.id} className={`ach-card ${claimed.includes(a.id)?'unlocked':''}`}>
                  <div className="ach-icon">{claimed.includes(a.id)?'✅':'🔒'}</div>
                  <div className="ach-info"><b>{a.title}</b><p>{a.desc}</p><span className="reward">+${a.reward}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button onClick={()=>setTab('mining')} className={tab==='mining'?'active':''}>КЛИК</button>
        <button onClick={()=>setTab('trade')} className={tab==='trade'?'active':''}>БИРЖИ</button>
        <button onClick={()=>setTab('achievements')} className={tab==='achievements'?'active':''}>ТРОФЕИ</button>
      </nav>
    </div>
  );
}
