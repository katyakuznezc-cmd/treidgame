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
    bal: "БАЛАНС", lang: "ЯЗЫК", sound: "ЗВУК", liquid: "ЛИКВ.:",
    buy: "КУПИТЬ", close: "ПРОДАТЬ",
    locked: "НУЖЕН LVL", settings: "НАСТРОЙКИ", creators: "СОЗДАТЕЛИ"
  },
  en: {
    mining: "MINING", trade: "DEX", awards: "AWARDS", opts: "OPTS",
    bal: "BALANCE", lang: "LANG", sound: "SOUND", liquid: "LIQ:",
    buy: "BUY", close: "SELL",
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
  const lvl = Math.floor(Math.sqrt(xp / 150)) + 1; // Усложненная формула уровня
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : 10;

  const sndAlert = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));
  const sndTap = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
    localStorage.setItem('k_lang', lang);
    localStorage.setItem('k_snd', JSON.stringify(soundOn));
  }, [balance, xp, lang, soundOn]);

  // Глобальный сигнал (меняется каждые 30 сек)
  useEffect(() => {
    const triggerSignal = () => {
      const coin = COINS[Math.floor(Math.random() * COINS.length)];
      const dex = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      setSignal({ coin: coin.id, dexId: dex.id, dexName: dex.name, bonus: (Math.random() * 7 + 3).toFixed(1) });
      if (soundOn) sndAlert.current.play().catch(() => {});
    };
    triggerSignal();
    const itv = setInterval(triggerSignal, 30000);
    return () => clearInterval(itv);
  }, [soundOn]);

  const handleTap = (e) => {
    setBalance(b => b + 0.05);
    setXp(x => x + 0.5); // Мало опыта за клик
    if (soundOn) { sndTap.current.currentTime = 0; sndTap.current.play().catch(()=>{}); }
    const id = Date.now();
    setTapAnims(p => [...p, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setTapAnims(p => p.filter(a => a.id !== id)), 800);
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const isWin = signal && signal.coin === coinId && signal.dexId === selectedDex;
    const pnl = isWin ? (Math.random() * 8 + 4) : -(Math.random() * 15 + 10);
    const result = p.amt + (p.amt * (p.lev * pnl) / 100);
    setBalance(b => b + result);
    setXp(x => x + 15); // Усложненный набор опыта
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
  };

  return (
    <div className="app-container">
      {tapAnims.map(a => <div key={a.id} className="tap-pop" style={{left:a.x, top:a.y}}>$</div>)}

      <header className="app-header">
        <div className="header-user">
          <div className="user-lvl">LEVEL {lvl}</div>
          <div className="user-xp"><div className="xp-fill" style={{width: `${(xp % 150) / 1.5}%`}}></div></div>
        </div>
        <div className="user-bal">
          <small>{t.bal}</small>
          <div className="bal-amt">${balance.toFixed(2)}</div>
        </div>
      </header>

      <main className="app-viewport">
        {tab === 'mining' && (
          <div className="view-mining" onClick={handleTap}>
            <div className="mining-btn">$</div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="view-trade">
            {/* СИГНАЛ ВСЕГДА СВЕРХУ В ТАБЕ ТОРГОВЛИ */}
            {signal && (
              <div className="global-signal">
                <div className="sig-blink"></div>
                <div className="sig-txt">
                  BUY <b>{signal.coin}</b> → SELL ON <b>{signal.dexName}</b> <span className="sig-perc">+{signal.bonus}%</span>
                </div>
              </div>
            )}

            {!selectedDex ? (
              <div className="dex-selection">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="dex-row" onClick={() => setSelectedDex(d.id)} style={{'--clr': d.color}}>
                    <span className="dex-n">{d.name}</span>
                    <div className="dex-arrow">→</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dex-terminal">
                <div className="term-head">
                  <button onClick={() => setSelectedDex(null)} className="back-btn">←</button>
                  <div className="term-controls">
                    <input type="number" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} />
                    <div className="lev-box">
                      <span>x{leverage}</span>
                      <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(parseInt(e.target.value))} />
                    </div>
                  </div>
                </div>
                <div className="pair-scroll">
                  {COINS.map(c => {
                    const p = activePositions[c.id];
                    const locked = c.lvl > lvl;
                    return (
                      <div key={c.id} className={`pair-row ${p ? 'active' : ''}`}>
                        <div className="p-data">
                          <b>{c.id}/USDT</b>
                          {p && <span className="p-timer">{t.liquid} {120 - Math.floor((Date.now()-p.start)/1000)}s</span>}
                        </div>
                        {!locked ? (
                          <button className={`p-btn ${p ? 'sell' : 'buy'}`} onClick={() => p ? closeTrade(c.id) : (balance >= tradeAmount && setActivePositions({...activePositions, [c.id]: {amt: parseFloat(tradeAmount), lev: leverage, start: Date.now(), dex: selectedDex}}))}>
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
          <div className="view-awards">
            <h2 className="v-title">{t.awards}</h2>
            <div className="v-card"><span>PROGRESS</span> <b>{xp} XP</b></div>
            <div className="v-card"><span>TRADER CLASS</span> <b>{lvl}</b></div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="view-settings">
            <h2 className="v-title">{t.settings}</h2>
            <div className="set-item">
              <span>{t.lang}</span>
              <button onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}>{lang.toUpperCase()}</button>
            </div>
            <div className="set-item">
              <span>{t.sound}</span>
              <button onClick={() => setSoundOn(!soundOn)}>{soundOn ? 'ON' : 'OFF'}</button>
            </div>
            <div className="set-tg">
              <a href="https://t.me/kriptoalians" target="_blank" rel="noreferrer">@kriptoalians</a>
            </div>
          </div>
        )}
      </main>

      <nav className="app-nav">
        <button onClick={() => setTab('mining')} className={tab === 'mining' ? 'active' : ''}>{t.mining}</button>
        <button onClick={() => setTab('trade')} className={tab === 'trade' ? 'active' : ''}>{t.trade}</button>
        <button onClick={() => setTab('awards')} className={tab === 'awards' ? 'active' : ''}>{t.awards}</button>
        <button onClick={() => setTab('settings')} className={tab === 'settings' ? 'active' : ''}>{t.opts}</button>
      </nav>
    </div>
  );
}
