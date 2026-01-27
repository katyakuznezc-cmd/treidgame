export default async function handler(req, res) {
  const botToken = "8318721103:AAFZ0jtX5JoDEjDXeJnk4yLetPkJjfup2Ec";
  const appUrl = "https://treidgame-sigma.vercel.app";
  const dbBase = "https://treidgame-b2ae0-default-rtdb.firebaseio.com";

  if (req.method === 'POST') {
    const { message } = req.body;
    if (message && message.text) {
      const chatId = message.chat.id;
      const text = message.text;

      if (text.startsWith('/start')) {
        const args = text.split(' ');
        const refId = args.length > 1 ? args[1] : null;

        // 1. Проверяем, есть ли уже такой игрок в базе
        const checkPlayer = await fetch(`${dbBase}/players/${chatId}.json`);
        const playerData = await checkPlayer.json();
        const isNewPlayer = !playerData;

        // 2. Отправка приветствия
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `👋 *Добро пожаловать в Arbitrage Terminal!*\n\n` +
                  (refId && isNewPlayer ? `🎁 Вы получили $1,000 за регистрацию по ссылке!` : `💻 Начните зарабатывать на разнице курсов прямо сейчас.`),
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "🚀 ОТКРЫТЬ ТЕРМИНАЛ", web_app: { url: appUrl } }],
                [{ text: "👨‍💻 ТЕХ. ПОДДЕРЖКА", url: "https://t.me/vladstelin78" }]
              ]
            }
          })
        });

        // 3. Логика реферала (только для новых игроков!)
        if (refId && isNewPlayer && refId !== chatId.toString()) {
          // Записываем друга пригласившему
          await fetch(`${dbBase}/referrals/${refId}/${chatId}.json`, {
            method: 'PUT',
            body: JSON.stringify({ username: message.from.username || 'Anonymous' })
          });
          
          // Начисляем пригласившему бонус
          const referrerRes = await fetch(`${dbBase}/players/${refId}/balanceUSDC.json`);
          const currentBal = await referrerRes.json() || 1000;
          await fetch(`${dbBase}/players/${refId}/balanceUSDC.json`, {
            method: 'PUT',
            body: JSON.stringify(currentBal + 1000)
          });
        }

        // 4. Если игрок новый, создаем ему профиль, чтобы он больше не считался новым
        if (isNewPlayer) {
          await fetch(`${dbBase}/players/${chatId}.json`, {
            method: 'PUT',
            body: JSON.stringify({
              balanceUSDC: 1000,
              username: message.from.username || 'Guest',
              wallet: {}
            })
          });
        }
      }
    }
    return res.status(200).json({ ok: true });
  }
  return res.status(200).send('Webhook Security Active');
}
