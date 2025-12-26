const mongoose = require('mongoose');

const tournamentResultSchema = new mongoose.Schema({
  tournament_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  player_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  position: {
    type: Number,
    required: true,
    min: 1
  },
  medal_type: {
    type: String,
    enum: ['Gold', 'Silver', 'Bronze', 'None'],
    default: 'None'
  },
  final_score: {
    type: Number,
    required: true,
    min: 0
  },
  result_date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TournamentResult', tournamentResultSchema);

