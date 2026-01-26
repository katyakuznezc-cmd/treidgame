export default async function handler(req, res) {
  const botToken = "8318721103:AAFZ0jtX5JoDEjDXeJnk4yLetPkJjfup2Ec";
  const appUrl = "https://treidgame-sigma.vercel.app";

  if (req.method !== 'POST') {
    return res.status(200).send('Бот активен. Ожидание сообщений от Telegram...');
  }

  const { message } = req.body;

  if (message && message.text === '/start') {
    const chatId = message.chat.id;
    const responseText = `👋 *Добро пожаловать!*\n\n` +
                         `💻 Ты попал в терминал арбитражной торговли\n` +
                         `📊 Реальные курсы с Binance\n` +
                         `🏦 4 крупнейшие DEX-биржи\n` +
                         `⚡️ Сигналы в реальном времени\n\n` +
                         `Жми кнопку ниже, чтобы попробовать начать в демо версии! 👇`;

    const payload = {
      chat_id: chatId,
      text: responseText,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: "🚀 НАЧАТЬ В ДЕМО ВЕРСИИ", web_app: { url: appUrl } }],
          [{ text: "👨‍💻 СВЯЗАТЬСЯ С МЕНЕДЖЕРОМ", url: "https://t.me/vladstelin78" }]
        ]
      }
    };

    // Используем встроенный fetch (Node.js 18+)
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  return res.status(200).json({ ok: true });
}
