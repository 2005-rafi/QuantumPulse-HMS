const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../secrets/backend.env') });

let centralPorts = {};
try {
  centralPorts = require('../../../../config/ports.config.json');
} catch (err) {
  // Graceful fallback if config file is absent
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || centralPorts.BACKEND?.PORT || 7722,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/quantum_careone',
  corsOrigin: process.env.CORS_ORIGIN || centralPorts.FRONTEND?.URL || 'http://localhost:7123',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 mins
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // Limit each IP to 100 requests per window
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  encryptionKey: process.env.ENCRYPTION_KEY,
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  maxFailedAttempts: parseInt(process.env.MAX_FAILED_ATTEMPTS, 10) || 5,
  initialAdmin: {
    username: process.env.INITIAL_ADMIN_USERNAME || 'admin',
    password: process.env.INITIAL_ADMIN_PASSWORD || 'Password123!',
  },
};

const validateSecurityConfig = () => {
  const isProd = config.env === 'production';
  const errors = [];

  if (!config.jwt.accessSecret) {
    errors.push('JWT_ACCESS_SECRET is required.');
  } else if (config.jwt.accessSecret.length < 32) {
    errors.push('JWT_ACCESS_SECRET must be at least 32 characters for adequate entropy.');
  }

  if (!config.jwt.refreshSecret) {
    errors.push('JWT_REFRESH_SECRET is required.');
  } else if (config.jwt.refreshSecret.length < 32) {
    errors.push('JWT_REFRESH_SECRET must be at least 32 characters for adequate entropy.');
  }

  if (!config.encryptionKey) {
    errors.push('ENCRYPTION_KEY is required.');
  }

  if (isProd) {
    const isWeakAccess = /change|default|secret|demo|test/i.test(config.jwt.accessSecret);
    const isWeakRefresh = /change|default|secret|demo|test/i.test(config.jwt.refreshSecret);
    if (isWeakAccess || isWeakRefresh) {
      errors.push('Production environment must not use default or placeholder JWT secrets.');
    }
  }

  if (errors.length > 0) {
    console.error('CRITICAL: Security Configuration Validation Failed:');
    errors.forEach((err) => console.error(`  - ${err}`));
    if (isProd) {
      throw new Error(`Fatal Security Misconfiguration in Production: ${errors.join('; ')}`);
    }
  }
};

validateSecurityConfig();

module.exports = config;
