const http = require('http');

function sendSoapRequest(xml, action) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8000,
            path: '/proxy',
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'Content-Length': Buffer.byteLength(xml),
                'SOAPAction': `urn:${action}`
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('Статус:', res.statusCode);
                
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP Error: ${res.statusCode}`));
                    return;
                }
                
                let match = data.match(/<result>(.*?)<\/result>/s);
                if (!match) {
                    match = data.match(/<tns:result>(.*?)<\/tns:result>/s);
                }
                if (!match) {
                    match = data.match(/<getValutesResponse.*?>(.*?)<\/getValutesResponse>/s);
                }
                
                if (match) {
                    try {
                        let jsonStr = match[1];
                        jsonStr = jsonStr
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&amp;/g, '&')
                            .replace(/&quot;/g, '"')
                            .replace(/&apos;/g, "'");
                        
                        const result = JSON.parse(jsonStr);
                        resolve(result);
                    } catch (e) {
                        reject(new Error('Ошибка парсинга JSON: ' + e.message));
                    }
                } else {
                    // Если не нашли result
                    const faultMatch = data.match(/<faultstring>(.*?)<\/faultstring>/);
                    if (faultMatch) {
                        reject(new Error('Сервер вернул ошибку: ' + faultMatch[1]));
                    } else {
                        console.log('Ответ сервера:', data.substring(0, 300));
                        reject(new Error('Не удалось извлечь данные из ответа'));
                    }
                }
            });
        });
        
        req.on('error', reject);
        req.write(xml);
        req.end();
    });
}

async function testGetValutes() {
    console.log('📊 Тест getValutes...');
    
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:CbrProxyService">
    <soap:Body>
        <tns:getValutes/>
    </soap:Body>
</soap:Envelope>`;
    
    try {
        const result = await sendSoapRequest(xml, 'getValutes');
        console.log(`✅ Получено ${result.length} валют`);
        console.log('📋 Первые 3:', result.slice(0, 3));
        return result;
    } catch (err) {
        console.error('❌ Ошибка в getValutes:', err.message);
        throw err;
    }
}

async function testGetValute() {
    console.log('\n📈 Тест getValute...');
    
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:CbrProxyService">
    <soap:Body>
    <tns:getValute>
        <code>R01235</code>
        <from>${weekAgo.toISOString().split('T')[0]}</from>
        <to>${today.toISOString().split('T')[0]}</to>
    </tns:getValute>
    </soap:Body>
</soap:Envelope>`;
    
    try {
        const result = await sendSoapRequest(xml, 'getValute');
        console.log(`✅ Получено ${result.length} записей`);
        console.log('📋 Первые 3:', result.slice(0, 3));
        return result;
    } catch (err) {
        console.error('❌ Ошибка в getValute:', err.message);
        throw err;
    }
}

async function run() {
    console.log('🔍 Тестирование прокси-сервера...\n');
    
    try {
        await testGetValutes();
        await testGetValute();
        console.log('\n✅ Все тесты пройдены успешно!');
    } catch (err) {
        console.error('\n❌ Тесты не пройдены:', err.message);
    }
}

run();