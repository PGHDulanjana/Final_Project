// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Check if MONGO_URI is set
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables. Please check your .env file.');
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.error('\n📋 Troubleshooting Steps:');
    console.error('1. Ensure MongoDB is running locally: mongod');
    console.error('2. Or check your MongoDB Atlas connection string');
    console.error('3. Verify MONGO_URI in your .env file');
    console.error('4. Check network connectivity\n');
    
    // Exit process if connection fails
    process.exit(1);
  }
};

module.exports = connectDB;

