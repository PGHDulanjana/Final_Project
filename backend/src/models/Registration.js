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
// For Individual registrations: unique per tournament + category + player (allows multiple events)
registrationSchema.index({ tournament_id: 1, category_id: 1, player_id: 1 }, { unique: true, sparse: true });
// For Team registrations: unique per tournament + category + team
registrationSchema.index({ tournament_id: 1, category_id: 1, team_id: 1 }, { unique: true, sparse: true });
// For Coach registrations: unique per tournament (coaches register for tournament, not specific events)
registrationSchema.index({ tournament_id: 1, coach_id: 1 }, { unique: true, sparse: true });
// For Judge registrations: unique per tournament (judges register for tournament, not specific events)
registrationSchema.index({ tournament_id: 1, judge_id: 1 }, { unique: true, sparse: true });

const Registration = mongoose.model('Registration', registrationSchema);

// Helper function to drop old indexes (call this on server startup)
Registration.dropOldIndexes = async function() {
  try {
    const collection = this.collection;
    const indexes = await collection.indexes();
    const oldIndexName = 'tournament_id_1_player_id_1';
    
    // Check if old index exists
    const oldIndex = indexes.find(idx => idx.name === oldIndexName);
    if (oldIndex) {
      console.log(`🔄 Dropping old index: ${oldIndexName}`);
      await collection.dropIndex(oldIndexName);
      console.log(`✅ Successfully dropped old index: ${oldIndexName}`);
    }
  } catch (error) {
    // Ignore errors if index doesn't exist (code 27) or namespace not found (code 85)
    if (error.code !== 27 && error.code !== 85) {
      console.warn(`⚠️  Could not drop old index: ${error.message}`);
    }
  }
};

module.exports = Registration;

