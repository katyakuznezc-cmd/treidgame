import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const EXCHANGES = [
  { id: '1inch', name: '1INCH', color: '#00ccff' },
  { id: 'uniswap', name: 'UNISWAP', color: '#ff007a' },
  { id: 'sushiswap', name: 'SUSHI', color: '#fa52a0' },
  { id: 'pancakeswap', name: 'PANCAKE', color: '#d1884f' }
];

const COINS = [
  { id: 'BTC', lvl: 10 }, { id: 'ETH', lvl: 5 }, { id: 'SOL', lvl: 3 },
  { id: 'TON', lvl: 1 }, { id: 'ARB', lvl: 1 }, { id: 'DOGE', lvl: 1 }
];

const STRINGS = {
  ru: {
    mining: "МАЙНИНГ", trade: "БИРЖИ", awards: "ТРОФЕИ", opts: "ОПЦИИ",
    bal: "БАЛАНС", lang: "ЯЗЫК", sound: "ЗВУК", liquid: "ЛИКВ.:",
    buy: "КУПИТЬ", close: "ПРОДАТЬ", history: "ЛОГИ",
    locked: "НУЖЕН LVL", settings: "НАСТРОЙКИ", creators: "СОЗДАТЕЛИ"
  },
  en: {
    mining: "MINING", trade: "DEX", awards: "AWARDS", opts: "OPTS",
    bal: "BALANCE", lang: "LANG", sound: "SOUND", liquid: "LIQ:",
    buy: "BUY", close: "SELL", history: "LOGS",
    locked: "REQ LVL", settings: "SETTINGS", creators: "CREATORS"
  }
};

export default function App() {
  // --- СОСТОЯНИЕ (Берем из LocalStorage) ---
  const [lang, setLang] = useState(() => localStorage.getItem('k_lang') || 'ru');
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 100);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
  const [tab, setTab] = useState('mining');
  const [selectedDex, setSelectedDex] = useState(null);
  const [activePositions, setActivePositions] = useState({});
  const [tradeAmount, setTradeAmount] = useState('10');
  const [leverage, setLeverage] = useState(1);
  const [signal, setSignal] = useState(null);
  const [logs, setLogs] = useState([]);
  const [soundOn, setSoundOn] = useState(() => JSON.parse(localStorage.getItem('k_snd') ?? 'true'));
  const [tapAnims, setTapAnims] = useState([]);

  const t = STRINGS[lang];
  const lvl = Math.floor(Math.sqrt(xp / 150)) + 1; // Хардкорная формула уровня
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : 10;

  const sndAlert = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));
  const sndTap = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));

  // --- СОХРАНЕНИЕ ДАННЫХ ---
  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
    localStorage.setItem('k_lang', lang);
    localStorage.setItem('k_snd', JSON.stringify(soundOn));
  }, [balance, xp, lang, soundOn]);

  // --- УМНЫЙ ГЕНЕРАТОР СИГНАЛОВ (Только доступные монеты) ---
  useEffect(() => {
    const triggerSignal = () => {
      const availableCoins = COINS.filter(c => c.lvl <= lvl);
      const coin = availableCoins[Math.floor(Math.random() * availableCoins.length)];
      const dex = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      
      setSignal({ 
        coin: coin.id, 
        dexId: dex.id, 
        dexName: dex.name, 
        bonus: (Math.random() * 8 + 4).toFixed(1) 
      });
      if (soundOn) sndAlert.current.play().catch(() => {});
    };
    triggerSignal();
    const itv = setInterval(triggerSignal, 30000);
    return () => clearInterval(itv);
  }, [soundOn, lvl]);

  // --- ЛОГИКА ЛИКВИДАЦИИ ---
  useEffect(() => {
    const timer = setInterval(() => {
      setActivePositions(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          if (120 - Math.floor((Date.now() - next[id].start) / 1000) <= 0) {
            setLogs(l => [{msg: `LIQ: ${id} -100%`, win: false}, ...l.slice(0, 9)]);
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- МАЙНИНГ (TAP) ---
  const handleTap = (e) => {
    setBalance(b => b + 0.1);
    setXp(x => x + 0.5); // Мало опыта за клик
    if (soundOn) { sndTap.current.currentTime = 0; sndTap.current.play().catch(()=>{}); }
    const id = Date.now();
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    setTapAnims(p => [...p, { id, x, y }]);
    setTimeout(() => setTapAnims(p => p.filter(a => a.id !== id)), 800);
  };

  // --- ТОРГОВЛЯ ---
  const openTrade = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (amt > balance || amt <= 0) return;
    setBalance(b => b - amt);
    setActivePositions(p => ({ ...p, [coinId]: { amt, lev: leverage, start: Date.now(), dex: selectedDex } }));
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const isWin = signal && signal.coin === coinId && signal.dexId === selectedDex;
    const pnlPerc = isWin ? (Math.random() * 10 + 5) : -(Math.random() * 20 + 15);
    const profit = (p.amt * (p.lev * pnlPerc) / 100);
    
    setBalance(b => b + p.amt + profit);
    setXp(x => x + 20); // Средний опыт за торговлю
    setLogs(l => [{msg: `${coinId} ${profit > 0 ? '+' : ''}${profit.toFixed(2)}$`, win: profit > 0}, ...l.slice(0, 9)]);
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
  };

  return (
    <div className="neon-wrapper">
      {tapAnims.map(a => <div key={a.id} className="tap-dollar" style={{left:a.x, top:a.y}}>$</div>)}

      <header className="neon-header">
        <div className="user-info">
          <div className="lvl-tag">LVL {lvl}</div>
          <div className="xp-container"><div className="xp-bar" style={{width: `${(xp % 150) / 1.5}%`}}></div></div>
        </div>
        <div className="balance-info">
          <small>{t.bal}</small>
          <div className="balance-val">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
        </div>
      </header>

      <main className="neon-content">
        {tab === 'mining' && (
          <div className="mining-screen" onClick={handleTap}>
            <div className="mining-core">$</div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="trade-screen">
            {signal && (
              <div className="global-signal-alert">
                <div className="sig-pulse"></div>
                <div className="sig-text">
                   BUY <b>{signal.coin}</b> → SELL ON <b>{signal.dexName}</b> <span className="sig-perc">+{signal.bonus}%</span>
                </div>
              </div>
            )}

            {!selectedDex ? (
              <div className="dex-grid">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="dex-card" onClick={() => setSelectedDex(d.id)} style={{'--clr': d.color}}>
                    <span className="dex-name">{d.name}</span>
                    <div className="dex-meta">
                      {Object.values(activePositions).some(p => p.dex === d.id) && <div className="active-dot"></div>}
                      <span>LIVE</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="terminal-view">
                <div className="term-nav">
                  <button onClick={() => setSelectedDex(null)} className="back-button">←</button>
                  <div className="term-inputs">
                    <input type="number" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} />
                    <div className="lev-box">
                      <span>LEV x{leverage}</span>
                      <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(parseInt(e.target.value))} />
                    </div>
                  </div>
                </div>

                <div className="pair-list">
                  {COINS.map(c => {
                    const p = activePositions[c.id];
                    const locked = c.lvl > lvl;
                    return (
                      <div key={c.id} className={`pair-row ${p ? 'in-trade' : ''}`}>
                        <div className="p-info">
                          <span className="p-sym">{c.id}/USDT</span>
                          {p && <span className="p-liq">{t.liquid} {120 - Math.floor((Date.now()-p.start)/1000)}s</span>}
                        </div>
                        {!locked ? (
                          <button className={`p-action ${p ? 'sell' : 'buy'}`} onClick={() => p ? closeTrade(c.id) : openTrade(c.id)}>
                            {p ? t.close : t.buy}
                          </button>
                        ) : <div className="p-lock">{t.locked} {c.lvl}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'awards' && (
          <div className="awards-screen">
            <h2 className="title">{t.awards}</h2>
            <div className="stat-card"><span>TOTAL EXPERIENCE</span> <b>{xp} XP</b></div>
            <div className="stat-card"><span>MAX LEVERAGE</span> <b>x{maxLev}</b></div>
            <div className="history-box">
               <div className="hist-title">{t.history}</div>
               {logs.map((l, i) => <div key={i} className={`hist-item ${l.win ? 'win' : 'loss'}`}>{l.msg}</div>)}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="settings-screen">
            <h2 className="title">{t.settings}</h2>
            <div className="set-row">
              <span>{t.lang}</span>
              <button onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}>{lang.toUpperCase()}</button>
            </div>
            <div className="set-row">
              <span>{t.sound}</span>
              <button onClick={() => setSoundOn(!soundOn)}>{soundOn ? 'ON' : 'OFF'}</button>
            </div>
            <div className="creators">
              <a href="https://t.me/kriptoalians" target="_blank" rel="noreferrer">@kriptoalians</a>
            </div>
          </div>
        )}
      </main>

      <nav className="neon-nav">
        <button onClick={() => setTab('mining')} className={tab === 'mining' ? 'active' : ''}>{t.mining}</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>{t.trade}</button>
        <button onClick={() => setTab('awards')} className={tab === 'awards' ? 'active' : ''}>{t.awards}</button>
        <button onClick={() => setTab('settings')} className={tab === 'settings' ? 'active' : ''}>{t.opts}</button>
      </nav>
    </div>
  );
}
