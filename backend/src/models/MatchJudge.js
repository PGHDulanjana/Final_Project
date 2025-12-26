const mongoose = require('mongoose');

const matchJudgeSchema = new mongoose.Schema({
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
  judge_role: {
    type: String,
    required: true,
    enum: ['Head Judge', 'Judge', 'Referee', 'Timekeeper', 'Scorekeeper']
  },
  assigned_at: {
    type: Date,
    default: Date.now
  },
  is_confirmed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Ensure unique judge per match role
matchJudgeSchema.index({ match_id: 1, judge_id: 1, judge_role: 1 }, { unique: true });

module.exports = mongoose.model('MatchJudge', matchJudgeSchema);

