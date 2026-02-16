const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Note = require('../models/Note');
const { expect } = require('chai');

describe('📝 Notes REST API Testing', function() {
  // Увеличиваем таймаут для тестов
  this.timeout(10000);

  let testNoteId;
  const testTitle = 'Тестовая заметка ' + Date.now();

  // Перед всеми тестами
  before(async () => {
    console.log('🔄 Подготовка к тестам...');
    
    // Проверяем подключение к БД
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect('mongodb://localhost:27017/note-app-test', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
    
    // Очищаем тестовые данные
    await Note.deleteMany({ title: { $regex: '^Тестовая заметка' } });
    console.log('✅ База данных очищена');
  });

  // После всех тестов
  after(async () => {
    console.log('🔄 Завершение тестов...');
    // Очищаем тестовые данные
    await Note.deleteMany({ title: { $regex: '^Тестовая заметка' } });
    // Закрываем соединение с БД
    await mongoose.connection.close();
    console.log('✅ Тесты завершены');
  });

  // ============ ТЕСТ 1: POST /note ============
  describe('POST /note - Создание заметки', () => {
    it('✅ Должен создать новую заметку', async () => {
      const res = await request(app)
        .post('/note')
        .send({
          title: testTitle,
          content: 'Это тестовое содержимое заметки'
        })
        .expect(201);

      // Проверяем структуру ответа
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('title', testTitle);
      expect(res.body).to.have.property('content', 'Это тестовое содержимое заметки');
      expect(res.body).to.have.property('created');
      expect(res.body).to.have.property('changed');
      
      // Проверяем, что created и changed равны при создании
      expect(res.body.created).to.equal(res.body.changed);
      
      testNoteId = res.body.id;
    });

    it('❌ Не должен создать заметку без заголовка', async () => {
      const res = await request(app)
        .post('/note')
        .send({
          content: 'Нет заголовка'
        })
        .expect(409);

      expect(res.body).to.have.property('error');
    });

    it('❌ Не должен создать дубликат заметки', async () => {
      const res = await request(app)
        .post('/note')
        .send({
          title: testTitle,
          content: 'Другое содержимое'
        })
        .expect(409);

      expect(res.body).to.have.property('error');
      expect(res.body.error).to.include('уже существует');
    });
  });

  // ============ ТЕСТ 2: GET /notes ============
  describe('GET /notes - Получение всех заметок', () => {
    it('✅ Должен вернуть массив заметок', async () => {
      const res = await request(app)
        .get('/notes')
        .expect(200);

      expect(res.body).to.be.an('array');
      expect(res.body.length).to.be.at.least(1);
      
      // Проверяем структуру первой заметки
      if (res.body.length > 0) {
        expect(res.body[0]).to.have.property('id');
        expect(res.body[0]).to.have.property('title');
        expect(res.body[0]).to.have.property('content');
        expect(res.body[0]).to.not.have.property('_id'); // Не должно быть _id
        expect(res.body[0]).to.not.have.property('__v'); // Не должно быть __v
      }
    });
  });

  // ============ ТЕСТ 3: GET /note/:id ============
  describe('GET /note/:id - Получение заметки по ID', () => {
    it('✅ Должен вернуть заметку по ID', async () => {
      const res = await request(app)
        .get(`/note/${testNoteId}`)
        .expect(200);

      expect(res.body).to.have.property('id', testNoteId);
      expect(res.body).to.have.property('title', testTitle);
    });

    it('❌ Должен вернуть 404 для несуществующего ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/note/${fakeId}`)
        .expect(404);

      expect(res.body).to.have.property('error');
    });

    it('❌ Должен вернуть 404 для невалидного ID', async () => {
      const res = await request(app)
        .get('/note/123')
        .expect(404);

      expect(res.body).to.have.property('error');
    });
  });

  // ============ ТЕСТ 4: GET /note/read/:title ============
  describe('GET /note/read/:title - Получение заметки по заголовку', () => {
    it('✅ Должен вернуть заметку по заголовку', async () => {
      const res = await request(app)
        .get(`/note/read/${encodeURIComponent(testTitle)}`)
        .expect(200);

      expect(res.body).to.have.property('title', testTitle);
    });

    it('❌ Должен вернуть 404 для несуществующего заголовка', async () => {
      const res = await request(app)
        .get('/note/read/НесуществующийЗаголовок123')
        .expect(404);

      expect(res.body).to.have.property('error');
    });
  });

  // ============ ТЕСТ 5: PUT /note/:id ============
  describe('PUT /note/:id - Обновление заметки', () => {
    const updatedTitle = 'Обновленный заголовок ' + Date.now();
    const updatedContent = 'Обновленное содержимое заметки';

    it('✅ Должен обновить заметку', async () => {
      await request(app)
        .put(`/note/${testNoteId}`)
        .send({
          title: updatedTitle,
          content: updatedContent
        })
        .expect(204);

      // Проверяем, что изменения применились
      const res = await request(app)
        .get(`/note/${testNoteId}`)
        .expect(200);

      expect(res.body).to.have.property('title', updatedTitle);
      expect(res.body).to.have.property('content', updatedContent);
      
      // Проверяем, что changed обновилось
      const changed = new Date(res.body.changed);
      const created = new Date(res.body.created);
      expect(changed.getTime()).to.be.greaterThan(created.getTime());
    });

    it('✅ Должен обновить только заголовок', async () => {
      await request(app)
        .put(`/note/${testNoteId}`)
        .send({
          title: 'Только заголовок ' + Date.now()
        })
        .expect(204);
    });

    it('✅ Должен обновить только содержимое', async () => {
      await request(app)
        .put(`/note/${testNoteId}`)
        .send({
          content: 'Только содержимое'
        })
        .expect(204);
    });

    it('❌ Не должен обновить несуществующую заметку', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .put(`/note/${fakeId}`)
        .send({
          title: 'Новый заголовок'
        })
        .expect(409);

      expect(res.body).to.have.property('error');
    });

    it('❌ Не должен создать дубликат заголовка', async () => {
      // Создаем вторую заметку
      const secondNote = await request(app)
        .post('/note')
        .send({
          title: 'Вторая заметка ' + Date.now(),
          content: 'Вторая заметка'
        })
        .expect(201);

      // Пытаемся обновить первую заметку, дав ей заголовок второй
      const res = await request(app)
        .put(`/note/${testNoteId}`)
        .send({
          title: secondNote.body.title
        })
        .expect(409);

      expect(res.body).to.have.property('error');
      expect(res.body.error).to.include('уже существует');
    });
  });

  // ============ ТЕСТ 6: DELETE /note/:id ============
  describe('DELETE /note/:id - Удаление заметки', () => {
    it('✅ Должен удалить заметку', async () => {
      await request(app)
        .delete(`/note/${testNoteId}`)
        .expect(204);

      // Проверяем, что заметка действительно удалена
      await request(app)
        .get(`/note/${testNoteId}`)
        .expect(404);
    });

    it('❌ Не должен удалить несуществующую заметку', async () => {
      const res = await request(app)
        .delete(`/note/${testNoteId}`) // Уже удалена
        .expect(409);

      expect(res.body).to.have.property('error');
    });

    it('❌ Не должен удалить с невалидным ID', async () => {
      const res = await request(app)
        .delete('/note/123')
        .expect(409);

      expect(res.body).to.have.property('error');
    });
  });
});