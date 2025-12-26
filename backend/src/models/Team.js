const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  dojo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dojo',
    required: true
  },
  coach_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    required: true
  },
  team_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  team_type: {
    type: String,
    required: true,
    enum: ['Kata', 'Kumite', 'Team Kata', 'Team Kumite']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Team', teamSchema);

