const mongoose = require('mongoose');

const dojoSchema = new mongoose.Schema({
  coach_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    required: true
  },
  dojo_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  address: {
    street: String,
    city: String,
    state: String,
    zip_code: String,
    country: String
  },
  phone: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    maxlength: 1000
  },
  established_date: {
    type: Date
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Dojo', dojoSchema);

