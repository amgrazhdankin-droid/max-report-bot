const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json({ limit: '50mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = process.env.GROUP_ID || '-72662613274024';

app.post('/api/bot', async (req, res) => {
  const data = req.body;
  console.log('📥 Получен отчёт:', JSON.stringify(data, null, 2));
  
  if (data.type === 'daily_report') {
    const message = data.message;
    
    try {
      // 🎯 ПЫТАЕМСЯ РАЗНЫЕ ФОРМАТЫ MAX API
      
      // Формат 1: v1/messages
      let response = await fetch(`https://platform-api.max.ru/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BOT_TOKEN}`
        },
        body: JSON.stringify({
          chatId: GROUP_ID,
          text: message
        })
      });
      
      // Формат 2: bot/sendMessage (как Telegram, но другой base URL)
      if (!response.ok) {
        response = await fetch(`https://api.max.ru/bot/${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: GROUP_ID,
            text: message,
            parse_mode: 'Markdown'
          })
        });
      }
      
      // Формат 3: platform-api с другим путём
      if (!response.ok) {
        response = await fetch(`https://platform-api.max.ru/bot/${BOT_TOKEN}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: GROUP_ID,
            text: message
          })
        });
      }
      
      const result = await response.json();
      console.log('📊 Статус:', response.status);
      console.log('📄 Ответ:', result);
      
      if (response.ok) {
        console.log('✅ Отправлено!');
      } else {
        console.log('❌ Ошибка API MAX:', result);
      }
      
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }
  }
  
  res.json({ ok: true });
});

app.get('/api/bot', (req, res) => {
  res.json({ status: 'ok', message: 'Бот работает!' });
});

module.exports = app;
