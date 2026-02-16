const express = require('express');
const router = express.Router();
const Note = require('../models/Note');

/**
 * POST /note
 * Создать новую заметку
 * @body {title: string, content: string}
 * @returns {Object} Созданная заметка
 * @status 201 - Создано
 * @status 409 - Конфликт 
 */
router.post('/', async (req, res) => {
  try {
    console.log('📝 Запрос: POST /note');
    console.log('   Тело запроса:', req.body);

    if (!req.body.title) {
      return res.status(409).json({ 
        error: 'Заголовок заметки обязателен' 
      });
    }

    const existingNote = await Note.findOne({ 
      title: { $regex: new RegExp(`^${req.body.title}$`, 'i') } 
    });
    
    if (existingNote) {
      console.log('⚠️ Заголовок уже существует:', req.body.title);
      return res.status(409).json({ 
        error: 'Заметка с таким заголовком уже существует',
        existingNoteId: existingNote.id
      });
    }

    const note = new Note({
      title: req.body.title.trim(),
      content: req.body.content || ''
    });

    await note.save();
    console.log('✅ Заметка создана, ID:', note.id);
    
    res.status(201).json(note);
  } catch (error) {
    console.error('❌ Ошибка при создании заметки:', error.message);
    
    if (error.name === 'ValidationError') {
      return res.status(409).json({ 
        error: 'Ошибка валидации',
        details: error.errors 
      });
    }
    
    res.status(409).json({ 
      error: error.message 
    });
  }
});

/**
 * GET /note/:id
 * Получить заметку по ID
 * @param {string} id - ID заметки
 * @returns {Object} Заметка
 * @status 200 - Найдено
 * @status 404 - Не найдено
 */
router.get('/:id', async (req, res) => {
  try {
    console.log(`🔍 Запрос: GET /note/${req.params.id}`);
    
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ 
        error: 'Неверный формат ID' 
      });
    }

    const note = await Note.findById(req.params.id);
    
    if (!note) {
      console.log('⚠️ Заметка не найдена, ID:', req.params.id);
      return res.status(404).json({ 
        error: 'Заметка не найдена' 
      });
    }
    
    console.log('✅ Заметка найдена:', note.title);
    res.status(200).json(note);
  } catch (error) {
    console.error('❌ Ошибка при получении заметки:', error.message);
    res.status(404).json({ 
      error: 'Заметка не найдена' 
    });
  }
});

/**
 * GET /note/read/:title
 * Получить заметку по заголовку
 * @param {string} title - Заголовок заметки
 * @returns {Object} Заметка
 * @status 200 - Найдено
 * @status 404 - Не найдено
 */
router.get('/read/:title', async (req, res) => {
  try {
    console.log(`🔍 Запрос: GET /note/read/${req.params.title}`);
    
    const title = decodeURIComponent(req.params.title);
    
    const note = await Note.findOne({ 
      title: { $regex: new RegExp(`^${title}$`, 'i') } 
    });
    
    if (!note) {
      console.log('⚠️ Заметка не найдена, заголовок:', title);
      return res.status(404).json({ 
        error: 'Заметка с таким заголовком не найдена' 
      });
    }
    
    console.log('✅ Заметка найдена:', note.title);
    res.status(200).json(note);
  } catch (error) {
    console.error('❌ Ошибка при поиске по заголовку:', error.message);
    res.status(404).json({ 
      error: 'Заметка не найдена' 
    });
  }
});

/**
 * PUT /note/:id
 * Обновить заметку
 * @param {string} id - ID заметки
 * @body {title: string, content: string}
 * @status 204 - Обновлено 
 * @status 409 - Конфликт 
 */
router.put('/:id', async (req, res) => {
  try {
    console.log(`📝 Запрос: PUT /note/${req.params.id}`);
    console.log('   Тело запроса:', req.body);

    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(409).json({ 
        error: 'Неверный формат ID' 
      });
    }
    if (req.body.title) {
      const existingNote = await Note.findOne({
        title: { $regex: new RegExp(`^${req.body.title}$`, 'i') },
        _id: { $ne: req.params.id } 
      });
      
      if (existingNote) {
        console.log('⚠️ Заголовок уже используется другой заметкой:', req.body.title);
        return res.status(409).json({
          error: 'Заметка с таким заголовком уже существует',
          existingNoteId: existingNote.id
        });
      }
    }

    const updateData = {};
    if (req.body.title) updateData.title = req.body.title.trim();
    if (req.body.content !== undefined) updateData.content = req.body.content;
    

    const note = await Note.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: false, 
        runValidators: true,
        context: 'query'
      }
    );

    if (!note) {
      console.log('⚠️ Заметка не найдена, ID:', req.params.id);
      return res.status(409).json({ 
        error: 'Заметка не найдена' 
      });
    }

    console.log('✅ Заметка обновлена, ID:', req.params.id);
    res.status(204).send(); 
  } catch (error) {
    console.error('❌ Ошибка при обновлении заметки:', error.message);
    
    if (error.name === 'ValidationError') {
      return res.status(409).json({ 
        error: 'Ошибка валидации',
        details: error.errors 
      });
    }
    
    res.status(409).json({ 
      error: error.message 
    });
  }
});

/**
 * DELETE /note/:id
 * Удалить заметку
 * @param {string} id - ID заметки
 * @status 204 - Удалено 
 * @status 409 - Конфликт (не найдена)
 */
router.delete('/:id', async (req, res) => {
  try {
    console.log(`🗑️ Запрос: DELETE /note/${req.params.id}`);

    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(409).json({ 
        error: 'Неверный формат ID' 
      });
    }

    const note = await Note.findByIdAndDelete(req.params.id);
    
    if (!note) {
      console.log('⚠️ Заметка не найдена, ID:', req.params.id);
      return res.status(409).json({ 
        error: 'Заметка не найдена' 
      });
    }
    
    console.log('✅ Заметка удалена, ID:', req.params.id);
    res.status(204).send(); 
  } catch (error) {
    console.error('❌ Ошибка при удалении заметки:', error.message);
    res.status(409).json({ 
      error: error.message 
    });
  }
});

module.exports = router;