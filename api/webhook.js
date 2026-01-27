export default async function handler(req, res) {
  const botToken = "8318721103:AAFZ0jtX5JoDEjDXeJnk4yLetPkJjfup2Ec";
  const appUrl = "https://treidgame-sigma.vercel.app";

  if (req.method === 'POST') {
    const { message } = req.body;
    if (message && message.text) {
      const chatId = message.chat.id;
      const text = message.text;

      if (text.startsWith('/start')) {
        const args = text.split(' ');
        const refId = args.length > 1 ? args[1] : null;

        // Отправка приветствия
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `👋 *Добро пожаловать в Arbitrage Terminal!*\n\n` +
                  (refId ? `🎁 Вы зашли по ссылке друга и получили стартовый бонус!` : `💻 Начните зарабатывать на разнице курсов прямо сейчас.`),
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "🚀 ОТКРЫТЬ ТЕРМИНАЛ", web_app: { url: appUrl } }],
                [{ text: "👨‍💻 ТЕХ. ПОДДЕРЖКА", url: "https://t.me/vladstelin78" }]
              ]
            }
          })
        });

        // Начисление бонуса рефереру
        if (refId && refId !== chatId.toString()) {
          const dbBase = "https://treidgame-b2ae0-default-rtdb.firebaseio.com";
          
          // 1. Добавляем друга в список пригласившему
          await fetch(`${dbBase}/referrals/${refId}/${chatId}.json`, {
            method: 'PUT',
            body: JSON.stringify({ username: message.from.username || 'Anonymous' })
          });
          
          // 2. Увеличиваем баланс пригласившего на 1000
          const playerRes = await fetch(`${dbBase}/players/${refId}/balanceUSDC.json`);
          const currentBal = await playerRes.json() || 1000;
          await fetch(`${dbBase}/players/${refId}/balanceUSDC.json`, {
            method: 'PUT',
            body: JSON.stringify(currentBal + 1000)
          });
        }
      }
    }
    return res.status(200).json({ ok: true });
  }
  return res.status(200).send('Webhook is active!');
}
