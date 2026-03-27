const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json({ limit: '50mb' }));

// 🔑 Токен и настройки
const BOT_TOKEN = process.env.BOT_TOKEN;
// Для теста пробуем отправить АВТОРУ (user_id из Mini App)
// Если хочешь в группу, верни GROUP_ID и убедись что бот там админ
// const GROUP_ID = process.env.GROUP_ID || '-72662613274024'; 

console.log('🚀 Бот запущен на Vercel');
console.log('🔑 Token:', BOT_TOKEN ? BOT_TOKEN.substring(0, 20) + '...' : 'НЕ ЗАДАН!');

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
  // Пробуем отправить автору отчёта (для теста)
  // ВАЖНО: Используем peer_id вместо chat_id и приводим к строке
  const peerId = user?.id?.toString(); 
  
  if (!peerId) {
    console.log('❌ Нет получателя (user.id)');
    return res.json({ ok: false, error: 'no_recipient' });
  }
  
  console.log('📬 Отправка в peer_id:', peerId, '(автор:', user?.first_name, ')');
  
  // Формируем тело запроса для MAX API
  // ВАЖНО: Используем peer_id и добавляем random_id
  const requestBody = {
    peer_id: peerId,        // ← Изменили с chat_id на peer_id
    message: message,
    random_id: Math.floor(Math.random() * 1000000000), // ← Добавили random_id
    format: 'markdown'
  };
  
  console.log('📤 Тело запроса:', JSON.stringify(requestBody));
  
  try {
    // 🎯 ОТПРАВКА ЧЕРЕЗ MAX API
    const response = await fetch('https://platform-api.max.ru/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': BOT_TOKEN
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    console.log('📊 Статус ответа:', response.status);
    console.log('📄 Ответ API:', JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }
    
    console.log('✅ Сообщение отправлено!');
    
    // 📷 Отправка фото (если есть)
    // Примечание: API MAX может требовать другой метод для фото
    if (photos && photos.length > 0) {
      console.log(`\n📷 Фото: ${photos.length} шт. (требуется доработка API)`);
      // Пока пропускаем фото, чтобы отладить текст
    }
    
    console.log('\n✅ ========== ОТЧЁТ УСПЕШНО ОТПРАВЛЕН! ==========\n');
    
  } catch (error) {
    console.error('\n❌ ========== ОШИБКА ОТПРАВКИ ==========');
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

// 🖥️ Запуск локально
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🤖 Бот запущен на порту ${PORT}`);
  });
}
