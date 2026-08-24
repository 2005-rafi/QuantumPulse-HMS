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

// Custom log format for readable console output during development
const consoleFormat = winston.format.combine(
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
    maxFiles: '30d',
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
    maxFiles: '14d',
    format: fileFormat,
  }),
];

const logger = winston.createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  transports,
  exitOnError: false,
});

module.exports = logger;
