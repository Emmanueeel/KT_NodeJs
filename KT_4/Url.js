const mongoose = require('mongoose');

/**
 * Схема для хранения URL в MongoDB
 * Основано на документации mongoosejs.com
 */
const urlSchema = new mongoose.Schema({
  shortCode: {
    type: String,
    required: [true, 'Короткий код обязателен'],
    unique: true,
    index: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  
  originalUrl: {
    type: String,
    required: [true, 'Оригинальный URL обязателен'],
    trim: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  clicks: {
    type: Number,
    default: 0
  },
  
  lastClickedAt: {
    type: Date,
    default: null
  }
}, {
  
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

urlSchema.virtual('shortUrl').get(function() {
  return `http://localhost:3000/${this.shortCode}`;
});

urlSchema.statics.findOrCreate = async function(originalUrl) {
  
  let url = await this.findOne({ originalUrl });
  
  if (!url) {
    let shortCode;
    let exists;
    
    do {
      shortCode = Math.random().toString(36).substring(2, 8);
      exists = await this.findOne({ shortCode });
    } while (exists);
    
    url = new this({ 
      shortCode, 
      originalUrl 
    });
    await url.save();
  }
  
  return url;
};

urlSchema.methods.incrementClicks = async function() {
  this.clicks += 1;
  this.lastClickedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Url', urlSchema);