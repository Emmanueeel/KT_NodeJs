const express = require('express');
const mongoose = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});


const notesRouter = require('./routes/notes');
const noteRouter = require('./routes/note');

app.use('/notes', notesRouter); // GET /notes
app.use('/note', noteRouter);   // POST /note, GET /note/:id, etc.


app.get('/', (req, res) => {
  res.json({
    name: 'Notes REST API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      'GET /notes': 'Получить все заметки',
      'POST /note': 'Создать заметку',
      'GET /note/:id': 'Получить заметку по ID',
      'GET /note/read/:title': 'Получить заметку по заголовку',
      'PUT /note/:id': 'Обновить заметку',
      'DELETE /note/:id': 'Удалить заметку'
    },
    documentation: 'README.md'
  });
});


app.use((req, res) => {
  console.log('⚠️ 404 - Маршрут не найден:', req.method, req.url);
  res.status(404).json({ 
    error: 'Маршрут не найден',
    method: req.method,
    path: req.url
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Ошибка сервера:', err.stack);
  
  res.status(500).json({ 
    error: 'Внутренняя ошибка сервера',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});



app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  console.log('='.repeat(50));
  console.log('\n📌 Доступные эндпоинты:');
  console.log('   GET    /notes');
  console.log('   POST   /note');
  console.log('   GET    /note/:id');
  console.log('   GET    /note/read/:title');
  console.log('   PUT    /note/:id');
  console.log('   DELETE /note/:id');
  console.log('\n' + '='.repeat(50) + '\n');
});

module.exports = app; // Экспорт для тестов