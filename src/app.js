const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./middleware/logger');
const config = require('./config/env');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Logging (only in development)
if (config.isDevelopment) {
  app.use(logger);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV
  });
});

// API routes
app.use('/api', routes);

// Webhook routes (not under /api prefix)
app.use('/webhook', require('./routes/webhook.routes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path 
  });
});

// Error handling (must be last)
app.use(errorHandler);

module.exports = app;
