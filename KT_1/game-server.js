const zmq = require("zeromq");

let min = 0;
let max = 0;
let currentGuess = 0;
let isGameActive = false;


function makeGuess() {
    return Math.floor((min + max) / 2);
}


function handleMessage(msg) {
    try {
        
        const data = JSON.parse(msg.toString());
        console.log(`Получено от клиента: ${msg.toString()}`);
        
        if (data.range) {
            
            const rangeParts = data.range.split('-');
            min = parseInt(rangeParts[0]);
            max = parseInt(rangeParts[1]);
            isGameActive = true;
            
            currentGuess = makeGuess();
            console.log(`Начата новая игра. Диапазон: ${min}-${max}`);
            console.log(`Первый вариант: ${currentGuess}`);
            
            return JSON.stringify({ answer: currentGuess });
            
        } else if (data.hint && isGameActive) {
            
            if (data.hint === 'more') {
                min = currentGuess + 1;
                console.log(`Подсказка: число БОЛЬШЕ чем ${currentGuess}`);
            } else if (data.hint === 'less') {
                max = currentGuess - 1;
                console.log(`Подсказка: число МЕНЬШЕ чем ${currentGuess}`);
            }
            
            
            if (min > max) {
                isGameActive = false;
                console.log('Ошибка: диапазон некорректен. Возможно клиент дал противоречивую подсказку.');
                return JSON.stringify({ error: 'Invalid range' });
            }
            
            
            currentGuess = makeGuess();
            console.log(`Следующее предположение: ${currentGuess}`);
            
            return JSON.stringify({ answer: currentGuess });
            
        } else {
            
            console.log(`Некорректное сообщение: ${msg.toString()}`);
            return JSON.stringify({ error: 'Invalid message format' });
        }
    } catch (error) {
        console.error(`Ошибка обработки сообщения: ${error.message}`);
        return JSON.stringify({ error: 'Message processing error' });
    }
}


async function runServer() {
    try {
        
        const sock = new zmq.Reply();
        
        
        const port = process.argv[2] || 3000;
        const address = `tcp://*:${port}`;
        
        
        await sock.bind(address);
        console.log(`Сервер запущен на порту ${port}`);
        console.log('Готов к игре...');
        
        
        while (true) {
            try {
                
                const [msg] = await sock.receive();
                
                
                const response = handleMessage(msg);
                
                
                await sock.send(response);
                
            } catch (error) {
                console.error(`Ошибка в цикле обработки: ${error.message}`);
                
                
                if (error.message.includes('Context was terminated')) {
                    break;
                }
            }
        }
        
    } catch (error) {
        console.error(`Ошибка запуска сервера: ${error.message}`);
        process.exit(1);
    }
}


process.on('SIGINT', async () => {
    console.log('\nСервер завершает работу...');
    process.exit(0);
});


process.on('SIGTERM', async () => {
    console.log('\nСервер получает сигнал завершения...');
    process.exit(0);
});


runServer().catch(error => {
    console.error('Неожиданная ошибка:', error);
    process.exit(1);
});