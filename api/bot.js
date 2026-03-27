const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json({ limit: '50mb' }));

// ✅ CORS для мини-приложения (разрешаем запросы с любых источников)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Обработка preflight-запросов
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 🔑 Токен и настройки (берутся из переменных окружения Vercel)
const BOT_TOKEN = process.env.BOT_TOKEN;
// Для теста отправляем автору отчёта, а не в группу
// Если хочешь в группу — раскомментируй строку ниже и закомментируй логику с user.id
// const GROUP_ID = process.env.GROUP_ID || '-72662613274024';

console.log('🚀 Бот запущен на Vercel');
console.log('🔑 Token:', BOT_TOKEN ? BOT_TOKEN.substring(0, 20) + '...' : 'НЕ ЗАДАН!');

// ✅ Главный endpoint для приёма отчётов от мини-приложения
app.post('/api/bot', async (req, res) => {
  const data = req.body;
  
  console.log('\n📥 ========== НОВЫЙ ЗАПРОС ==========');
  console.log('📥 Получены данные:', JSON.stringify(data, null, 2));
  
  // Проверяем, что это отчёт
  if (data.type !== 'daily_report') {
    console.log('⚠️ Не отчёт, пропускаем');
    return res.json({ ok: true });
  }
  
  const { message, photos, user } = data;
  
  // 🔍 Определяем получателя: отправляем АВТОРУ отчёта (для теста)
  // Если хочешь в группу — замени на: const chatId = GROUP_ID;
  const chatId = user?.id?.toString();
  
  if (!chatId) {
    console.log('❌ Нет получателя (user.id)');
    return res.json({ ok: false, error: 'no_recipient' });
  }
  
  console.log('📬 Отправка в чат:', chatId, '(автор:', user?.first_name, ')');
  console.log('📝 Сообщение:', message.substring(0, 200) + '...');
  
  try {
    // 🎯 ОТПРАВКА ТЕКСТА через MAX API
    // Документация: POST https://platform-api.max.ru/messages
    console.log('\n📤 Отправляем текст...');
    
    const textResponse = await fetch('https://platform-api.max.ru/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': BOT_TOKEN  // 🔑 Токен в заголовке, не в URL!
      },
      body: JSON.stringify({
        chat_id: chatId,
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
            filename: `report_photo_${i}.jpg`,
            contentType: 'image/jpeg'
          });
          
          console.log(`📤 Фото ${i+1}: отправка...`);
          
          const photoResponse = await fetch('https://platform-api.max.ru/messages', {
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
          // Не прерываем цикл — отправляем остальные фото
        }
      }
    }
    
    console.log('\n✅ ========== ОТЧЁТ УСПЕШНО ОТПРАВЛЕН! ==========');
    
  } catch (error) {
    console.error('\n❌ ========== ОШИБКА ОТПРАВКИ ==========');
    console.error('❌ Сообщение:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('========================================\n');
  }
  
  // Всегда отвечаем 200, чтобы MAX не повторял запрос
  res.json({ ok: true });
});

// ✅ Health check endpoint (для проверки, что бот жив)
app.get('/api/bot', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Бот работает!',
    timestamp: new Date().toISOString()
  });
});

// ✅ Экспортируем app для Vercel (serverless-функция)
module.exports = app;

// 🖥️ Запуск локального сервера (только если не в Vercel)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🤖 Бот запущен локально на порту ${PORT}`);
    console.log(`📍 Webhook: http://localhost:${PORT}/api/bot`);
    console.log(`🔍 Health: http://localhost:${PORT}/api/bot`);
  });
}
