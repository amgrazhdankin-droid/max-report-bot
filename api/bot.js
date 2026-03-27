const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json({ limit: '50mb' }));

// CORS для мини-приложения
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = process.env.GROUP_ID || '-72662613274024';

console.log('🚀 Бот запущен');
console.log('🔑 Token:', BOT_TOKEN?.substring(0, 20) + '...');
console.log('📬 Group:', GROUP_ID);

// ✅ Webhook от мини-приложения
app.post('/api/bot', async (req, res) => {
  const data = req.body;
  console.log('\n📥 ========== НОВЫЙ ЗАПРОС ==========');
  console.log('📥 Получен отчёт:', JSON.stringify(data, null, 2));
  
  if (data.type === 'daily_report') {
    const { message, photos, user } = data;
    
    try {
      // 🎯 ОТПРАВКА ЧЕРЕЗ ПРАВИЛЬНЫЙ MAX API
      
      // 1. Отправляем текст в группу
      console.log('\n📤 Отправляем текст через MAX API...');
      
      const textResponse = await fetch('https://platform-api.max.ru/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': BOT_TOKEN
        },
        body: JSON.stringify({
          chat_id: GROUP_ID,
          text: message,
          format: 'markdown'
        })
      });
      
      const textResult = await textResponse.json();
      console.log('📊 Статус:', textResponse.status);
      console.log('📄 Ответ API:', JSON.stringify(textResult, null, 2));
      
      if (!textResponse.ok) {
        throw new Error(textResult.message || `HTTP ${textResponse.status}`);
      }
      
      console.log('✅ Текст отправлен!');
      
      // 2. Отправляем фото (если есть)
      if (photos && photos.length > 0) {
        console.log(`\n📷 Отправляем ${photos.length} фото...`);
        
        for (let i = 0; i < photos.length; i++) {
          try {
            const base64Image = photos[i].replace(/^image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Image, 'base64');
            
            // Создаём FormData для отправки фото
            const formData = new FormData();
            formData.append('chat_id', GROUP_ID);
            formData.append('photo', buffer, {
              filename: `photo_${i}.jpg`,
              contentType: 'image/jpeg'
            });
            
            const photoResponse = await fetch('https://platform-api.max.ru/messages', {
              method: 'POST',
              headers: {
                'Authorization': BOT_TOKEN
                // Не указываем Content-Type — fetch сам установит boundary для FormData
              },
              body: formData
            });
            
            const photoResult = await photoResponse.json();
            console.log(`📷 Фото ${i+1}:`, photoResponse.status, photoResult);
            
          } catch (e) {
            console.log(`⚠️ Фото ${i+1} не отправлено:`, e.message);
          }
        }
      }
      
      console.log('\n✅ ========== ОТЧЁТ ОТПРАВЛЕН В ГРУППУ! ==========\n');
      
    } catch (error) {
      console.error('\n❌ ========== ОШИБКА ==========\n');
      console.error('❌ Ошибка отправки:', error.message);
      console.error('❌ Stack:', error.stack);
      console.error('\n========================================\n');
    }
  }
  
  res.json({ ok: true });
});

// ✅ Health check
app.get('/api/bot', (req, res) => {
  res.json({ status: 'ok', message: 'Бот работает!' });
});

// Экспорт для Vercel
module.exports = app;

// Запуск локально
if (!process.env.VERCEL) {
  app.listen(process.env.PORT || 3000, () => {
    console.log('🤖 Бот запущен на порту', process.env.PORT || 3000);
  });
}
