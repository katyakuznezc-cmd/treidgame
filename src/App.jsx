import React, { useState, useEffect } from 'react';

// База данных токенов
const ASSETS = {
  USDT: { symbol: 'USDT', name: 'Tether', price: 1, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 145.50, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2600.00, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 605.20, icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' }
};

export default function RealExchangeApp() {
  // Глобальное состояние кошелька
  const [balanceUSDT, setBalanceUSDT] = useState(1000.00);
  const [inventory, setInventory] = useState({ symbol: null, amount: 0 });
  
  // Состояния интерфейса
  const [activeDex, setActiveDex] = useState(null); // 'UNISWAP', 'RAYDIUM'
  const [signal, setSignal] = useState(null);
  const [amountInput, setAmountInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTokenList, setShowTokenList] = useState(false);
  const [selectedToken, setSelectedToken] = useState(ASSETS.SOL);

  // 1. Генерация подробного сигнала
  useEffect(() => {
    if (!signal) {
      const tokens = [ASSETS.SOL, ASSETS.ETH, ASSETS.BNB];
      const coin = tokens[Math.floor(Math.random() * tokens.length)];
      const profit = (Math.random() * 4 + 3).toFixed(2);
      setSignal({
        coin: coin,
        buyAt: 'UNISWAP',
        sellAt: 'RAYDIUM',
        profit: profit,
        buyPrice: coin.price.toFixed(2),
        sellPrice: (coin.price * (1 + profit/100)).toFixed(2)
      });
    }
  }, [signal]);

  // 2. ЛОГИКА КНОПКИ SWAP (ПОКУПКА/ПРОДАЖА)
  const handleAction = () => {
    if (!amountInput || amountInput <= 0) return;
    
    setIsProcessing(true);
    
    setTimeout(() => {
      // РЕЖИМ ПОКУПКИ (Если в кошельке пусто)
      if (inventory.amount === 0) {
        const cost = Number(amountInput);
        if (cost <= balanceUSDT) {
          const qty = cost / selectedToken.price;
          setBalanceUSDT(prev => prev - cost);
          setInventory({ symbol: selectedToken.symbol, amount: qty });
        }
      } 
      // РЕЖИМ ПРОДАЖИ (Если в кошельке есть актив)
      else if (inventory.symbol === selectedToken.symbol) {
        const isCorrectDex = activeDex === signal?.sellAt;
        const profitMod = isCorrectDex ? (1 + Number(signal.profit)/100) : 0.8; // Штраф за неверную биржу
        
        const finalReturn = (inventory.amount * selectedToken.price) * profitMod;
        setBalanceUSDT(prev => prev + finalReturn);
        setInventory({ symbol: null, amount: 0 });
        setSignal(null); // Сигнал выполнен
      }
      
      setIsProcessing(false);
      setAmountInput('');
    }, 1500);
  };

  // --- UI: СПИСОК ТОКЕНОВ ---
  const TokenModal = () => (
    <div style={{ position: 'absolute', inset: 0, background: '#111', zIndex: 3000, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <b>Выберите токен</b>
        <span onClick={() => setShowTokenList(false)} style={{ cursor: 'pointer' }}>✕</span>
      </div>
      {Object.values(ASSETS).map(token => (
        <div key={token.symbol} onClick={() => { setSelectedToken(token); setShowTokenList(false); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 0', borderBottom: '1px solid #222' }}>
          <img src={token.icon} width="30" />
          <div>
            <div>{token.symbol}</div>
            <div style={{ fontSize: 12, opacity: 0.5 }}>{token.name}</div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {showTokenList && <TokenModal />}

      {/* ГЛАВНЫЙ ХАБ */}
      {!activeDex ? (
        <div style={{ padding: 20 }}>
          <div style={{ textAlign: 'center', margin: '40px 0' }}>
            <h1 style={{ fontSize: 42, fontWeight: 900 }}>${balanceUSDT.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h1>
            <p style={{ opacity: 0.5, letterSpacing: 2 }}>TOTAL BALANCE</p>
            {inventory.amount > 0 && (
              <div style={{ color: '#00ff88', fontSize: 14 }}>HOLDING: {inventory.amount.toFixed(4)} {inventory.symbol}</div>
            )}
          </div>

          {/* СИГНАЛ */}
          <div style={{ background: '#111', padding: 20, borderRadius: 24, border: '1px solid #222', marginBottom: 25 }}>
            <div style={{ color: '#00ff88', fontSize: 10, fontWeight: 'bold', marginBottom: 10 }}>ACTIVE ARBITRAGE SIGNAL</div>
            {signal ? (
              <div>
                <div style={{ fontSize: 18, fontWeight: 'bold' }}>КУПИТЬ {signal.coin.symbol} на <span style={{ color: '#ff007a' }}>{signal.buyAt}</span></div>
                <div style={{ fontSize: 14, opacity: 0.6 }}>Цена входа: ${signal.buyPrice}</div>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#00ff88', marginTop: 10 }}>ПРОДАТЬ на {signal.sellAt}</div>
                <div style={{ fontSize: 14, opacity: 0.6 }}>Цена выхода: ${signal.sellPrice}</div>
                <div style={{ marginTop: 15, background: 'rgba(0,255,136,0.1)', padding: 10, borderRadius: 12, textAlign: 'center', color: '#00ff88', fontWeight: 'bold' }}>
                  ОЖИДАЕМЫЙ ПРОФИТ: +{signal.profit}%
                </div>
              </div>
            ) : "Scanning liquidity pools..."}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            <button onClick={() => setActiveDex('UNISWAP')} style={{ background: '#1a1a1a', border: '1px solid #333', padding: 25, borderRadius: 20, color: '#fff', fontWeight: 'bold' }}>UNISWAP</button>
            <button onClick={() => setActiveDex('RAYDIUM')} style={{ background: '#1a1a1a', border: '1px solid #333', padding: 25, borderRadius: 20, color: '#fff', fontWeight: 'bold' }}>RAYDIUM</button>
          </div>
        </div>
      ) : (
        /* ТЕРМИНАЛЫ БИРЖИ */
        <div style={{ height: '100%', background: activeDex === 'UNISWAP' ? '#fff' : '#0c0d21', color: activeDex === 'UNISWAP' ? '#000' : '#fff' }}>
          <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
             <b style={{ color: activeDex === 'UNISWAP' ? '#ff007a' : '#39f2af' }}>{activeDex} V3</b>
             <span onClick={() => {setActiveDex(null); setAmountInput('');}} style={{ cursor: 'pointer' }}>ВЫХОД</span>
          </div>

          <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: 420, background: activeDex === 'UNISWAP' ? '#f7f8fa' : '#14162e', borderRadius: 24, padding: 12 }}>
               
               {/* ВХОДЯЩИЙ ТОКЕН */}
               <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : '#050614', padding: 16, borderRadius: 20, marginBottom: 5 }}>
                  <div style={{ fontSize: 12, opacity: 0.5 }}>{inventory.amount === 0 ? 'Вы платите' : 'Вы продаете'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                    <input 
                      type="number" 
                      placeholder="0.0"
                      value={inventory.amount === 0 ? amountInput : inventory.amount.toFixed(4)}
                      onChange={(e) => setAmountInput(e.target.value)}
                      disabled={inventory.amount > 0}
                      style={{ background: 'none', border: 'none', fontSize: 28, color: 'inherit', width: '60%', outline: 'none' }}
                    />
                    <button onClick={() => setShowTokenList(true)} style={{ background: 'rgba(128,128,128,0.1)', border: 'none', borderRadius: 12, padding: '5px 12px', color: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                       <img src={inventory.amount === 0 ? ASSETS.USDT.icon : selectedToken.icon} width="20" />
                       {inventory.amount === 0 ? 'USDT' : inventory.symbol} ▾
                    </button>
                  </div>
               </div>

               <div style={{ textAlign: 'center', margin: '-10px 0', position: 'relative', zIndex: 2 }}>
                  <div style={{ background: activeDex === 'UNISWAP' ? '#f7f8fa' : '#14162e', border: '4px solid ' + (activeDex === 'UNISWAP' ? '#f7f8fa' : '#14162e'), borderRadius: 12, display: 'inline-block', padding: 5 }}>↓</div>
               </div>

               {/* ВЫХОДЯЩИЙ ТОКЕН */}
               <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : '#050614', padding: 16, borderRadius: 20, marginBottom: 20 }}>
                  <div style={{ fontSize: 12, opacity: 0.5 }}>Вы получаете</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                    <div style={{ fontSize: 28 }}>
                       {inventory.amount === 0 
                         ? (amountInput ? (amountInput / selectedToken.price).toFixed(4) : '0') 
                         : (inventory.amount * selectedToken.price).toFixed(2)}
                    </div>
                    <button onClick={() => setShowTokenList(true)} style={{ background: activeDex === 'UNISWAP' ? '#ff007a' : '#39f2af', border: 'none', borderRadius: 12, padding: '5px 12px', color: activeDex === 'UNISWAP' ? '#fff' : '#000', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 5 }}>
                       <img src={inventory.amount === 0 ? selectedToken.icon : ASSETS.USDT.icon} width="20" />
                       {inventory.amount === 0 ? selectedToken.symbol : 'USDT'} ▾
                    </button>
                  </div>
               </div>

               <button onClick={handleAction} style={{ 
                 width: '100%', padding: 18, borderRadius: 20, border: 'none', fontSize: 18, fontWeight: 'bold',
                 background: activeDex === 'UNISWAP' ? 'rgba(255, 0, 122, 0.15)' : '#39f2af',
                 color: activeDex === 'UNISWAP' ? '#ff007a' : '#000'
               }}>
                 {isProcessing ? 'Обработка...' : (inventory.amount === 0 ? 'КУПИТЬ' : 'ПРОДАТЬ')}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Анимация загрузки */}
      {isProcessing && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
           <div className="loader"></div>
           <p style={{ marginTop: 20 }}>Транзакция в сети...</p>
        </div>
      )}

      <style>{`
        .loader { width: 48px; height: 48px; border: 5px solid #FFF; border-bottom-color: #ff007a; border-radius: 50%; animation: rotation 1s linear infinite; }
        @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
