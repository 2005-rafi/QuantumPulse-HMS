const mongoose = require('mongoose');
const dns = require('dns');
const config = require('../config');
const logger = require('../logger');

// If using MongoDB Atlas SRV URI, ensure reliable DNS resolution
if (config.mongoUri && config.mongoUri.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch (dnsErr) {
    // Non-critical fallback if custom DNS cannot be set
  }
}

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    const dbName = mongoose.connection.name || 'quantum_careone';
    const isAtlas = config.mongoUri && config.mongoUri.includes('mongodb.net');
    
    logger.info(`MongoDB connected successfully [Cluster: ${isAtlas ? 'MongoDB Atlas Cloud' : 'Local'}, DB: ${dbName}]`);
  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message, stack: error.stack });
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
