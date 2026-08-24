const mongoose = require('mongoose');
const { createApp } = require('../core/app');
const { connectDB } = require('../core/database/connection');
const config = require('../core/config');
const logger = require('../core/logger');
const { setupCronJobs } = require('../core/cron');

// Global Uncaught Exception Handler
process.on('uncaughtException', (err) => {
  logger.error('FATAL: Uncaught Exception! System shutting down...', {
    errorCode: 'SYSTEM_FATAL_UNCAUGHT',
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

// Global Unhandled Rejection Handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('FATAL: Unhandled Promise Rejection detected! System shutting down...', {
    errorCode: 'SYSTEM_FATAL_REJECTION',
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : null,
  });
  process.exit(1);
});

const startServer = async () => {
  // 1. Establish Database Connection (MongoDB Atlas / Local)
  await connectDB();

  // 2. Initialize Express Application
  const app = createApp();

  // 3. Initialize background / recurring tasks
  setupCronJobs();

  // 4. Start HTTP Server
  const server = app.listen(config.port, () => {
    logger.info(`HMS API server successfully started in ${config.env.toUpperCase()} mode`, {
      port: config.port,
      env: config.env,
      database: config.mongoUri ? config.mongoUri.replace(/:([^:@]{3,})@/, ':***@') : 'unknown',
      url: `http://localhost:${config.port}`,
    });
  });

  // ── Production & Nodemon Graceful Shutdown Handler ──────────────────────────
  let isShuttingDown = false;

  const handleShutdown = async (signal, callback) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`${signal} signal received. Initiating graceful shutdown...`);

    // Force close process if cleanup takes longer than 5 seconds
    const forceExitTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timed out after 5000ms. Force exiting process.');
      process.exit(1);
    }, 5000);
    forceExitTimeout.unref();

    try {
      // Step A: Stop accepting new HTTP requests
      await new Promise((resolve) => {
        server.close((err) => {
          if (err) {
            logger.warn('Error closing HTTP server:', { error: err.message });
          } else {
            logger.info('HTTP server successfully closed.');
          }
          resolve();
        });
      });

      // Step B: Cleanly close MongoDB Atlas connection pool
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(false);
        logger.info('MongoDB Atlas database connection pool closed.');
      }

      clearTimeout(forceExitTimeout);

      if (callback) {
        callback();
      } else {
        process.exit(0);
      }
    } catch (err) {
      logger.error('Error occurred during graceful shutdown:', { error: err.message, stack: err.stack });
      process.exit(1);
    }
  };

  // 1. Nodemon Hot-Reload Signal (SIGUSR2)
  process.once('SIGUSR2', () => {
    handleShutdown('SIGUSR2', () => {
      logger.info('Nodemon restart ready. Forwarding SIGUSR2...');
      process.kill(process.pid, 'SIGUSR2');
    });
  });

  // 2. Production Process Manager Termination Signals (PM2, Docker, Kubernetes, Systemd)
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
};

startServer().catch((err) => {
  logger.error('Failed to start HMS backend server:', {
    errorCode: 'SERVER_BOOT_FAILED',
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});
