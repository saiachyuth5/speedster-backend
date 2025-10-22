const config = require('../config/env');
const { HTTP_STATUS } = require('../config/constants');

class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let { statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, message } = err;

  // Log error details in development
  if (config.isDevelopment) {
    console.error('❌ Error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
      path: req.path,
      method: req.method
    });
  } else {
    console.error('❌ Error:', message);
  }

  // Send error response
  res.status(statusCode).json({
    error: message,
    ...(config.isDevelopment && { 
      stack: err.stack,
      details: err.details 
    })
  });
};

module.exports = { errorHandler, AppError };
