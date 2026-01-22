:root { --win: #00ff88; --loss: #ff3366; --neon: #00d9ff; --panel: #121214; }

/* FULLSCREEN MOBILE FIX */
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { 
  margin: 0; padding: 0; width: 100vw; height: 100vh; 
  overflow: hidden; background: #080808; color: #e0e0e0;
  font-family: 'Roboto Mono', monospace; 
}

.app-neon { height: 100vh; display: flex; flex-direction: column; position: relative; }

/* Header */
.n-header { height: 60px; padding: 0 15px; display: flex; justify-content: space-between; align-items: center; background: var(--panel); border-bottom: 1px solid #222; }
.n-user-info { display: flex; flex-direction: column; }
.n-uid { font-size: 8px; color: #555; }
.n-lvl-pill { font-size: 10px; color: var(--neon); background: #222; padding: 2px 6px; border-radius: 4px; border: 1px solid #333; width: fit-content; }
.n-money { color: var(--win); font-size: 20px; font-weight: bold; }

/* КНОПКИ BUY / CLOSE - ЖЕСТКИЙ ДИЗАЙН */
.n-p-btn {
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  font-weight: 800;
  font-size: 14px;
  cursor: pointer;
  min-width: 85px;
  text-transform: uppercase;
  transition: transform 0.1s;
}
.n-p-btn:active { transform: scale(0.95); }
.n-p-btn.buy { 
  background: linear-gradient(135deg, #00ff88 0%, #00bd65 100%); 
  color: #000; 
  box-shadow: 0 4px 15px rgba(0, 255, 136, 0.3);
}
.n-p-btn.close { 
  background: linear-gradient(135deg, #ff3366 0%, #c21a44 100%); 
  color: #fff; 
  box-shadow: 0 4px 15px rgba(255, 51, 102, 0.3);
}

/* Терминал */
.n-terminal-layout { display: flex; flex: 1; overflow: hidden; }
.n-term-sidebar { width: 85px; border-right: 1px solid #222; background: #0a0a0a; }
.n-term-main { flex: 1; display: flex; flex-direction: column; overflow-y: auto; }
.n-pair-row { display: flex; justify-content: space-between; padding: 12px; border-bottom: 1px solid #1a1a1d; align-items: center; }

/* РЕКЛАМНОЕ ОКНО */
.n-modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.9); z-index: 10000;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.n-ad-card {
  background: #1a1a1d; border: 2px solid var(--neon); padding: 30px;
  border-radius: 15px; text-align: center; max-width: 400px;
  box-shadow: 0 0 50px rgba(0, 217, 255, 0.3);
}
.n-ad-card h2 { color: var(--win); margin-bottom: 15px; }
.n-ad-sub { font-size: 12px; color: #777; margin: 15px 0; }
.n-ad-btn {
  display: block; background: var(--neon); color: #000;
  padding: 15px; border-radius: 8px; font-weight: bold;
  text-decoration: none; margin-bottom: 10px;
}
.n-ad-close { background: none; border: none; color: #555; text-decoration: underline; cursor: pointer; }

/* Ожидание */
.n-pending-status { font-size: 11px; color: #666; animation: blink 1s infinite; }
@keyframes blink { 50% { opacity: 0.3; } }

/* Навигация */
.n-nav { height: 70px; background: var(--panel); display: flex; border-top: 1px solid #222; padding-bottom: env(safe-area-inset-bottom); }
.n-nav button { flex: 1; background: none; border: none; color: #444; font-size: 10px; font-weight: bold; }
.n-nav button.active { color: var(--neon); border-top: 2px solid var(--neon); }

/* Остальное */
.n-dex-list { display: grid; gap: 10px; padding: 15px; }
.n-dex-card { background: var(--panel); padding: 20px; border-radius: 8px; border-left: 4px solid var(--c); display: flex; justify-content: space-between; }
.n-sphere { width: 140px; height: 140px; border: 2px solid var(--neon); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 50px; color: var(--neon); margin: auto; box-shadow: 0 0 20px rgba(0, 217, 255, 0.2); }
