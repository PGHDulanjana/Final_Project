const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error(err);

  // Mongoose connection/buffering timeout error
  if (err.message && err.message.includes('buffering timed out')) {
    const message = 'Database connection timeout. Please ensure MongoDB is running and MONGO_URI is correct.';
    error = { message, statusCode: 500 };
  }

  // Mongoose connection error
  if (err.name === 'MongoServerError' || err.name === 'MongooseError') {
    if (err.message.includes('connection') || err.message.includes('timeout')) {
      const message = 'Database connection error. Please check your MongoDB connection.';
      error = { message, statusCode: 500 };
    }
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `${field} already exists`;
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;

