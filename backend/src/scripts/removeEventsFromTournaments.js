/**
 * Script to remove 'events' field from all Tournament documents
 * This restores the database to the previous working state where
 * events/categories are stored in the TournamentCategory collection,
 * not embedded in Tournament documents.
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Tournament = require('../models/Tournament');

const removeEventsFromTournaments = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xpertkarate', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');

    // Find all tournaments that have an 'events' field
    const tournaments = await Tournament.find({ events: { $exists: true } });

    if (tournaments.length === 0) {
      console.log('✅ No tournaments found with events field. Database is clean.');
      await mongoose.connection.close();
      return;
    }

    console.log(`Found ${tournaments.length} tournament(s) with events field. Removing...`);

    // Remove events field from all tournaments
    const result = await Tournament.updateMany(
      { events: { $exists: true } },
      { $unset: { events: "" } }
    );

    console.log(`✅ Successfully removed events field from ${result.modifiedCount} tournament(s)`);

    // Verify cleanup
    const remaining = await Tournament.find({ events: { $exists: true } });
    if (remaining.length === 0) {
      console.log('✅ Verification: All events fields have been removed.');
    } else {
      console.log(`⚠️  Warning: ${remaining.length} tournament(s) still have events field.`);
    }

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing events from tournaments:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
removeEventsFromTournaments();

