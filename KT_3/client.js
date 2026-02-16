
let userName = prompt('👋 Введите ваше имя:', 'Гость');
if (!userName || userName.trim() === '') userName = 'Гость';

let userColor = prompt('🎨 Выберите цвет для своих сообщений (например: red, blue, green, #ff0000):', 'black');
if (!userColor || userColor.trim() === '') userColor = 'black';

console.log('👤 Имя:', userName);
console.log('🎨 Цвет:', userColor);

const socket = new WebSocket('ws://localhost:3000');

const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const usersListDiv = document.getElementById('usersList');
const recipientSelect = document.getElementById('recipientSelect');
const connectionText = document.getElementById('connectionText');
const currentUserNameSpan = document.getElementById('currentUserName');
const currentUserColorSpan = document.getElementById('currentUserColor');
const recipientHint = document.getElementById('recipientHint');

socket.onopen = function(e) {
    console.log('✅ Подключено к серверу!');
    if (connectionText) connectionText.textContent = 'Подключено ✅';
    
    if (currentUserNameSpan) currentUserNameSpan.textContent = userName;
    if (currentUserColorSpan) {
        currentUserColorSpan.textContent = userColor;
        currentUserColorSpan.style.color = userColor;
        currentUserColorSpan.style.backgroundColor = userColor + '20';
        currentUserColorSpan.style.padding = '3px 10px';
        currentUserColorSpan.style.borderRadius = '15px';
    }
    
    socket.send(JSON.stringify({
        type: 'register',
        name: userName,
        color: userColor
    }));
    
    addMessage('✅ Подключение к серверу...', 'system');
};

socket.onmessage = function(event) {
    try {
        const data = JSON.parse(event.data);
        console.log('📩 Получено:', data);
        
        if (data.type === 'system') {
            addMessage(`🔔 ${data.content}`, 'system');
        }
        
        else if (data.type === 'message') {
            
            if (data.name === userName) {
                addMessage(`${data.name}: ${data.content}`, 'own-message', data.color);
            } else {
                addMessage(`${data.name}: ${data.content}`, 'message', data.color);
            }
        }
        
        else if (data.type === 'private') {
            const messageText = `✉️ [ЛИЧНОЕ] ${data.name}: ${data.content}`;
            const messageElement = addMessage(messageText, 'private', data.color);
            if (messageElement) {
                messageElement.style.backgroundColor = '#fff3cd';
                messageElement.style.borderLeft = '4px solid #ffc107';
            }
            
            if (data.name !== userName) {
                document.title = '✉️ Новое личное сообщение!';
                setTimeout(() => { document.title = 'Чат на веб-сокетах'; }, 3000);
            }
        }
        
        else if (data.type === 'users_list') {
            updateUsersList(data.users);
        }
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
    }
};


socket.onerror = function(error) {
    console.error('❌ Ошибка WebSocket:', error);
    addMessage('❌ Ошибка подключения к серверу!', 'system');
    addMessage('💡 Запустите сервер: node server.js', 'system');
    if (connectionText) connectionText.textContent = 'Ошибка подключения ❌';
};

socket.onclose = function() {
    console.log('🔴 Отключено от сервера');
    addMessage('🔴 Отключено от сервера', 'system');
    if (connectionText) connectionText.textContent = 'Отключено 🔴';
};

function sendMessage() {
    const message = messageInput.value.trim();
    const recipient = recipientSelect ? recipientSelect.value : 'all';
    
    if (message) {

        socket.send(JSON.stringify({
            type: 'message',
            content: message,
            recipient: recipient
        }));
        
        if (recipient !== 'all') {
            const messageElement = addMessage(`✉️ Вы -> ${recipient}: ${message}`, 'self-private', userColor);
            if (messageElement) {
                messageElement.style.backgroundColor = '#f8f9fa';
                messageElement.style.borderLeft = '4px solid #6c757d';
            }
        }
        
        messageInput.value = '';
    }
}

sendButton.onclick = sendMessage;

messageInput.onkeypress = function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
};

function addMessage(text, type = 'normal', color = null) {
    if (!messagesDiv) return null;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = text;
    
    if (type === 'message' && color) {
        messageElement.style.color = color;
    }
    
    if (type === 'own-message') {
        messageElement.style.background = 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)';
        messageElement.style.marginLeft = 'auto';
        messageElement.style.borderBottomRightRadius = '4px';
        if (color) messageElement.style.color = color;
    }
    
    if (type === 'private') {
        messageElement.style.fontWeight = '500';
        messageElement.style.border = '1px solid #ffc107';
    }
    
    if (type === 'self-private') {
        messageElement.style.fontStyle = 'italic';
        messageElement.style.color = '#666';
        messageElement.style.marginLeft = 'auto';
        messageElement.style.borderBottomRightRadius = '4px';
    }
    
    if (type === 'system') {
        messageElement.style.color = '#666';
        messageElement.style.fontStyle = 'italic';
        messageElement.style.backgroundColor = '#e3f2fd';
        messageElement.style.textAlign = 'center';
        messageElement.style.maxWidth = '100%';
    }
    

    const timeElement = document.createElement('div');
    timeElement.className = 'message-time';
    const now = new Date();
    timeElement.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    messageElement.appendChild(timeElement);
    
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    return messageElement;
}

function updateUsersList(users) {
    if (!usersListDiv) {
        console.error('❌ usersListDiv не найден!');
        return;
    }
    
    console.log('👥 Обновление списка пользователей:', users);
    

    usersListDiv.innerHTML = '';
    
    if (!users || users.length === 0) {
        usersListDiv.innerHTML = '<div style="color: #999; text-align: center; padding: 20px;">👥 Нет активных пользователей</div>';
        return;
    }
    

    const sortedUsers = [...users].sort((a, b) => {
        if (a.name === userName) return -1;
        if (b.name === userName) return 1;
        return a.name.localeCompare(b.name);
    });
    

    sortedUsers.forEach(user => {
        const userElement = document.createElement('div');
        userElement.style.padding = '12px 15px';
        userElement.style.marginBottom = '8px';
        userElement.style.borderRadius = '12px';
        userElement.style.transition = 'all 0.3s';
        userElement.style.display = 'flex';
        userElement.style.alignItems = 'center';
        userElement.style.gap = '8px';
        
        let userColorStyle = user.color || 'black';
        

        if (user.name === userName) {
            userElement.innerHTML = `
                <span style="font-size: 18px;">👉</span>
                <span style="font-weight: bold; color: ${userColorStyle};">${user.name}</span>
                <span style="background: #4caf50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: auto;">это вы</span>
            `;
            userElement.style.background = 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)';
            userElement.style.border = '1px solid #4a90e2';
        } else {
            userElement.innerHTML = `
                <span style="font-size: 14px; color: #4caf50;">🟢</span>
                <span style="color: ${userColorStyle}; font-weight: 500;">${user.name}</span>
            `;
            userElement.style.background = '#f8f9fa';
            userElement.style.border = '1px solid transparent';
            userElement.style.cursor = 'pointer';
            userElement.title = `Нажмите, чтобы написать лично ${user.name}`;
            
            userElement.onclick = function() {
                if (recipientSelect) {
                    recipientSelect.value = user.name;
                    messageInput.placeholder = `✉️ Личное сообщение для ${user.name}...`;
                    if (recipientHint) {
                        recipientHint.innerHTML = `✉️ Пишите лично <span style="color: ${userColorStyle};">${user.name}</span>`;
                        recipientHint.style.color = '#ff9800';
                    }
                    messageInput.focus();
                    addMessage(`💡 Теперь вы пишете лично ${user.name}`, 'system');
                }
            };
            
            userElement.onmouseover = function() {
                this.style.background = '#e9ecef';
                this.style.borderColor = userColorStyle;
                this.style.transform = 'translateX(5px)';
            };
            userElement.onmouseout = function() {
                this.style.background = '#f8f9fa';
                this.style.borderColor = 'transparent';
                this.style.transform = 'translateX(0)';
            };
        }
        
        usersListDiv.appendChild(userElement);
    });
    
    updateRecipientSelect(users);
}


function updateRecipientSelect(users) {
    if (!recipientSelect) {
        console.error('❌ recipientSelect не найден!');
        return;
    }
    
    const currentValue = recipientSelect.value;
    
    recipientSelect.innerHTML = '<option value="all">📢 Всем участникам</option>';
    
    let hasOtherUsers = false;
    
    users.forEach(user => {
        if (user.name !== userName) {
            hasOtherUsers = true;
            const option = document.createElement('option');
            option.value = user.name;
            option.textContent = `✉️ ${user.name}`;
            if (user.color) {
                option.style.color = user.color;
                option.style.fontWeight = '500';
            }
            recipientSelect.appendChild(option);
        }
    });
    
    if (!hasOtherUsers) {
        const option = document.createElement('option');
        option.value = 'all';
        option.textContent = '📢 Нет других участников';
        option.disabled = true;
        recipientSelect.appendChild(option);
        if (recipientHint) {
            recipientHint.innerHTML = '💡 Вы пока один в чате';
            recipientHint.style.color = '#999';
        }
    }
    
    
    if (currentValue && currentValue !== 'all') {
        
        const userExists = users.some(u => u.name === currentValue);
        if (userExists) {
            recipientSelect.value = currentValue;
            const selectedUser = users.find(u => u.name === currentValue);
            if (selectedUser && recipientHint) {
                recipientHint.innerHTML = `✉️ Пишите лично <span style="color: ${selectedUser.color};">${selectedUser.name}</span>`;
            }
        }
    }
    
    
    recipientSelect.onchange = function() {
        if (this.value === 'all') {
            messageInput.placeholder = 'Введите сообщение для всех...';
            if (recipientHint) {
                recipientHint.innerHTML = '📢 Сообщение увидят все';
                recipientHint.style.color = '#999';
            }
        } else {
            const selectedUser = users.find(u => u.name === this.value);
            messageInput.placeholder = `✉️ Личное сообщение для ${this.value}...`;
            if (recipientHint && selectedUser) {
                recipientHint.innerHTML = `✉️ Пишите лично <span style="color: ${selectedUser.color};">${selectedUser.name}</span>`;
                recipientHint.style.color = '#ff9800';
            }
        }
        messageInput.focus();
    };
}


addMessage('💬 Добро пожаловать в чат!', 'system');
addMessage(`👤 Вы вошли как: ${userName}`, 'system');
addMessage(`🎨 Ваш цвет: ${userColor}`, 'system');
addMessage(`💡 Нажмите на имя в списке, чтобы написать лично`, 'system');

console.log('✅ Клиент готов!');