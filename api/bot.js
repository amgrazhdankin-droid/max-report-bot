const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json({ limit: '50mb' }));

// CORS для мини-приложения
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = process.env.GROUP_ID || '-72662613274024';

// ✅ Webhook от MAX (получаем события от мини-приложения)
app.post('/api/bot', async (req, res) => {
  const update = req.body;
  console.log('📥 Получено обновление:', JSON.stringify(update, null, 2));
  
  // Проверяем, что это данные от мини-приложения
  if (update.type === 'daily_report' || update.event === 'report_submitted') {
    const data = update.data || update;
    
    try {
      // 🎯 ОТПРАВКА ЧЕРЕЗ MAX API (ПРАВИЛЬНЫЙ ФОРМАТ)
      // Используем правильный endpoint для MAX
      const message = data.message;
      
      // Отправляем в группу через MAX
      const response = await fetch(`https://platform-api.max.ru/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BOT_TOKEN}`
        },
        body: JSON.stringify({
          chat_id: GROUP_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      });
      
      const result = await response.json();
      console.log('📊 Результат:', result);
      
      if (response.ok) {
        console.log('✅ Отчёт отправлен в группу!');
      } else {
        console.log('⚠️ Ошибка API:', result);
      }
      
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }
  }
  
  res.json({ ok: true });
});

// Health check
app.get('/api/bot', (req, res) => {
  res.json({ status: 'ok', message: 'Бот работает!' });
});

module.exports = app;

if (!process.env.VERCEL) {
  app.listen(process.env.PORT || 3000, () => {
    console.log('🤖 Бот запущен на порту', process.env.PORT || 3000);
  });
}
