const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  tournament_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TournamentCategory',
    required: true
  },
  match_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  match_type: {
    type: String,
    required: true,
    enum: ['Kata', 'Kumite', 'Team Kata', 'Team Kumite']
  },
  match_level: {
    type: String,
    required: true,
    enum: ['Preliminary', 'Quarterfinal', 'Semifinal', 'Final', 'Bronze']
  },
  scheduled_time: {
    type: Date,
    required: true
  },
  venue_area: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed'],
    default: 'Scheduled'
  },
  winner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  completed_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Match', matchSchema);

