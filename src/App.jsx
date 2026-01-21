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
    mining: "Майнинг", trade: "Рынки", awards: "Награды", opts: "Опции",
    bal: "Баланс", lang: "Язык", sound: "Звук", liquid: "Ликвидация через",
    buy: "Купить", close: "Закрыть", signal: "СИГНАЛ", history: "История сделок",
    locked: "Нужен уровень", settings: "Настройки", creators: "Создатели"
  },
  en: {
    mining: "Mining", trade: "Markets", awards: "Awards", opts: "Options",
    bal: "Balance", lang: "Language", sound: "Sound", liquid: "Liquid. in",
    buy: "Buy", close: "Close", signal: "SIGNAL", history: "Trade History",
    locked: "Level required", settings: "Settings", creators: "Creators"
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
  const [isGreed, setIsGreed] = useState(false);
  const [logs, setLogs] = useState([]);
  const [soundOn, setSoundOn] = useState(() => JSON.parse(localStorage.getItem('k_snd') ?? 'true'));
  const [tapAnims, setTapAnims] = useState([]);

  const t = STRINGS[lang];
  const lvl = Math.floor(Math.sqrt(xp / 100)) + 1;
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : lvl >= 3 ? 20 : 10;

  const sndAlert = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));
  const sndTap = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
    localStorage.setItem('k_lang', lang);
    localStorage.setItem('k_snd', JSON.stringify(soundOn));
  }, [balance, xp, lang, soundOn]);

  // Система сигналов
  useEffect(() => {
    const triggerSignal = () => {
      const coin = COINS[Math.floor(Math.random() * COINS.length)];
      const dex = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      setSignal({ coin: coin.id, dex: dex.name, dexId: dex.id, bonus: (Math.random() * 5 + 3).toFixed(1) });
      if (soundOn) sndAlert.current.play().catch(() => {});
    };
    triggerSignal();
    const itv = setInterval(triggerSignal, 45000);
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
            setLogs(l => [{msg: `LIQ: ${id} -100%`, win: false}, ...l]);
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
    const touch = (e.touches && e.touches[0]) || e;
    const id = Date.now();
    setTapAnims(p => [...p, { id, x: touch.clientX, y: touch.clientY }]);
    setTimeout(() => setTapAnims(p => p.filter(a => a.id !== id)), 800);
  };

  const openTrade = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (amt > balance || amt <= 0) return;
    setBalance(b => b - amt);
    setActivePositions(p => ({ ...p, [coinId]: { amt, lev: leverage, start: Date.now(), dex: selectedDex } }));
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const isWin = signal && signal.coin === coinId && signal.dexId === selectedDex;
    const pnlBase = isWin ? (Math.random() * 10 + 5) : -(Math.random() * 20 + 15);
    const finalPnl = (p.amt * (p.lev * pnlBase) / 100);
    
    setBalance(b => b + p.amt + finalPnl);
    setXp(x => x + (isWin ? 100 : 20));
    setLogs(l => [{msg: `${coinId} ${finalPnl > 0 ? '+' : ''}${finalPnl.toFixed(2)}$`, win: finalPnl > 0}, ...l]);
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
  };

  return (
    <div className="exchange-app">
      {tapAnims.map(a => <div key={a.id} className="dollar-pop" style={{left:a.x, top:a.y}}>$</div>)}

      <header className="ex-header">
        <div className="ex-user">
          <div className="ex-lvl">LVL {lvl}</div>
          <div className="ex-xp-bar"><div className="ex-xp-fill" style={{width: `${xp%100}%`}}></div></div>
        </div>
        <div className="ex-balance">
          <small>{t.bal}</small>
          <div className="ex-val">${balance.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
        </div>
      </header>

      <main className="ex-content">
        {tab === 'mining' && (
          <div className="ex-mining">
            <div className="coin-sphere" onClick={handleTap}>$</div>
            <p className="hint-text">TAP TO EARN</p>
          </div>
        )}

        {tab === 'trade' && (
          <div className="ex-trade">
            {!selectedDex ? (
              <div className="dex-grid">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="dex-card" onClick={() => setSelectedDex(d.id)}>
                    <div className="dex-brand" style={{background: d.color}}></div>
                    <span className="dex-name">{d.name}</span>
                    {Object.values(activePositions).some(p => p.dex === d.id) && <div className="ex-dot"></div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="trading-terminal">
                <div className="term-nav">
                  <button onClick={() => setSelectedDex(null)} className="btn-back">←</button>
                  <div className="term-form">
                    <input type="number" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} />
                    <div className="lev-group">
                      <span>x{leverage} Leverage</span>
                      <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(parseInt(e.target.value))} />
                    </div>
                  </div>
                </div>

                <div className="term-body">
                  <div className="market-list">
                    {COINS.map(c => {
                      const p = activePositions[c.id];
                      const locked = c.lvl > lvl;
                      return (
                        <div key={c.id} className="market-row">
                          <div className="m-info">
                            <span className="m-sym">{c.id}/USD</span>
                            {p && <span className="m-timer">{t.liquid} {120 - Math.floor((Date.now()-p.start)/1000)}s</span>}
                          </div>
                          {!locked ? (
                            <button className={`m-btn ${p ? 'close' : 'buy'}`} onClick={() => p ? closeTrade(c.id) : openTrade(c.id)}>
                              {p ? t.close : t.buy}
                            </button>
                          ) : <span className="m-lock">{t.locked} {c.lvl}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="history-list">
                    <div className="h-title">{t.history}</div>
                    {logs.map((l, i) => <div key={i} className={`h-item ${l.win ? 'up' : 'down'}`}>{l.msg}</div>)}
                  </div>
                </div>
                {signal && (
                  <div className="signal-banner">
                    {t.signal}: {signal.coin} ➔ {signal.dex} <span className="up">+{signal.bonus}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'awards' && (
          <div className="ex-awards">
            <h2>{t.awards}</h2>
            <div className="award-item"><span>TRADER RANK</span> <b>{lvl}</b></div>
            <div className="award-item"><span>TOTAL XP</span> <b>{xp}</b></div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="ex-settings">
            <h2>{t.settings}</h2>
            <div className="set-row">
              <span>{t.lang}</span>
              <button onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}>{lang.toUpperCase()}</button>
            </div>
            <div className="set-row">
              <span>{t.sound}</span>
              <button onClick={() => setSoundOn(!soundOn)}>{soundOn ? 'ON' : 'OFF'}</button>
            </div>
            <div className="set-footer">
              <a href="https://t.me/kriptoalians" target="_blank" rel="noreferrer">@kriptoalians</a>
            </div>
          </div>
        )}
      </main>

      <nav className="ex-nav">
        <button onClick={() => setTab('mining')} className={tab === 'mining' ? 'active' : ''}>{t.mining}</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>{t.trade}</button>
        <button onClick={() => setTab('awards')} className={tab === 'awards' ? 'active' : ''}>{t.awards}</button>
        <button onClick={() => setTab('settings')} className={tab === 'settings' ? 'active' : ''}>{t.opts}</button>
      </nav>
    </div>
  );
}
