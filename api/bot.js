const express = require('express');
const fetch = require('node-fetch');

const app = express();

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '50mb' }));

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = process.env.GROUP_ID || '-72662613274024';

console.log('🚀 Бот запущен');
console.log('🔑 Token:', BOT_TOKEN?.substring(0, 20) + '...');
console.log('📬 Group:', GROUP_ID);

app.post('/api/bot', async (req, res) => {
  const data = req.body;
  console.log('\n📥 ========== НОВЫЙ ЗАПРОС ==========');
  console.log('📥 Получен отчёт:', JSON.stringify(data, null, 2));
  console.log('🔑 BOT_TOKEN:', BOT_TOKEN ? 'задан' : 'НЕ ЗАДАН!');
  console.log('📬 GROUP_ID:', GROUP_ID);
  
  if (data.type === 'daily_report') {
    const { message, photos, user } = data;
    
    try {
      console.log('\n📤 Отправляем текст в группу...');
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
      console.log('📊 Статус:', textResponse.status);
      console.log('📄 Ответ API:', JSON.stringify(textResult, null, 2));
      
      if (!textResult.ok) {
        throw new Error(textResult.description || 'Ошибка текста');
      }
      
      console.log('✅ Текст отправлен!');
      
      if (photos && photos.length > 0) {
        console.log(`\n📷 Отправляем ${photos.length} фото...`);
        for (let i = 0; i < photos.length; i++) {
          try {
            const base64Image = photos[i].replace(/^image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Image, 'base64');
            const formData = new FormData();
            formData.append('chat_id', GROUP_ID);
            formData.append('photo', buffer, `photo_${i}.jpg`);
            
            const photoResponse = await fetch(`https://platform-api.max.ru/bot/${BOT_TOKEN}/sendPhoto`, {
              method: 'POST',
              body: formData
            });
            
            const photoResult = await photoResponse.json();
            console.log(`📷 Фото ${i+1}:`, photoResult.ok ? '✅' : '❌', photoResult);
            
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

app.get('/api/bot', (req, res) => {
  res.json({ status: 'ok', message: 'Бот работает!' });
});

module.exports = app;

if (!process.env.VERCEL) {
  app.listen(process.env.PORT || 3000, () => {
    console.log('🤖 Бот запущен на порту', process.env.PORT || 3000);
  });
}
