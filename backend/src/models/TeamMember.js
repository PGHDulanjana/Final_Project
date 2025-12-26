const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  player_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['Captain', 'Member', 'Reserve']
  },
  joined_date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure unique player per team
teamMemberSchema.index({ team_id: 1, player_id: 1 }, { unique: true });

module.exports = mongoose.model('TeamMember', teamMemberSchema);

