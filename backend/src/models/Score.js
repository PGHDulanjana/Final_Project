const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  match_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: false // Not required for Kata performances
  },
  kata_performance_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KataPerformance',
    required: false // Only for Kata performances
  },
  judge_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Judge',
    required: true
  },
  participant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MatchParticipant',
    required: false // Not required for Kata performances
  },
  player_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: false // Only for Kata performances
  },
  technical_score: {
    type: Number,
    required: false, // Not required for Kumite (calculated from points/penalties)
    min: 0,
    max: 10,
    default: 0
  },
  performance_score: {
    type: Number,
    required: false, // Not required for Kumite (calculated from points/penalties)
    min: 0,
    max: 10,
    default: 0
  },
  final_score: {
    type: Number,
    required: false, // For Kata, calculated from all judge scores
    min: 0,
    max: 30 // For Kata, max is 30 (3 scores × 10.0)
  },
  // Kata-specific: single score per judge (5.0-10.0)
  kata_score: {
    type: Number,
    required: false, // Only for Kata performances
    min: 5.0,
    max: 10.0
  },
  comments: {
    type: String,
    maxlength: 500
  },
  // Kumite-specific scoring fields
  yuko: {
    type: Number,
    default: 0,
    min: 0
  },
  waza_ari: {
    type: Number,
    default: 0,
    min: 0
  },
  ippon: {
    type: Number,
    default: 0,
    min: 0
  },
  chukoku: {
    type: Number,
    default: 0,
    min: 0
  },
  keikoku: {
    type: Number,
    default: 0,
    min: 0
  },
  hansoku_chui: {
    type: Number,
    default: 0,
    min: 0
  },
  hansoku: {
    type: Number,
    default: 0,
    min: 0
  },
  jogai: {
    type: Number,
    default: 0,
    min: 0
  },
  scored_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure unique score per judge per participant per match (for Kumite)
scoreSchema.index({ match_id: 1, judge_id: 1, participant_id: 1 }, { 
  unique: true,
  partialFilterExpression: { match_id: { $ne: null } }
});

// Ensure unique score per judge per player per kata performance (for Kata)
scoreSchema.index({ kata_performance_id: 1, judge_id: 1, player_id: 1 }, { 
  unique: true,
  partialFilterExpression: { kata_performance_id: { $ne: null } }
});

module.exports = mongoose.model('Score', scoreSchema);

