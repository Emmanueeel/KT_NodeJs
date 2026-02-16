const http = require('http');

// Тест getValutes
function testGetValutes() {
    console.log('📊 Тест getValutes...');
    
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:CbrProxyService">
    <soap:Body>
        <tns:getValutes/>
    </soap:Body>
</soap:Envelope>`;
    
    const options = {
        hostname: 'localhost',
        port: 8000,
        path: '/proxy',
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'Content-Length': Buffer.byteLength(xml),
            'SOAPAction': 'urn:getValutes'
        }
    };
    
    const req = http.request(options, (res) => {
        console.log(`Статус: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Ответ получен, длина:', data.length);
            
            // Парсим результат
            const match = data.match(/<result>(.*?)<\/result>/s);
            if (match) {
                try {
                    // Декодируем XML спецсимволы
                    let jsonStr = match[1]
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&apos;/g, "'");
                    
                    const result = JSON.parse(jsonStr);
                    console.log('✅ Успех! Получено записей:', result.length);
                    console.log('📋 Первые 3:', result.slice(0, 3));
                } catch (e) {
                    console.log('❌ Ошибка парсинга JSON:', e.message);
                    console.log('Строка:', match[1].substring(0, 200));
                }
            } else {
                console.log('❌ Нет тега result в ответе');
                console.log('Ответ:', data.substring(0, 300));
            }
        });
    });
    
    req.on('error', (err) => console.error('Ошибка:', err));
    req.write(xml);
    req.end();
}

// Тест getValute
function testGetValute() {
    console.log('\n📈 Тест getValute...');
    
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:CbrProxyService">
    <soap:Body>
        <tns:getValute>
        <code>R01235</code>
        <from>2026-02-06</from>
        <to>2026-02-13</to>
        </tns:getValute>
    </soap:Body>
</soap:Envelope>`;
    
    const options = {
        hostname: 'localhost',
        port: 8000,
        path: '/proxy',
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'Content-Length': Buffer.byteLength(xml),
            'SOAPAction': 'urn:getValute'
        }
    };
    
    const req = http.request(options, (res) => {
        console.log(`Статус: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Ответ получен, длина:', data.length);
            
            const match = data.match(/<result>(.*?)<\/result>/s);
            if (match) {
                try {
                    let jsonStr = match[1]
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&apos;/g, "'");
                    
                    const result = JSON.parse(jsonStr);
                    console.log('✅ Успех! Получено записей:', result.length);
                    console.log('📋 Первые 3:', result.slice(0, 3));
                } catch (e) {
                    console.log('❌ Ошибка парсинга JSON:', e.message);
                }
            } else {
                console.log('❌ Нет тега result в ответе');
                console.log('Ответ:', data.substring(0, 300));
            }
        });
    });
    
    req.on('error', (err) => console.error('Ошибка:', err));
    req.write(xml);
    req.end();
}

console.log('🔍 Тестирование прокси-сервера прямыми HTTP запросами...\n');
testGetValutes();
setTimeout(testGetValute, 2000);