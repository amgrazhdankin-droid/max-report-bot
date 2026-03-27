const express = require('express');
const fetch = require('node-fetch');

const app = express();

// ✅ Разрешаем CORS для всех источников
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  // Обработка preflight-запросов
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = process.env.GROUP_ID || '-72662613274024';

// ✅ POST endpoint для приёма отчётов
app.post('/api/bot', async (req, res) => {
  const data = req.body;
  console.log('📥 Получен отчёт:', JSON.stringify(data, null, 2));
  
  if (data.type === 'daily_report') {
    const { message, photos, user } = data;
    
    try {
      // 1. Отправляем текст в группу
      const textResponse = await fetch(`https://platform-api.max.ru/bot/${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: GROUP_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      });
      
      const textResult = await textResponse.json();
      console.log('📤 Текст:', textResult);
      
      if (!textResult.ok) {
        throw new Error(textResult.description || 'Ошибка текста');
      }
      
      // 2. Отправляем фото
      if (photos && photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          try {
            const base64Image = photos[i].replace(/^image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Image, 'base64');
            const formData = new FormData();
            formData.append('chat_id', GROUP_ID);
            formData.append('photo', buffer, `photo_${i}.jpg`);
            
            await fetch(`https://platform-api.max.ru/bot/${BOT_TOKEN}/sendPhoto`, {
              method: 'POST',
              body: formData
            });
          } catch (e) {
            console.log(`⚠️ Фото ${i+1}: ${e.message}`);
          }
        }
      }
      
      console.log('✅ Отчёт отправлен в группу');
      
    } catch (error) {
      console.error('❌ Ошибка:', error.message);
    }
  }
  
  res.json({ ok: true });
});

// ✅ GET endpoint для проверки
app.get('/api/bot', (req, res) => {
  res.json({ status: 'ok', message: 'Бот работает!' });
});

module.exports = app;

if (!process.env.VERCEL) {
  app.listen(process.env.PORT || 3000, () => {
    console.log('🤖 Бот запущен');
  });
}
