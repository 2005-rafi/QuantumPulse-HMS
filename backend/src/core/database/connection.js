const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../logger');

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message });
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB error', { error: err.message });
});

module.exports = { connectDB };
