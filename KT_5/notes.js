const express = require('express');
const router = express.Router();
const Note = require('../models/Note');

/**
 * GET /notes
 * Получить все заметки
 * @returns {Array} Массив заметок
 * @status 200 - Успех (даже если массив пустой)
 * @status 500 - Ошибка сервера
 */
router.get('/', async (req, res) => {
  try {
    console.log('📋 Запрос: GET /notes');
    
    const notes = await Note.find()
      .sort({ created: -1 })
      .lean(); 
    
    console.log(`✅ Найдено заметок: ${notes.length}`);
    
    res.status(200).json(notes);
  } catch (error) {
    console.error('❌ Ошибка при получении заметок:', error.message);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      message: error.message 
    });
  }
});

module.exports = router;