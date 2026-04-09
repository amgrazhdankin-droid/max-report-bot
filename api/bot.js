// api/bot.js
const MAX_API = 'https://platform-api.max.ru';
const BOT_TOKEN = process.env.MAX_BOT_TOKEN;      // Добавьте в Vercel Environment Variables
const GROUP_CHAT_ID = process.env.MAX_GROUP_CHAT_ID; // ID группы, куда отправлять отчёты

export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' }, // Важно для приёма фото
  },
};

export default async function handler(req, res) {
  // Разрешаем CORS только для вашего домена
  res.setHeader('Access-Control-Allow-Origin', 'https://amgrazhdankin-droid.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { message, photos, user, type } = req.body;
    
    if (!message || !GROUP_CHAT_ID) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    // 1. Загружаем фотографии (если есть)
    const attachments = [];
    if (photos?.length > 0) {
      for (const base64 of photos) {
        const attachment = await uploadImage(base64);
        if (attachment) {
          attachments.push(attachment);
        }
      }
    }

    // 2. Формируем и отправляем сообщение
    const result = await sendMessage(GROUP_CHAT_ID, message, attachments);
    
    return res.status(200).json({ ok: true, messageId: result.message?.mid });
    
  } catch (error) {
    console.error('❌ Bot error:', error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message || 'Internal server error' 
    });
  }
}

// 🔹 Загрузка изображения
async function uploadImage(base64Data) {
  try {
    // Удаляем префикс data:image/jpeg;base64,
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    // Шаг 1: Получаем URL для загрузки
    const uploadUrlRes = await fetch(`${MAX_API}/uploads?type=image`, {
      method: 'POST',
      headers: {
        'Authorization': BOT_TOKEN,
      },
    });
    
    if (!uploadUrlRes.ok) {
      throw new Error(`Failed to get upload URL: ${uploadUrlRes.status}`);
    }
    
    const { url } = await uploadUrlRes.json();
    
    // Шаг 2: Загружаем файл по полученному URL (multipart/form-data)
    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    formData.append('data', blob, `report_${Date.now()}.jpg`);
    
    const uploadRes = await fetch(url, {
      method: 'POST',
      body: formData,
      // Не передаём заголовок Content-Type — браузер/FormData сам установит границу
    });
    
    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Upload failed: ${uploadRes.status} ${errText}`);
    }
    
    const retval = await uploadRes.json();
    
    // Шаг 3: Возвращаем объект вложения для сообщения
    return {
      type: 'image',
      payload: retval // Содержит token/attachment_id для MAX API
    };
    
  } catch (error) {
    console.error('❌ Image upload error:', error);
    return null; // Пропускаем фото с ошибкой, но продолжаем отправку
  }
}

// 🔹 Отправка сообщения
async function sendMessage(chatId, text, attachments = []) {
  const payload = {
    text: text,
    attachments: attachments.length > 0 ? attachments : undefined,
    format: 'markdown', // Включаем поддержку *жирного* и _курсива_
    notify: true,
  };

  // Пробуем отправить с повторами на случай "attachment.not.ready"
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${MAX_API}/messages?chat_id=${chatId}`, {
        method: 'POST',
        headers: {
          'Authorization': BOT_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        // Если вложение ещё не обработано — ждём и пробуем снова
        if (result.code === 'attachment.not.ready' && attempt < 2) {
          await sleep(1000 * (attempt + 1)); // Экспоненциальная задержка
          continue;
        }
        throw new Error(result.message || `API error: ${res.status}`);
      }
      
      return result;
      
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await sleep(1500);
        continue;
      }
      throw lastError;
    }
  }
  
  throw lastError;
}

// Вспомогательная функция задержки
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
