const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json({ limit: '50mb' }));

// ✅ CORS для мини-приложения
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// 🔑 Настройки из переменных окружения Vercel
const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = process.env.GROUP_ID || -72662613274024; // ← ЧИСЛО, не строка!

console.log('🚀 Бот запущен на Vercel');
console.log('🔑 Token:', BOT_TOKEN ? BOT_TOKEN.substring(0, 20) + '...' : 'НЕ ЗАДАН!');
console.log('📬 Group ID:', GROUP_ID, `(тип: ${typeof GROUP_ID})`);

// ✅ Главный endpoint для приёма отчётов
app.post('/api/bot', async (req, res) => {
  const data = req.body;
  
  console.log('\n📥 ========== НОВЫЙ ЗАПРОС ==========');
  console.log('📥 Получены данные:', JSON.stringify(data, null, 2));
  
  if (data.type !== 'daily_report') {
    console.log('⚠️ Не отчёт, пропускаем');
    return res.json({ ok: true });
  }
  
  const { message, photos, user } = data;
  
  // 🎯 ОПРЕДЕЛЯЕМ ПОЛУЧАТЕЛЯ
  // Для теста: отправляем автору отчёта (user.id — число)
  // Для группы: используй GROUP_ID
  const chatId = user?.id || GROUP_ID;
  
  console.log('📬 Отправка в чат:', chatId, `(тип: ${typeof chatId})`);
  
  try {
    // 🎯 ПРАВИЛЬНЫЙ MAX API
    // Документация: https://dev.max.ru/docs
    // POST /messages с токеном в заголовке Authorization
    
    console.log('\n📤 Отправляем текст через MAX API...');
    
    const textResponse = await fetch('https://platform-api.max.ru/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': BOT_TOKEN  // ← Токен в заголовке!
      },
      body: JSON.stringify({
        chat_id: chatId,  // ← ЧИСЛО, не строка!
        text: message,
        format: 'markdown'
      })
    });
    
    const textResult = await textResponse.json();
    console.log('📊 Статус ответа:', textResponse.status);
    console.log('📄 Ответ API:', JSON.stringify(textResult, null, 2));
    
    if (!textResponse.ok) {
      throw new Error(textResult.message || `HTTP ${textResponse.status}`);
    }
    
    console.log('✅ Текст отправлен!');
    
    // 📷 Фото (пока пропускаем для отладки)
    if (photos && photos.length > 0) {
      console.log(`\n📷 Фото: ${photos.length} шт.`);
    }
    
    console.log('\n✅ ========== ОТЧЁТ УСПЕШНО ОТПРАВЛЕН! ==========');
    
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
    timestamp: new Date().toISOString(),
    config: {
      tokenSet: !!BOT_TOKEN,
      groupId: GROUP_ID,
      groupIdType: typeof GROUP_ID
    }
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
