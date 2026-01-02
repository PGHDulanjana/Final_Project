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
// Use partial indexes to prevent conflicts when fields are null
// For Individual registrations: unique per tournament + category + player (allows multiple events)
registrationSchema.index(
  { tournament_id: 1, category_id: 1, player_id: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { player_id: { $ne: null }, registration_type: 'Individual' }
  }
);
// For Team registrations: unique per tournament + category + team
registrationSchema.index(
  { tournament_id: 1, category_id: 1, team_id: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { team_id: { $ne: null }, registration_type: 'Team' }
  }
);
// For Coach registrations: unique per tournament + coach (allows multiple coaches per tournament)
registrationSchema.index(
  { tournament_id: 1, coach_id: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { coach_id: { $ne: null }, registration_type: 'Coach' }
  }
);
// For Judge registrations: unique per tournament + judge (allows multiple judges per tournament)
registrationSchema.index(
  { tournament_id: 1, judge_id: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { judge_id: { $ne: null }, registration_type: 'Judge' }
  }
);

const Registration = mongoose.model('Registration', registrationSchema);

// Helper function to drop old indexes and recreate with partial indexes (call this on server startup)
Registration.dropOldIndexes = async function() {
  try {
    const collection = this.collection;
    const indexes = await collection.indexes();
    
    // List of known old index names to drop (sparse indexes that might cause conflicts)
    const knownOldIndexNames = [
      'tournament_id_1_player_id_1',
      'tournament_id_1_category_id_1_player_id_1',
      'tournament_id_1_category_id_1_team_id_1',
      'tournament_id_1_coach_id_1',
      'tournament_id_1_judge_id_1',
      // Old indexes with event_id (should be category_id now)
      'tournament_id_1_event_id_1_player_id_1',
      'tournament_id_1_event_id_1_team_id_1',
      'tournament_id_1_event_id_1'
    ];
    
    // Find all indexes that contain event_id in their key (old field name)
    const indexesWithEventId = indexes.filter(idx => {
      const keys = Object.keys(idx.key || {});
      return keys.some(key => key.includes('event_id'));
    });
    
    // Find all sparse indexes that don't have partialFilterExpression (old style)
    const sparseIndexesWithoutPartial = indexes.filter(idx => {
      // Skip the default _id index
      if (idx.name === '_id_') return false;
      // Check if it's a sparse index without partial filter
      const isSparse = idx.sparse === true;
      const hasPartial = idx.partialFilterExpression !== undefined;
      return isSparse && !hasPartial;
    });
    
    // Combine all indexes to drop
    const indexesToDrop = new Set(knownOldIndexNames);
    
    // Add indexes with event_id
    indexesWithEventId.forEach(idx => indexesToDrop.add(idx.name));
    
    // Add sparse indexes without partial filters (except the ones we want to keep)
    sparseIndexesWithoutPartial.forEach(idx => {
      // Only drop if it's not one of our new partial indexes
      const isNewIndex = idx.name.includes('tournament_id') && 
                         (idx.name.includes('category_id') || 
                          idx.name.includes('coach_id') || 
                          idx.name.includes('judge_id') ||
                          idx.name.includes('player_id') ||
                          idx.name.includes('team_id'));
      if (isNewIndex && !idx.partialFilterExpression) {
        indexesToDrop.add(idx.name);
      }
    });
    
    console.log(`🔍 Found ${indexesToDrop.size} old index(es) to drop`);
    
    // Drop all old indexes
    for (const oldIndexName of indexesToDrop) {
      const oldIndex = indexes.find(idx => idx.name === oldIndexName);
      if (oldIndex) {
        try {
          console.log(`🔄 Dropping old index: ${oldIndexName}`);
          await collection.dropIndex(oldIndexName);
          console.log(`✅ Successfully dropped old index: ${oldIndexName}`);
        } catch (error) {
          // Ignore errors if index doesn't exist (code 27) or namespace not found (code 85)
          if (error.code !== 27 && error.code !== 85) {
            console.warn(`⚠️  Could not drop old index ${oldIndexName}: ${error.message}`);
          }
        }
      }
    }
    
    // Recreate indexes with partial filters (this will be done automatically by Mongoose)
    console.log('✅ Old indexes cleaned up. New partial indexes will be created automatically.');
  } catch (error) {
    console.warn(`⚠️  Error during index cleanup: ${error.message}`);
  }
};

module.exports = Registration;

