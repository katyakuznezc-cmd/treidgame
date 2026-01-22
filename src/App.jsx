

import React, { useState, useEffect, useRef } from 'react';

const COINS = [
  { id: 'TON', base: 5.4 }, { id: 'DOGE', base: 0.15 },
  { id: 'SOL', base: 145 }, { id: 'BTC', base: 95000 }
];

const DEX = [
  { id: '1in', name: '1INCH' }, { id: 'uni', name: 'UNISWAP' }, { id: 'pancake', name: 'PANCAKE' }
];

const TEXTS = {
  RU: {
    mining: 'МАЙНИНГ', trade: 'БИРЖА', opts: 'ОПЦИИ', analysis: 'АНАЛИЗ...', 
    buy: 'КУПИТЬ', sell: 'ПРОДАТЬ', back: '← НАЗАД', profit: 'ПРОГНОЗ:',
    wait: 'СЕТЬ...', sum: 'СУММА', lev: 'ПЛЕЧО', done: 'СДЕЛКА ЗАВЕРШЕНА'
  },
  EN: {
    mining: 'MINING', trade: 'EXCHANGE', opts: 'SETTINGS', analysis: 'ANALYSIS...', 
    buy: 'BUY', sell: 'SELL', back: '← BACK', profit: 'PROFIT:',
    wait: 'NETWORK...', sum: 'AMOUNT', lev: 'LEVERAGE', done: 'TRADE COMPLETED'
  }
};

export default function App() {
  const [balance, setBalance] = useState(1000.00);
  const [lang, setLang] = useState('RU');
  const [tab, setTab] = useState('trade');
  const [selectedDex, setSelectedDex] = useState(null);
  
  // Торговые параметры
  const [amount, setAmount] = useState(100);
  const [leverage, setLeverage] = useState(10);
  const [activePos, setActivePos] = useState(null); // {coin, amt, lev, isWaiting}
  const [netTimer, setNetTimer] = useState(null);

  // Сигналы
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [signal, setSignal] = useState(null);
  const [sigTime, setSigTime] = useState(0);

  const [tutStep, setTutStep] = useState(0); 
  const [result, setResult] = useState(null); // Для финального уведомления

  const t = TEXTS[lang];
  const potentialProfit = (amount * leverage * (signal ? signal.perc / 100 : 0.05)).toFixed(2);

  // Логика сигнала
  useEffect(() => {
    let timer;
    if (tab === 'trade' && !signal && !activePos) {
      setIsAnalyzing(true);
      timer = setTimeout(() => {
        const coin = COINS[Math.floor(Math.random() * COINS.length)];
        setSignal({
          coin: coin.id,
          perc: (Math.random() * 5 + 2).toFixed(2)
        });
        setSigTime(60);
        setIsAnalyzing(false);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [tab, signal, activePos]);

  useEffect(() => {
    if (sigTime > 0) {
      const itv = setInterval(() => setSigTime(s => s - 1), 1000);
      return () => clearInterval(itv);
    } else if (signal) { setSignal(null); }
  }, [sigTime, signal]);

  const handleBuy = (coinId) => {
    if (balance < amount) return;
    setBalance(b => b - amount);
    setActivePos({ coin: coinId, amt: amount, lev: leverage, profit: potentialProfit });
  };

  const handleSell = () => {
    setNetTimer(10);
    const itv = setInterval(() => {
      setNetTimer(prev => {
        if (prev <= 1) {
          clearInterval(itv);
          const win = Math.random() > 0.1;
          const finalProfit = win ? Number(activePos.profit) : -activePos.amt;
          const totalReturn = win ? (activePos.amt + finalProfit) : 0;
          
          setBalance(b => b + totalReturn);
          setResult({ win, val: finalProfit });
          setActivePos(null);
          setNetTimer(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="v">
      <style>{`
        :root { --n: #00d9ff; --w: #00ff88; --l: #ff3366; }
        * { box-sizing: border-box; font-family: sans-serif; margin: 0; padding: 0; }
        .v { width: 100vw; height: 100dvh; background: #000; color: #fff; display: flex; justify-content: center; overflow: hidden; }
        .c { width: 100%; max-width: 500px; height: 100%; display: flex; flex-direction: column; position: relative; border: 1px solid #111; }
        
        .h { padding: 20px; border-bottom: 1px solid #222; z-index: 10; background: #000; }
        .b-val { font-size: 32px; font-weight: 800; color: var(--w); }
        
        .main { flex: 1; overflow-y: auto; padding: 15px; }
        
        .sig { background: #001a1f; border: 1px solid var(--n); border-radius: 15px; padding: 15px; margin-bottom: 15px; text-align: center; }
        .card { background: #111; padding: 15px; border-radius: 15px; margin-bottom: 10px; border: 1px solid #222; }
        
        .input-row { display: flex; gap: 10px; margin-bottom: 15px; }
        .input-group { flex: 1; background: #1a1a1a; padding: 10px; border-radius: 10px; }
        .input-group label { display: block; font-size: 10px; color: #666; margin-bottom: 5px; }
        .input-group input { width: 100%; background: none; border: none; color: #fff; font-size: 16px; font-weight: bold; outline: none; }

        .btn { width: 100%; padding: 15px; border-radius: 12px; border: none; font-weight: bold; cursor: pointer; font-size: 16px; }
        
        .nav { height: 75px; display: flex; background: #050505; border-top: 1px solid #222; }
        .tab { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #444; font-weight: bold; }
        .tab.active { color: var(--n); }

        /* Обучение */
        .tut { position: absolute; inset: 0; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; }
        .spot { position: absolute; border: 4px solid #fff; border-radius: 15px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.8); z-index: 999; pointer-events: none; }
        
        /* Уведомление конца */
        .res { position: absolute; inset: 0; background: rgba(0,0,0,0.95); z-index: 2000; display: flex; align-items: center; justify-content: center; }
        .res-box { background: #1a1a1a; padding: 40px; border-radius: 30px; text-align: center; border: 2px solid var(--n); width: 80%; }

        @keyframes pulse { 50% { opacity: 0.3; } }
      `}</style>

      <div className="c">
        {/* РЕЗУЛЬТАТ СДЕЛКИ */}
        {result && (
          <div className="res">
            <div className="res-box" style={{borderColor: result.win ? 'var(--w)' : 'var(--l)'}}>
              <h1 style={{color: result.win ? 'var(--w)' : 'var(--l)'}}>{result.win ? 'SUCCESS' : 'LOSS'}</h1>
              <p style={{fontSize: 24, margin: '20px 0'}}>{result.win ? `+$${result.val}` : `-$${Math.abs(result.val)}`}</p>
              <button className="btn" style={{background: '#fff'}} onClick={() => setResult(null)}>OK</button>
            </div>
          </div>
        )}

        {/* ОБУЧЕНИЕ */}
        {tutStep !== -1 && (
          <div className="tut">
            {tutStep === 0 && <div className="spot" style={{top: 15, left: 15, width: '92%', height: 90}}></div>}
            {tutStep === 1 && <div className="spot" style={{top: 120, left: 15, width: '92%', height: 100}}></div>}
            <div style={{zIndex: 1001, marginTop: 150}}>
              <h2 style={{color: 'var(--n)'}}>ИНСТРУКЦИЯ</h2>
              <p style={{margin: '15px 0', fontSize: 18}}>{
                tutStep === 0 ? "Следи за своим балансом здесь!" :
                tutStep === 1 ? "Тут появятся сигналы после анализа рынка." : 
                "Выбери биржу и начни зарабатывать!"
              }</p>
              <button className="btn" style={{background: 'var(--n)'}} onClick={() => tutStep < 2 ? setTutStep(tutStep+1) : setTutStep(-1)}>ДАЛЕЕ</button>
            </div>
          </div>
        )}

        <header className="h">
          <div style={{fontSize: 11, color: '#444'}}>ID: 9921 | {lang}</div>
          <div className="b-val">${balance.toFixed(2)}</div>
        </header>

        <main className="main">
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="sig">
                    {isAnalyzing ? (
                      <b style={{color: 'var(--n)', animation: 'pulse 1s infinite'}}>{t.analysis}</b>
                    ) : signal ? (
                      <div>
                        <b style={{fontSize: 20}}>{signal.coin} / USDT</b>
                        <div style={{color: var(--w), fontWeight: 'bold'}}>ВЫГОДА: +{signal.perc}% | {sigTime}s</div>
                      </div>
                    ) : <span style={{color: '#333'}}>ПОИСК СИГНАЛА...</span>}
                  </div>
                  {DEX.map(d => (
                    <div key={d.name} className="card" style={{cursor: 'pointer', display: 'flex', justifyContent: 'space-between'}} onClick={() => setSelectedDex(d.name)}>
                      <b>{d.name}</b> <span style={{color: 'var(--n)'}}>ONLINE</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} style={{background: 'none', color: '#fff', border: 'none', marginBottom: 15}}>{t.back}</button>
                  
                  <div className="card" style={{borderColor: 'var(--n)'}}>
                    <div className="input-row">
                      <div className="input-group">
                        <label>{t.sum}</label>
                        <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
                      </div>
                      <div className="input-group">
                        <label>{t.lev}</label>
                        <input type="number" value={leverage} onChange={e => setLeverage(Number(e.target.value))} />
                      </div>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span style={{color: '#666'}}>{t.profit}</span>
                      <b style={{color: 'var(--w)'}}>+${potentialProfit}</b>
                    </div>
                  </div>

                  {COINS.map(c => (
                    <div key={c.id} className="card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <b>{c.id} / USDT</b>
                      {activePos?.coin === c.id ? (
                        <button className="btn" style={{width: 120, background: netTimer ? '#333' : 'var(--l)'}} onClick={handleSell}>
                          {netTimer ? `${netTimer}s` : t.sell}
                        </button>
                      ) : (
                        <button className="btn" style={{width: 120, background: 'var(--w)', color: '#000'}} onClick={() => handleBuy(c.id)} disabled={!!activePos}>
                          {t.buy}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'mining' && (
            <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
               <div onClick={(e) => {
                 setBalance(b => b + 0.1);
                 const d = document.createElement('div'); d.innerText = '$'; d.style.cssText = `position:fixed; left:${e.clientX}px; top:${e.clientY}px; color:var(--w); animation:fly 0.5s forwards;`;
                 document.body.appendChild(d); setTimeout(()=>d.remove(), 500);
               }} style={{width: 200, height: 200, border: '8px solid var(--n)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, color: 'var(--n)'}}>$</div>
            </div>
          )}

          {tab === 'opts' && (
            <div>
              <button className="btn" style={{background: '#111', color: '#fff', marginBottom: 10}} onClick={() => {setTutStep(0); setTab('trade'); setSelectedDex(null);}}>ПОВТОР ОБУЧЕНИЯ</button>
              <button className="btn" style={{background: '#111', color: '#fff', marginBottom: 10}} onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')}>ЯЗЫК: {lang}</button>
              <div style={{textAlign: 'center', marginTop: 30}}><a href="https://t.me/kriptoalians" style={{color: 'var(--n)', textDecoration: 'none'}}>TELEGRAM @KRIPTOALIANS</a></div>
            </div>
          )}
        </main>

        <nav className="nav">
          <div onClick={() => setTab('mining')} className={`tab ${tab === 'mining' ? 'active' : ''}`}>{t.mining}</div>
          <div onClick={() => setTab('trade')} className={`tab ${tab === 'trade' ? 'active' : ''}`}>{t.trade}</div>
          <div onClick={() => setTab('opts')} className={`tab ${tab === 'opts' ? 'active' : ''}`}>{t.opts}</div>
        </nav>
      </div>
      <style>{`@keyframes fly { to { transform: translateY(-100px); opacity: 0; } }`}</style>
    </div>
  );
}
