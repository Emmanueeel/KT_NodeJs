const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Заголовок заметки обязателен'],
    unique: true,
    trim: true,
    minlength: [1, 'Заголовок не может быть пустым'],
    maxlength: [200, 'Заголовок не может быть длиннее 200 символов']
  },
  content: {
    type: String,
    default: '',
    trim: true,
    maxlength: [5000, 'Содержимое не может быть длиннее 5000 символов']
  },
  created: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  changed: {
    type: Date,
    default: Date.now
  }
}, {
  versionKey: false, 
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret._id; 
      return ret;
    }
  }
});

noteSchema.pre('findOneAndUpdate', function(next) {
  this.set({ changed: new Date() });
  next();
});

noteSchema.pre('save', function(next) {
  if (this.isNew) {
    this.changed = this.created;
  }
  next();
});

noteSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

noteSchema.index({ title: 1 });
noteSchema.index({ created: -1 });


noteSchema.statics.findByTitle = function(title) {
  return this.findOne({ title: new RegExp(title, 'i') }); 
};

noteSchema.methods.summary = function() {
  return {
    id: this.id,
    title: this.title,
    created: this.created,
    changed: this.changed,
    excerpt: this.content.substring(0, 100) + (this.content.length > 100 ? '...' : '')
  };
};

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;