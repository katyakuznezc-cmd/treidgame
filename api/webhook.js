export default async function handler(req, res) {
  const botToken = "8318721103:AAFZ0jtX5JoDEjDXeJnk4yLetPkJjfup2Ec";
  const appUrl = "https://treidgame-sigma.vercel.app";

  if (req.method === 'POST') {
    try {
      const { message } = req.body;
      if (message && message.text === '/start') {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: message.chat.id,
            text: `👋 *Добро пожаловать!*\n\n💻 Ты попал в терминал арбитражной торговли\n📊 Реальные курсы с Binance\n🏦 4 крупнейшие DEX-биржи\n⚡️ Сигналы в реальном времени\n\nЖми кнопку ниже, чтобы попробовать начать в демо версии! 👇`,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "🚀 НАЧАТЬ В ДЕМО ВЕРСИИ", web_app: { url: appUrl } }],
                [{ text: "👨‍💻 СВЯЗАТЬСЯ С МЕНЕДЖЕРОМ", url: "https://t.me/vladstelin78" }]
              ]
            }
          })
        });
      }
    } catch (err) {}
    return res.status(200).json({ ok: true });
  }
  return res.status(200).send('Бот работает!');
}
