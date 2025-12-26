const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  match_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  judge_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Judge',
    required: true
  },
  participant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MatchParticipant',
    required: true
  },
  technical_score: {
    type: Number,
    required: true,
    min: 0,
    max: 10
  },
  performance_score: {
    type: Number,
    required: true,
    min: 0,
    max: 10
  },
  final_score: {
    type: Number,
    required: true,
    min: 0,
    max: 10
  },
  comments: {
    type: String,
    maxlength: 500
  },
  scored_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure unique score per judge per participant per match
scoreSchema.index({ match_id: 1, judge_id: 1, participant_id: 1 }, { unique: true });

module.exports = mongoose.model('Score', scoreSchema);

