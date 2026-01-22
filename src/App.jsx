import React, { useState, useEffect } from 'react';

const COINS = [
  { id: 'TON', base: 5.42, lvl: 1 },
  { id: 'DOGE', base: 0.15, lvl: 1 },
  { id: 'SOL', base: 145.30, lvl: 2 },
  { id: 'BTC', base: 95400, lvl: 3 }
];

const DEX = [
  { id: '1in', name: '1INCH' }, { id: 'uni', name: 'UNISWAP' }, 
  { id: 'pancake', name: 'PANCAKE' }, { id: 'ray', name: 'RAYDIUM' }
];

export default function App() {
  const [balance, setBalance] = useState(1000.00);
  const [level, setLevel] = useState(1);
  const [tradesInLevel, setTradesInLevel] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);
  const [tab, setTab] = useState('trade');
  const [selectedDex, setSelectedDex] = useState(null);
  const [amount, setAmount] = useState(100);
  const [leverage, setLeverage] = useState(10);
  const [activePos, setActivePos] = useState(null);
  const [netTimer, setNetTimer] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [signal, setSignal] = useState(null);
  const [sigTime, setSigTime] = useState(0);
  const [result, setResult] = useState(null);
  const [showAds, setShowAds] = useState(false);

  // Количество сделок, нужное для перехода на СЛЕДУЮЩИЙ уровень
  const neededForNext = 10 + (level - 1) * 5;
  const progress = (tradesInLevel / neededForNext) * 100;

  useEffect(() => {
    let timer;
    if (tab === 'trade' && !signal && !activePos) {
      setIsAnalyzing(true);
      timer = setTimeout(() => {
        const available = COINS.filter(c => c.lvl <= level);
        const coin = available[Math.floor(Math.random() * available.length)];
        const d1 = DEX[Math.floor(Math.random() * DEX.length)];
        let d2 = DEX[Math.floor(Math.random() * DEX.length)];
        while (d1.name === d2.name) d2 = DEX[Math.floor(Math.random() * DEX.length)];
        
        setSignal({
          coin: coin.id, buyDex: d1.name, sellDex: d2.name,
          perc: (Math.random() * (3.0 - 2.0) + 2.0).toFixed(2)
        });
        setSigTime(60);
        setIsAnalyzing(false);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [tab, signal, activePos, level]);

  useEffect(() => {
    if (sigTime > 0) {
      const itv = setInterval(() => setSigTime(s => s - 1), 1000);
      return () => clearInterval(itv);
    } else if (signal) setSignal(null);
  }, [sigTime, signal]);

  const calcProfit = (amount * leverage * ((signal ? signal.perc : 2.5) / 100)).toFixed(2);

  const handleBuy = (coin) => {
    if (balance < amount || coin.lvl > level) return;
    setBalance(b => b - amount);
    setActivePos({ id: coin.id, amt: amount, lev: leverage, profit: calcProfit });
  };

  const handleSell = () => {
    setNetTimer(10);
    const itv = setInterval(() => {
      setNetTimer(p => {
        if (p <= 1) {
          clearInterval(itv);
          const win = Math.random() > 0.2;
          let pnl = win ? Number(activePos.profit) : -(activePos.amt * activePos.lev * 0.01);
          
          setBalance(b => Math.max(0, b + activePos.amt + pnl));
          setResult({ win, val: Math.abs(pnl).toFixed(2) });
          setActivePos(null);
          
          // Логика прокачки
          const newTradesInLevel = tradesInLevel + 1;
          setTotalTrades(t => t + 1);
          
          if (newTradesInLevel >= neededForNext) {
            setLevel(l => l + 1);
            setTradesInLevel(0);
          } else {
            setTradesInLevel(newTradesInLevel);
          }

          if (level >= 3) {
            setTimeout(() => setShowAds(true), 1500);
          }
          return null;
        }
        return p - 1;
      });
    }, 1000);
  };

  return (
    <div className="v">
      <style>{`
        :root { --n: #00d9ff; --w: #00ff88; --l: #ff3366; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; }
        .v { width: 100vw; height: 100dvh; background: #000; display: flex; justify-content: center; }
        .app { width: 100%; max-width: 500px; height: 100%; background: #000; display: flex; flex-direction: column; position: relative; border: 1px solid #111; }
        .header { padding: 15px; border-bottom: 1px solid #222; }
        .balance { font-size: 28px; font-weight: 800; color: var(--w); }
        .xp-container { width: 100%; height: 6px; background: #111; margin-top: 10px; border-radius: 3px; border: 1px solid #222; overflow: hidden; }
        .xp-fill { height: 100%; background: var(--n); transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .main { flex: 1; overflow-y: auto; padding: 15px; padding-bottom: 80px; }
        .sig { background: linear-gradient(to bottom right, #001a1f, #000); border: 1px solid var(--n); border-radius: 12px; padding: 15px; margin-bottom: 15px; }
        .card { background: #0a0a0a; padding: 12px; border-radius: 10px; margin-bottom: 8px; border: 1px solid #1a1a1a; position: relative; }
        .locked { opacity: 0.3; filter: grayscale(1); }
        .lock-tag { position: absolute; right: 10px; top: 10px; font-size: 9px; background: #222; color: #888; padding: 2px 6px; border-radius: 4px; }
        .nav { height: 70px; display: flex; background: #050505; border-top: 1px solid #222; position: absolute; bottom: 0; width: 100%; }
        .tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; color: #333; font-weight: bold; }
        .tab.active { color: var(--n); }
        .modal { position: absolute; inset: 0; background: rgba(0,0,0,0.97); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 25px; }
        .btn { width: 100%; padding: 14px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer; text-decoration: none; display: block; text-align: center; }
        @keyframes pulse { 50% { opacity: 0.2; } }
      `}</style>

      <div className="app">
        {showAds && (
          <div className="modal">
            <div style={{background: '#111', padding: 30, borderRadius: 20, textAlign: 'center', border: '1px solid var(--n)', width: '100%'}}>
              <h2 style={{color: 'var(--n)', marginBottom: 10}}>ВЫ КРАСАВЧИК!</h2>
              <p style={{color: '#888', marginBottom: 20, fontSize: 14, lineHeight: 1.4}}>Вы достигли 3 уровня и совершили {totalTrades} сделок. Пора переходить к реальной прибыли!</p>
              <a href="https://t.me/kriptoalians" className="btn" style={{background: 'var(--w)', color: '#000', marginBottom: 12}}>ТОРГОВАТЬ НА РЕАЛЕ</a>
              <button onClick={() => setShowAds(false)} style={{background: 'none', border: 'none', color: '#444'}}>Продолжить демо</button>
            </div>
          </div>
        )}

        {result && (
          <div className="modal">
            <div style={{background: '#0a0a0a', padding: 30, borderRadius: 20, textAlign: 'center', border: `1px solid ${result.win ? 'var(--w)' : 'var(--l)'}`, width: '80%'}}>
              <h1 style={{color: result.win ? 'var(--w)' : 'var(--l)', fontSize: 24, marginBottom: 10}}>{result.win ? 'WIN' : 'LOSS'}</h1>
              <p style={{fontSize: 26, marginBottom: 20, fontWeight: 'bold'}}>{result.win ? `+$${result.val}` : `-$${result.val}`}</p>
              <button className="btn" style={{background: '#fff', color: '#000'}} onClick={() => setResult(null)}>ЗАКРЫТЬ</button>
            </div>
          </div>
        )}

        <header className="header">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
            <div className="balance">${balance.toFixed(2)}</div>
            <div style={{fontSize: 14, color: 'var(--n)', fontWeight: 'bold'}}>УРОВЕНЬ {level}</div>
          </div>
          <div className="xp-container"><div className="xp-fill" style={{width: `${progress}%`}}></div></div>
          <div style={{fontSize: 10, color: '#444', marginTop: 5, display: 'flex', justifyContent: 'space-between'}}>
             <span>СДЕЛКИ: {tradesInLevel} / {neededForNext}</span>
             <span>ВСЕГО: {totalTrades}</span>
          </div>
        </header>

        <main className="main">
          {tab === 'trade' && (
            <>
              {!selectedDex ? (
                <div>
                  <div className="sig">
                    {isAnalyzing ? (
                      <div style={{textAlign: 'center', color: 'var(--n)', animation: 'pulse 1s infinite', fontSize: 13}}>ПОИСК СИГНАЛА...</div>
                    ) : signal ? (
                      <div>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 10}}>
                          <b style={{fontSize: 18}}>{signal.coin} / USDT</b>
                          <b style={{color: 'var(--w)'}}>+{signal.perc}%</b>
                        </div>
                        <div style={{fontSize: 11, color: '#666', background: '#000', padding: '5px 10px', borderRadius: 5}}>
                          {signal.buyDex} <span style={{color: 'var(--n)'}}>→</span> {signal.sellDex}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {DEX.map(d => (
                    <div key={d.name} className="card" onClick={() => setSelectedDex(d.name)} style={{cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                      <b>{d.name}</b> <div style={{width: 8, height: 8, background: 'var(--w)', borderRadius: '50%', boxShadow: '0 0 10px var(--w)'}}></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedDex(null)} style={{background: 'none', color: '#555', border: 'none', marginBottom: 10, fontWeight: 'bold'}}>← НАЗАД К БИРЖАМ</button>
                  <div className="card" style={{borderColor: 'var(--n)', marginBottom: 15, background: '#000'}}>
                    <div style={{display: 'flex', gap: 10, marginBottom: 10}}>
                      <div style={{flex:1}}><label style={{fontSize:9, color:'#444'}}>СУММА</label><input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} style={{width:'100%', background:'none', border:'none', color:'#fff', fontSize:18, fontWeight:'bold', outline:'none'}} /></div>
                      <div style={{flex:1}}><label style={{fontSize:9, color:'#444'}}>ПЛЕЧО</label><input type="number" value={leverage} onChange={e => setLeverage(Number(e.target.value))} style={{width:'100%', background:'none', border:'none', color:'#fff', fontSize:18, fontWeight:'bold', outline:'none'}} /></div>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13}}>
                      <span style={{color: '#555'}}>ОЖИДАЕМАЯ ПРИБЫЛЬ:</span> <b style={{color: 'var(--w)'}}>+${calcProfit}</b>
                    </div>
                  </div>
                  {COINS.map(c => {
                    const isLocked = c.lvl > level;
                    return (
                      <div key={c.id} className={`card ${isLocked ? 'locked' : ''}`}>
                        {isLocked && <div className="lock-tag">НУЖЕН LVL {c.lvl}</div>}
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <div>
                            <b style={{fontSize: 16}}>{c.id} / USDT</b>
                            <div style={{fontSize: 10, color: '#444'}}>${c.base}</div>
                          </div>
                          {activePos?.id === c.id ? (
                            <button className="btn" style={{width: 90, background: netTimer ? '#111' : 'var(--l)', color: '#fff', fontSize: 12}} onClick={handleSell}>
                              {netTimer ? `${netTimer}s` : 'SELL'}
                            </button>
                          ) : (
                            <button className="btn" style={{width: 90, background: 'var(--w)', color: '#000', fontSize: 12}} onClick={() => handleBuy(c)} disabled={!!activePos || isLocked}>
                              BUY
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'mining' && (
            <div style={{height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
               <div onClick={() => setBalance(b => b + 0.1)} style={{width: 200, height: 200, border: '5px solid var(--n)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, color: 'var(--n)', cursor: 'pointer', boxShadow: '0 0 30px rgba(0,217,255,0.1)'}}>$</div>
            </div>
          )}

          {tab === 'opts' && (
            <div style={{padding: 10, textAlign: 'center'}}>
               <p style={{color: '#444', fontSize: 12, marginBottom: 20}}>ВЕРСИЯ: 2.0.4 PRO</p>
               <a href="https://t.me/kriptoalians" style={{color: 'var(--n)', textDecoration: 'none', fontSize: 16, fontWeight: 'bold'}}>ПОДДЕРЖКА @KRIPTOALIANS</a>
            </div>
          )}
        </main>

        <nav className="nav">
          <div onClick={() => setTab('mining')} className={`tab ${tab === 'mining' ? 'active' : ''}`}>МАЙНИНГ</div>
          <div onClick={() => setTab('trade')} className={`tab ${tab === 'trade' ? 'active' : ''}`}>БИРЖА</div>
          <div onClick={() => setTab('opts')} className={`tab ${tab === 'opts' ? 'active' : ''}`}>ОПЦИИ</div>
        </nav>
      </div>
    </div>
  );
}
