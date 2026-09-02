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
  jsonLimit: process.env.JSON_BODY_LIMIT || '10mb',
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 mins
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 3000, // Limit shared IP to 3,000 requests per window (hospital scale)
    userMax: parseInt(process.env.RATE_LIMIT_USER_MAX, 10) || 1500, // Limit individual user to 1,500 requests per window
    loginMax: parseInt(process.env.RATE_LIMIT_LOGIN_MAX, 10) || 120, // Limit shared IP to 120 login attempts per window
  },
  db: {
    maxPoolSize: parseInt(process.env.DB_MAX_POOL, 10) || 50,
    minPoolSize: parseInt(process.env.DB_MIN_POOL, 10) || 5,
    serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECT_TIMEOUT, 10) || 10000,
    socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT, 10) || 45000,
    dnsServers: process.env.DNS_SERVERS
      ? process.env.DNS_SERVERS.split(',').map((s) => s.trim())
      : ['8.8.8.8', '1.1.1.1', '8.8.4.4'],
    useCustomDns: process.env.USE_CUSTOM_DNS !== 'false',
  },
  auth: {
    statusCacheTtlMs: parseInt(process.env.AUTH_STATUS_CACHE_TTL_MS, 10) || 30000,
    statusCacheMaxSize: parseInt(process.env.AUTH_STATUS_CACHE_MAX_SIZE, 10) || 1000,
  },
  query: {
    defaultLimit: parseInt(process.env.QUERY_DEFAULT_LIMIT, 10) || 20,
    maxLimit: parseInt(process.env.QUERY_MAX_LIMIT, 10) || 100,
  },
  tariff: {
    lookbackWindowDays: parseInt(process.env.TARIFF_LOOKBACK_DAYS, 10) || 30,
  },
  billingDefaults: {
    fallbackDailyRates: {
      ICU: parseInt(process.env.FALLBACK_RATE_ICU, 10) || 8000,
      DELUXE: parseInt(process.env.FALLBACK_RATE_DELUXE, 10) || 4000,
      STANDARD: parseInt(process.env.FALLBACK_RATE_STANDARD, 10) || 1500,
    },
    fallbackMinAdvance: {
      ICU: parseInt(process.env.FALLBACK_ADV_ICU, 10) || 20000,
      DELUXE: parseInt(process.env.FALLBACK_ADV_DELUXE, 10) || 12000,
      STANDARD: parseInt(process.env.FALLBACK_ADV_STANDARD, 10) || 5000,
    },
    defaultGracePeriodMinutes: parseInt(process.env.DEFAULT_GRACE_PERIOD_MIN, 10) || 60,
    nursingCareRates: {
      ICU: parseInt(process.env.NURSING_RATE_ICU, 10) || 1500,
      STANDARD: parseInt(process.env.NURSING_RATE_STANDARD, 10) || 500,
    },
    rmoRoundCharge: parseInt(process.env.RMO_ROUND_CHARGE, 10) || 400,
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