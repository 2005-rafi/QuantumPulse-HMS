const mongoose = require('mongoose');
const dns = require('dns');
const config = require('../config');
const logger = require('../logger');
const { registerAllModels } = require('./register-models');

// Ensure reliable public DNS resolvers (Google / Cloudflare) for MongoDB Atlas SRV record resolution
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignore
}

if (typeof dns.setDefaultResultOrder === 'function') {
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch (e) {
    // Ignore
  }
}

/**
 * Connect to MongoDB Atlas Cloud Cluster.
 * Rejects any local loopback / local cluster connection and enforces cloud TLS/SSL pooling.
 */
const connectDB = async () => {
  try {
    // 0. Ensure all Mongoose schemas and models are registered in memory
    registerAllModels();

    // Defensive assertion: ensure URI is not local
    if (typeof config.validateCloudMongoUri === 'function') {
      config.validateCloudMongoUri(config.mongoUri);
    }

    await mongoose.connect(config.mongoUri, {
      maxPoolSize: config.db?.maxPoolSize || 50,
      minPoolSize: config.db?.minPoolSize || 5,
      serverSelectionTimeoutMS: config.db?.serverSelectionTimeoutMS || 15000,
      socketTimeoutMS: config.db?.socketTimeoutMS || 45000,
      connectTimeoutMS: config.db?.connectTimeoutMS || 15000,
      heartbeatFrequencyMS: config.db?.heartbeatFrequencyMS || 10000,
      retryWrites: true,
      w: 'majority',
    });

    const dbName = mongoose.connection.name || 'quantum_careone';
    const isAtlas = config.mongoUri && (config.mongoUri.includes('mongodb.net') || config.mongoUri.startsWith('mongodb+srv://'));
    const maskedUri = config.mongoUri ? config.mongoUri.replace(/:([^:@]{3,})@/, ':***@') : 'unknown';

    logger.info(`MongoDB Atlas connected successfully [Cluster: ${isAtlas ? 'MongoDB Atlas Cloud' : 'Remote Cloud'}, DB: ${dbName}]`, {
      clusterType: 'MongoDB Atlas Cloud',
      database: dbName,
      connectionEndpoint: maskedUri,
      maxPoolSize: config.db?.maxPoolSize || 50,
      minPoolSize: config.db?.minPoolSize || 5,
    });
  } catch (error) {
    const isSelectionError = error.name === 'MongooseServerSelectionError' || (error.message && error.message.includes('Could not connect to any servers'));
    logger.error('MongoDB Atlas cloud connection failed:', {
      error: error.message,
      errorCode: isSelectionError ? 'ATLAS_FIREWALL_IP_NOT_WHITELISTED' : 'DATABASE_CONNECTION_ERROR',
      guidance: isSelectionError
        ? 'Your IP is not whitelisted in MongoDB Atlas. Go to MongoDB Atlas (cloud.mongodb.com) -> Security -> Network Access -> Add IP Address -> Add 0.0.0.0/0 (Allow Access from Anywhere).'
        : 'Verify active network connection and MONGO_URI in secrets/backend.env',
      actionRequired: isSelectionError ? 'Whitelist 0.0.0.0/0 in MongoDB Atlas Cloud Console' : 'Check network',
    });
    process.exit(1);
  }
};

let reconnectTimer = null;

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB Atlas disconnected. Retrying connection in 5s...');
  if (!reconnectTimer) {
    reconnectTimer = setTimeout(async () => {
      reconnectTimer = null;
      try {
        if (mongoose.connection.readyState === 0) {
          await connectDB();
        }
      } catch (err) {
        logger.error('MongoDB Atlas reconnection attempt failed:', { error: err.message });
      }
    }, 5000);
    reconnectTimer.unref();
  }
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB Atlas driver error:', { error: err.message });
});

module.exports = { connectDB };
