const express = require('express');
const mongoose = require('mongoose');
const Url = require('./models/Url');

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect('mongodb://127.0.0.1:27017/urlshortener')
  .then(() => {
    console.log('MongoDB подключена успешно');
    console.log('База данных: urlshortener');
    console.log('Подключение: mongodb://127.0.0.1:27017/urlshortener');
  })
  .catch(err => {
    console.error('Ошибка подключения к MongoDB:');
    console.error(err.message);
    console.error('\n💡 Убедитесь, что MongoDB запущена:');
    console.error('   C:\\mongodb\\bin\\mongod.exe --dbpath C:\\data\\db');
    process.exit(1);
  });

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

/**
 * Проверка валидности URL
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}


/**
 * @route   GET /
 * @desc    Главная страница с инструкцией
 */
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>URL Shortener Service</title>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 0 20px;
          line-height: 1.6;
          background: #f5f5f5;
        }
        h1 { color: #2c3e50; }
        .container {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        code {
          background: #f8f9fa;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 1.1em;
          color: #e83e8c;
        }
        .endpoint {
          background: #e9ecef;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #007bff;
        }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Сервис сокращения URL</h1>
        <p>Express + MongoDB + Mongoose</p>
        
        <div class="endpoint">
          <h2>Создать короткую ссылку</h2>
          <code>GET /create?url=ВАШ_URL</code>
          <p>Пример:</p>
          <a href="/create?url=https://google.com">
            <code>http://localhost:${PORT}/create?url=https://google.com</code>
          </a>
        </div>
        
        <div class="endpoint">
          <h2>Перейти по короткой ссылке</h2>
          <code>GET /{shortCode}</code>
          <p>Пример: <code>http://localhost:${PORT}/abc123</code></p>
        </div>
        
        <div class="endpoint">
          <h2>Статистика по ссылке</h2>
          <code>GET /stats/{shortCode}</code>
          <p>Пример: <code>http://localhost:${PORT}/stats/abc123</code></p>
        </div>
        
        <div class="endpoint">
          <h2>Статус сервера</h2>
          <p class="success">✓ MongoDB: Подключена</p>
          <p class="success">✓ Сервер: Запущен на порту ${PORT}</p>
          <p>Mongoose версия: 8.x</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

/**
 * @route   GET /create
 * @desc    Создание короткой ссылки
 * @param   {string} url - Оригинальный URL
 */
app.get('/create', async (req, res) => {
  try {
    const originalUrl = req.query.url;
    
    if (!originalUrl) {
      return res.status(400).json({
        success: false,
        error: 'Не передан параметр url',
        example: '/create?url=https://google.com'
      });
    }
    
    if (!isValidUrl(originalUrl)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный URL',
        message: 'URL должен начинаться с http:// или https://'
      });
    }
    
    const url = await Url.findOrCreate(originalUrl);
    
    res.json({
      success: true,
      originalUrl: url.originalUrl,
      shortCode: url.shortCode,
      shortUrl: url.shortUrl,
      createdAt: url.createdAt,
      clicks: url.clicks
    });
    
    console.log(`Создана ссылка: ${url.originalUrl} -> ${url.shortUrl}`);
    
  } catch (error) {
    console.error('Ошибка при создании ссылки:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * @route   GET /:shortCode
 * @desc    Редирект на оригинальный URL
 */
app.get('/:shortCode', async (req, res) => {
  try {
    if (req.params.shortCode === 'favicon.ico') {
      return res.status(204).end();
    }
    
    const { shortCode } = req.params;
    
    const url = await Url.findOne({ shortCode });
    
    if (url) {
      await url.incrementClicks();
      
      console.log(`🔄 Редирект [${url.clicks}]: ${shortCode} -> ${url.originalUrl}`);
      
      return res.redirect(302, url.originalUrl);
    }
    
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ссылка не найдена</title>
        <style>
          body {
            font-family: sans-serif;
            max-width: 600px;
            margin: 100px auto;
            text-align: center;
            padding: 0 20px;
          }
          h1 { color: #dc3545; }
          a {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 20px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <h1> Ссылка не найдена</h1>
        <p>Короткий код <strong>${shortCode}</strong> не существует в базе данных</p>
        <a href="/">← Вернуться на главную</a>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Ошибка при редиректе:', error);
    res.status(500).send('Внутренняя ошибка сервера');
  }
});

/**
 * @route   GET /stats/:shortCode
 * @desc    Получить статистику по ссылке
 */
app.get('/stats/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    const url = await Url.findOne({ shortCode });
    
    if (!url) {
      return res.status(404).json({
        success: false,
        error: 'Ссылка не найдена'
      });
    }
    
    res.json({
      success: true,
      data: {
        shortCode: url.shortCode,
        shortUrl: url.shortUrl,
        originalUrl: url.originalUrl,
        createdAt: url.createdAt,
        clicks: url.clicks,
        lastClickedAt: url.lastClickedAt
      }
    });
    
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * @route   DELETE /delete/:shortCode
 * @desc    Удалить ссылку
 */
app.delete('/delete/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    const result = await Url.findOneAndDelete({ shortCode });
    
    if (result) {
      res.json({
        success: true,
        message: `Ссылка ${shortCode} успешно удалена`,
        deleted: {
          shortCode: result.shortCode,
          originalUrl: result.originalUrl
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Ссылка не найдена'
      });
    }
    
  } catch (error) {
    console.error('Ошибка при удалении:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Маршрут не найден',
    availableEndpoints: [
      'GET /',
      'GET /create?url=...',
      'GET /:shortCode',
      'GET /stats/:shortCode',
      'DELETE /delete/:shortCode'
    ]
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Необработанная ошибка:', err);
  res.status(500).json({
    success: false,
    error: 'Внутренняя ошибка сервера'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  console.log(`📌 Создать ссылку: http://localhost:${PORT}/create?url=https://google.com`);
  console.log(`📊 Статистика: http://localhost:${PORT}/stats/abc123`);
  console.log(`❌ Удалить: DELETE http://localhost:${PORT}/delete/abc123`);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Завершение работы...');
  await mongoose.connection.close();
  console.log('Соединение с MongoDB закрыто');
  process.exit(0);
});