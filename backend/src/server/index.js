const { createApp } = require('../core/app');
const { connectDB } = require('../core/database/connection');
const config = require('../core/config');
const logger = require('../core/logger');
const { setupCronJobs } = require('../core/cron');

// Global Uncaught Exception Handler
process.on('uncaughtException', (err) => {
  logger.error('FATAL: Uncaught Exception! System shutting down...', {
    message: err.message,
    stack: err.stack
  });
  process.exit(1);
});

// Global Unhandled Rejection Handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('FATAL: Unhandled Promise Rejection detected! System shutting down...', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : null
  });
  process.exit(1);
});

const startServer = async () => {
  await connectDB();

  const app = createApp();

  // Initialize background jobs
  setupCronJobs();

  const server = app.listen(config.port, () => {
    logger.info(`HMS API server started`, {
      port: config.port,
      env: config.env,
      url: `http://localhost:${config.port}`,
    });
  });

  // Graceful shutdown handling
  const gracefulShutdown = (signal) => {
    logger.info(`${signal} received. Closing HTTP server gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer().catch((err) => {
  logger.error('Failed to start server:', { error: err.message, stack: err.stack });
  process.exit(1);
});
