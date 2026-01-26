import React, { useState, useEffect } from 'react';

// Конфигурация активов
const ASSETS = {
  USDT: { symbol: 'USDT', price: 1, icon: '💵' },
  SOL: { symbol: 'SOL', price: 145.50, icon: '🟣' },
  ETH: { symbol: 'ETH', price: 2600.00, icon: '🔷' },
  BNB: { symbol: 'BNB', price: 605.20, icon: '🟡' }
};

export default function App() {
  const [balance, setBalance] = useState(1000.00);
  const [wallet, setWallet] = useState({});
  const [view, setView] = useState('main'); // main, dex, settings
  const [activeDex, setActiveDex] = useState(null);
  const [amount, setAmount] = useState('');
  const [toast, setToast] = useState(null);

  // Инициализация Telegram
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  const showNotification = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSwap = () => {
    const num = Number(amount);
    if (!num || num <= 0) return showNotification("Введите сумму!");
    
    if (balance >= num) {
      setBalance(prev => prev - num);
      setWallet(prev => ({ ...prev, SOL: (prev.SOL || 0) + (num / 145.5) }));
      showNotification("Сделка успешна! +SOL");
      setActiveDex(null);
      setAmount('');
    } else {
      showNotification("Недостаточно USDT!");
    }
  };

  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '450px', padding: '20px', boxSizing: 'border-box' }}>
        
        {/* Экран Настроек */}
        {view === 'settings' ? (
          <div>
            <button onClick={() => setView('main')} style={s.backBtn}>← Назад</button>
            <h2 style={{textAlign: 'center'}}>Настройки</h2>
            <div style={s.card}>
              <p>Создатель: <a href="https://t.me/kriptoalians" style={{color: '#39f2af'}}>@kriptoalians</a></p>
            </div>
            <button onClick={() => setBalance(prev => prev + 1000)} style={s.mainBtn}>Админ: +1000$</button>
          </div>
        ) : activeDex ? (
          /* Экран DEX */
          <div>
            <button onClick={() => setActiveDex(null)} style={s.backBtn}>← Отмена</button>
            <h2 style={{textAlign: 'center'}}>{activeDex}</h2>
            
            <div style={s.card}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.6}}>
                <span>Отдаете USDT</span>
                <span onClick={() => setAmount(balance.toString())} style={{color: '#39f2af', cursor: 'pointer'}}>MAX: {balance.toFixed(2)}</span>
              </div>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                style={s.input} 
                placeholder="0.0"
              />
            </div>

            <button onClick={handleSwap} style={s.mainBtn}>ОБМЕНЯТЬ</button>
          </div>
        ) : (
          /* Главный экран */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#39f2af', fontSize: '12px', fontWeight: 'bold' }}>● LIVE</div>
              <button onClick={() => setView('settings')} style={s.iconBtn}>⚙️</button>
            </div>

            <div style={{ textAlign: 'center', margin: '40px 0' }}>
              <h1 style={{ fontSize: '50px', margin: 0 }}>${balance.toFixed(2)}</h1>
              <p style={{ opacity: 0.5, fontSize: '12px' }}>ВАШ БАЛАНС</p>
            </div>

            <div style={s.card}>
              <p style={{fontSize: '10px', color: '#39f2af', fontWeight: 'bold', marginTop: 0}}>КОШЕЛЕК</p>
              {Object.keys(wallet).map(coin => (
                <div key={coin} style={{display: 'flex', justifyContent: 'space-between', padding: '5px 0'}}>
                  <span>{coin}</span><b>{wallet[coin].toFixed(4)}</b>
                </div>
              ))}
              {Object.keys(wallet).length === 0 && <p style={{opacity: 0.3}}>Нет активов</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
              {['UNISWAP', 'PANCAKE', 'RAYDIUM', '1INCH'].map(dex => (
                <button key={dex} onClick={() => setActiveDex(dex)} style={s.dexBtn}>{dex}</button>
              ))}
            </div>
          </div>
        )}

        {/* Уведомление */}
        {toast && <div style={s.toast}>{toast}</div>}
      </div>
    </div>
  );
}

const s = {
  card: { background: '#111', padding: '15px', borderRadius: '15px', border: '1px solid #222', marginBottom: '15px' },
  mainBtn: { width: '100%', background: '#39f2af', color: '#000', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' },
  dexBtn: { background: '#111', border: '1px solid #222', color: '#fff', padding: '20px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' },
  iconBtn: { background: '#111', border: 'none', color: '#fff', padding: '8px', borderRadius: '10px', cursor: 'pointer' },
  backBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer', marginBottom: '10px' },
  input: { background: 'none', border: 'none', color: '#fff', fontSize: '24px', width: '100%', outline: 'none', marginTop: '10px' },
  toast: { position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#39f2af', color: '#000', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', zIndex: 1000 }
};
