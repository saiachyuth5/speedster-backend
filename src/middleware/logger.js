const config = require('../config/env');

const logger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  console.log(`➡️  ${req.method} ${req.path}`);
  
  // Log response when it finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusEmoji = res.statusCode < 400 ? '✅' : '❌';
    console.log(`${statusEmoji} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
};

module.exports = logger;
