const { verifyToken } = require('../utils/generateToken');
const User = require('../models/User');

// Optional authentication - sets req.user if token is valid, but doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token, just continue without setting req.user
    if (!token) {
      return next();
    }

    try {
      // Verify token
      const decoded = verifyToken(token);
      
      // Get user from token
      const user = await User.findById(decoded.userId).select('-password_hash');
      
      if (user && user.is_active) {
        req.user = user;
      }
    } catch (error) {
      // If token is invalid, just continue without setting req.user
      // Don't fail the request
    }
    
    next();
  } catch (error) {
    // On any error, just continue without authentication
    next();
  }
};

module.exports = optionalAuth;

