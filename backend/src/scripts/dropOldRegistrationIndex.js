// Script to drop old registration index
// Run with: node src/scripts/dropOldRegistrationIndex.js

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const dropOldIndex = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    
    const Registration = require('../models/Registration');
    console.log('🔄 Dropping old registration index...');
    
    await Registration.dropOldIndexes();
    
    console.log('✅ Script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

dropOldIndex();

