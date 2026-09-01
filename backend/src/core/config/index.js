const path = require('path');
const fs = require('fs');

const secretsEnvPath = path.resolve(__dirname, '../../../../secrets/backend.env');
const localEnvPath = path.resolve(__dirname, '../../../.env');

if (fs.existsSync(secretsEnvPath)) {
  require('dotenv').config({ path: secretsEnvPath });
} else if (fs.existsSync(localEnvPath)) {
  require('dotenv').config({ path: localEnvPath });
} else {
  require('dotenv').config();
}

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
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 mins
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 3000, // Limit shared IP to 3,000 requests per window (hospital scale)
    userMax: parseInt(process.env.RATE_LIMIT_USER_MAX, 10) || 1500, // Limit individual user to 1,500 requests per window
    loginMax: parseInt(process.env.RATE_LIMIT_LOGIN_MAX, 10) || 120, // Limit shared IP to 120 login attempts per window
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  maxFailedAttempts: parseInt(process.env.MAX_FAILED_ATTEMPTS, 10) || 5,
  initialAdmin: {
    username: process.env.INITIAL_ADMIN_USERNAME || 'admin',
    password: process.env.INITIAL_ADMIN_PASSWORD || 'Password123!',
  },
};

module.exports = config;