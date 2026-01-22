import React, { useState, useEffect } from 'react';

// Список реальных токенов для выбора
const TOKEN_LIST = [
  { id: 'USDT', name: 'Tether USD', img: 'https://cryptologos.cc/logos/tether-usdt-logo.png', price: 1 },
  { id: 'SOL', name: 'Solana', img: 'https://cryptologos.cc/logos/solana-sol-logo.png', price: 145 },
  { id: 'ETH', name: 'Ethereum', img: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', price: 2600 },
  { id: 'CRO', name: 'Cronos', img: 'https://cryptologos.cc/logos/cronos-cro-logo.png', price: 0.16 },
  { id: 'BNB', name: 'BNB', img: 'https://cryptologos.cc/logos/bnb-bnb-logo.png', price: 610 }
];

export default function RealArbitrageApp() {
  // Состояния кошелька
  const [balance, setBalance] = useState(2500.00); // Баланс в USDT
  const [inventory, setInventory] = useState({ coin: null, amount: 0 }); // Что сейчас в кошельке
  
  // Состояния интерфейса
  const [activeDex, setActiveDex] = useState(null);
  const [amountIn, setAmountIn] = useState('');
  const [selectedToken, setSelectedToken] = useState(TOKEN_LIST[1]); // По умолчанию SOL
  const [showTokenList, setShowTokenList] = useState(false);
  
  // Состояния сигнала
  const [signal, setSignal] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Состояния транзакции
  const [txStatus, setTxStatus] = useState('idle'); // idle, pending, success

  // 1. ГЕНЕРАЦИЯ РЕАЛЬНОГО СИГНАЛА
  useEffect(() => {
    if (!signal) {
      const coin = TOKEN_LIST[Math.floor(Math.random() * (TOKEN_LIST.length - 1)) + 1];
      const dexs = ['UNISWAP', 'RAYDIUM', 'PANCAKE', 'CRODEX'];
      const buyDex = dexs[Math.floor(Math.random() * 4)];
      let sellDex = dexs[Math.floor(Math.random() * 4)];
      while (sellDex === buyDex) sellDex = dexs[Math.floor(Math.random() * 4)];

      setSignal({ coin: coin.id, buyAt: buyDex, sellAt: sellDex, profit: (Math.random() * 6 + 4).toFixed(2) });
      setTimeLeft(60); // 60 секунд на сделку
    }
  }, [signal]);

  // 2. ТАЙМЕР СИГНАЛА
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (signal) {
      setSignal(null); // Сигнал протух
    }
  }, [timeLeft, signal]);

  // 3. ЛОГИКА ПОКУПКИ / ПРОДАЖИ
  const handleTrade = () => {
    if (!amountIn || Number(amountIn) <= 0) return;
    setTxStatus('pending');

    setTimeout(() => {
      // Если мы ПОКУПАЕМ (в кошельке пусто)
      if (inventory.amount === 0) {
        const boughtAmount = Number(amountIn) / selectedToken.price;
        setBalance(prev => prev - Number(amountIn));
        setInventory({ coin: selectedToken.id, amount: boughtAmount });
      } 
      // Если мы ПРОДАЕМ (в кошельке есть монета)
      else {
        const isCorrectDex = activeDex === signal?.sellAt;
        const baseValue = inventory.amount * selectedToken.price;
        const finalProfit = isCorrectDex ? (baseValue * (1 + signal.profit/100)) : (baseValue * 0.7);
        
        setBalance(prev => prev + finalProfit);
        setInventory({ coin: null, amount: 0 });
      }
      
      setTxStatus('success');
      setTimeout(() => { setTxStatus('idle'); setAmountIn(''); }, 1500);
    }, 2000);
  };

  // --- UI КОМПОНЕНТ: ВЫБОР ТОКЕНА (Оригинальный список) ---
  const TokenSelector = () => (
    <div style={{ position: 'absolute', inset: 0, background: '#111', zIndex: 2000, padding: 20, animation: 'fadeIn 0.2s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <b>Выберите токен</b>
        <span onClick={() => setShowTokenList(false)}>✕</span>
      </div>
      <input placeholder="Поиск по имени или адресу" style={{ width: '100%', padding: 12, background: '#222', border: '1px solid #333', borderRadius: 12, color: '#fff', marginBottom: 20 }} />
      {TOKEN_LIST.map(token => (
        <div key={token.id} onClick={() => { setSelectedToken(token); setShowTokenList(false); }} style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '12px 0', borderBottom: '1px solid #222' }}>
          <img src={token.img} width="32" height="32" style={{ borderRadius: '50%' }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{token.id}</div>
            <div style={{ fontSize: 12, opacity: 0.5 }}>{token.name}</div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#000', color: '#fff', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      {showTokenList && <TokenSelector />}

      {/* ГЛАВНЫЙ ЭКРАН (HUB) */}
      {!activeDex ? (
        <div style={{ padding: 20 }}>
          <header style={{ textAlign: 'center', margin: '30px 0' }}>
            <h1 style={{ fontSize: 40, margin: 0 }}>${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h1>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 10 }}>
              {inventory.amount > 0 && <span style={{ background: '#39f2af', color: '#000', padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>В кошельке: {inventory.amount.toFixed(4)} {inventory.coin}</span>}
            </div>
          </header>

          {/* ЖИВОЙ СИГНАЛ */}
          <div style={{ background: '#111', padding: 20, borderRadius: 24, border: '1px solid #222', position: 'relative' }}>
            {signal ? (
              <>
                <div style={{ position: 'absolute', top: 15, right: 15, color: timeLeft < 15 ? '#ff4444' : '#39f2af', fontWeight: 'bold' }}>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</div>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 5 }}>АРБИТРАЖНАЯ СВЯЗКА:</div>
                <div style={{ fontSize: 18, fontWeight: 'bold' }}>1. Купи {signal.coin} на <span style={{ color: '#ff007a' }}>{signal.buyAt}</span></div>
                <div style={{ fontSize: 18, fontWeight: 'bold' }}>2. Продай на <span style={{ color: '#39f2af' }}>{signal.sellAt}</span></div>
                <div style={{ marginTop: 10, padding: '8px', background: 'rgba(57, 242, 175, 0.1)', borderRadius: 10, color: '#39f2af', textAlign: 'center', fontWeight: 'bold' }}>ПРОФИТ: +{signal.profit}%</div>
              </>
            ) : "Поиск аномалий на биржах..."}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginTop: 25 }}>
            {['UNISWAP', 'RAYDIUM', 'PANCAKE', 'CRODEX'].map(id => (
              <button key={id} onClick={() => setActiveDex(id)} style={{ background: '#1a1a1a', border: '1px solid #333', padding: 25, borderRadius: 20, color: '#fff', fontWeight: 'bold' }}>{id}</button>
            ))}
          </div>
        </div>
      ) : (
        /* РЕАЛЬНЫЙ ИНТЕРФЕЙС БИРЖИ */
        <div style={{ height: '100%', background: activeDex === 'UNISWAP' ? '#fff' : '#0c0d21', color: activeDex === 'UNISWAP' ? '#000' : '#fff' }}>
           <div style={{ padding: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
             <b style={{ color: activeDex === 'RAYDIUM' ? '#39f2af' : (activeDex === 'UNISWAP' ? '#ff007a' : 'inherit') }}>{activeDex}</b>
             <button onClick={() => setActiveDex(null)} style={{ background: 'none', border: 'none', color: 'inherit' }}>Выход</button>
           </div>

           <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
             <div style={{ width: '100%', maxWidth: 400, background: activeDex === 'UNISWAP' ? '#f5f6fc' : '#14162e', borderRadius: 24, padding: 15 }}>
                
                {/* ВВОД */}
                <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : '#050614', padding: 15, borderRadius: 16 }}>
                  <div style={{ fontSize: 12, opacity: 0.5 }}>{inventory.amount === 0 ? 'Вы платите' : 'Вы продаете'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                    <input 
                      type="number" 
                      value={inventory.amount === 0 ? amountIn : inventory.amount} 
                      onChange={e => setAmountIn(e.target.value)}
                      disabled={inventory.amount > 0}
                      style={{ background: 'none', border: 'none', fontSize: 24, color: 'inherit', width: '60%', outline: 'none' }} 
                    />
                    <button onClick={() => setShowTokenList(true)} style={{ background: 'rgba(128,128,128,0.1)', border: 'none', padding: '5px 10px', borderRadius: 12, color: 'inherit', fontWeight: 'bold' }}>
                      {inventory.amount === 0 ? 'USDT' : inventory.coin} ▾
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: 'center', margin: '10px 0' }}>↓</div>

                {/* ВЫВОД */}
                <div style={{ background: activeDex === 'UNISWAP' ? '#fff' : '#050614', padding: 15, borderRadius: 16, marginBottom: 20 }}>
                   <div style={{ fontSize: 12, opacity: 0.5 }}>Вы получите</div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                      <div style={{ fontSize: 24 }}>
                        {inventory.amount === 0 ? (amountIn / selectedToken.price).toFixed(4) : (inventory.amount * selectedToken.price).toFixed(2)}
                      </div>
                      <button onClick={() => setShowTokenList(true)} style={{ background: activeDex === 'UNISWAP' ? '#ff007a' : '#39f2af', border: 'none', padding: '5px 10px', borderRadius: 12, color: '#000', fontWeight: 'bold' }}>
                        {inventory.amount === 0 ? selectedToken.id : 'USDT'} ▾
                      </button>
                   </div>
                </div>

                <button onClick={handleTrade} style={{ 
                  width: '100%', padding: 18, borderRadius: 16, border: 'none', fontWeight: 'bold', fontSize: 18,
                  background: activeDex === 'UNISWAP' ? '#ff007a15' : '#39f2af',
                  color: activeDex === 'UNISWAP' ? '#ff007a' : '#000'
                }}>
                  {txStatus === 'pending' ? 'Обработка...' : (inventory.amount === 0 ? 'Купить' : 'Продать')}
                </button>
             </div>
           </div>
        </div>
      )}

      {/* ЭКРАН ТРАНЗАКЦИИ */}
      {txStatus === 'pending' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 5000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 50, height: 50, border: '4px solid #333', borderTopColor: '#39f2af', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <h3 style={{ marginTop: 20 }}>Отправка в блокчейн...</h3>
        </div>
      )}
    </div>
  );
}
