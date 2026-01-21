

import React, { useState, useEffect, useRef } from 'react';
import './App.css'; // Подключаем стили

// --- Константы для DEX и Токенов ---
const DEX_PLATFORMS = [
  { id: '1inch', name: '1inch', color: '#2f8af5' },
  { id: 'Uniswap', name: 'Uniswap v3', color: '#ff007a' },
  { id: 'SushiSwap', name: 'SushiSwap', color: '#fa52a0' },
  { id: 'PancakeSwap', name: 'PancakeSwap', color: '#d1884f' }
];

const TOKENS = [
  { name: 'TON', basePrice: 5.2 },
  { name: 'ETH', basePrice: 3400 },
  { name: 'SOL', basePrice: 145 },
  { name: 'BNB', basePrice: 580 },
  { name: 'ARB', basePrice: 0.95 }
];

// --- Основной Компонент Приложения ---
function App() {
  // --- Состояния ---
  const [balance, setBalance] = useState(() => parseFloat(localStorage.getItem('kross_dex_balance')) || 100);
  const [activeTab, setActiveTab] = useState('mining');
  const [currentSignal, setCurrentSignal] = useState(null);
  const [isProcessingTrade, setIsProcessingTrade] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => JSON.parse(localStorage.getItem('kross_dex_sound')) ?? true);
  const [floatingClicks, setFloatingClicks] = useState([]); // Для анимации вылетающих долларов

  // Референс для звука клика
  const clickAudioRef = useRef(new Audio('https://www.soundjay.com/buttons/sounds/button-37a.mp3')); // Стандартный звук клика

  // --- Эффекты ---

  // Сохранение баланса и настроек звука в localStorage
  useEffect(() => {
    localStorage.setItem('kross_dex_balance', balance.toFixed(2));
    localStorage.setItem('kross_dex_sound', JSON.stringify(soundEnabled));
  }, [balance, soundEnabled]);

  // Генерация сигналов Kross-DEX
  useEffect(() => {
    const generateNewSignal = () => {
      if (isProcessingTrade) return; // Не генерируем новый сигнал, если идет сделка

      const token = TOKENS[Math.floor(Math.random() * TOKENS.length)];
      const buyDex = DEX_PLATFORMS[Math.floor(Math.random() * DEX_PLATFORMS.length)];
      let sellDex = DEX_PLATFORMS[Math.floor(Math.random() * DEX_PLATFORMS.length)];
      while (buyDex.id === sellDex.id) sellDex = DEX_PLATFORMS[Math.floor(Math.random() * DEX_PLATFORMS.length)];

      const spreadPercentage = (Math.random() * (3.5 - 0.7) + 0.7); // Процент прибыли
      const buyPrice = (token.basePrice * (1 - Math.random() * 0.002)).toFixed(4); // Небольшая случайная вариация цены
      const sellPrice = (parseFloat(buyPrice) * (1 + spreadPercentage / 100)).toFixed(4);

      setCurrentSignal({
        token: token.name,
        buyFrom: buyDex,
        sellTo: sellDex,
        buyPrice: parseFloat(buyPrice),
        sellPrice: parseFloat(sellPrice),
        spread: spreadPercentage.toFixed(2),
        timeLeft: 15, // Время жизни сигнала
        volume: (Math.random() * (50000 - 10000) + 10000).toFixed(0) // Случайный объем
      });
    };

    if (activeTab === 'kross') {
      generateNewSignal();
      const signalInterval = setInterval(generateNewSignal, 15000); // Новый сигнал каждые 15 секунд
      return () => clearInterval(signalInterval);
    }
  }, [activeTab, isProcessingTrade]);

  // Таймер обратного отсчета для сигнала
  useEffect(() => {
    if (currentSignal && currentSignal.timeLeft > 0 && activeTab === 'kross' && !isProcessingTrade) {
      const timer = setTimeout(() => {
        setCurrentSignal(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (currentSignal && currentSignal.timeLeft === 0 && activeTab === 'kross' && !isProcessingTrade) {
      // Сигнал истек, сбрасываем его
      setCurrentSignal(null);
    }
  }, [currentSignal, activeTab, isProcessingTrade]);

  // --- Обработчики событий ---

  // Обработчик для клика по доллару (майнинг)
  const handleMiningClick = (e) => {
    setBalance(prev => prev + 0.01);

    if (soundEnabled) {
      clickAudioRef.current.currentTime = 0; // Сбрасываем звук, чтобы он играл сразу при каждом клике
      clickAudioRef.current.play().catch(error => console.log("Sound error:", error));
    }

    // Анимация вылетающего доллара
    const id = Date.now();
    const x = e.clientX;
    const y = e.clientY;
    setFloatingClicks(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setFloatingClicks(prev => prev.filter(click => click.id !== id));
    }, 800); // Длительность анимации
  };

  // Обработчик для подтверждения Kross-Swap
  const handleConfirmKrossSwap = () => {
    if (!currentSignal || isProcessingTrade || balance < 100) {
      alert("Недостаточно средств или сигнал истек!");
      return;
    }

    setIsProcessingTrade(true);
    setBalance(prev => prev - 100); // Вычитаем сумму сделки

    setTimeout(() => {
      // Имитация задержки блокчейна и случайного исхода
      const successChance = currentSignal.timeLeft > 5 ? 0.9 : 0.6; // Выше шанс, если успел вовремя
      if (Math.random() < successChance) {
        const profit = 100 * (currentSignal.spread / 100);
        setBalance(prev => prev + 100 + profit); // Возвращаем сумму + прибыль
        alert(`Kross-Swap УСПЕШЕН! Вы заработали +$${profit.toFixed(2)}`);
      } else {
        // Имитация проскальзывания или неудачи
        setBalance(prev => prev + 100 * 0.95); // Возвращаем часть суммы, остальное - комиссия/потеря
        alert("Kross-Swap НЕУДАЧЕН! Проскальзывание или высокая комиссия.");
      }
      setIsProcessingTrade(false);
      setCurrentSignal(null); // Сбрасываем сигнал после сделки
    }, 3000); // 3 секунды на "обработку транзакции"
  };

  // --- Рендер Компонента ---
  return (
    <div className="app-container">
      {/* --- Верхний Хедер --- */}
      <header className="header-bar">
        <div className="app-title">Kross-DEX</div>
        <div className="balance-info">
          <span className="balance-label">Баланс USD:</span>
          <span className="balance-value">${balance.toFixed(2)}</span>
        </div>
      </header>

      {/* --- Основное Содержимое --- */}
      <main className="main-content">
        {/* Вкладка: Майнинг */}
        {activeTab === 'mining' && (
          <div className="mining-screen">
            <div className="tap-dollar-area" onClick={handleMiningClick}>
              <div className="dollar-glow-icon">$</div>
              {floatingClicks.map(click => (
                <span key={click.id} className="floating-text" style={{ left: click.x, top: click.y }}>
                  +$0.01
                </span>
              ))}
            </div>
            <p className="mining-text">Нажимай на доллар, чтобы заработать!</p>
          </div>
        )}

        {/* Вкладка: Kross-DEX (Арбитраж) */}
        {activeTab === 'kross' && (
          <div className="kross-dex-screen">
            {isProcessingTrade ? (
              <div className="processing-indicator">
                <div className="spinner"></div>
                <p>Обработка Kross-Swap...</p>
              </div>
            ) : currentSignal && currentSignal.timeLeft > 0 ? (
              <div className="signal-card neon-border">
                <div className="signal-card-header">
                  <span className="live-tag">LIVE SIGNAL</span>
                  <span className={`timer ${currentSignal.timeLeft < 5 ? 'urgent' : ''}`}>
                    {currentSignal.timeLeft}s
                  </span>
                </div>
                <div className="signal-route">
                  <div className="route-node">
                    <span className="node-label">КУПИТЬ на</span>
                    <span className="node-dex">{currentSignal.buyFrom.name}</span>
                    <span className="node-price">${currentSignal.buyPrice.toFixed(4)}</span>
                  </div>
                  <div className="route-arrow">➔</div>
                  <div className="route-node">
                    <span className="node-label">ПРОДАТЬ на</span>
                    <span className="node-dex">{currentSignal.sellTo.name}</span>
                    <span className="node-price profit">${currentSignal.sellPrice.toFixed(4)}</span>
                  </div>
                </div>
                <div className="signal-details">
                  <span>Объем: <span className="value">${currentSignal.volume}</span></span>
                  <span>Прибыль: <span className="value profit">+{currentSignal.spread}%</span></span>
                </div>
                <button
                  className="kross-swap-button"
                  onClick={handleConfirmKrossSwap}
                  disabled={isProcessingTrade || currentSignal.timeLeft === 0 || balance < 100}
                >
                  {balance < 100 ? "НЕДОСТАТОЧНО USD ($100)" : "ПОДТВЕРДИТЬ KROSS-SWAP (100 USD)"}
                </button>
              </div>
            ) : (
              <div className="no-signal">
                <div className="spinner"></div>
                <p>Сканирование пулов ликвидности...</p>
              </div>
            )}

            {/* Карточки DEX платформ */}
            <div className="dex-platforms-grid">
              {DEX_PLATFORMS.map(dex => (
                <div key={dex.id} className="dex-platform-card" style={{ borderColor: dex.color }}>
                  <span className="dex-name">{dex.name}</span>
                  <span className="dex-status" style={{ color: dex.color }}>Online</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Вкладка: Настройки */}
        {activeTab === 'settings' && (
          <div className="settings-screen">
            <h2 className="settings-title">Настройки</h2>
            <div className="setting-item">
              <span>Звук кликов</span>
              <button
                className={`toggle-button ${soundEnabled ? 'on' : 'off'}`}
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}
              </button>
            </div>
            <div className="creator-info">
              <p>Создатели проекта:</p>
              <a href="https://t.me/kriptoalians" target="_blank" rel="noopener noreferrer">@kriptoalians</a>
            </div>
          </div>
        )}
      </main>

      {/* --- Нижняя Навигация --- */}
      <nav className="bottom-navbar">
        <button className={activeTab === 'mining' ? 'active' : ''} onClick={() => setActiveTab('mining')}>
          Mining
        </button>
        <button className={activeTab === 'kross' ? 'active' : ''} onClick={() => setActiveTab('kross')}>
          Kross-DEX
        </button>
        <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
          Settings
        </button>
      </nav>
    </div>
  );
}

export default App;
