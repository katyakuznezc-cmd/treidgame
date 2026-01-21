

import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const DEX_PLATFORMS = [
  { id: '1inch', name: '1inch', color: '#2f8af5' },
  { id: 'Uniswap', name: 'Uniswap v3', color: '#ff007a' },
  { id: 'SushiSwap', nam e: 'SushiSwap', color: '#fa52a0' },
  { id: 'PancakeSwap', name: 'PancakeSwap', color: '#d1884f' }
];

const TOKENS = ['TON', 'ETH', 'SOL', 'BNB', 'ARB'];

const translations = {
  ru: {
    mining: 'Майнинг',
    trade: 'Кросс-DEX',
    settings: 'Настройки',
    balanceLabel: 'Баланс USD',
    miningText: 'Нажимай на доллар, чтобы заработать!',
    liveSignal: 'ЖИВОЙ СИГНАЛ',
    buy: 'КУПИТЬ на',
    sell: 'ПРОДАТЬ на',
    profit: 'Прибыль',
    volume: 'Объем',
    confirm: 'ПОДТВЕРДИТЬ KROSS-SWAP',
    searching: 'Сканирование пулов...',
    sound: 'Звук кликов',
    lang: 'Язык',
    creators: 'Создатели проекта:',
    processing: 'Обработка транзакции...',
    success: 'Сделка успешна!',
    fail: 'Ошибка проскальзывания!'
  },
  uk: {
    mining: 'Майнінг',
    trade: 'Крос-DEX',
    settings: 'Налаштування',
    balanceLabel: 'Баланс USD',
    miningText: 'Тисни на долар, щоб заробити!',
    liveSignal: 'ЖИВИЙ СИГНАЛ',
    buy: 'КУПИТИ на',
    sell: 'ПРОДАТИ на',
    profit: 'Прибуток',
    volume: 'Обсяг',
    confirm: 'ПІДТВЕРДИТИ KROSS-SWAP',
    searching: 'Сканування пулів...',
    sound: 'Звук кліків',
    lang: 'Мова',
    creators: 'Творці проєкту:',
    processing: 'Обробка транзакції...',
    success: 'Угода успішна!',
    fail: 'Помилка проковзування!'
  },
  en: {
    mining: 'Mining',
    trade: 'Kross-DEX',
    settings: 'Settings',
    balanceLabel: 'Balance USD',
    miningText: 'Tap the dollar to earn!',
    liveSignal: 'LIVE SIGNAL',
    buy: 'BUY on',
    sell: 'SELL on',
    profit: 'Profit',
    volume: 'Volume',
    confirm: 'CONFIRM KROSS-SWAP',
    searching: 'Scanning pools...',
    sound: 'Click sounds',
    lang: 'Language',
    creators: 'Project creators:',
    processing: 'Processing trade...',
    success: 'Trade success!',
    fail: 'Slippage error!'
  }
};

function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 100);
  const [lang, setLang] = useState(() => localStorage.getItem('k_lang') || 'ru');
  const [tab, setTab] = useState('mining');
  const [sound, setSound] = useState(() => JSON.parse(localStorage.getItem('k_snd')) ?? true);
  const [signal, setSignal] = useState(null);
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(false);

  const t = translations[lang];
  const audio = useRef(new Audio('https://www.soundjay.com/buttons/sounds/button-37a.mp3'));

  useEffect(() => {
    localStorage.setItem('k_bal', balance);
    localStorage.setItem('k_lang', lang);
    localStorage.setItem('k_snd', JSON.stringify(sound));
  }, [balance, lang, sound]);

  useEffect(() => {
    if (tab !== 'kross' || loading) return;
    const gen = () => {
      const b = DEX_PLATFORMS[Math.floor(Math.random()*4)];
      let s = DEX_PLATFORMS[Math.floor(Math.random()*4)];
      while(b.id === s.id) s = DEX_PLATFORMS[Math.floor(Math.random()*4)];
      setSignal({
        token: TOKENS[Math.floor(Math.random()*5)],
        buy: b, sell: s,
        spread: (Math.random()*3 + 0.5).toFixed(2),
        time: 15
      });
    };
    gen();
    const int = setInterval(gen, 15000);
    return () => clearInterval(int);
  }, [tab, loading]);

  useEffect(() => {
    if (signal && signal.time > 0) {
      const timer = setTimeout(() => setSignal({...signal, time: signal.time - 1}), 1000);
      return () => clearTimeout(timer);
    }
  }, [signal]);

  const handleTap = (e) => {
    setBalance(b => b + 0.01);
    if(sound) { audio.current.currentTime = 0; audio.current.play().catch(()=>{}); }
    const id = Date.now();
    setClicks([...clicks, {id, x: e.clientX, y: e.clientY}]);
    setTimeout(() => setClicks(c => c.filter(i => i.id !== id)), 800);
  };

  const handleSwap = () => {
    if (!signal || balance < 100) return;
    setLoading(true);
    setBalance(b => b - 100);
    setTimeout(() => {
      const win = Math.random() > 0.2;
      if(win) {
        const p = 100 * (signal.spread/100);
        setBalance(b => b + 100 + p);
        alert(t.success);
      } else {
        setBalance(b => b + 95);
        alert(t.fail);
      }
      setLoading(false);
      setSignal(null);
    }, 2000);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">Kross-DEX</div>
        <div className="bal">
          <small>{t.balanceLabel}</small>
          <h2>${balance.toFixed(2)}</h2>
        </div>
      </header>

      <main className="content">
        {tab === 'mining' && (
          <div className="mining">
            <div className="coin" onClick={handleTap}>
              $ {clicks.map(c => <span key={c.id} className="f-text" style={{left: c.x, top: c.y}}>+$0.01</span>)}
            </div>
            <p>{t.miningText}</p>
          </div>
        )}

        {tab === 'kross' && (
          <div className="dex">
            {loading ? <div className="loader"><div className="spin"></div>{t.processing}</div> : 
             signal && signal.time > 0 ? (
              <div className="card neon">
                <div className="c-head"><span>{t.liveSignal}</span><span className={signal.time < 5 ? 'red':''}>{signal.time}s</span></div>
                <div className="c-route">
                  <div><small>{t.buy}</small><br/><b style={{color: signal.buy.color}}>{signal.buy.name}</b></div>
                  <div className="arr">➔</div>
                  <div><small>{t.sell}</small><br/><b style={{color: signal.sell.color}}>{signal.sell.name}</b></div>
                </div>
                <div className="c-foot">{t.profit}: <span className="grn">+{signal.spread}%</span></div>
                <button className="btn" onClick={handleSwap}>{t.confirm}</button>
              </div>
            ) : <div className="loader"><div className="spin"></div>{t.searching}</div>}
          </div>
        )}

        {tab === 'settings' && (
          <div className="settings">
            <h2>{t.settings}</h2>
            <div className="s-row"><span>{t.sound}</span><button className={`tgl ${sound?'on':''}`} onClick={()=>setSound(!sound)}>{sound?'ON':'OFF'}</button></div>
            <div className="s-row">
              <span>{t.lang}</span>
              <div className="lang-btns">
                {['ru','uk','en'].map(l => (
                  <button key={l} className={lang === l ? 'active':''} onClick={()=>setLang(l)}>{l.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <div className="creators">
              <p>{t.creators}</p>
              <a href="https://t.me/kriptoalians" target="_blank">@kriptoalians</a>
            </div>
          </div>
        )}
      </main>

      <nav className="nav">
        <button className={tab==='mining'?'active':''} onClick={()=>setTab('mining')}>{t.mining}</button>
        <button className={tab==='kross'?'active':''} onClick={()=>setTab('kross')}>{t.trade}</button>
        <button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}>{t.settings}</button>
      </nav>
    </div>
  );
}
export default App;
