import React, { useState, useEffect } from 'react';

// Константы активов прямо в коде
const ASSETS = {
  USDT: { symbol: 'USDT', price: 1, icon: '💵' },
  SOL: { symbol: 'SOL', price: 145.50, icon: '🟣' },
  ETH: { symbol: 'ETH', price: 2600.00, icon: '🔷' },
  BNB: { symbol: 'BNB', price: 605.20, icon: '🟡' }
};

export default function App() {
  const [balance, setBalance] = useState(() => Number(localStorage.getItem('user_balance')) || 1000);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('user_wallet')) || {});
  const [view, setView] = useState('main'); 
  const [dex, setDex] = useState(null);
  const [amount, setAmount] = useState('');
  const [toast, setToast] = useState(null);

  // Инициализация Telegram без лишних проверок
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.enableClosingConfirmation();
    }
  }, []);

  // Сохранение локально (вместо базы временно)
  useEffect(() => {
    localStorage.setItem('user_balance', balance);
    localStorage.setItem('user_wallet', JSON.stringify(wallet));
  }, [balance, wallet]);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const trade = () => {
    const val = Number(amount);
    if (!val || val > balance) return notify("Ошибка баланса!");
    
    setBalance(prev => prev - val);
    setWallet(prev => ({ ...prev, SOL: (prev.SOL || 0) + (val / 145.5) }));
    notify("Сделка успешна!");
    setDex(null);
    setAmount('');
  };

  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', display: 'flex', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '450px', padding: '20px', position: 'relative' }}>
        
        {/* Главный экран */}
        {!dex && view === 'main' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
              <span style={{ color: '#39f2af', fontSize: '12px', fontWeight: 'bold' }}>● ONLINE</span>
              <button onClick={() => setView('settings')} style={{ background: '#111', border: 'none', color: '#fff', borderRadius: '10px', padding: '10px' }}>⚙️</button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h1 style={{ fontSize: '50px', margin: 0 }}>${balance.toFixed(2)}</h1>
              <p style={{ opacity: 0.5 }}>USDT BALANCE</p>
            </div>

            <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '15px', border: '1px solid #1a1a1a', marginBottom: '20px' }}>
              <p style={{ fontSize: '10px', color: '#39f2af', margin: '0 0 10px 0' }}>МОИ АКТИВЫ</p>
              {Object.keys(wallet).map(k => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                  <span>{k}</span><b>{wallet[k].toFixed(4)}</b>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {['UNISWAP', 'PANCAKE', 'RAYDIUM', '1INCH'].map(n => (
                <button key={n} onClick={() => setDex(n)} style={{ background: '#111', border: '1px solid #222', color: '#fff', padding: '20px', borderRadius: '15px', fontWeight: 'bold' }}>{n}</button>
              ))}
            </div>
          </>
        )}

        {/* Экран сделки */}
        {dex && (
          <div>
            <button onClick={() => setDex(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px' }}>← Назад</button>
            <h2 style={{ textAlign: 'center' }}>{dex}</h2>
            <div style={{ background: '#111', padding: '20px', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.5 }}>
                <span>Сумма USDT</span>
                <span onClick={() => setAmount(balance.toString())} style={{ color: '#39f2af', fontWeight: 'bold' }}>MAX</span>
              </div>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '30px', width: '100%', outline: 'none' }} placeholder="0.0" />
            </div>
            <button onClick={trade} style={{ width: '100%', background: '#39f2af', color: '#000', padding: '20px', borderRadius: '20px', fontWeight: 'bold', marginTop: '20px', border: 'none' }}>ОБМЕНЯТЬ</button>
          </div>
        )}

        {/* Настройки */}
        {view === 'settings' && (
          <div>
            <button onClick={() => setView('main')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px' }}>← Назад</button>
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
               <a href="https://t.me/kriptoalians" style={{ color: '#39f2af', textDecoration: 'none' }}>Канал Создателя</a>
               <p style={{ opacity: 0.2, marginTop: '100px' }}>v.2.5.0-DEBUG</p>
               <button onClick={() => { setBalance(1000); setWallet({}); }} style={{ background: 'red', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px' }}>Сброс данных</button>
            </div>
          </div>
        )}

        {toast && <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', background: '#39f2af', color: '#000', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold' }}>{toast}</div>}
      </div>
    </div>
  );
}
