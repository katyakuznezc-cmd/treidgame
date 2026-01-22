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
    wait: 'СЕТЬ...', sum: 'СУММА', lev: 'ПЛЕЧО', done: 'ГОТОВО',
    tut1: 'Твой баланс здесь!', tut2: 'Тут будут сигналы.', tut3: 'Выбери биржу!'
  },
  EN: {
    mining: 'MINING', trade: 'EXCHANGE', opts: 'SETTINGS', analysis: 'ANALYSIS...', 
    buy: 'BUY', sell: 'SELL', back: '← BACK', profit: 'PROFIT:',
    wait: 'NETWORK...', sum: 'AMOUNT', lev: 'LEVERAGE', done: 'DONE',
    tut1: 'Your balance here!', tut2: 'Signals appear here.', tut3: 'Pick a DEX!'
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
  const [tutStep, setTutStep] = useState(0); 
  const [result, setResult] = useState(null);

  const sndClick = useRef(new Audio('https://www.fesliyanstudios.com/play-mp3/6510'));
  const t = TEXTS[lang];

  // Динамический расчет прибыли (Калькулятор)
  const calcProfit = (amount * leverage * (signal ? signal.perc / 100 : 0.05)).toFixed(2);

  // Логика сигналов
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
    setActivePos({ coin: coinId, amt: amount, lev: leverage, profit: calcProfit });
  };

  const handleSell = () => {
    setNetTimer(10);
    const itv = setInterval(() => {
      setNetTimer(prev => {
        if (prev <= 1) {
          clearInterval(itv);
          const win = Math.random() > 0.1;
          const profitVal = win ? Number(activePos.profit) : -activePos.amt;
          setBalance(b => b + (win ? (activePos.amt + profitVal) : 0));
          setResult({ win, val: profitVal });
          setActivePos(null);
          setNetTimer(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="app-wrap">
      <style>{`
        :root { --w: #00ff88; --l: #ff3366; --n: #00d9ff; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; }
        .app-wrap { width: 100vw; height: 100dvh; background: #000; color: #fff; display: flex; justify-content: center; overflow: hidden; }
        .container { width: 100%; max-width: 500px; height: 100%; display: flex; flex-direction: column; position: relative; border: 1px solid #111; }
        .header { padding: 20px; border-bottom: 1px solid #222; background: #000; }
        .balance-box { font-size: 32px; font-weight: 800; color: var(--w); }
        .scroll { flex: 1; overflow-y: auto; padding: 15px; }
        .sig-card { background: #001a1f; border: 1px solid var(--n); border-radius: 15px; padding: 20px; margin-bottom: 20px; text-align: center; }
        .card { background: #111; padding: 15px; border-radius: 15px; margin-bottom: 12px; border: 1px solid #222; }
        .btn { width: 100%; padding: 16px; border-radius: 12px; border: none; font-weight: bold; cursor: pointer; font-size: 16px; transition: 0.2s; }
        .nav { height: 75px; display: flex; background: #050505; border-top: 1px solid #222; }
        .tab { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #444; font-weight: bold; cursor: pointer; }
        .tab.active { color: var(--n); }
        .input-row { display: flex; gap: 10px; margin: 10px 0; }
        .input-box { flex: 1; background: #1a1a1a; padding: 10px; border-radius: 10px; }
        .input-box input { width: 100%; background: none; border: none; color: #fff; font-size: 18px; font-weight: bold; outline: none; }
        .tut { position: absolute; inset: 0; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; }
        .result-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.95); z-index: 2000; display: flex; align-items: center; justify-content: center; }
        @keyframes pulse { 50% { opacity: 0.3; } }
      `}</style>

      <div className="container">
        {/* УВЕДОМЛЕНИЕ О РЕЗУЛЬТАТЕ */}
        {result && (
          <div className="result-overlay">
            <div style={{background: '#151515', padding: 40, borderRadius: 30, textAlign: 'center', border: `2px solid ${result.win ? 'var(--w)' : 'var(--l)'}`, width: '85%'}}>
              <h1 style={{color: result.win ? 'var(--w)' : 'var(--l)'}}>{result.win ? 'SUCCESS' : 'LOSS'}</h1>
              <p style={{fontSize: 30, margin: '20px 0'}}>{result.win ? `+$${result.val}` : `-$${Math.abs(result.val)}`}</p>
              <button className="btn" style={{background: '#fff', color: '#000'}} onClick={() => setResult(null)}>OK</button>
            </div>
          </div>
        )}

        {/* ОБУЧЕНИЕ */}
        {tutStep !== -1 && (
          <div className="tut">
            <h2 style={{color: 'var(--n)', marginBottom: 20}}>{t.lang === 'RU' ? 'ОБУЧЕНИЕ' : 'TUTORIAL'}</h2>
            <p style={{fontSize: 20, marginBottom: 30}}>{tutStep === 0 ? t.tut1 : tutStep === 1 ? t.tut2 : t.tut3}</p>
            <button className="btn" style={{background: 'var(--n)', color: '#000'}} onClick={() => tutStep < 2 ? setTutStep(tutStep + 1) : setTutStep(-1)}>ДАЛЕЕ</button>
          </div>
        )}

        <header className="header">
          <div style={{fontSize: 10, color: '#666', marginBottom: 5}}>USER_ID: 9942</div>
          <div className="balance-box">${balance.toFixed(2)}</div>
        </header>

        <main className="scroll">
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="sig-card">
                    {isAnalyzing ? (
                      <b style={{color: 'var(--n)', animation: 'pulse 1s infinite'}}>{t.analysis}</b>
                    ) : signal ? (
                      <div>
                        <b style={{fontSize: 22}}>{signal.coin} / USDT</b>
                        <div style={{color: 'var(--w)', fontWeight: 'bold', marginTop: 5}}>PROFIT: +{signal.perc}% | {sigTime}s</div>
                      </div>
                    ) : <span>{t.wait}</span>}
                  </div>
                  {DEX.map(d => (
                    <div key={d.name} className="card" style={{display: 'flex', justifyContent: 'space-between', cursor: 'pointer'}} onClick={() => setSelectedDex(d.name)}>
                      <b>{d.name}</b> <span style={{color: 'var(--w)'}}>ONLINE</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} style={{background: 'none', color: '#fff', border: 'none', marginBottom: 15, cursor: 'pointer'}}>{t.back}</button>
                  <div className="card" style={{border: '1px solid var(--n)'}}>
                    <div className="input-row">
                      <div className="input-box"><label style={{fontSize: 10, color: '#666'}}>{t.sum}</label><input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} /></div>
                      <div className="input-box"><label style={{fontSize: 10, color: '#666'}}>{t.lev}</label><input type="number" value={leverage} onChange={e => setLeverage(Number(e.target.value))} /></div>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 10}}>
                      <span style={{color: '#666'}}>{t.profit}</span>
                      <b style={{color: 'var(--w)'}}>+${calcProfit}</b>
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
              <div onClick={() => {
                setBalance(b => b + 0.1);
                sndClick.current.currentTime = 0; sndClick.current.play().catch(()=>{});
              }} style={{width: 220, height: 220, border: '6px solid var(--n)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 100, color: 'var(--n)', cursor: 'pointer', boxShadow: '0 0 30px rgba(0,217,255,0.2)'}}>$</div>
            </div>
          )}

          {tab === 'opts' && (
            <div>
              <button className="btn" style={{background: '#111', color: '#fff', marginBottom: 15}} onClick={() => {setTutStep(0); setTab('trade'); setSelectedDex(null);}}>{t.reset}</button>
              <button className="btn" style={{background: '#111', color: '#fff', marginBottom: 15}} onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')}>{t.lang}: {lang}</button>
              <div style={{textAlign: 'center', marginTop: 40}}>
                <a href="https://t.me/kriptoalians" style={{color: 'var(--n)', textDecoration: 'none', fontWeight: 'bold'}}>TELEGRAM @KRIPTOALIANS</a>
              </div>
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
