// This file is for additional socket server configuration if needed
// Main socket initialization is done in server.js

const { getIO } = require('./utils/socket');

// Export socket instance for use in other modules
module.exports = {
  getIO
};

