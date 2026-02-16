// game-client.js для ZeroMQ 6+
const zmq = require("zeromq");


if (process.argv.length < 4) {
    console.log('Использование: node game-client.js <минимальное_число> <максимальное_число> [порт]');
    console.log('Пример: node game-client.js 1 100');
    process.exit(1);
}

const min = parseInt(process.argv[2]);
const max = parseInt(process.argv[3]);
const port = process.argv[4] || 3000;

if (isNaN(min) || isNaN(max) || min >= max) {
    console.log('Ошибка: укажите корректный диапазон чисел (минимальное < максимальное)');
    process.exit(1);
}

const address = `tcp://localhost:${port}`;


async function runClient() {
    try {
        
        const sock = new zmq.Request();
        
        
        await sock.connect(address);
        console.log(`Подключено к серверу по адресу: ${address}`);
        
        
        const secretNumber = Math.floor(Math.random() * (max - min + 1)) + min;
        console.log(`Загадано число в диапазоне ${min}-${max}`);
        console.log(`Секретное число: ${secretNumber} (не показывать серверу!)`);
        console.log('--- Начало игры ---');
        
        let attempts = 0;
        let gameActive = true;
        
        
        const startMessage = JSON.stringify({ range: `${min}-${max}` });
        console.log(`Попытка #1`);
        console.log(`Отправлено серверу: ${startMessage}`);
        await sock.send(startMessage);
        
        
        while (gameActive) {
            try {
                
                const [msg] = await sock.receive();
                attempts++;
                
                
                const data = JSON.parse(msg.toString());
                console.log(`Получено от сервера: ${msg.toString()}`);
                
                if (data.error) {
                    console.log(`Ошибка сервера: ${data.error}`);
                    gameActive = false;
                    break;
                }
                
                if (data.answer !== undefined) {
                    const serverGuess = parseInt(data.answer);
                    
                    if (serverGuess < secretNumber) {
                        console.log(`Сервер предположил: ${serverGuess} - это МЕНЬШЕ загаданного`);
                        const response = JSON.stringify({ hint: 'more' });
                        console.log(`Отправляем подсказку: ${response}`);
                        await sock.send(response);
                        
                    } else if (serverGuess > secretNumber) {
                        console.log(`Сервер предположил: ${serverGuess} - это БОЛЬШЕ загаданного`);
                        const response = JSON.stringify({ hint: 'less' });
                        console.log(`Отправляем подсказку: ${response}`);
                        await sock.send(response);
                        
                    } else {
                        console.log(`Сервер угадал число! Это действительно ${secretNumber}`);
                        console.log(`Потребовалось попыток: ${attempts}`);
                        gameActive = false;
                    }
                }
                
            } catch (error) {
                console.error(`Ошибка обработки сообщения: ${error.message}`);
                gameActive = false;
                break;
            }
        }
        
        
        console.log('--- Игра завершена ---');
        sock.close();
        process.exit(0);
        
    } catch (error) {
        console.error(`Ошибка клиента: ${error.message}`);
        process.exit(1);
    }
}


process.on('SIGINT', () => {
    console.log('\nИгра прервана пользователем');
    process.exit(0);
});


runClient().catch(error => {
    console.error('Неожиданная ошибка:', error);
    process.exit(1);
});