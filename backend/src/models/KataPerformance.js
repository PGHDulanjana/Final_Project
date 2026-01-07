const mongoose = require('mongoose');

const kataPerformanceSchema = new mongoose.Schema({
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
  player_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  round: {
    type: String,
    required: true,
    enum: ['First Round', 'Second Round (Final 8)', 'Third Round (Final 4)'],
    default: 'First Round'
  },
  performance_order: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Completed'],
    default: 'Scheduled'
  },
  started_at: {
    type: Date,
    default: null
  },
  completed_at: {
    type: Date,
    default: null
  },
  // Calculated final score (after removing highest/lowest, summing 3)
  final_score: {
    type: Number,
    default: null,
    min: 0
  },
  // Place in this round (1st, 2nd, 3rd, 4th for final round)
  place: {
    type: Number,
    default: null,
    min: 1
  }
}, {
  timestamps: true
});

// Ensure unique performance per player per round per category
kataPerformanceSchema.index({ category_id: 1, player_id: 1, round: 1 }, { unique: true });

module.exports = mongoose.model('KataPerformance', kataPerformanceSchema);

