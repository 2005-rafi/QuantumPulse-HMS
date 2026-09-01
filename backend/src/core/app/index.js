const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('../config');
const requestId = require('../middleware/requestId');
const errorHandler = require('../middleware/errorHandler');
const logger = require('../logger');
const xssClean = require('../middleware/xss');

// Route imports
const authRoutes = require('../../modules/auth/auth.routes');
const staffRoutes = require('../../modules/staff/staff.routes');
const identityRoutes = require('../../modules/identity/identity.routes');
const administrationRoutes = require('../../modules/administration/administration.routes');
const patientRoutes = require('../../modules/patient/patient.routes');
const visitRoutes = require('../../modules/visits/visit.routes');
const laboratoryRoutes = require('../../modules/laboratory/laboratory.routes');
const pharmacyRoutes = require('../../modules/pharmacy/pharmacy.routes');
const auditRoutes = require('../../modules/audit/audit.routes');
const appointmentRoutes = require('../../modules/appointments/appointment.routes');
const tariffRoutes = require('../../modules/tariff/tariff.routes');
const billRoutes = require('../../modules/billing/bill.routes');

const createApp = () => {
  const app = express();

  // Security - Enable CORS first so rate limiter and preflight headers match
  const allowedCors = (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      config.corsOrigin === '*' ||
      config.corsOrigin === origin ||
      origin.endsWith('.trycloudflare.com') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  };
  app.use(cors({ origin: allowedCors, credentials: true }));

  // Enable trust proxy so express-rate-limit reads actual client IP behind Nginx
  app.set('trust proxy', 1);

  // Helper to identify and skip intranet/local clinical workstations
  const isWhitelistedIp = (ip) => {
    if (!ip) return false;
    return (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '::ffff:127.0.0.1' ||
      ip.startsWith('10.') ||        // Private LAN class A
      ip.startsWith('192.168.') ||   // Private LAN class C
      ip.startsWith('172.16.')       // Private LAN class B
    );
  };

  // Rate Limiting
  const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    skip: (req) => isWhitelistedIp(req.ip),
    message: {
      status: 'error',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Limit to 15 login attempts per IP per 15 minutes
    skip: (req) => isWhitelistedIp(req.ip),
    message: {
      status: 'error',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again after 15 minutes.',
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiters before other handlers
  app.use('/api', apiLimiter);
  app.use('/api/v1/auth/login', loginLimiter);

  // Security
  app.use(helmet());

  // Request parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Input Sanitization
  app.use(xssClean);

  // Request tracking
  app.use(requestId);

  // HTTP logging (dev only)
  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  }

  // Serve static assets directory
  const path = require('path');
  app.use('/assets', express.static(path.join(__dirname, '../../../../assets')));

  // Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/staff', staffRoutes);
  app.use('/api/v1/identity', identityRoutes);
  app.use('/api/v1', administrationRoutes);
  app.use('/api/v1/patients', patientRoutes);
  app.use('/api/v1/visits', visitRoutes);
  app.use('/api/v1/laboratory', laboratoryRoutes);
  app.use('/api/v1/pharmacy', pharmacyRoutes);
  app.use('/api/v1/audit', auditRoutes);
  app.use('/api/v1/appointments', appointmentRoutes);
  app.use('/api/v1/tariff', tariffRoutes);
  app.use('/api/v1/bills', billRoutes);

  // Health check
  app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'success', message: 'HMS API is running', timestamp: new Date().toISOString() });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      status: 'error',
      errorCode: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    });
  });

  // Central error handler (must be last)
  app.use(errorHandler);

  return app;
};

module.exports = { createApp };