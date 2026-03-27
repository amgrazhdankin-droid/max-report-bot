const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json({ limit: '50mb' }));

// Токен и ID группы (берутся из переменных окружения Vercel)
const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = process.env.GROUP_ID || '-72662613274024';

// Webhook endpoint для MAX
app.post('/api/bot', async (req, res) => {
  const update = req.body;
  
  console.log('📥 Получено событие:', JSON.stringify(update, null, 2));
  
  // Обработка события от мини-приложения
  if (update.event === 'report_submitted' && update.data?.type === 'daily_report') {
    const { message, photos, user } = update.data;
    
    console.log('📝 Новый отчёт от:', user?.first_name || 'Аноним');
    
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
      console.log('📤 Текст отправлен:', textResult);
      
      if (!textResult.ok) {
        throw new Error(textResult.description || 'Ошибка отправки текста');
      }
      
      // 2. Отправляем фото (если есть)
      if (photos && photos.length > 0) {
        console.log(`📷 Отправка ${photos.length} фото...`);
        
        for (let i = 0; i < photos.length; i++) {
          try {
            const photoBase64 = photos[i];
            const base64Image = photoBase64.replace(/^image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Image, 'base64');
            
            const formData = new FormData();
            formData.append('chat_id', GROUP_ID);
            formData.append('photo', buffer, `photo_${i}.jpg`);
            
            const photoResponse = await fetch(`https://platform-api.max.ru/bot/${BOT_TOKEN}/sendPhoto`, {
              method: 'POST',
              body: formData
            });
            
            const photoResult = await photoResponse.json();
            console.log(`📤 Фото ${i+1} отправлено:`, photoResult.ok);
            
          } catch (photoError) {
            console.error(`⚠️ Фото ${i+1} не отправлено:`, photoError.message);
          }
        }
      }
      
      console.log('✅ Отчёт успешно отправлен в группу!');
      
    } catch (error) {
      console.error('❌ Ошибка отправки:', error.message);
    }
  }
  
  // Всегда отвечаем OK
  res.json({ ok: true });
});

// Health check
app.get('/api/bot', (req, res) => {
  res.json({ status: 'ok', message: 'Бот работает!' });
});

// Экспортируем app для Vercel
module.exports = app;

// Запускаем сервер только если не в Vercel
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🤖 Бот запущен на порту ${PORT}`);
    console.log(`📍 Webhook: http://localhost:${PORT}/api/bot`);
  });
}