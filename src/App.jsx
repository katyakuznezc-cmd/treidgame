import React, { useState, useEffect } from 'react';

// --- Константы сетей ---
const NETWORKS = {
  ETH: { name: 'Ethereum', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', color: '#627EEA' },
  BSC: { name: 'BNB Chain', icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png', color: '#F3BA2F' },
  SOL: { name: 'Solana', icon: 'https://cryptologos.cc/logos/solana-sol-logo.png', color: '#14F195' },
  POLY: { name: 'Polygon', icon: 'https://cryptologos.cc/logos/polygon-matic-logo.png', color: '#8247E5' },
  ARB: { name: 'Arbitrum', icon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png', color: '#28A0F0' }
};

const ASSETS = {
  USDT: { symbol: 'USDT', name: 'Tether', price: 1, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 145.50, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 605.20, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  DOGE: { symbol: 'DOGE', name: 'Dogecoin', price: 0.16, icon: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
  XRP: { symbol: 'XRP', name: 'XRP', price: 0.62, icon: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
  TRX: { symbol: 'TRX', name: 'TRON', price: 0.12, icon: 'https://cryptologos.cc/logos/tron-trx-logo.png' }
};

const DEXES = ['UNISWAP', 'RAYDIUM', 'PANCAKE', '1INCH'];

export default function AppWithNetworks() {
  const [balanceUSDT, setBalanceUSDT] = useState(() => Number(localStorage.getItem('arb_balance')) || 1000.00);
  const [wallet, setWallet] = useState(() => JSON.parse(localStorage.getItem('arb_wallet')) || {});
  const [activeDex, setActiveDex] = useState(null);
  const [currentNet, setCurrentNet] = useState(NETWORKS.ETH);
  const [showNetList, setShowNetList] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payToken, setPayToken] = useState(ASSETS.USDT);
  const [receiveToken, setReceiveToken] = useState(ASSETS.SOL);
  const [amount, setAmount] = useState('');

  // При смене биржи ставим дефолтную сеть
  useEffect(() => {
    if (activeDex === 'PANCAKE') setCurrentNet(NETWORKS.BSC);
    else if (activeDex === 'RAYDIUM') setCurrentNet(NETWORKS.SOL);
    else if (activeDex === 'UNISWAP') setCurrentNet(NETWORKS.ETH);
  }, [activeDex]);

  const handleSwap = () => {
    if (!amount || amount <= 0) return;
    setIsProcessing(true);
    setTimeout(() => {
      const num = Number(amount);
      if (payToken.symbol === 'USDT') {
        if (balanceUSDT >= num) {
          setBalanceUSDT(b => b - num);
          setWallet(w => ({ ...w, [receiveToken.symbol]: (w[receiveToken.symbol] || 0) + (num / receiveToken.price) }));
        }
      } else {
        const has = wallet[payToken.symbol] || 0;
        if (has >= num) {
          setBalanceUSDT(b => b + (num * payToken.price));
          setWallet(w => ({ ...w, [payToken.symbol]: has - num }));
        }
      }
      setIsProcessing(false);
      setAmount('');
    }, 5000);
  };

  const theme = activeDex === 'PANCAKE' ? { bg: '#f6f6f9', text: '#280d5f', card: '#fff' } :
                activeDex === 'UNISWAP' ? { bg: '#fff', text: '#000', card: '#f7f8fa' } :
                { bg: '#0c0d21', text: '#fff', card: '#14162e' };

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* Главный экран выбора DEX */}
      {!activeDex && (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <h1 style={{ fontSize: 42, margin: '40px 0 10px' }}>${balanceUSDT.toFixed(2)}</h1>
          <p style={{ opacity: 0.5, marginBottom: 40 }}>БАЛАНС КОШЕЛЬКА</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            {DEXES.map(d => (
              <button key={d} onClick={() => setActiveDex(d)} style={{ background: '#111', border: '1px solid #222', color: '#fff', padding: 25, borderRadius: 20, fontWeight: 'bold' }}>{d}</button>
            ))}
          </div>
        </div>
      )}

      {/* Окно биржи */}
      {activeDex && (
        <div style={{ height: '100%', background: theme.bg, color: theme.text, display: 'flex', flexDirection: 'column' }}>
          
          {/* HEADER БИРЖИ С ВЫБОРОМ СЕТИ */}
          <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <b style={{ fontSize: 18 }}>{activeDex}</b>
              {/* КНОПКА СЕТИ */}
              <div onClick={() => setShowNetList(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(128,128,128,0.1)', padding: '5px 10px', borderRadius: 12, cursor: 'pointer' }}>
                <img src={currentNet.icon} width="14" height="14" />
                <span style={{ fontSize: 11, fontWeight: 'bold' }}>{currentNet.name} ▾</span>
              </div>
            </div>
            <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: 'inherit', fontSize: 14 }}>Выход</button>
          </div>

          <div style={{ padding: 15 }}>
            <div style={{ background: theme.card, padding: 20, borderRadius: 30, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
              
              {/* Поля обмена (упрощенно для примера) */}
              <div style={{ background: 'rgba(128,128,128,0.05)', padding: 15, borderRadius: 20 }}>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 10 }}>ВЫ ОТДАЕТЕ</div>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" style={{ background: 'none', border: 'none', fontSize: 28, color: 'inherit', outline: 'none', width: '100%' }} />
              </div>

              <div style={{ textAlign: 'center', margin: '10px 0' }}>↓</div>

              <div style={{ background: 'rgba(128,128,128,0.05)', padding: 15, borderRadius: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 10 }}>ВЫ ПОЛУЧАЕТЕ</div>
                <div style={{ fontSize: 28 }}>{amount ? (amount * 1.02).toFixed(2) : '0.0'}</div>
              </div>

              <button onClick={handleSwap} style={{ width: '100%', padding: 20, borderRadius: 20, border: 'none', background: '#39f2af', color: '#000', fontWeight: 'bold', fontSize: 16 }}>
                ПОДТВЕРДИТЬ
              </button>
            </div>
          </div>

          {/* Всплывающий список сетей */}
          {showNetList && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 5000, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ background: '#111', width: '100%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                  <b>Выберите сеть</b>
                  <button onClick={() => setShowNetList(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20 }}>&times;</button>
                </div>
                {Object.values(NETWORKS).map(net => (
                  <div key={net.name} onClick={() => { setCurrentNet(net); setShowNetList(false); }} style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '15px 0', borderBottom: '1px solid #222' }}>
                    <img src={net.icon} width="24" height="24" />
                    <span style={{ fontWeight: currentNet.name === net.name ? 'bold' : 'normal' }}>{net.name}</span>
                    {currentNet.name === net.name && <span style={{ marginLeft: 'auto', color: '#39f2af' }}>●</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isProcessing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 6000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #111', borderTopColor: '#39f2af', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: 20 }}>Синхронизация с {currentNet.name}...</p>
        </div>
      )}

      <style>{` @keyframes spin { to { transform: rotate(360deg); } } `}</style>
    </div>
  );
}
