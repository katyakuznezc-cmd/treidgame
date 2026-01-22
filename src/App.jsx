import React, { useState, useEffect, useRef } from 'react';
// Импортируем Firebase (убедись, что добавил эти пакеты в package.json: firebase)
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, updateDoc, increment } from "firebase/firestore";

// ТВОИ ДАННЫЕ ИЗ FIREBASE CONSOLE:
const firebaseConfig = {
  apiKey: "AIzaSyC9UUEv4Lz15Xs8LWfYeUnVFnhL4x-QvyE",
  authDomain: "PROJECT.firebaseapp.com",
  projectId: "PROJECT_ID",
  storageBucket: "PROJECT.appspot.com",
  messagingSenderId: "315576452898",
  appId: "1:315576452898:web:5a7dae517bbd7f3eb6c77b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const [userId] = useState(() => {
    // В Telegram WebApp лучше брать window.Telegram.WebApp.initDataUnsafe.user.id
    let id = localStorage.getItem('user_id');
    if (!id) {
      id = 'u' + Math.floor(Math.random() * 999999);
      localStorage.setItem('user_id', id);
    }
    return id;
  });

  const [balance, setBalance] = useState(1000);
  const [level, setLevel] = useState(1);
  const [tab, setTab] = useState('trade');
  const [referrals, setReferrals] = useState(0);

  // 1. ЗАГРУЗКА ДАННЫХ ИЗ FIREBASE
  useEffect(() => {
    const loadData = async () => {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setBalance(data.balance);
        setLevel(data.level);
        setReferrals(data.refCount || 0);
      } else {
        // Создаем нового пользователя, если его нет
        await setDoc(userRef, {
          balance: 1000,
          level: 1,
          refCount: 0,
          referredBy: new URLSearchParams(window.location.search).get('ref') || null
        });
      }
    };
    loadData();
  }, [userId]);

  // 2. ФУНКЦИЯ ПРИГЛАШЕНИЯ
  const inviteFriend = () => {
    const botUrl = "https://t.me/ТВОЙ_БОТ"; // Ссылка на твоего бота
    const inviteLink = `${botUrl}?start=${userId}`;
    const text = "Заходи в трейдинг-симулятор и получи бонус!";
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
    
    window.open(shareUrl, '_blank');
    
    // Демонстрационное начисление (в реальности это делает бэкенд при регистрации друга)
    // updateDoc(doc(db, "users", userId), { balance: increment(500), refCount: increment(1) });
  };

  return (
    <div style={{width:'100vw', height:'100dvh', background:'#000', color:'#fff', fontFamily:'sans-serif', display:'flex', flexDirection:'column'}}>
      <header style={{padding:20, borderBottom:'1px solid #1a1a1a', textAlign:'center'}}>
        <div style={{color:'#00f2ff', fontSize:24, fontWeight:'bold'}}>${balance.toFixed(2)}</div>
        <div style={{fontSize:10, color:'#555'}}>ID: {userId} | LVL: {level}</div>
      </header>

      <main style={{flex:1, overflowY:'auto', padding:20}}>
        {tab === 'trade' && (
           <div className="card" style={{border:'1px solid #00f2ff', padding:15, borderRadius:12}}>
              <h3 style={{margin:0}}>ТРЕЙДИНГ</h3>
              <p style={{fontSize:12, color:'#666'}}>Выбирай биржу и следуй сигналам.</p>
              {/* Тут твой код бирж */}
           </div>
        )}

        {tab === 'friends' && (
          <div>
            <div style={{background:'#111', padding:20, borderRadius:15, textAlign:'center', marginBottom:20}}>
              <h2 style={{color:'#00ff88', margin:0}}>+{referrals * 500}$</h2>
              <p style={{fontSize:12, color:'#666'}}>Бонусы за друзей</p>
            </div>

            <div style={{marginBottom:20}}>
               <h3>Твои друзья: {referrals}</h3>
               <div style={{fontSize:11, color:'#444', background:'#0a0a0a', padding:10, borderRadius:8}}>
                  Друзья приносят по $500 и +10% к их фармингу (скоро).
               </div>
            </div>

            <button 
              onClick={inviteFriend}
              style={{width:'100%', padding:15, background:'#00f2ff', border:'none', borderRadius:10, fontWeight:'bold', color:'#000'}}
            >
              ПРИГЛАСИТЬ ДРУГА
            </button>
          </div>
        )}

        {/* Остальные вкладки */}
      </main>

      <nav style={{height:70, display:'flex', background:'#050505', borderTop:'1px solid #1a1a1a'}}>
        <div onClick={() => setTab('trade')} style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:tab==='trade'?'#00f2ff':'#444'}}>ТРЕЙД</div>
        <div onClick={() => setTab('friends')} style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:tab==='friends'?'#00f2ff':'#444'}}>ДРУЗЬЯ</div>
        <div onClick={() => setTab('opts')} style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:tab==='opts'?'#00f2ff':'#444'}}>ОПЦИИ</div>
      </nav>
    </div>
  );
}
