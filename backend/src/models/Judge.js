const mongoose = require('mongoose');

const judgeSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  certification_level: {
    type: String,
    required: true,
    enum: ['National', 'International', 'World', 'Master']
  },
  specialization: {
    type: [String],
    default: [],
    enum: ['Kata', 'Kumite', 'Team Kata', 'Team Kumite']
  },
  experience_years: {
    type: Number,
    required: true,
    min: 0
  },
  is_certified: {
    type: Boolean,
    default: false
  },
  is_available: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Judge', judgeSchema);

