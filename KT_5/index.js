const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/note-app';

console.log('🔄 Инициализация подключения к MongoDB...');
console.log(`📌 Попытка подключения к: ${MONGODB_URI}`);

// ВАЖНО: НИКАКИХ ОПЦИЙ! Только строка подключения!
mongoose.connect(MONGODB_URI);

const db = mongoose.connection;

db.once('open', () => {
  console.log('✅ УСПЕХ! Подключено к MongoDB!');
});

db.on('error', (err) => {
  console.error('❌ ОШИБКА ПОДКЛЮЧЕНИЯ:', err.message);
});

module.exports = mongoose;