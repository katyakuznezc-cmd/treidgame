import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update, get } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCKmEa1B4xOdMdNGXBDK2LeOhBQoMqWv40",
  authDomain: "treidgame-b2ae0.firebaseapp.com",
  projectId: "treidgame-b2ae0",
  storageBucket: "treidgame-b2ae0.firebasestorage.app",
  messagingSenderId: "985305772375",
  appId: "1:985305772375:web:08d9b482a6f9d3cd748e12"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Константы активов и тем (оставлены без изменений для работы кода)
const ASSETS = {
  USDC: { symbol: 'USDC', price: 1, icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg' },
  BTC: { symbol: 'BTC', price: 65000, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg' },
  ETH: { symbol: 'ETH', price: 2600, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg' }
};

const DEX_THEMES = {
  UNISWAP: { name: 'UNISWAP V3', color: '#FF007A', bg: 'radial-gradient(circle at 50% 10%, #2a0014 0%, #000 85%)' },
  ODOS: { name: 'ODOS ROUTER', color: '#0CF2B0', bg: 'radial-gradient(circle at 50% 10%, #002a1e 0%, #000 85%)' }
};

export default function App() {
  const [balance, setBalance] = useState(1000);
  const [activeDex, setActiveDex] = useState(null);
  const [deal, setDeal] = useState(null);
  const [timeLeft, setTimeLeft] = useState(120);
  
  // Admin State
  const [showAdmin, setShowAdmin] = useState(false);
  const [allPlayers, setAllPlayers] = useState({});
  const [targetUser, setTargetUser] = useState(null);
  const [newBalance, setNewBalance] = useState('');
  const timerRef = useRef(null);

  const webAppUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const userId = webAppUser?.id?.toString() || 'Guest';
  const username = webAppUser?.username || '';

  useEffect(() => {
    onValue(ref(db, `players/${userId}`), (s) => {
      if (s.exists()) setBalance(s.val().balanceUSDC ?? 1000);
      else update(ref(db, `players/${userId}`), { balanceUSDC: 1000, username: username });
    });
  }, [userId, username]);

  // Секретный вход только для тебя
  const startAdminTimer = () => {
    if (username.toLowerCase() === 'vladstelin78' || userId === '5143323924') { // Твой ник или ID
      timerRef.current = setTimeout(() => {
        loadAllPlayers();
        setShowAdmin(true);
      }, 3000);
    }
  };
  const stopAdminTimer = () => clearTimeout(timerRef.current);

  const loadAllPlayers = () => {
    get(ref(db, 'players')).then(s => {
      if (s.exists()) setAllPlayers(s.val());
    });
  };

  const updateBalance = (id) => {
    if (!newBalance) return;
    update(ref(db, `players/${id}`), { balanceUSDC: Number(newBalance) });
    loadAllPlayers();
    setTargetUser(null);
    setNewBalance('');
  };

  const banUser = (id) => {
    update(ref(db, `players/${id}`), { balanceUSDC: 0, status: 'BANNED' });
    loadAllPlayers();
    setTargetUser(null);
  };

  return (
    <div className="app-container">
      {/* ГЛАВНЫЙ ЭКРАН */}
      <div className={`main-ui ${activeDex || showAdmin ? 'scale-down' : ''}`}>
        <header className="header-nav">
          <div className="usdc-badge">USDC <span>${balance.toFixed(2)}</span></div>
          <button onClick={() => window.open('https://t.me/vladstelin78')} className="mgr-btn">MANAGER</button>
        </header>

        <div className="balance-hero" onMouseDown={startAdminTimer} onMouseUp={stopAdminTimer} onTouchStart={startAdminTimer} onTouchEnd={stopAdminTimer}>
          <div className="bal-value">${balance.toLocaleString()}</div>
          <div className="bal-sub">NET EQUITY</div>
        </div>

        <div className="grid-dex">
          {Object.keys(DEX_THEMES).map(k => (
            <button key={k} onClick={() => setActiveDex(k)} className="card-dex">
              <div className="card-line" style={{background: DEX_THEMES[k].color}}></div>
              <div className="card-name">{DEX_THEMES[k].name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* АДМИН ПАНЕЛЬ (ТОЛЬКО ДЛЯ ВАС) */}
      {showAdmin && (
        <div className="admin-panel">
          <div className="admin-nav">
            <button onClick={() => setShowAdmin(false)}>✕ ЗАКРЫТЬ</button>
            <b>BOSS CONSOLE</b>
            <button onClick={loadAllPlayers}>REFRESH</button>
          </div>
          
          <div className="admin-scroll">
            <p style={{fontSize: 10, opacity: 0.5, marginBottom: 10}}>ВСЕГО ИГРОКОВ: {Object.keys(allPlayers).length}</p>
            {Object.entries(allPlayers).map(([id, data]) => (
              <div key={id} className="user-row" onClick={() => setTargetUser({id, ...data})}>
                <div className="u-info">
                  <span className="u-id">ID: {id}</span>
                  <span className="u-name">@{data.username || 'unknown'}</span>
                </div>
                <div className="u-bal">${data.balanceUSDC?.toFixed(2)}</div>
              </div>
            ))}
          </div>

          {targetUser && (
            <div className="admin-modal">
              <div className="modal-content">
                <h3>Управление: @{targetUser.username}</h3>
                <input type="number" placeholder="Новый баланс" value={newBalance} onChange={e => setNewBalance(e.target.value)} />
                <div className="modal-btns">
                  <button className="save-btn" onClick={() => updateBalance(targetUser.id)}>СОХРАНИТЬ</button>
                  <button className="ban-btn" onClick={() => banUser(targetUser.id)}>ОБНУЛИТЬ / БАН</button>
                  <button className="close-btn" onClick={() => setTargetUser(null)}>ОТМЕНА</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Остальные экраны (Trade/Receipt) как в прошлом коде */}

      <style>{`
        .app-container { background: #000; height: 100vh; color: #fff; font-family: sans-serif; overflow: hidden; }
        .main-ui { padding: 20px; transition: 0.3s; height: 100%; }
        .scale-down { transform: scale(0.9); opacity: 0; pointer-events: none; }
        
        .balance-hero { text-align: center; margin: 40px 0; padding: 20px; }
        .bal-value { font-size: 44px; font-weight: 800; }
        .bal-sub { font-size: 10px; opacity: 0.3; letter-spacing: 2px; }

        .admin-panel { position: fixed; inset: 0; background: #050505; z-index: 1000; display: flex; flex-direction: column; padding: 20px; }
        .admin-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #222; padding-bottom: 15px; }
        .admin-nav button { background: #222; border: none; color: #fff; padding: 5px 15px; border-radius: 8px; font-size: 12px; }

        .admin-scroll { flex: 1; overflow-y: auto; }
        .user-row { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #111; border-radius: 12px; margin-bottom: 8px; border: 1px solid #1a1a1a; }
        .u-info { display: flex; flex-direction: column; }
        .u-id { font-size: 9px; opacity: 0.4; }
        .u-name { font-size: 13px; font-weight: 700; color: #0CF2B0; }
        .u-bal { font-weight: 800; color: #fff; }

        .admin-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-content { background: #111; padding: 25px; border-radius: 20px; width: 100%; border: 1px solid #333; }
        .modal-content input { width: 100%; padding: 15px; background: #000; border: 1px solid #333; color: #fff; border-radius: 12px; margin: 15px 0; font-size: 18px; }
        .modal-btns { display: grid; gap: 10px; }
        .save-btn { background: #0CF2B0; color: #000; border: none; padding: 15px; border-radius: 12px; font-weight: 800; }
        .ban-btn { background: #ff4b4b; color: #fff; border: none; padding: 12px; border-radius: 12px; }
        .close-btn { background: transparent; color: #555; border: none; padding: 10px; }
        
        .card-dex { background: #0a0a0a; border: 1px solid #1a1a1a; padding: 25px; border-radius: 20px; width: 100%; color: #fff; text-align: left; margin-bottom: 10px; }
      `}</style>
    </div>
  );
}
