import React, { useState, useEffect } from 'react';

// ... (ASSETS и DEXES остаются прежними)
const ASSETS = {
  USDT: { symbol: 'USDT', name: 'Tether', price: 1, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 145.50, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 605.20, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' }
};

export default function AppWithSlippage() {
  const [amount, setAmount] = useState('');
  const [activeDex, setActiveDex] = useState('UNISWAP');
  const [slippage, setSlippage] = useState(0.5);
  const [priceImpact, setPriceImpact] = useState(0.01);

  // Имитация живого рынка: Slippage и Impact немного "плавают"
  useEffect(() => {
    const interval = setInterval(() => {
      setPriceImpact(prev => {
        const baseImpact = amount > 1000 ? (amount / 50000) : 0.01;
        return Math.max(0.01, baseImpact + (Math.random() * 0.02 - 0.01));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [amount]);

  const theme = activeDex === 'PANCAKE' ? { bg: '#f6f6f9', text: '#280d5f', card: '#fff', accent: '#1fc7d4' } : { bg: '#060814', text: '#fff', card: '#131823', accent: '#39f2af' };

  return (
    <div style={{ width: '100vw', height: '100dvh', background: theme.bg, color: theme.text, fontFamily: 'sans-serif', padding: 20, boxSizing: 'border-box' }}>
      
      <div style={{ background: theme.card, padding: 25, borderRadius: 32, marginTop: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: 13, opacity: 0.8 }}>
          <b>Обмен</b>
          <div style={{ display: 'flex', gap: 10 }}>
             <span>Slippage: <span style={{ color: theme.accent }}>{slippage}%</span></span>
             <span style={{ fontSize: 16 }}>⚙️</span>
          </div>
        </div>

        {/* Поле ввода */}
        <div style={{ background: 'rgba(128,128,128,0.05)', padding: 15, borderRadius: 20 }}>
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0" 
            style={{ background: 'none', border: 'none', fontSize: 32, color: 'inherit', outline: 'none', width: '100%' }} 
          />
        </div>

        {/* ТЕХНИЧЕСКАЯ ИНФОРМАЦИЯ (Slippage & Routing) */}
        <div style={{ marginTop: 20, padding: '0 5px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8, opacity: 0.6 }}>
              <span>Влияние на цену (Price Impact)</span>
              <span style={{ color: priceImpact > 0.1 ? '#ff4d4d' : theme.accent }}>
                {amount ? `<${priceImpact.toFixed(2)}%` : '0.00%'}
              </span>
           </div>
           
           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8, opacity: 0.6 }}>
              <span>Маршрут (Route)</span>
              <span>USDT ➔ {activeDex} ➔ SOL</span>
           </div>

           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.6 }}>
              <span>Минимум к получению</span>
              <span>{amount ? (amount / 145.5 * 0.995).toFixed(4) : '0.00'} SOL</span>
           </div>
        </div>

        <button style={{ 
          width: '100%', 
          marginTop: 25, 
          padding: 20, 
          borderRadius: 20, 
          border: 'none', 
          background: theme.accent, 
          color: '#000', 
          fontWeight: '900',
          fontSize: 16,
          boxShadow: `0 4px 15px ${theme.accent}44`
        }}>
          ОБМЕНЯТЬ
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, opacity: 0.4, marginTop: 20 }}>
        Газ (Network Fee): ~$2.41 • Обновление через 2с
      </p>
    </div>
  );
}
