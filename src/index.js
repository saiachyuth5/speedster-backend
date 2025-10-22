const app = require('./app');
const config = require('./config/env');

const PORT = config.PORT;

const server = app.listen(PORT, () => {
  console.log('🚀 ================================');
  console.log(`✅ Speedster Backend (${config.NODE_ENV})`);
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`🔔 Webhook: http://localhost:${PORT}/webhook/strava`);
  console.log('🚀 ================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
