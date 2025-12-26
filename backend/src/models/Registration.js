const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  tournament_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TournamentCategory',
    required: false, // Optional for Coach and Judge registrations (they register for tournament, not specific events)
    default: null
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
  coach_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    default: null
  },
  judge_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Judge',
    default: null
  },
  registration_type: {
    type: String,
    required: true,
    enum: ['Individual', 'Team', 'Judge', 'Coach']
  },
  registration_date: {
    type: Date,
    default: Date.now
  },
  approval_status: {
    type: String,
    required: true,
    enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
    default: 'Pending'
  },
  payment_status: {
    type: String,
    required: true,
    enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  payment_method: {
    type: String,
    enum: ['Card', 'Bank Transfer', 'Cash', 'PayHere']
  },
  transaction_id: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Ensure unique registration per player/coach/judge per tournament
registrationSchema.index({ tournament_id: 1, player_id: 1 }, { unique: true, sparse: true });
registrationSchema.index({ tournament_id: 1, coach_id: 1 }, { unique: true, sparse: true });
registrationSchema.index({ tournament_id: 1, judge_id: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Registration', registrationSchema);

