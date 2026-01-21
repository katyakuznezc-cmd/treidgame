import React, { useState, useEffect, useRef } from 'react';

const EXCHANGES = [
  { id: '1inch', name: '1inch', color: '#00ccff' },
  { id: 'uniswap', name: 'Uniswap v3', color: '#ff007a' },
  { id: 'sushiswap', name: 'SushiSwap', color: '#fa52a0' },
  { id: 'pancakeswap', name: 'PancakeSwap', color: '#d1884f' }
];

const ALL_COINS = [
  { id: 'TON', lvl: 1, base: 5.4 }, { id: 'ARB', lvl: 1, base: 1.1 },
  { id: 'DOGE', lvl: 2, base: 0.15 }, { id: 'MATIC', lvl: 3, base: 0.7 },
  { id: 'ETH', lvl: 4, base: 3400 }, { id: 'SOL', lvl: 5, base: 145 },
  { id: 'BNB', lvl: 8, base: 580 }, { id: 'BTC', lvl: 10, base: 67000 }
];

export default function App() {
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('k_bal')) || 100);
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('k_xp')) || 0);
  const [taps, setTaps] = useState(() => parseInt(localStorage.getItem('k_taps')) || 0);
  const [tradeLogs, setTradeLogs] = useState(() => JSON.parse(localStorage.getItem('k_logs') || '[]'));
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('k_tut_done'));
  const [tutStep, setTutStep] = useState(0);
  const [soundOn, setSoundOn] = useState(() => JSON.parse(localStorage.getItem('k_snd') ?? 'true'));
  const [tab, setTab] = useState('mining');
  const [selectedDex, setSelectedDex] = useState(null);
  const [activePositions, setActivePositions] = useState({});
  const [tradeAmount, setTradeAmount] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [signal, setSignal] = useState(null);
  const [isGreedMode, setIsGreedMode] = useState(false);
  const [tapAnims, setTapAnims] = useState([]);

  const tapAudio = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));
  const signalAudio = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  const currentLvl = Math.floor(Math.sqrt(xp / 50)) + 1;
  const maxLev = currentLvl >= 5 ? 100 : currentLvl >= 3 ? 50 : 10;

  useEffect(() => {
    localStorage.setItem('k_bal', balance.toString());
    localStorage.setItem('k_xp', xp.toString());
    localStorage.setItem('k_logs', JSON.stringify(tradeLogs));
    localStorage.setItem('k_snd', JSON.stringify(soundOn));
  }, [balance, xp, tradeLogs, soundOn]);

  useEffect(() => {
    const genS = () => {
      const available = ALL_COINS.filter(c => c.lvl <= currentLvl);
      const coin = available[Math.floor(Math.random() * available.length)];
      setSignal({ 
        coin: coin.id, 
        sell: EXCHANGES[Math.floor(Math.random()*4)].id, 
        profit: (Math.random()*2+5).toFixed(2), 
        expires: Date.now() + 120000 
      });
      if (soundOn && tab === 'trade') {
        signalAudio.current.currentTime = 0;
        signalAudio.current.play().catch(() => {});
      }
    };
    genS();
    const itv = setInterval(genS, 120000);
    return () => clearInterval(itv);
  }, [currentLvl, soundOn, tab]);

  useEffect(() => {
    const itv = setInterval(() => {
      if (!isGreedMode && Math.random() > 0.8) {
        setIsGreedMode(true);
        setTimeout(() => setIsGreedMode(false), 20000);
      }
    }, 40000);
    return () => clearInterval(itv);
  }, [isGreedMode]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePositions(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          const pos = next[id];
          const elapsed = (Date.now() - pos.startTime) / 1000;
          if (elapsed >= 120) {
            if (pos.status === 'closed') {
              setBalance(b => b + pos.finalAmount);
              setTradeLogs(l => [{id:Date.now(), coin:id, pnl:(pos.finalAmount-pos.margin).toFixed(2), isWin:pos.isWin}, ...l].slice(0,10));
              if (pos.isWin) setXp(x => x + 50);
            }
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
    setTaps(t => t + 1);
    if (soundOn) { tapAudio.current.currentTime = 0; tapAudio.current.play().catch(()=>{}); }
    const touch = (e.touches && e.touches[0]) || e;
    const id = Date.now();
    setTapAnims(p => [...p, { id, x: touch.clientX, y: touch.clientY }]);
    setTimeout(() => setTapAnims(p => p.filter(a => a.id !== id)), 800);
  };

  const openPos = (coinId) => {
    const amt = parseFloat(tradeAmount);
    if (!amt || amt > balance) return;
    setBalance(b => b - amt);
    setActivePositions(p => ({ 
      ...p, 
      [coinId]: { margin: amt, lev: leverage, startTime: Date.now(), status: 'open', dexId: selectedDex } 
    }));
    setTradeAmount('');
  };

  const closePos = (coinId) => {
    const pos = activePositions[coinId];
    if (!pos || pos.status === 'closed') return;
    const isWin = signal && coinId === signal.coin && selectedDex === signal.sell;
    const mult = (isGreedMode && isWin) ? 2.5 : 1.0;
    const pnl = ((isWin ? 10 : -35) * mult) / 100;
    setActivePositions(p => ({ 
      ...p, 
      [coinId]: { ...pos, status: 'closed', finalAmount: Math.max(0, pos.margin + (pos.margin * pos.lev * pnl)), isWin } 
    }));
  };

  return (
    <div style={s.app}>
      <style>{`
        @keyframes flyUp { 0% { opacity:1; transform:translateY(0); } 100% { opacity:0; transform:translateY(-100px); } }
        @keyframes pulse { 50% { opacity: 0.5; } }
      `}</style>

      {tapAnims.map(a => <div key={a.id} style={{...s.tapDollar, left:a.x, top:a.y}}>$</div>)}

      <header style={s.header}>
        <div>
          <div style={{fontSize:10, color:'#555'}}>LVL {currentLvl}</div>
          <div style={s.xpBar}><div style={{...s.xpFill, width:(xp%100)+'%'}} /></div>
        </div>
        <div style={s.balance}>${balance.toFixed(2)}</div>
      </header>

      <main style={s.content}>
        {tab === 'mining' && (
          <div style={s.pageMining}>
            <div style={s.coin} onClick={handleTap}>$</div>
            <div style={s.neonText}>ТАПАЙ И КОПИ</div>
          </div>
        )}

        {tab === 'trade' && (
          <div style={{...s.pageTrade, background: isGreedMode ? '#0a1a0a' : 'transparent'}}>
            {showTutorial && (
              <div style={s.tutOverlay}>
                <div style={s.tutCard}>
                  <h3>{["СИГНАЛЫ","ТОЧКИ","РИСКИ"][tutStep] || "ГОТОВО"}</h3>
                  <p>{["Сигнал внизу экрана подскажет, что купить.","Красная точка покажет, где твоя сделка.","У тебя 120 секунд на закрытие!"][tutStep]}</p>
                  <button style={s.btn} onClick={() => tutStep < 2 ? setTutStep(s=>s+1) : (setShowTutorial(false), localStorage.setItem('k_tut_done','t'))}>ДАЛЕЕ</button>
                </div>
              </div>
            )}

            {!selectedDex ? (
              <div style={s.dexList}>
                {EXCHANGES.map(d => {
                  const hasPos = Object.values(activePositions).some(p => p.dexId === d.id);
                  return (
                    <div key={d.id} style={{...s.dexCard, borderColor:d.color}} onClick={()=>setSelectedDex(d.id)}>
                      {d.name}
                      {hasPos && <div style={s.dot} />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{...s.terminal, borderColor: isGreedMode ? '#39ff14' : '#222'}}>
                {isGreedMode && <div style={s.greedBanner}>🤑 EXTREME GREED X2.5 🤑</div>}
                <div style={s.termTop}>
                  <button onClick={()=>setSelectedDex(null)} style={s.backBtn}>←</button>
                  <input type="number" placeholder="USD" value={tradeAmount} onChange={e=>setTradeAmount(e.target.value)} style={s.input}/>
                  <div style={{fontSize:9}}>x{leverage} <input type="range" min="1" max={maxLev} value={leverage} onChange={e=>setLeverage(parseInt(e.target.value))} /></div>
                </div>
                <div style={s.termBody}>
                  <div style={s.coinSide}>
                    {ALL_COINS.map(c => {
                      const pos = activePositions[c.id];
                      const timeElapsed = pos ? Math.floor((Date.now() - pos.startTime) / 1000) : 0;
                      return (
                        <div key={c.id} style={{...s.coinItem, borderLeft: pos ? '3px solid #00ccff' : 'none'}}>
                          <div style={{display:'flex', flexDirection:'column'}}>
                            <span>{c.id}</span>
                            {pos && <small style={{fontSize:8, color:'#555'}}>{120 - timeElapsed}s</small>}
                          </div>
                          <button style={{...s.tradeBtn, color: pos?.status==='closed'?'#444':'#00ccff'}} onClick={()=>pos?closePos(c.id):openPos(c.id)} disabled={pos?.status==='closed'}>
                            {pos ? (pos.status==='closed'?'WAIT':'CLOSE') : 'OPEN'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div style={s.diary}>
                    <div style={{fontSize:9, color:'#444', marginBottom:5}}>DIARY</div>
                    {tradeLogs.map(l => <div key={l.id} style={{fontSize:8, color: l.isWin?'#39ff14':'#ff0055'}}>{l.coin} {l.pnl}$</div>)}
                  </div>
                </div>
                {signal && <div style={s.signal}>{signal.coin} ➔ {signal.sell} <span style={{color:'#39ff14'}}>+{signal.profit}%</span></div>}
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div style={{padding:20}}>
            <h2 style={s.neonText}>ОПЦИИ</h2>
            <div style={s.settItem}>
              <span>ЗВУК</span>
              <button style={s.btn} onClick={()=>setSoundOn(!soundOn)}>{soundOn?'ВКЛ':'ВЫКЛ'}</button>
            </div>
            <div style={{marginTop:40, textAlign:'center'}}>
              <a href="https://t.me/kriptoalians" style={{color:'#00ccff', textDecoration:'none'}}>CREATORS: @kriptoalians</a>
            </div>
          </div>
        )}
      </main>

      <nav style={s.nav}>
        <button onClick={()=>setTab('mining')} style={{...s.navBtn, color:tab==='mining'?'#00ccff':'#555'}}>КЛИК</button>
        <button onClick={()=>setTab('trade')} style={{...s.navBtn, color:tab==='trade'?'#00ccff':'#555'}}>БИРЖИ</button>
        <button onClick={()=>setTab('settings')} style={{...s.navBtn, color:tab==='settings'?'#00ccff':'#555'}}>ОПЦИИ</button>
      </nav>
    </div>
  );
}

const s = {
  app: { height:'100vh', background:'#050508', color:'#fff', display:'flex', flexDirection:'column', fontFamily:'sans-serif', overflow:'hidden' },
  header: { padding:15, display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #111' },
  balance: { fontSize:22, fontWeight:'bold', color:'#39ff14' },
  xpBar: { width:60, height:4, background:'#222', borderRadius:2, marginTop:4 },
  xpFill: { height:'100%', background:'#00ccff' },
  content: { flex:1, display:'flex', flexDirection:'column', position:'relative' },
  pageMining: { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' },
  coin: { width:150, height:150, borderRadius:'50%', background:'radial-gradient(circle, #00ccff, #004466)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:60, cursor:'pointer', boxShadow:'0 0 30px rgba(0,204,255,0.3)' },
  neonText: { marginTop:20, color:'#00ccff', letterSpacing:2, fontSize:12 },
  tapDollar: { position:'absolute', color:'#39ff14', fontWeight:'bold', pointerEvents:'none', animation:'flyUp 0.8s forwards' },
  nav: { height:60, display:'flex', borderTop:'1px solid #111', background:'#0d0d14' },
  navBtn: { flex:1, background:'none', border:'none', fontWeight:'bold', fontSize:10 },
  pageTrade: { flex:1, display:'flex', flexDirection:'column' },
  dexList: { padding:20, display:'grid', gridTemplateColumns:'1fr 1fr', gap:15 },
  dexCard: { position:'relative', padding:20, border:'1px solid #333', borderRadius:10, textAlign:'center', fontSize:12, background:'#0d0d14' },
  dot: { position:'absolute', top:5, right:5, width:8, height:8, background:'#ff0055', borderRadius:'50%', animation:'pulse 1s infinite' },
  terminal: { flex:1, display:'flex', flexDirection:'column', border:'1px solid #222', margin:10, borderRadius:8, overflow:'hidden', position:'relative' },
  greedBanner: { background:'#39ff14', color:'#000', fontSize:10, fontWeight:'bold', textAlign:'center', padding:4 },
  termTop: { padding:10, borderBottom:'1px solid #111', display:'flex', gap:10, alignItems:'center' },
  input: { background:'#111', border:'1px solid #333', color:'#fff', width:60, padding:5, fontSize:12 },
  backBtn: { background:'none', border:'1px solid #333', color:'#fff', borderRadius:4, padding:'2px 8px' },
  termBody: { display:'flex', flex:1 },
  coinSide: { flex:1, borderRight:'1px solid #111', overflowY:'auto' },
  coinItem: { display:'flex', justifyContent:'space-between', padding:10, borderBottom:'1px solid #080808', fontSize:12 },
  tradeBtn: { background:'none', border:'1px solid #444', fontSize:9, borderRadius:4, padding:'4px 8px' },
  diary: { width:80, padding:5, background:'#020202', overflowY:'auto' },
  signal: { position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.9)', padding:'5px 15px', borderRadius:15, border:'1px solid #39ff14', fontSize:10, whiteSpace:'nowrap' },
  tutOverlay: { position:'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.9)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' },
  tutCard: { background:'#0d0d14', border:'1px solid #00ccff', padding:20, borderRadius:12, textAlign:'center', width:200 },
  settItem: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15 },
  btn: { background:'#00ccff', border:'none', color:'#000', fontWeight:'bold', padding:'5px 15px', borderRadius:4, fontSize:10 }
};
