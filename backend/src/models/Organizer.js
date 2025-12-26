const mongoose = require('mongoose');

const organizerSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  organization_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  license_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  is_verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Organizer', organizerSchema);

