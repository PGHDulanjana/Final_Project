/**
 * Script to fix Registration indexes
 * Replaces sparse indexes with partial indexes to allow multiple coaches/judges/players per tournament
 * 
 * Run this script once to fix the database indexes:
 * node src/scripts/fixRegistrationIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Registration = require('../models/Registration');

const fixIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/xpertkarate', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');

    const collection = Registration.collection;
    const indexes = await collection.indexes();
    
    console.log('📋 Current indexes:', indexes.map(idx => idx.name).join(', '));

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
    indexesWithEventId.forEach(idx => {
      indexesToDrop.add(idx.name);
      console.log(`🔍 Found old index with event_id: ${idx.name}`);
    });
    
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
        console.log(`🔍 Found old sparse index without partial filter: ${idx.name}`);
      }
    });
    
    console.log(`\n📋 Found ${indexesToDrop.size} old index(es) to drop`);
    
    // Drop old indexes
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

    // Create new partial indexes
    console.log('🔄 Creating new partial indexes...');
    
    // For Individual registrations: unique per tournament + category + player
    try {
      await collection.createIndex(
        { tournament_id: 1, category_id: 1, player_id: 1 },
        {
          unique: true,
          name: 'tournament_id_1_category_id_1_player_id_1',
          partialFilterExpression: { player_id: { $ne: null }, registration_type: 'Individual' }
        }
      );
      console.log('✅ Created index: tournament_id_1_category_id_1_player_id_1 (Individual)');
    } catch (error) {
      if (error.code !== 85) { // Ignore if already exists
        console.warn(`⚠️  Could not create Individual index: ${error.message}`);
      }
    }

    // For Team registrations: unique per tournament + category + team
    try {
      await collection.createIndex(
        { tournament_id: 1, category_id: 1, team_id: 1 },
        {
          unique: true,
          name: 'tournament_id_1_category_id_1_team_id_1',
          partialFilterExpression: { team_id: { $ne: null }, registration_type: 'Team' }
        }
      );
      console.log('✅ Created index: tournament_id_1_category_id_1_team_id_1 (Team)');
    } catch (error) {
      if (error.code !== 85) {
        console.warn(`⚠️  Could not create Team index: ${error.message}`);
      }
    }

    // For Coach registrations: unique per tournament + coach (allows multiple coaches)
    try {
      await collection.createIndex(
        { tournament_id: 1, coach_id: 1 },
        {
          unique: true,
          name: 'tournament_id_1_coach_id_1',
          partialFilterExpression: { coach_id: { $ne: null }, registration_type: 'Coach' }
        }
      );
      console.log('✅ Created index: tournament_id_1_coach_id_1 (Coach)');
    } catch (error) {
      if (error.code !== 85) {
        console.warn(`⚠️  Could not create Coach index: ${error.message}`);
      }
    }

    // For Judge registrations: unique per tournament + judge (allows multiple judges)
    try {
      await collection.createIndex(
        { tournament_id: 1, judge_id: 1 },
        {
          unique: true,
          name: 'tournament_id_1_judge_id_1',
          partialFilterExpression: { judge_id: { $ne: null }, registration_type: 'Judge' }
        }
      );
      console.log('✅ Created index: tournament_id_1_judge_id_1 (Judge)');
    } catch (error) {
      if (error.code !== 85) {
        console.warn(`⚠️  Could not create Judge index: ${error.message}`);
      }
    }

    // Verify indexes
    const newIndexes = await collection.indexes();
    console.log('\n📋 Updated indexes:', newIndexes.map(idx => idx.name).join(', '));
    
    console.log('\n✅ Index migration completed successfully!');
    console.log('✅ Multiple coaches, judges, and players can now register for the same tournament.');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
fixIndexes();

