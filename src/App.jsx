import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const EXCHANGES = [
  { id: '1inch', name: '1inch Network', color: '#00ccff' },
  { id: 'uniswap', name: 'Uniswap V3', color: '#ff007a' },
  { id: 'sushiswap', name: 'SushiSwap', color: '#fa52a0' },
  { id: 'pancakeswap', name: 'PancakeSwap', color: '#d1884f' }
];

const COINS = [
  { id: 'BTC', lvl: 10 }, { id: 'ETH', lvl: 5 }, { id: 'SOL', lvl: 3 },
  { id: 'TON', lvl: 1 }, { id: 'ARB', lvl: 1 }, { id: 'DOGE', lvl: 2 }
];

const STRINGS = {
  ru: {
    mining: "Майнинг", trade: "Биржи", awards: "Трофеи", opts: "Настройки",
    bal: "Баланс", lang: "Язык", sound: "Звук", liquid: "Ликв. через:",
    buy: "КУПИТЬ", close: "ЗАКРЫТЬ", history: "История",
    locked: "Lvl", settings: "Настройки системы", creators: "Создатели"
  },
  en: {
    mining: "Mining", trade: "Exchanges", awards: "Trophies", opts: "Settings",
    bal: "Balance", lang: "Language", sound: "Sound", liquid: "Liq. in:",
    buy: "BUY", close: "CLOSE", history: "History",
    locked: "Lvl", settings: "System Settings", creators: "Creators"
  }
};

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('k_lang') || 'ru');
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 1000);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
  const [tab, setTab] = useState('mining');
  const [selectedDex, setSelectedDex] = useState(null);
  const [activePositions, setActivePositions] = useState({});
  const [tradeAmount, setTradeAmount] = useState('100');
  const [leverage, setLeverage] = useState(1);
  const [signal, setSignal] = useState(null);
  const [soundOn, setSoundOn] = useState(() => JSON.parse(localStorage.getItem('k_snd') ?? 'true'));
  const [tapAnims, setTapAnims] = useState([]);

  const t = STRINGS[lang];
  const lvl = Math.floor(Math.sqrt(xp / 100)) + 1;
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : 10;

  const sndAlert = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));
  const sndTap = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
    localStorage.setItem('k_lang', lang);
    localStorage.setItem('k_snd', JSON.stringify(soundOn));
  }, [balance, xp, lang, soundOn]);

  // Генератор сигналов
  useEffect(() => {
    const triggerSignal = () => {
      const coin = COINS[Math.floor(Math.random() * COINS.length)];
      const dex = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      setSignal({ coin: coin.id, dexId: dex.id, dexName: dex.name, bonus: (Math.random() * 8 + 2).toFixed(1) });
      if (soundOn) sndAlert.current.play().catch(() => {});
    };
    triggerSignal();
    const itv = setInterval(triggerSignal, 30000);
    return () => clearInterval(itv);
  }, [soundOn]);

  // Ликвидация
  useEffect(() => {
    const timer = setInterval(() => {
      setActivePositions(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          const p = next[id];
          const left = 120 - Math.floor((Date.now() - p.start) / 1000);
          if (left <= 0) {
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
    setXp(x => x + 1);
    if (soundOn) { sndTap.current.currentTime = 0; sndTap.current.play().catch(()=>{}); }
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setTapAnims(p => [...p, { id, x: e.clientX || e.touches[0].clientX, y: e.clientY || e.touches[0].clientY }]);
    setTimeout(() => setTapAnims(p => p.filter(a => a.id !== id)), 800);
  };

  const openTrade = (coinId) => {
    if (parseFloat(tradeAmount) > balance) return;
    setBalance(b => b - parseFloat(tradeAmount));
    setActivePositions(p => ({ ...p, [coinId]: { amt: parseFloat(tradeAmount), lev: leverage, start: Date.now(), dex: selectedDex } }));
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const isWin = signal && signal.coin === coinId && signal.dexId === selectedDex;
    const pnl = isWin ? (Math.random() * 15 + 5) : -(Math.random() * 25 + 10);
    const result = p.amt + (p.amt * (p.lev * pnl) / 100);
    setBalance(b => b + result);
    setXp(x => x + 50);
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
  };

  return (
    <div className="app-shell">
      {tapAnims.map(a => <div key={a.id} className="tap-dollar" style={{left:a.x, top:a.y}}>$</div>)}

      <header className="main-header">
        <div className="header-stats">
          <div className="lvl-badge">LVL {lvl}</div>
          <div className="xp-bar"><div className="xp-progress" style={{width: `${xp%100}%`}}></div></div>
        </div>
        <div className="header-balance">
          <div className="bal-label">{t.bal}</div>
          <div className="bal-value">${balance.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
        </div>
      </header>

      <main className="main-view">
        {tab === 'mining' && (
          <div className="view-mining">
            <div className="tap-target" onClick={handleTap}>$</div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="view-trade">
            {!selectedDex ? (
              <div className="dex-list">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="dex-item" onClick={() => setSelectedDex(d.id)} style={{'--c': d.color}}>
                    <div className="dex-logo"></div>
                    <div className="dex-info">
                      <div className="dex-title">{d.name}</div>
                      <div className="dex-status">ONLINE</div>
                    </div>
                    {Object.values(activePositions).some(p => p.dex === d.id) && <div className="dex-indicator"></div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="terminal">
                {/* СИГНАЛ - ТЕПЕРЬ ОН ГЛАВНЫЙ */}
                <div className="terminal-signal-box">
                  <div className="sig-header">MARKET SIGNAL ⚡</div>
                  <div className="sig-body">
                    {signal.coin} / USDT → <span className="sig-dex">{signal.dexName}</span> 
                    <span className="sig-profit">+{signal.bonus}%</span>
                  </div>
                </div>

                <div className="terminal-top">
                  <button onClick={() => setSelectedDex(null)} className="btn-exit">←</button>
                  <div className="trade-params">
                    <input type="number" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} />
                    <div className="lev-slider">
                      <span>Leverage: x{leverage}</span>
                      <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(parseInt(e.target.value))} />
                    </div>
                  </div>
                </div>

                <div className="terminal-body">
                  <div className="pair-list">
                    {COINS.map(c => {
                      const p = activePositions[c.id];
                      return (
                        <div key={c.id} className={`pair-card ${p ? 'active' : ''} ${c.lvl > lvl ? 'locked' : ''}`}>
                          <div className="pair-main">
                            <span className="pair-name">{c.id}/USDT</span>
                            {p && <span className="pair-liq">{t.liquid} {120 - Math.floor((Date.now()-p.start)/1000)}s</span>}
                          </div>
                          {c.lvl <= lvl ? (
                            <button className={`pair-btn ${p ? 'close' : 'buy'}`} onClick={() => p ? closeTrade(c.id) : openTrade(c.id)}>
                              {p ? t.close : t.buy}
                            </button>
                          ) : <div className="pair-locked-msg">{t.locked} {c.lvl}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'awards' && (
          <div className="view-awards">
            <h2 className="section-title">{t.awards}</h2>
            <div className="award-row"><span>XP COLLECTED</span> <span>{xp}</span></div>
            <div className="award-row"><span>MAX LEVERAGE</span> <span>x{maxLev}</span></div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="view-settings">
            <h2 className="section-title">{t.settings}</h2>
            <div className="set-row">
              <span>{t.lang}</span>
              <button onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}>{lang.toUpperCase()}</button>
            </div>
            <div className="set-row">
              <span>{t.sound}</span>
              <button onClick={() => setSoundOn(!soundOn)}>{soundOn ? 'ON' : 'OFF'}</button>
            </div>
            <div className="creator-link">
              <a href="https://t.me/kriptoalians" target="_blank" rel="noreferrer">@kriptoalians</a>
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button onClick={() => setTab('mining')} className={tab === 'mining' ? 'active' : ''}>{t.mining}</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>{t.trade}</button>
        <button onClick={() => setTab('awards')} className={tab === 'awards' ? 'active' : ''}>{t.awards}</button>
        <button onClick={() => setTab('settings')} className={tab === 'settings' ? 'active' : ''}>{t.opts}</button>
      </nav>
    </div>
  );
}
