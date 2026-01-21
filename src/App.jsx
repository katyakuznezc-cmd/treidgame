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

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 100);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
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
  const [isGreedMode, setIsGreedMode] = useState(false);
  const [tapAnims, setTapAnims] = useState([]);

  const tapAudio = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));
  const signalAudio = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  const currentLvl = Math.floor(Math.sqrt(xp / 50)) + 1;
  const maxLev = currentLvl >= 5 ? 100 : currentLvl >= 3 ? 50 : 10;

  useEffect(() => {
    localStorage.setItem('k_bal', balance.toString());
    localStorage.setItem('k_xp', xp.toString());
    localStorage.setItem('k_logs', JSON.stringify(tradeLogs));
    localStorage.setItem('k_snd', JSON.stringify(soundOn));
  }, [balance, xp, tradeLogs, soundOn]);

  useEffect(() => {
    const genS = () => {
      const available = ALL_COINS.filter(c => c.lvl <= currentLvl);
      const coin = available[Math.floor(Math.random() * available.length)];
      setSignal({ 
        coin: coin.id, 
        sell: EXCHANGES[Math.floor(Math.random()*4)].id, 
        profit: (Math.random()*2+5).toFixed(2), 
        expires: Date.now() + 120000 
      });
      if (soundOn && tab === 'trade') {
        signalAudio.current.currentTime = 0;
        signalAudio.current.play().catch(() => {});
      }
    };
    genS();
    const itv = setInterval(genS, 120000);
    return () => clearInterval(itv);
  }, [currentLvl, soundOn, tab]);

  useEffect(() => {
    const itv = setInterval(() => {
      if (!isGreedMode && Math.random() > 0.8) {
        setIsGreedMode(true);
        setTimeout(() => setIsGreedMode(false), 20000);
      }
    }, 45000);
    return () => clearInterval(itv);
  }, [isGreedMode]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePositions(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          const pos = next[id];
          if ((Date.now() - pos.startTime) / 1000 >= 120) {
            if (pos.status === 'closed') {
              setBalance(b => b + pos.finalAmount);
              setTradeLogs(l => [{id:Date.now(), coin:id, pnl:(pos.finalAmount-pos.margin).toFixed(2), isWin:pos.isWin}, ...l].slice(0,10));
              if (pos.isWin) setXp(x => x + 50);
            }
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTap = (e) => {
    setBalance(b => b + 1);
    if (soundOn) { tapAudio.current.currentTime = 0; tapAudio.current.play().catch(()=>{}); }
    const touch = (e.touches && e.touches[0]) || e;
    const id = Date.now();
    setTapAnims(p => [...p, { id, x: touch.clientX, y: touch.clientY }]);
    setTimeout(() => setTapAnims(p => p.filter(a => a.id !== id)), 800);
  };

  const openPos = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (!amt || amt > balance) return;
    setBalance(b => b - amt);
    setActivePositions(p => ({ 
      ...p, 
      [coinId]: { margin: amt, lev: leverage, startTime: Date.now(), status: 'open', dexId: selectedDex } 
    }));
    setTradeAmount('');
  };

  const closePos = (coinId) => {
    const pos = activePositions[coinId];
    if (!pos || pos.status === 'closed') return;
    const isWin = signal && coinId === signal.coin && selectedDex === signal.sell;
    const mult = (isGreedMode && isWin) ? 2.5 : 1.0;
    const pnl = ((isWin ? 15 : -40) * mult) / 100;
    setActivePositions(p => ({ 
      ...p, 
      [coinId]: { ...pos, status: 'closed', finalAmount: Math.max(0, pos.margin + (pos.margin * pos.lev * pnl)), isWin } 
    }));
  };

  return (
    <div className="app">
      {tapAnims.map(a => <div key={a.id} className="tap-anim" style={{left:a.x, top:a.y}}>$</div>)}

      <header className="header">
        <div className="stats">
          <small>LVL {currentLvl}</small>
          <div className="xp-bar"><div className="xp-fill" style={{width: (xp%100)+'%'}} /></div>
        </div>
        <div className="balance">${balance.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
      </header>

      <main className="main">
        {tab === 'mining' && (
          <div className="page-mining">
            <div className="coin-btn" onClick={handleTap}>$</div>
            <p className="neon-text">ТАПАЙ МОНЕТУ</p>
          </div>
        )}

        {tab === 'trade' && (
          <div className={`page-trade ${isGreedMode ? 'greed-bg' : ''}`}>
            {showTutorial && (
              <div className="tut-overlay">
                <div className="tut-card">
                  <h3>{["СИГНАЛЫ","ТОЧКИ","ВРЕМЯ"][tutStep]}</h3>
                  <p>{["Читай сигнал внизу — там ключ к прибыли!","Красная точка мигает там, где открыта сделка.","У тебя всего 2 минуты, чтобы закрыть позицию!"][tutStep]}</p>
                  <button onClick={() => tutStep < 2 ? setTutStep(s=>s+1) : (setShowTutorial(false), localStorage.setItem('k_tut_done','t'))}>ДАЛЕЕ</button>
                </div>
              </div>
            )}

            {!selectedDex ? (
              <div className="dex-grid">
                {EXCHANGES.map(d => {
                  const hasPos = Object.values(activePositions).some(p => p.dexId === d.id);
                  return (
                    <div key={d.id} className="dex-card" style={{borderColor: d.color}} onClick={()=>setSelectedDex(d.id)}>
                      {d.name}
                      {hasPos && <div className="red-dot" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="terminal">
                {isGreedMode && <div className="greed-alert">EXTREME GREED ACTIVE: X2.5 PROFIT</div>}
                <div className="term-nav">
                  <button onClick={()=>setSelectedDex(null)}>←</button>
                  <input type="number" placeholder="USD" value={tradeAmount} onChange={e=>setTradeAmount(e.target.value)} />
                  <div className="lev-control">
                    <span>x{leverage}</span>
                    <input type="range" min="1" max={maxLev} value={leverage} onChange={e=>setLeverage(parseInt(e.target.value))} />
                  </div>
                </div>
                <div className="term-content">
                  <div className="coin-list">
                    {ALL_COINS.map(c => {
                      const pos = activePositions[c.id];
                      return (
                        <div key={c.id} className={`coin-row ${pos ? 'active' : ''}`}>
                          <div className="c-name">{c.id} {pos && <small>{120 - Math.floor((Date.now()-pos.startTime)/1000)}s</small>}</div>
                          <button className={`trade-btn ${pos?.status}`} onClick={()=>pos?closePos(c.id):openPos(c.id)} disabled={pos?.status==='closed'}>
                            {pos ? (pos.status==='closed' ? 'FIXED' : 'CLOSE') : 'OPEN'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="diary">
                    <small>LOGS</small>
                    {tradeLogs.map(l => <div key={l.id} className={l.isWin?'win':'loss'}>{l.coin} {l.pnl}$</div>)}
                  </div>
                </div>
                {signal && <div className="signal-bar">{signal.coin} ➔ {signal.sell} <span className="win">+{signal.profit}%</span></div>}
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="page-settings">
            <h2>НАСТРОЙКИ</h2>
            <div className="setting-row">
              <span>ЗВУКОВЫЕ ЭФФЕКТЫ</span>
              <button onClick={()=>setSoundOn(!soundOn)}>{soundOn ? 'ВКЛ' : 'ВЫКЛ'}</button>
            </div>
            <a href="https://t.me/kriptoalians" target="_blank" className="tg-link">НАШ ТЕЛЕГРАМ: @kriptoalians</a>
          </div>
        )}
      </main>

      <nav className="nav-bar">
        <button onClick={()=>setTab('mining')} className={tab==='mining'?'active':''}>КЛИК</button>
        <button onClick={()=>setTab('trade')} className={tab==='trade'?'active':''}>БИРЖИ</button>
        <button onClick={()=>setTab('settings')} className={tab==='settings'?'active':''}>ОПЦИИ</button>
      </nav>
    </div>
  );
}
