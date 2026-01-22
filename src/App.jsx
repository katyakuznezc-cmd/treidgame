
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
    mining: 'МАЙНИНГ', trade: 'БИРЖА', opts: 'ОПЦИИ', analysis: 'АНАЛИЗ РЫНКА...', 
    buy: 'КУПИТЬ', sell: 'ПРОДАТЬ', back: '← НАЗАД', profit: 'ПРОГНОЗ:',
    wait: 'СЕТЬ...', sum: 'СУММА', lev: 'ПЛЕЧО', done: 'ГОТОВО',
    sig_buy: 'КУПИТЬ НА:', sig_sell: 'ПРОДАТЬ НА:',
    t0: 'Здесь твой текущий баланс. На него ты покупаешь активы.',
    t1: 'Тут появляется сигнал: какую монету и на какой бирже купить.',
    t2: 'Выбери любую биржу из списка, чтобы открыть терминал.'
  },
  EN: {
    mining: 'MINING', trade: 'EXCHANGE', opts: 'SETTINGS', analysis: 'ANALYZING...', 
    buy: 'BUY', sell: 'SELL', back: '← BACK', profit: 'EXPECTED:',
    wait: 'NETWORK...', sum: 'AMOUNT', lev: 'LEVERAGE', done: 'DONE',
    sig_buy: 'BUY ON:', sig_sell: 'SELL ON:',
    t0: 'This is your balance. Use it to trade assets.',
    t1: 'Signal shows which coin to buy and where to sell.',
    t2: 'Select any exchange to open the trading terminal.'
  }
};

export default function App() {
  const [balance, setBalance] = useState(1000.00);
  const [lang, setLang] = useState('RU');
  const [tab, setTab] = useState('trade');
  const [selectedDex, setSelectedDex] = useState(null);
  const [amount, setAmount] = useState(100);
  const [leverage, setLeverage] = useState(10);
  const [activePos, setActivePos] = useState(null);
  const [netTimer, setNetTimer] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [signal, setSignal] = useState(null);
  const [sigTime, setSigTime] = useState(0);
  const [tutStep, setTutStep] = useState(0); // 0, 1, 2, -1 (off)
  const [result, setResult] = useState(null);

  const t = TEXTS[lang];

  // Логика сигналов
  useEffect(() => {
    let timer;
    if (tab === 'trade' && !signal && !activePos && tutStep === -1) {
      setIsAnalyzing(true);
      timer = setTimeout(() => {
        const coin = COINS[Math.floor(Math.random() * COINS.length)];
        const d1 = DEX[Math.floor(Math.random() * DEX.length)];
        let d2 = DEX[Math.floor(Math.random() * DEX.length)];
        while (d1.name === d2.name) d2 = DEX[Math.floor(Math.random() * DEX.length)];
        
        setSignal({
          coin: coin.id, buyDex: d1.name, sellDex: d2.name,
          perc: (Math.random() * (3.0 - 2.0) + 2.0).toFixed(2)
        });
        setSigTime(60);
        setIsAnalyzing(false);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [tab, signal, activePos, tutStep]);

  useEffect(() => {
    if (sigTime > 0) {
      const itv = setInterval(() => setSigTime(s => s - 1), 1000);
      return () => clearInterval(itv);
    } else if (signal) { setSignal(null); }
  }, [sigTime, signal]);

  const calcProfit = (amount * leverage * ((signal ? signal.perc : 2.5) / 100)).toFixed(2);

  const handleBuy = (coinId) => {
    if (balance < amount) return;
    setBalance(b => b - amount);
    setActivePos({ coin: coinId, amt: amount, lev: leverage, profit: calcProfit });
  };

  const handleSell = () => {
    setNetTimer(10);
    const itv = setInterval(() => {
      setNetTimer(p => {
        if (p <= 1) {
          clearInterval(itv);
          const win = Math.random() > 0.2;
          let pnl = win ? Number(activePos.profit) : -(activePos.amt * activePos.lev * (Math.random() * 0.015));
          setBalance(b => Math.max(0, b + activePos.amt + pnl));
          setResult({ win, val: pnl.toFixed(2) });
          setActivePos(null);
          return null;
        }
        return p - 1;
      });
    }, 1000);
  };

  return (
    <div className="view">
      <style>{`
        :root { --n: #00d9ff; --w: #00ff88; --l: #ff3366; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; }
        .view { width: 100vw; height: 100dvh; background: #050505; display: flex; justify-content: center; overflow: hidden; }
        .app { width: 100%; max-width: 500px; height: 100%; background: #000; display: flex; flex-direction: column; position: relative; border: 1px solid #111; }
        
        .header { padding: 20px; border-bottom: 1px solid #222; position: relative; z-index: 10; }
        .balance { font-size: 32px; font-weight: 800; color: var(--w); }
        
        .main { flex: 1; overflow-y: auto; padding: 15px; position: relative; }
        
        .sig { background: #001a1f; border: 1px solid var(--n); border-radius: 15px; padding: 15px; margin-bottom: 15px; }
        .card { background: #111; padding: 15px; border-radius: 12px; margin-bottom: 10px; border: 1px solid #222; }
        
        .nav { height: 75px; display: flex; background: #080808; border-top: 1px solid #222; z-index: 10; }
        .tab { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #444; font-weight: bold; }
        .tab.active { color: var(--n); }

        /* Обучение с динамической маской */
        .tut-overlay { position: absolute; inset: 0; z-index: 100; pointer-events: none; }
        .tut-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.8); transition: 0.3s; pointer-events: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; }
        
        /* Вырезы для обучения */
        .hole { position: absolute; border: 2px solid #fff; border-radius: 12px; box-shadow: 0 0 0 2000px rgba(0,0,0,0.8); z-index: 90; pointer-events: none; }
        
        .btn { width: 100%; padding: 15px; border-radius: 10px; border: none; font-weight: bold; cursor: pointer; }
        .modal { position: absolute; inset: 0; background: rgba(0,0,0,0.9); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        @keyframes pulse { 50% { opacity: 0.3; } }
      `}</style>

      <div className="app">
        {/* УВЕДОМЛЕНИЕ О КОНЦЕ СДЕЛКИ */}
        {result && (
          <div className="modal">
            <div style={{background: '#111', padding: 40, borderRadius: 25, textAlign: 'center', border: `2px solid ${result.win ? 'var(--w)' : 'var(--l)'}`, width: '100%'}}>
              <h1 style={{color: result.win ? 'var(--w)' : 'var(--l)'}}>{result.win ? 'SUCCESS' : 'LOSS'}</h1>
              <p style={{fontSize: 28, margin: '20px 0'}}>{result.win ? `+$${result.val}` : `-$${Math.abs(result.val)}`}</p>
              <button className="btn" style={{background: '#fff'}} onClick={() => setResult(null)}>OK</button>
            </div>
          </div>
        )}

        {/* ОБУЧЕНИЕ С ПОДСВЕТКОЙ */}
        {tutStep !== -1 && (
          <div className="tut-overlay">
            {tutStep === 0 && <div className="hole" style={{top: 10, left: 10, width: '95%', height: 95}}></div>}
            {tutStep === 1 && <div className="hole" style={{top: 115, left: 15, width: '93%', height: 110}}></div>}
            {tutStep === 2 && <div className="hole" style={{top: 240, left: 15, width: '93%', height: 180}}></div>}
            
            <div className="tut-mask" style={{background: 'none'}}>
              <div style={{marginTop: tutStep === 0 ? 150 : (tutStep === 1 ? 250 : -200), background: '#1a1a1a', padding: 20, borderRadius: 15, border: '1px solid var(--n)', textAlign: 'center', pointerEvents: 'auto'}}>
                <p style={{marginBottom: 15, lineHeight: 1.4}}>{t['t'+tutStep]}</p>
                <button className="btn" style={{background: 'var(--n)'}} onClick={() => setTutStep(tutStep < 2 ? tutStep + 1 : -1)}>ДАЛЕЕ</button>
              </div>
            </div>
          </div>
        )}

        <header className="header">
          <div style={{fontSize: 10, color: '#444', marginBottom: 5}}>NETWORK: ONLINE</div>
          <div className="balance">${balance.toFixed(2)}</div>
        </header>

        <main className="main">
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="sig">
                    {isAnalyzing ? (
                      <div style={{textAlign: 'center', color: 'var(--n)', animation: 'pulse 1s infinite', fontWeight: 'bold'}}>{t.analysis}</div>
                    ) : signal ? (
                      <div>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 10}}>
                          <b style={{fontSize: 20}}>{signal.coin} / USDT</b>
                          <b style={{color: 'var(--w)'}}>+{signal.perc}%</b>
                        </div>
                        <div style={{fontSize: 12, display: 'flex', justifyContent: 'space-between'}}>
                          <span>{t.sig_buy} <b>{signal.buyDex}</b></span>
                          <span>{t.sig_sell} <b>{signal.sellDex}</b></span>
                        </div>
                      </div>
                    ) : <div style={{textAlign: 'center', color: '#222'}}>WAITING...</div>}
                  </div>
                  {DEX.map(d => (
                    <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)}>
                      <b>{d.name}</b>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} style={{background: 'none', color: '#fff', border: 'none', marginBottom: 15}}>{t.back}</button>
                  <div className="card" style={{border: '1px solid var(--n)'}}>
                    <div style={{display: 'flex', gap: 10, marginBottom: 10}}>
                      <div style={{flex: 1}}>
                        <label style={{fontSize: 10, color: '#666'}}>{t.sum}</label>
                        <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} style={{width: '100%', background: 'none', border: 'none', color: '#fff', fontSize: 18, fontWeight: 'bold', outline: 'none'}} />
                      </div>
                      <div style={{flex: 1}}>
                        <label style={{fontSize: 10, color: '#666'}}>{t.lev}</label>
                        <input type="number" value={leverage} onChange={e => setLeverage(Number(e.target.value))} style={{width: '100%', background: 'none', border: 'none', color: '#fff', fontSize: 18, fontWeight: 'bold', outline: 'none'}} />
                      </div>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span style={{color: '#666'}}>{t.profit}</span>
                      <b style={{color: 'var(--w)'}}>+${calcProfit}</b>
                    </div>
                  </div>
                  {COINS.map(c => (
                    <div key={c.id} className="card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <b>{c.id}</b>
                      {activePos?.coin === c.id ? (
                        <button className="btn" style={{width: 100, background: netTimer ? '#333' : 'var(--l)'}} onClick={handleSell}>
                          {netTimer ? `${netTimer}s` : t.sell}
                        </button>
                      ) : (
                        <button className="btn" style={{width: 100, background: 'var(--w)', color: '#000'}} onClick={() => handleBuy(c.id)} disabled={!!activePos}>
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
               <div onClick={() => setBalance(b => b + 0.1)} style={{width: 200, height: 200, border: '6px solid var(--n)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, color: 'var(--n)', cursor: 'pointer'}}>$</div>
            </div>
          )}

          {tab === 'opts' && (
            <div style={{padding: 10}}>
              <button className="btn" style={{background: '#111', color: '#fff', marginBottom: 15}} onClick={() => setTutStep(0)}>ПОВТОРИТЬ ОБУЧЕНИЕ</button>
              <button className="btn" style={{background: '#111', color: '#fff', marginBottom: 15}} onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')}>ЯЗЫК: {lang}</button>
              <div style={{textAlign: 'center'}}><a href="https://t.me/kriptoalians" style={{color: 'var(--n)', textDecoration: 'none'}}>TELEGRAM @KRIPTOALIANS</a></div>
            </div>
          )}
        </main>

        <nav className="nav">
          <div onClick={() => setTab('mining')} className={`tab ${tab === 'mining' ? 'active' : ''}`}>{t.mining}</div>
          <div onClick={() => setTab('trade')} className={`tab ${tab === 'trade' ? 'active' : ''}`}>{t.trade}</div>
          <div onClick={() => setTab('opts')} className={`tab ${tab === 'opts' ? 'active' : ''}`}>{t.opts}</div>
        </nav>
      </div>
    </div>
  );
}
