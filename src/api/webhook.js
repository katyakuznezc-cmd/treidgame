export default async function handler(req, res) {
  const botToken = "8318721103:AAFZ0jtX5JoDEjDXeJnk4yLetPkJjfup2Ec";
  const appUrl = "https://treidgame-sigma.vercel.app";

  // Telegram отправляет данные методом POST
  if (req.method === 'POST') {
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

      // Отправляем запрос в Telegram
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    // Обязательно отвечаем Telegram, что получили данные
    return res.status(200).json({ ok: true });
  }

  // Если зашли через браузер, просто показываем статус
  return res.status(200).send('Бот готов и ждет сообщений от Telegram!');
}
