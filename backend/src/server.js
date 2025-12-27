const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initializeSocket } = require('./utils/socket');

// Load environment variables
require('dotenv').config();

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Drop old indexes (migration)
    try {
      const Registration = require('./models/Registration');
      await Registration.dropOldIndexes();
    } catch (error) {
      console.warn('⚠️  Could not drop old indexes:', error.message);
    }
    
    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.IO
    initializeSocket(server);

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(`✅ XpertKarate Server running on port ${PORT}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error(`❌ Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error(`❌ Uncaught Exception: ${err.message}`);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

