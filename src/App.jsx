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
    mining: "МАЙНИНГ", trade: "БИРЖИ", awards: "ЛОГИ", opts: "ОПЦИИ",
    bal: "БАЛАНС", liquid: "ЛИКВИДАЦИЯ:", buy: "КУПИТЬ", close: "ЗАКРЫТЬ",
    profit: "ПРОФИТ", live: "ЖИВАЯ ЛЕНТА", creators: "СОЗДАТЕЛИ"
  },
  en: {
    mining: "MINING", trade: "DEX", awards: "LOGS", opts: "OPTS",
    bal: "BALANCE", liquid: "LIQ IN:", buy: "BUY", close: "CLOSE",
    profit: "PROFIT", live: "LIVE FEED", creators: "CREATORS"
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
  const [history, setHistory] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);
  const [soundOn, setSoundOn] = useState(() => JSON.parse(localStorage.getItem('k_snd') ?? 'true'));
  const [tapAnims, setTapAnims] = useState([]);

  const t = STRINGS[lang];
  const lvl = Math.floor(Math.sqrt(xp / 150)) + 1;
  const maxLev = lvl >= 10 ? 100 : lvl >= 5 ? 50 : 10;

  const sndAlert = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));
  const sndTap = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_xp', xp);
    localStorage.setItem('k_lang', lang);
    localStorage.setItem('k_snd', JSON.stringify(soundOn));
  }, [balance, xp, lang, soundOn]);

  // Живая лента трафика
  useEffect(() => {
    const itv = setInterval(() => {
      const coin = COINS[Math.floor(Math.random() * COINS.length)].id;
      const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
      const amt = (Math.random() * 500).toFixed(2);
      const newAction = { id: Date.now(), text: `${type} ${coin} $${amt}`, type };
      setLiveFeed(prev => [newAction, ...prev.slice(0, 5)]);
    }, 3000);
    return () => clearInterval(itv);
  }, []);

  // Генератор сигналов (Арбитраж)
  useEffect(() => {
    const triggerSignal = () => {
      const available = COINS.filter(c => c.lvl <= lvl);
      const coin = available[Math.floor(Math.random() * available.length)];
      const d1 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      let d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      while(d2.id === d1.id) d2 = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      
      setSignal({ coin: coin.id, buyDex: d1.name, sellDexId: d2.id, sellDexName: d2.name, bonus: (Math.random() * 10 + 5).toFixed(1) });
      if (soundOn) sndAlert.current.play().catch(() => {});
    };
    triggerSignal();
    const sItv = setInterval(triggerSignal, 30000);
    return () => clearInterval(sItv);
  }, [lvl, soundOn]);

  // Таймер ликвидации и расчет профита
  useEffect(() => {
    const tItv = setInterval(() => {
      setActivePositions(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(coinId => {
          const pos = next[coinId];
          const elapsed = Math.floor((Date.now() - pos.start) / 1000);
          if (elapsed >= 120) {
            setHistory(h => [{ coin: coinId, pnl: -pos.amt, win: false }, ...h]);
            delete next[coinId];
            changed = true;
          } else {
            // Динамическое изменение профита в реальном времени
            const isWin = signal && signal.coin === coinId && signal.sellDexId === pos.dex;
            const basePnl = isWin ? parseFloat(signal.bonus) : -15;
            const drift = (Math.sin(Date.now() / 1000) * 2); // Имитация движения цены
            next[coinId].currentPnl = ((pos.amt * (pos.lev * (basePnl + drift)) / 100)).toFixed(2);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(tItv);
  }, [signal]);

  const handleTap = (e) => {
    setBalance(b => b + 0.1); setXp(x => x + 1);
    if (soundOn) { sndTap.current.currentTime = 0; sndTap.current.play().catch(()=>{}); }
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setTapAnims(p => [...p, { id, x: e.clientX || e.touches[0].clientX, y: e.clientY || e.touches[0].clientY }]);
    setTimeout(() => setTapAnims(p => p.filter(a => a.id !== id)), 800);
  };

  const openTrade = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (amt > balance) return;
    setBalance(b => b - amt);
    setActivePositions(p => ({ ...p, [coinId]: { amt, lev: leverage, start: Date.now(), dex: selectedDex, currentPnl: 0 } }));
  };

  const closeTrade = (coinId) => {
    const p = activePositions[coinId];
    const finalPnl = parseFloat(p.currentPnl);
    setBalance(b => b + p.amt + finalPnl);
    setXp(x => x + 50);
    setHistory(h => [{ coin: coinId, pnl: finalPnl, win: finalPnl > 0 }, ...h]);
    setActivePositions(prev => { const n = {...prev}; delete n[coinId]; return n; });
  };

  return (
    <div className="app-neon">
      {tapAnims.map(a => <div key={a.id} className="tap-pop" style={{left:a.x, top:a.y}}>$</div>)}
      
      <header className="n-header">
        <div className="n-stats">
          <div className="n-lvl">LVL {lvl}</div>
          <div className="n-xp-w"><div className="n-xp-f" style={{width: `${(xp % 150)/1.5}%`}}></div></div>
        </div>
        <div className="n-balance">
          <small>{t.bal}</small>
          <div className="n-money">${balance.toFixed(2)}</div>
        </div>
      </header>

      <main className="n-viewport">
        {tab === 'mining' && (
          <div className="n-mining-view">
            <div className="n-sphere" onClick={handleTap}>$</div>
            <div className="n-live-feed">
              <div className="n-live-title">{t.live}</div>
              {liveFeed.map(f => (
                <div key={f.id} className={`n-feed-item ${f.type.toLowerCase()}`}>{f.text}</div>
              ))}
            </div>
          </div>
        )}

        {tab === 'trade' && (
          <div className="n-trade-view">
            {signal && (
              <div className="n-signal">
                <div className="n-sig-top">⚡ ARBITRAGE SIGNAL</div>
                <div className="n-sig-body">
                  BUY <b>{signal.coin}</b> @ {signal.buyDex} <br/>
                  SELL @ <b>{signal.sellDexName}</b> <span className="n-sig-win">+{signal.bonus}%</span>
                </div>
              </div>
            )}

            {!selectedDex ? (
              <div className="n-dex-grid">
                {EXCHANGES.map(d => (
                  <div key={d.id} className="n-dex-row" onClick={() => setSelectedDex(d.id)} style={{'--c': d.color}}>
                    <span>{d.name}</span>
                    {Object.values(activePositions).some(p => p.dex === d.id) && <div className="n-dex-active"></div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="n-terminal">
                <div className="n-term-head">
                  <button onClick={() => setSelectedDex(null)} className="n-back">←</button>
                  <div className="n-term-ops">
                    <input type="number" value={tradeAmount} onChange={e => setTradeAmount(e.target.value)} />
                    <div className="n-lev-box">
                      <span>x{leverage}</span>
                      <input type="range" min="1" max={maxLev} value={leverage} onChange={e => setLeverage(parseInt(e.target.value))} />
                    </div>
                  </div>
                </div>

                <div className="n-pair-list">
                  {COINS.map(c => {
                    const p = activePositions[c.id];
                    return (
                      <div key={c.id} className={`n-pair-row ${p ? 'active' : ''}`}>
                        <div className="n-p-meta">
                          <b>{c.id}/USDT</b>
                          {p && <span className="n-p-liq">{t.liquid} {120 - Math.floor((Date.now()-p.start)/1000)}s</span>}
                        </div>
                        {p && <div className={`n-p-pnl ${p.currentPnl >= 0 ? 'plus' : 'minus'}`}>{p.currentPnl}$</div>}
                        {c.lvl <= lvl ? (
                          <button className={`n-p-btn ${p ? 'close' : 'buy'}`} onClick={() => p ? closeTrade(c.id) : openTrade(c.id)}>
                            {p ? t.close : t.buy}
                          </button>
                        ) : <div className="n-p-lock">LVL {c.lvl}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'awards' && (
          <div className="n-awards-view">
            <h2 className="n-title">{t.awards}</h2>
            <div className="n-log-list">
              {history.map((h, i) => (
                <div key={i} className={`n-log-item ${h.win ? 'win' : 'loss'}`}>
                  {h.coin} | {h.win ? '+' : ''}{h.pnl.toFixed(2)}$
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="n-settings-view">
            <h2 className="n-title">{t.creators}</h2>
            <div className="n-set-row">
              <span>{t.sound}</span>
              <button onClick={() => setSoundOn(!soundOn)}>{soundOn ? 'ON' : 'OFF'}</button>
            </div>
            <div className="n-set-row">
              <button onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}>{lang.toUpperCase()}</button>
            </div>
            <a href="https://t.me/kriptoalians" target="_blank" rel="noreferrer" className="n-tg">@kriptoalians</a>
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
