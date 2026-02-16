const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');

const VALID_CATEGORIES = ['business', 'politics', 'auto'];

app.get('/:count/news/for/:category', async (req, res) => {
    try {
        console.log('🔍 Получен запрос:', req.params);
        
        const count = parseInt(req.params.count);
        const category = req.params.category;
        if (isNaN(count) || count <= 0) {
            return res.status(400).send('Ошибка: количество должно быть положительным числом');
        }

        if (!VALID_CATEGORIES.includes(category)) {
            return res.status(400).send(`Ошибка: категория "${category}" не поддерживается. Доступные категории: ${VALID_CATEGORIES.join(', ')}`);
        }

        console.log(`Запрос обработан: ${count} новостей из категории "${category}"`);

        const rssUrl = `https://www.vedomosti.ru/rss/rubric/${category}`;
        console.log('📡 RSS URL:', rssUrl);

        console.log('Отправка запроса к rss2json...');
        const response = await axios.get('https://api.rss2json.com/v1/api.json', {
            params: {
                rss_url: rssUrl
            },
            timeout: 10000
        });

        console.log('Ответ получен от rss2json');

        const newsData = response.data;

        if (!newsData.items || newsData.items.length === 0) {
            return res.status(404).send('Новости не найдены для данной категории');
        }

        const newsItems = newsData.items.slice(0, count);
        console.log(`Получено ${newsItems.length} новостей`);

        res.render('news', {
            newsItems: newsItems,
            count: count,
            category: category,
            requestDate: new Date().toLocaleString('ru-RU')
        });

    } catch (error) {
        console.error('Ошибка:', error.message);
        
        if (error.code === 'ECONNABORTED') {
            res.status(504).send('Таймаут запроса. Сервер долго не отвечает.');
        } else if (error.response) {
            res.status(502).send('Ошибка при получении данных от rss2json');
        } else {
            res.status(500).send('Внутренняя ошибка сервера');
        }
    }
});
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Сервер новостей Ведомости</title>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
                h1 { color: #333; }
                ul { list-style-type: none; padding: 0; }
                li { margin: 10px 0; }
                a { color: #011324; text-decoration: none; }
                a:hover { text-decoration: underline; }
                .category { background: #f5f5f5; padding: 20px; border-radius: 5px; }
            </style>
        </head>
        <body>
            <h1>Сервер новостей Ведомости</h1>
            <p>Сервер успешно запущен! Используй следующие ссылки для получения новостей:</p>
            
            <div class="category">
                <h2>Бизнес</h2>
                <ul>
                    <li><a href="/3/news/for/business">🔹 3 последние новости бизнеса</a></li>
                    <li><a href="/5/news/for/business">🔹 5 последних новостей бизнеса</a></li>
                    <li><a href="/10/news/for/business">🔹 10 последних новостей бизнеса</a></li>
                </ul>
            </div>
            
            <div class="category">
                <h2>Авто</h2>
                <ul>
                    <li><a href="/3/news/for/auto">🔹 3 последние новости авто</a></li>
                    <li><a href="/5/news/for/auto">🔹 5 последних новостей авто</a></li>
                </ul>
            </div>
            
            <div class="category">
                <h2>Политика</h2>
                <ul>
                    <li><a href="/3/news/for/politics">🔹 3 последние новости политики</a></li>
                </ul>
            </div>
            
            <p><strong>Доступные категории:</strong> ${VALID_CATEGORIES.join(', ')}</p>
            
        </body>
        </html>
    `);
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        time: new Date().toISOString(),
        categories: VALID_CATEGORIES
    });
});


app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('СЕРВЕР НОВОСТЕЙ ЗАПУЩЕН');
    console.log('='.repeat(50));
    console.log(`Адрес: http://localhost:${PORT}`);
    console.log('\nДоступные маршруты:');
    console.log(`   • Главная: http://localhost:${PORT}/`);
    console.log(`   • Проверка: http://localhost:${PORT}/health`);
    console.log('\n Примеры запросов новостей:');
    console.log(`   • http://localhost:${PORT}/3/news/for/business`);
    console.log(`   • http://localhost:${PORT}/5/news/for/auto`);
    console.log(`   • http://localhost:${PORT}/10/news/for/politics`);
    console.log('\n Доступные категории:');
    console.log(`   • ${VALID_CATEGORIES.join('\n   • ')}`);
    console.log('\n' + '='.repeat(50) + '\n');
});