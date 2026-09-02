const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure log directory exists
const logDir = path.resolve(__dirname, '../../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// HIPAA PHI (Protected Health Information) Redaction Formatter (45 CFR § 164.514)
const PHI_SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'refreshtoken',
  'accesstoken',
  'secret',
  'phone',
  'mobile',
  'ssn',
  'nationalid',
  'aadhaar',
  'cardnumber',
  'cvv',
  'creditcard',
  'accountnumber',
]);

const redactPhiInPlace = (obj, depth = 0, seen = new WeakSet()) => {
  if (!obj || typeof obj !== 'object' || depth > 5) return obj;
  if (seen.has(obj)) return obj;
  seen.add(obj);

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'object' && obj[i] !== null) {
        redactPhiInPlace(obj[i], depth + 1, seen);
      }
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    if (PHI_SENSITIVE_KEYS.has(key.toLowerCase())) {
      obj[key] = '[REDACTED_PHI]';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      redactPhiInPlace(obj[key], depth + 1, seen);
    }
  }
  return obj;
};

const hipaaSanitizer = winston.format((info) => {
  redactPhiInPlace(info);
  return info;
});

// Custom log format for readable console output during development
const consoleFormat = winston.format.combine(
  hipaaSanitizer(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, errorCode, requestId, httpStatus, ...meta }) => {
    let output = `${timestamp} [${level}]`;
    if (requestId && requestId !== 'unknown') output += ` [Req: ${requestId}]`;
    if (errorCode) output += ` [${errorCode}]`;
    if (httpStatus) output += ` [HTTP ${httpStatus}]`;
    output += `: ${message}`;
    
    const extraMeta = { ...meta };
    delete extraMeta.stack;
    if (Object.keys(extraMeta).length > 0) {
      output += ` | Meta: ${JSON.stringify(extraMeta)}`;
    }
    if (meta.stack) {
      output += `\n${meta.stack}`;
    }
    return output;
  })
);

// Structured JSON format for file logging (ELK / Datadog / CloudWatch compatible)
const fileFormat = winston.format.combine(
  hipaaSanitizer(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports = [
  // 1. Console Transport
  new winston.transports.Console({
    level: config.env === 'production' ? 'info' : 'debug',
    format: consoleFormat,
  }),

  // 2. Daily Rotating Error Log File (Error & Critical severity only)
  new DailyRotateFile({
    level: 'error',
    dirname: logDir,
    filename: 'error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: process.env.LOG_RETENTION_DAYS || '2190d', // 6-year HIPAA compliance retention
    format: fileFormat,
  }),

  // 3. Daily Rotating Combined Log File (All events)
  new DailyRotateFile({
    level: config.env === 'production' ? 'info' : 'debug',
    dirname: logDir,
    filename: 'combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: process.env.LOG_RETENTION_DAYS || '2190d', // 6-year HIPAA compliance retention
    format: fileFormat,
  }),
];

const logger = winston.createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  transports,
  exitOnError: false,
});

logger.redactPhi = redactPhiInPlace;

module.exports = logger;
