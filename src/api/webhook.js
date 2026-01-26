export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { message } = req.body;

    if (message && message.text === '/start') {
      const chatId = message.chat.id;
      // ВСТАВЬ СВОЙ ТОКЕН НИЖЕ
      const botToken = "8318721103:AAFZ0jtX5JoDEjDXeJnk4yLetPkJjfup2EcА"; 
      // ВСТАВЬ ССЫЛКУ НА СВОЙ VERCEL НИЖЕ
      const appUrl = "treidgame-sigma.vercel.app
"; 

      // Твой текст с форматированием
      const responseText = `👋 *Добро пожаловать!*\n\n` +
                           `💻 Ты попал в терминал арбитражной торговли\n` +
                           `📊 Реальные курсы с Binance\n` +
                           `🏦 4 крупнейшие DEX-биржи\n` +
                           `⚡️ Сигналы в реальном времени\n\n` +
                           `Жми кнопку ниже, чтобы попробовать начать в демо версии! 👇`;

      const keyboard = {
        inline_keyboard: [
          // Первая кнопка - запускает игру внутри Telegram
          [{ text: "🚀 НАЧАТЬ В ДЕМО ВЕРСИИ", web_app: { url: appUrl } }],
          // Вторая кнопка - ссылка на менеджера
          [{ text: "👨‍💻 СВЯЗАТЬСЯ С МЕНЕДЖЕРОМ", url: "https://t.me/vladstelin78" }]
        ]
      };

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: responseText,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        })
      });
    }
  }

  res.status(200).send('OK');
}
