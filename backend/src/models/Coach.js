const mongoose = require('mongoose');

const coachSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  certification_level: {
    type: String,
    required: true,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master']
  },
  experience_years: {
    type: Number,
    required: true,
    min: 0
  },
  specialization: {
    type: [String],
    default: [],
    enum: ['Kata', 'Kumite', 'Kobudo', 'Self-Defense', 'Fitness', 'Competition']
  },
  // Optional organization details
  organization_name: {
    type: String,
    trim: true,
    maxlength: 200
  },
  organization_license: {
    type: String,
    trim: true,
    maxlength: 100
  },
  is_verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Coach', coachSchema);

