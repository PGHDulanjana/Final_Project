const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  coach_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    default: null
  },
  dojo_name: {
    type: String,
    trim: true,
    maxlength: 200
  },
  coach_name: {
    type: String,
    trim: true,
    maxlength: 200
  },
  age: {
    type: Number,
    min: 5,
    max: 100
  },
  belt_rank: {
    type: String,
    enum: ['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown', 'Black']
  },
  weight_category: {
    type: String,
    trim: true,
    maxlength: 50
  },
  age_category: {
    type: String,
    enum: ['Under 10', '10-12', '13-15', '16-17', '18-21', '22-34', '35+']
  },
  gender: {
    type: String,
    enum: {
      values: ['Male', 'Female'],
      message: 'Gender must be either Male or Female'
    },
    default: null,
    required: false
  },
  // Event type participation preferences
  kata: {
    type: Boolean,
    default: false
  },
  kumite: {
    type: Boolean,
    default: false
  },
  team_kata: {
    type: Boolean,
    default: false
  },
  team_kumite: {
    type: Boolean,
    default: false
  },
  medical_info: {
    type: String,
    default: null
  },
  emergency_contact: {
    name: {
      type: String,
      required: false,
      default: null
    },
    phone: {
      type: String,
      required: false,
      default: null
    },
    relationship: {
      type: String,
      required: false,
      default: null
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Player', playerSchema);

