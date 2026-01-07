const mongoose = require('mongoose');

const tatamiSchema = new mongoose.Schema({
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
  tatami_number: {
    type: Number,
    required: true,
    min: 1
  },
  tatami_name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  location: {
    type: String,
    trim: true,
    maxlength: 200
  },
  status: {
    type: String,
    enum: ['Setup', 'Active', 'Completed', 'Closed'],
    default: 'Setup'
  },
  assigned_judges: [{
    judge_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Judge',
      required: true
    },
    judge_role: {
      type: String,
      enum: ['Head Judge', 'Judge', 'Referee', 'Timekeeper', 'Scorekeeper'],
      default: 'Judge'
    },
    is_confirmed: {
      type: Boolean,
      default: false
    },
    confirmed_at: {
      type: Date,
      default: null
    },
    assigned_at: {
      type: Date,
      default: Date.now
    }
  }],
  table_worker_access: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    access_type: {
      type: String,
      enum: ['Table Worker', 'Assistant'],
      default: 'Table Worker'
    },
    granted_at: {
      type: Date,
      default: Date.now
    },
    granted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  results_submitted: {
    type: Boolean,
    default: false
  },
  results_submitted_at: {
    type: Date,
    default: null
  },
  results_approved: {
    type: Boolean,
    default: false
  },
  results_approved_at: {
    type: Date,
    default: null
  },
  results_approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure one event per tatami per tournament
tatamiSchema.index({ tournament_id: 1, category_id: 1 }, { unique: true });

module.exports = mongoose.model('Tatami', tatamiSchema);

