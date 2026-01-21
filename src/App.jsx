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
  { id: 'TON', lvl: 1 }, { id: 'ARB', lvl: 1 }, { id: 'DOGE', lvl: 2 }
];

const STRINGS = {
  ru: {
    mining: "МАЙНИНГ", trade: "БИРЖИ", awards: "ТРОФЕИ", opts: "ОПЦИИ",
    bal: "БАЛАНС", lang: "ЯЗЫК", sound: "ЗВУК", liquid: "ЛИКВИДАЦИЯ:",
    buy: "КУПИТЬ", close: "ПРОДАТЬ", history: "ЛОГИ",
    locked: "НУЖЕН LVL", settings: "НАСТРОЙКИ", creators: "СОЗДАТЕЛИ"
  },
  en: {
    mining: "MINING", trade: "DEX", awards: "AWARDS", opts: "OPTS",
    bal: "BALANCE", lang: "LANG", sound: "SOUND", liquid: "LIQ IN:",
    buy: "BUY", close: "SELL", history: "LOGS",
    locked: "REQ LVL", settings: "SETTINGS", creators: "CREATORS"
  }
};

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('k_lang') || 'ru');
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 100);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
  const [tab, setTab] = useState('mining');
  const [selectedDex, setSelectedDex] = useState(null);
  const [activePositions, setActivePositions] = useState({});
  const [tradeAmount, setTradeAmount] = useState('10');
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

  useEffect(() => {
    const triggerSignal = () => {
      const coin = COINS[Math.floor(Math.random() * COINS.length)];
      const dex = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      setSignal({ coin: coin.id, dexId: dex.id, dexName: dex.name, bonus: (Math.random() * 8 + 5).toFixed(1) });
      if (soundOn) sndAlert.current.play().catch(() => {});
    };
    triggerSignal();
    const itv = setInterval(triggerSignal, 35000);
    return () => clearInterval(itv);
  }, [soundOn]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePositions(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          if (120 - Math.floor((Date.now() - next[id].start) / 1000) <= 0) {
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
    setBalance(b => b + 0.1);
    setXp(x => x + 1);
    if (soundOn) { sndTap.current.currentTime = 0; sndTap.current.play().catch(()=>{}); }
    const id = Date.now();
    setTapAnims(p => [...p, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setTapAnims(p => p.filter(a => a.id !== id)), 800);
  };

  const openTrade = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (amt > balance) return;
    setBalance(b => b - amt);
    setActivePositions(p => ({ ...p, [coinId]: { amt, lev: leverage, start: Date.now(), dex: selectedDex } }));
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const isWin = signal && signal.coin === coinId && signal.dexId === selectedDex;
    const pnl = isWin ? (Math.random() * 10 + 5) : -(Math.random() * 20 + 10);
    const result = p.amt + (p.amt * (p.lev * pnl) / 100);
    setBalance(b => b + result);
    setXp(x => x + 100); // Опыт за торговлю!
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
  };

  return (
    <div className="neon-app">
      {tapAnims.map(a => <div key={a.id} className="pop-money" style={{left:a.x, top:a.y}}>$</div>)}

      <header className="neon-header">
        <div className="n-user">
          <div className="n-lvl">LVL {lvl}</div>
          <div className="n-xp"><div className="n-xp-f" style={{width: `${xp%100}%`}}></div></div>
        </div>
        <div className="n-bal">
          <small>{t.bal}</small>
          <div>${balance.toFixed(2)}</div>
        </div>
      </header>

      <main className="neon-main">
        {tab === 'mining' && (
          <div className="n-mining" onClick={handleTap}>
            <div className="n-sphere">$</div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="n-trade">
            {!selectedDex ? (
              <div className="n-dex-list">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="n-dex-card" onClick={() => setSelectedDex(d.id)} style={{'--c': d.color}}>
                    <span>{d.name}</span>
                    {Object.values(activePositions).some(p => p.dex === d.id) && <div className="n-dot"></div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="n-terminal">
                <div className="n-signal-alert">
                  <div className="sig-label">⚡ SIGNAL DETECTED</div>
                  <div className="sig-info">
                    BUY <b>{signal.coin}</b> → SELL ON <b>{signal.dexName}</b> <span className="sig-plus">+{signal.bonus}%</span>
                  </div>
                </div>

                <div className="n-term-top">
                  <button onClick={() => setSelectedDex(null)} className="n-back-btn">←</button>
                  <div className="n-params">
                    <input type="number" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} />
                    <div className="n-lev">
                      <span>x{leverage}</span>
                      <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(parseInt(e.target.value))} />
                    </div>
                  </div>
                </div>

                <div className="n-pair-list">
                  {COINS.map(c => {
                    const p = activePositions[c.id];
                    const locked = c.lvl > lvl;
                    return (
                      <div key={c.id} className={`n-row ${p ? 'active' : ''}`}>
                        <div className="n-row-info">
                          <b>{c.id}/USDT</b>
                          {p && <span className="n-liq">{t.liquid} {120 - Math.floor((Date.now()-p.start)/1000)}s</span>}
                        </div>
                        {!locked ? (
                          <button className={`n-btn ${p ? 'sell' : 'buy'}`} onClick={() => p ? closeTrade(c.id) : openTrade(c.id)}>
                            {p ? t.close : t.buy}
                          </button>
                        ) : <span className="n-lock">{t.locked} {c.lvl}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'awards' && (
          <div className="n-awards">
            <h2 className="n-title">{t.awards}</h2>
            <div className="n-ach"><span>TOTAL XP</span> <b>{xp}</b></div>
            <div className="n-ach"><span>MAX LEV</span> <b>x{maxLev}</b></div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="n-settings">
            <h2 className="n-title">{t.settings}</h2>
            <div className="n-set-row">
              <span>{t.lang}</span>
              <button onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}>{lang.toUpperCase()}</button>
            </div>
            <div className="n-set-row">
              <span>{t.sound}</span>
              <button onClick={() => setSoundOn(!soundOn)}>{soundOn ? 'ON' : 'OFF'}</button>
            </div>
            <div className="n-creators">
              <a href="https://t.me/kriptoalians" target="_blank" rel="noreferrer">@kriptoalians</a>
            </div>
          </div>
        )}
      </main>

      <nav className="n-nav">
        <button onClick={() => setTab('mining')} className={tab === 'mining' ? 'active' : ''}>{t.mining}</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>{t.trade}</button>
        <button onClick={() => setTab('awards')} className={tab === 'awards' ? 'active' : ''}>{t.awards}</button>
        <button onClick={() => setTab('settings')} className={tab === 'settings' ? 'active' : ''}>{t.opts}</button>
      </nav>
    </div>
  );
}
