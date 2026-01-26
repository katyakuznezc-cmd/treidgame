export default async function handler(req, res) {
  // Проверяем, что пришло сообщение от Telegram
  if (req.method === 'POST') {
    const { message } = req.body;

    if (message && message.text === '/start') {
      const chatId = message.chat.id;
      const botToken = "98318721103:AAFZ0jtX5JoDEjDXeJnk4yLetPkJjfup2Ec; // <--- ЗАМЕНИ НА СВОЙ ТОКЕН ИЗ BOTFATHER
      const appUrl = "https://название-твоего-проекта.vercel.app"; // <--- ЗАМЕНИ НА СВОЮ ССЫЛКУ VERCEL

      const responseText = `📈 *Добро пожаловать, ${message.from.first_name}!*\n\n` +
                           `Ты попал в терминал арбитражной торговли.\n` +
                           `• Реальные курсы с Binance\n` +
                           `• 4 крупнейшие DEX-биржи\n` +
                           `• Сигналы в реальном времени\n\n` +
                           `Жми кнопку ниже, чтобы попробовать начать в демо версии! 👇`;

      const keyboard = {
        inline_keyboard: [[
          { text: "🚀 ИГРАТЬ", web_app: { url: appUrl } }
        ]]
      };

      // Отправляем ответ пользователю через API Телеграма
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

  // Говорим Телеграму, что всё ок
  res.status(200).send('OK');
}
