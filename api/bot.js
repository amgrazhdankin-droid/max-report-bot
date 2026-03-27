      // 🎯 ОТПРАВКА ЧЕРЕЗ ПРАВИЛЬНЫЙ MAX API
      
      // 1. Определяем получателя: если GROUP_ID не работает, отправляем автору отчёта
      let chatId = GROUP_ID;
      
      // Если GROUP_ID начинается с '-', пробуем убрать минус (формат MAX может отличаться)
      if (chatId && chatId.startsWith('-')) {
        // Пробуем формат без минуса
        chatId = chatId.substring(1);
      }
      
      // Если всё ещё ошибка, отправляем автору отчёта (для теста)
      if (!chatId || chatId === 'undefined') {
        chatId = user?.id?.toString();
        console.log('⚠️ Отправляем автору отчёта:', chatId);
      }
            console.log('🔍 Отладка получателя:');
      console.log('   - Исходный GROUP_ID:', GROUP_ID);
      console.log('   - Используется chat_id:', chatId);
      console.log('   - Автор отчёта ID:', user?.id);
      console.log('📬 Отправка в чат:', chatId);
      
      // 2. Отправляем текст
      console.log('\n📤 Отправляем текст через MAX API...');
      
      const textResponse = await fetch('https://platform-api.max.ru/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': BOT_TOKEN
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          format: 'markdown'
        })
      });
