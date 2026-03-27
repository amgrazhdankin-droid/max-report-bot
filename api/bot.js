const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json({ limit: '50mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = process.env.GROUP_ID || '72662613274024';

console.log('🚀 Бот запущен');
console.log('🔑 Token:', BOT_TOKEN ? BOT_TOKEN.substring(0, 20) + '...' : 'НЕ ЗАДАН!');
console.log('📬 Group ID:', GROUP_ID, `(тип: ${typeof GROUP_ID})`);

app.post('/api/bot', async (req, res) => {
  const data = req.body;
  
  console.log('\n📥 ========== НОВЫЙ ЗАПРОС ==========');
  console.log('📥 Получены данные:', JSON.stringify(data, null, 2));
  
  if (data.type !== 'daily_report') {
    console.log('⚠️ Не отчёт, пропускаем');
    return res.json({ ok: true });
  }
  
  const { message, photos, user } = data;
  
  // 🎯 ОТПРАВЛЯЕМ В ГРУППУ (не пользователю!)
  // ВАЖНО: используем строку
  const chatId = String(GROUP_ID);
  
  console.log('📬 Отправка в чат:', chatId, `(тип: ${typeof chatId})`);
  
  const requestBody = {
    chat_id: chatId,
    text: message,
    format: 'markdown'
  };
  
  console.log('📤 Тело запроса:', JSON.stringify(requestBody));
  
  try {
    const response = await fetch('https://platform-api.max.ru/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': BOT_TOKEN
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    console.log('📊 Статус:', response.status);
    console.log('📄 Ответ API:', JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }
    
    console.log('✅ Отчёт отправлен в группу!');
    
  } catch (error) {
    console.error('\n❌ ========== ОШИБКА ==========');
    console.error('❌ Сообщение:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('========================================\n');
  }
  
  res.json({ ok: true });
});

app.get('/api/bot', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Бот работает!',
    config: {
      tokenSet: !!BOT_TOKEN,
      groupId: GROUP_ID,
      groupIdType: typeof GROUP_ID
    }
  });
});

module.exports = app;

if (!process.env.VERCEL) {
  app.listen(process.env.PORT || 3000, () => {
    console.log(`🤖 Бот запущен на порту ${process.env.PORT || 3000}`);
  });
}
