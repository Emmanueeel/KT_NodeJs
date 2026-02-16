const http = require('http');
const cbr = require('./cbr-client');

const server = http.createServer(async (req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    // Отдаем WSDL
    if (req.url === '/proxy?wsdl') {
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(`<?xml version="1.0" encoding="UTF-8"?>
<definitions name="CbrProxyService"
      targetNamespace="urn:CbrProxyService"
      xmlns="http://schemas.xmlsoap.org/wsdl/"
      xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
      xmlns:tns="urn:CbrProxyService"
      xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <message name="getValutesRequest"/>
  <message name="getValutesResponse">
    <part name="result" type="xsd:string"/>
  </message>
  <message name="getValuteRequest">
    <part name="code" type="xsd:string"/>
    <part name="from" type="xsd:string"/>
    <part name="to" type="xsd:string"/>
  </message>
  <portType name="CbrProxyPortType">
    <operation name="getValutes">
      <input message="tns:getValutesRequest"/>
      <output message="tns:getValutesResponse"/>
    </operation>
    <operation name="getValute">
      <input message="tns:getValuteRequest"/>
      <output message="tns:getValuteResponse"/>
    </operation>
  </portType>
  <binding name="CbrProxyBinding" type="tns:CbrProxyPortType">
    <soap:binding style="rpc" transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="getValutes">
      <soap:operation soapAction="urn:getValutes"/>
      <input><soap:body use="literal" namespace="urn:CbrProxyService"/></input>
      <output><soap:body use="literal" namespace="urn:CbrProxyService"/></output>
    </operation>
    <operation name="getValute">
      <soap:operation soapAction="urn:getValute"/>
      <input><soap:body use="literal" namespace="urn:CbrProxyService"/></input>
      <output><soap:body use="literal" namespace="urn:CbrProxyService"/></output>
    </operation>
  </binding>
  <service name="CbrProxyService">
    <port name="CbrProxyPort" binding="tns:CbrProxyBinding">
      <soap:address location="http://localhost:8000/proxy"/>
    </port>
  </service>
</definitions>`);
        return;
    }
    
    // Обрабатываем SOAP запросы
    if (req.url === '/proxy' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const soapAction = req.headers.soapaction?.replace(/"/g, '') || '';
                console.log('SOAPAction:', soapAction);
                
                if (soapAction.includes('getValutes')) {
                    console.log('📊 Вызов getValutes');
                    
                    const catalog = await cbr.fetchValutesCatalog();
                    const today = new Date();
                    const rates = await cbr.fetchRatesOnDate(today);
                    
                    const data = catalog
                        .map(v => {
                            const rate = rates.find(r => r.code === v.code);
                            return rate ? {
                                code: v.code,
                                name: v.name,
                                value: rate.value
                            } : null;
                        })
                        .filter(v => v !== null);
                    
                    const jsonResult = JSON.stringify(data);
                    console.log(`✅ Получено ${data.length} валют`);
                    
                    // Формируем правильный SOAP ответ
                    const responseXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:CbrProxyService">
  <soap:Body>
    <tns:getValutesResponse>
      <result>${jsonResult.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</result>
    </tns:getValutesResponse>
  </soap:Body>
</soap:Envelope>`;
                    
                    res.writeHead(200, { 'Content-Type': 'text/xml' });
                    res.end(responseXml);
                    
                } else if (soapAction.includes('getValute')) {
                    console.log('📈 Вызов getValute');
                    
                    const codeMatch = body.match(/<code>(.*?)<\/code>/);
                    const fromMatch = body.match(/<from>(.*?)<\/from>/);
                    const toMatch = body.match(/<to>(.*?)<\/to>/);
                    
                    const code = codeMatch ? codeMatch[1] : 'R01235';
                    const from = fromMatch ? fromMatch[1] : '2026-02-06';
                    const to = toMatch ? toMatch[1] : '2026-02-13';
                    
                    console.log(`Параметры: code=${code}, from=${from}, to=${to}`);
                    
                    const fromDate = new Date(from);
                    const toDate = new Date(to);
                    
                    const dynamics = await cbr.fetchCurrencyDynamic(fromDate, toDate, code);
                    const jsonResult = JSON.stringify(dynamics);
                    console.log(`✅ Получено ${dynamics.length} записей`);
                    
                    // Формируем правильный SOAP ответ
                    const responseXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:CbrProxyService">
  <soap:Body>
    <tns:getValuteResponse>
      <result>${jsonResult.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</result>
    </tns:getValuteResponse>
  </soap:Body>
</soap:Envelope>`;
                    
                    res.writeHead(200, { 'Content-Type': 'text/xml' });
                    res.end(responseXml);
                    
                } else {
                    throw new Error('Неизвестная операция');
                }
                
            } catch (err) {
                console.error('❌ Ошибка:', err);
                res.writeHead(500, { 'Content-Type': 'text/xml' });
                res.end(`<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>Server</faultcode>
      <faultstring>${err.message}</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`);
            }
        });
        return;
    }
    
    res.writeHead(404);
    res.end('Not Found');
});

server.listen(8000, () => {
    console.log('='.repeat(50));
    console.log('✅ Прокси-сервер запущен на порту 8000');
    console.log('📍 WSDL: http://localhost:8000/proxy?wsdl');
    console.log('📍 SOAP endpoint: http://localhost:8000/proxy');
    console.log('='.repeat(50));
});