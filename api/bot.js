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

console.log('🚀 Бот запущен на Vercel');
console.log('🔑 Token:', BOT_TOKEN ? BOT_TOKEN.substring(0, 20) + '...' : 'НЕ ЗАДАН!');

// ✅ Webhook от мини-приложения
app.post('/api/bot', async (req, res) => {
  const data = req.body;
  
  console.log('\n📥 ========== НОВЫЙ ЗАПРОС ==========');
  console.log('📥 Получены данные:', JSON.stringify(data, null, 2));
  
  if (data.type !== 'daily_report') {
    console.log('⚠️ Не отчёт, пропускаем');
    return res.json({ ok: true });
  }
  
  const { message, photos, user } = data;
  
  // 🎯 ОТПРАВЛЯЕМ В ГРУППУ
  // ВАЖНО: chat_id передаётся в URL как query-параметр!
  const chatId = GROUP_ID;
  const apiUrl = `https://platform-api.max.ru/messages?chat_id=${encodeURIComponent(chatId)}`;
  
  console.log('📬 Отправка в чат:', chatId);
  console.log('🌐 API URL:', apiUrl);
  
  try {
    // 🎯 ПРАВИЛЬНЫЙ MAX API
    console.log('\n📤 Отправляем текст через MAX API...');
    
    const textResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': BOT_TOKEN  // ← Токен в заголовке!
      },
      body: JSON.stringify({
        text: message,
        format: 'markdown'  // Поддержка Markdown
      })
    });
    
    const textResult = await textResponse.json();
    console.log('📊 Статус ответа:', textResponse.status);
    console.log('📄 Ответ API:', JSON.stringify(textResult, null, 2));
    
    if (!textResponse.ok) {
      throw new Error(textResult.message || `HTTP ${textResponse.status}`);
    }
    
    console.log('✅ Текст отправлен!');
    
    // 📷 Отправка фото (если есть)
    if (photos && photos.length > 0) {
      console.log(`\n📷 Отправляем ${photos.length} фото...`);
      
      for (let i = 0; i < photos.length; i++) {
        try {
          const photoBase64 = photos[i];
          // Убираем префикс data:image/jpeg;base64,
          const base64Image = photoBase64.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Image, 'base64');
          
          // Создаём FormData для отправки файла
          const formData = new FormData();
          formData.append('chat_id', chatId);
          formData.append('photo', buffer, {
            filename: `photo_${i}.jpg`,
            contentType: 'image/jpeg'
          });
          
          console.log(`📤 Фото ${i+1}: отправка...`);
          
          const photoResponse = await fetch(`https://platform-api.max.ru/messages?chat_id=${encodeURIComponent(chatId)}`, {
            method: 'POST',
            headers: {
              'Authorization': BOT_TOKEN
              // ❗ Не указываем Content-Type — fetch сам добавит boundary для FormData
            },
            body: formData
          });
          
          const photoResult = await photoResponse.json();
          console.log(`📊 Фото ${i+1}: статус ${photoResponse.status}`, photoResult);
          
        } catch (photoError) {
          console.log(`⚠️ Фото ${i+1} не отправлено:`, photoError.message);
        }
      }
    }
    
    console.log('\n✅ ========== ОТЧЁТ УСПЕШНО ОТПРАВЛЕН В ГРУППУ! ==========');
    
  } catch (error) {
    console.error('\n❌ ========== ОШИБКА ==========');
    console.error('❌ Сообщение:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('========================================\n');
  }
  
  res.json({ ok: true });
});

// ✅ Health check
app.get('/api/bot', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Бот работает!',
    timestamp: new Date().toISOString()
  });
});

// ✅ Экспорт для Vercel
module.exports = app;

// 🖥️ Локальный запуск
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🤖 Бот запущен на порту ${PORT}`);
  });
}
