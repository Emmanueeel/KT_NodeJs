const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3000 });

const clients = new Map();

console.log('==================================');
console.log('✅ СЕРВЕР ЗАПУЩЕН НА ПОРТУ 3000');
console.log('==================================');

wss.on('connection', function connection(ws) {
    clients.set(ws, {
        name: null,
        color: 'black'
    });
    
    console.log('👤 Новый клиент подключился');

    ws.on('message', function incoming(message) {
        try {
            const data = JSON.parse(message);
            const client = clients.get(ws);
            
            console.log('📨 Получено:', data);

            if (data.type === 'register') {
                
                client.name = data.name;
                client.color = data.color || 'black';
                
                console.log(`✅ Зарегистрирован: ${client.name} (${client.color})`);

                const usersList = [];
                clients.forEach((user, socket) => {
                    if (user.name) {
                        usersList.push({
                            name: user.name,
                            color: user.color
                        });
                    }
                });
                
                let welcomeMessage;
                if (usersList.length === 1) {
                    welcomeMessage = '🎉 Добро пожаловать! Вы первый в чате.';
                } else {
                    const otherNames = usersList
                        .filter(u => u.name !== client.name)
                        .map(u => u.name)
                        .join(', ');
                    welcomeMessage = `🎉 Добро пожаловать! В чате уже: ${otherNames}.`;
                }
                
                ws.send(JSON.stringify({
                    type: 'system',
                    content: welcomeMessage
                }));
                
                broadcast({
                    type: 'system',
                    content: `👋 К нам присоединился ${client.name}`
                }, ws);
                
                broadcast({
                    type: 'users_list',
                    users: usersList
                });
            }
            else if (data.type === 'message') {
                if (!client.name) {
                    ws.send(JSON.stringify({
                        type: 'system',
                        content: '⚠️ Сначала представьтесь!'
                    }));
                    return;
                }
                
                if (data.recipient && data.recipient !== 'all') {
                    let recipientSocket = null;
                    let recipientName = data.recipient;
                    
                    for (let [socket, user] of clients.entries()) {
                        if (user.name === recipientName) {
                            recipientSocket = socket;
                            break;
                        }
                    }
                    
                    if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
                        recipientSocket.send(JSON.stringify({
                            type: 'private',
                            name: client.name,
                            content: data.content,
                            color: client.color,
                            recipient: recipientName
                        }));

                        ws.send(JSON.stringify({
                            type: 'system',
                            content: `✉️ Личное сообщение для ${recipientName}: "${data.content}"`
                        }));
                        
                        console.log(`🔒 Личное сообщение от ${client.name} к ${recipientName}`);
                    } else {
                        ws.send(JSON.stringify({
                            type: 'system',
                            content: `Пользователь ${recipientName} не найден или отключился`
                        }));
                    }
                } 
                else {
                    broadcast({
                        type: 'message',
                        name: client.name,
                        content: data.content,
                        color: client.color
                    });
                }
            }
            
        } catch (error) {
            console.error('Ошибка:', error);
        }
    });

    ws.on('close', function() {
        const client = clients.get(ws);
        if (client && client.name) {
            console.log(`👋 ${client.name} отключился`);
            
            broadcast({
                type: 'system',
                content: `👋 ${client.name} нас покинул`
            });
            
            clients.delete(ws);
            
            const usersList = [];
            clients.forEach((user, socket) => {
                if (user.name) {
                    usersList.push({
                        name: user.name,
                        color: user.color
                    });
                }
            });
            
            broadcast({
                type: 'users_list',
                users: usersList
            });
        }
    });
});

function broadcast(message, excludeWs = null) {
    wss.clients.forEach(function each(client) {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

console.log('🚀 Сервер готов к работе!');