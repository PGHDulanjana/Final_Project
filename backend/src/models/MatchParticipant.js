const mongoose = require('mongoose');

const matchParticipantSchema = new mongoose.Schema({
  match_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
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
  participant_type: {
    type: String,
    required: true,
    enum: ['Individual', 'Team']
  },
  position: {
    type: String,
    enum: ['Player 1', 'Player 2', 'Player 3', 'Team']
  },
  result: {
    type: String,
    enum: ['Win', 'Loss', 'Draw', 'Disqualified', 'No Show']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MatchParticipant', matchParticipantSchema);

