const mongoose = require('mongoose');
const dns = require('dns');
const config = require('../config');
const logger = require('../logger');

// If using MongoDB Atlas SRV URI, ensure reliable DNS resolution via configured DNS servers
if (config.mongoUri && config.mongoUri.startsWith('mongodb+srv://') && config.db?.useCustomDns) {
  try {
    const servers = config.db?.dnsServers || ['8.8.8.8', '1.1.1.1', '8.8.4.4'];
    dns.setServers(servers);
  } catch (dnsErr) {
    // Non-critical fallback if custom DNS cannot be set
  }
}

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      maxPoolSize: config.db?.maxPoolSize || 50,
      minPoolSize: config.db?.minPoolSize || 5,
      serverSelectionTimeoutMS: config.db?.serverSelectionTimeoutMS || 10000,
      socketTimeoutMS: config.db?.socketTimeoutMS || 45000,
    });
    
    const dbName = mongoose.connection.name || 'quantum_careone';
    const isAtlas = config.mongoUri && config.mongoUri.includes('mongodb.net');
    
    logger.info(`MongoDB connected successfully [Cluster: ${isAtlas ? 'MongoDB Atlas Cloud' : 'Local'}, DB: ${dbName}]`, {
      maxPoolSize: config.db?.maxPoolSize || 50,
      minPoolSize: config.db?.minPoolSize || 5,
    });
  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

let reconnectTimer = null;

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Retrying connection in 5s...');
  if (!reconnectTimer) {
    reconnectTimer = setTimeout(async () => {
      reconnectTimer = null;
      try {
        if (mongoose.connection.readyState === 0) {
          await connectDB();
        }
      } catch (err) {
        logger.error('MongoDB reconnection attempt failed', { error: err.message });
      }
    }, 5000);
    reconnectTimer.unref();
  }
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB error', { error: err.message });
});

module.exports = { connectDB };
