/**
 * core/app/index.js
 * Express Application Configuration with Hospital-Grade Rate Limiting & Proxy Ingress Security.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./core/config');
const requestId = require('./core/middleware/request-id.middleware');
const errorHandler = require('./core/middleware/error-handler.middleware');
const logger = require('./core/logger');
const xssClean = require('./core/middleware/xss.middleware');
const mongoSanitize = require('./core/middleware/mongo-sanitize.middleware');
const parameterCoercion = require('./core/middleware/parameter-coercion.middleware');
const { getClientIp } = require('./core/utils/ip-resolver');
const { verifyAccessToken } = require('./modules/auth/token.service');
const threatDetector = require('./core/security/threat-detector');

// Route imports
const authRoutes = require('./modules/auth/auth.routes');
const staffRoutes = require('./modules/staff/staff.routes');
const identityRoutes = require('./modules/identity/identity.routes');
const administrationRoutes = require('./modules/administration/administration.routes');
const patientRoutes = require('./modules/patient/patient.routes');
const visitRoutes = require('./modules/visits/visit.routes');
const laboratoryRoutes = require('./modules/laboratory/laboratory.routes');
const pharmacyRoutes = require('./modules/pharmacy/pharmacy.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const appointmentRoutes = require('./modules/appointments/appointment.routes');
const tariffRoutes = require('./modules/tariff/tariff.routes');
const billRoutes = require('./modules/billing/bill.routes');
const ipdRoutes = require('./modules/ipd/ipd.routes');
const cdssRoutes = require('./modules/clinical/cdss.routes');
const omnisearchRoutes = require('./modules/search/omnisearch.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const developmentRoutes = require('./modules/patient/patient-development.routes');
const { handlePatientStatusSSE } = require('./modules/realtime/patient-status-events.service');

const createApp = () => {
  const app = express();

  // 1. Security & CORS configuration (Optimized for Cloudflare Tunnels & Local Dev)
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

  // 2. Trust proxy headers (Cloudflare Tunnel, Nginx, Load Balancers)
  app.set('trust proxy', true);

  // 3. Security headers & body parsing (must precede body-dependent rate limiters)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          workerSrc: ["'self'", "blob:"],
          frameSrc: ["'self'", "blob:", "data:", "https://*.cloudinary.com", "https://res.cloudinary.com", "https://api.cloudinary.com"],
          childSrc: ["'self'", "blob:", "data:", "https://*.cloudinary.com", "https://res.cloudinary.com", "https://api.cloudinary.com"],
          connectSrc: ["'self'", "http:", "https:", "wss:", "ws:", "https://*.cloudinary.com", "https://res.cloudinary.com", "https://api.cloudinary.com"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(express.json({ limit: config.jsonLimit || '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: config.jsonLimit || '10mb' }));
  app.use(mongoSanitize);
  app.use(parameterCoercion);
  app.use(xssClean);
  app.use(requestId);

  // 4. Transport-Level Anti-Caching Headers for all Clinical & Admin API endpoints
  // Prevents browser disk caching, intermediate proxy retention, and Back-Forward cache (bfcache) leaks
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  // W3C Clear-Site-Data on logout to purge client-side execution contexts and caches
  app.use('/api/v1/auth/logout', (req, res, next) => {
    res.setHeader('Clear-Site-Data', '"cache", "storage", "executionContexts"');
    next();
  });

  // 5. Rate Limiting Key Generators & Helpers
  const getDecodedToken = (req) => {
    if (req._decodedToken !== undefined) return req._decodedToken;
    const authHeader = req.headers?.['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        req._decodedToken = verifyAccessToken(token);
      } catch {
        req._decodedToken = null;
      }
    } else {
      req._decodedToken = null;
    }
    return req._decodedToken;
  };

  const extractUserIdOrIp = (req) => {
    const decoded = getDecodedToken(req);
    if (decoded?.userId) {
      return `user_${decoded.userId}`;
    }
    return `ip_${getClientIp(req)}`;
  };

  const getRoleAdaptiveMax = (req) => {
    const decoded = getDecodedToken(req);
    const role = decoded?.role;
    // Role-adaptive capacity: guarantees legitimate clinical bursts are never blocked
    if (role === 'Administrator') return Math.max(config.rateLimit.userMax, 4000);
    if (role === 'Doctor' || role === 'Surgeon') return Math.max(config.rateLimit.userMax, 3000);
    if (role === 'Nurse' || role === 'Ward Operations') return Math.max(config.rateLimit.userMax, 2500);
    if (role === 'Reception' || role === 'Billing' || role === 'Pharmacy' || role === 'Laboratory') return Math.max(config.rateLimit.userMax, 2000);
    return decoded ? config.rateLimit.userMax : config.rateLimit.max;
  };

  const isExemptFromRateLimit = (req) => {
    if (!config.rateLimit.enabled) return true;
    const url = req.originalUrl || req.url || '';
    // Exempt critical auth session maintenance (so users never get trapped in 429 lockout),
    // health probes, and routine background polling telemetry/queues
    if (
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout') ||
      url.includes('/auth/unlock') ||
      url.includes('/auth/me') ||
      url.endsWith('/health') ||
      url.endsWith('/status') ||
      url.includes('/ipd/bed-map') ||
      url.includes('/notifications') ||
      url.includes('/visits/stats') ||
      url.includes('/queue')
    ) {
      return true;
    }
    return false;
  };

  // 6. Hospital-Grade Rate Limiters with Threat Assessment
  const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: (req) => getRoleAdaptiveMax(req),
    keyGenerator: (req) => extractUserIdOrIp(req),
    skip: (req) => {
      threatDetector.assessFlood(req);
      return isExemptFromRateLimit(req);
    },
    message: {
      status: 'error',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down and try again shortly.',
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const loginLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.loginMax,
    keyGenerator: (req) => {
      const ip = getClientIp(req);
      const username = (req.body?.username || '').trim().toLowerCase();
      return `login_${ip}_${username || 'anon'}`;
    },
    skip: () => !config.rateLimit.enabled,
    message: {
      status: 'error',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again after a few minutes or contact Hospital IT.',
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiters
  app.use('/api/v1/auth/login', loginLimiter);
  app.use('/api', apiLimiter);

  // HTTP logging (dev only) â€” with noise filter for high-frequency telemetry/polls
  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev', {
      skip: (req, res) => {
        // Suppress routine 2xx/3xx background polls from cluttering console and causing terminal I/O lag
        if (res.statusCode < 400) {
          const url = req.originalUrl || req.url || '';
          return (
            url.includes('/visits/stats') ||
            url.endsWith('/health') ||
            url.includes('/ipd/bed-map') ||
            url.includes('/notifications') ||
            url.includes('/queue')
          );
        }
        return false;
      }
    }));
  }

  // Serve static assets directory & compiled React frontend
  const path = require('path');
  const fs = require('fs');
  const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

  app.use('/assets', express.static(path.join(__dirname, '../../assets')));
  app.use(express.static(frontendDistPath));

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
  app.use('/api/v1/billing', billRoutes);
  app.use('/api/v1/ipd', ipdRoutes);
  app.use('/api/v1/clinical/cdss', cdssRoutes);
  app.use('/api/v1/omnisearch', omnisearchRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.get('/api/v1/realtime/patient-status', handlePatientStatusSSE);

  // Development Mode Tools & Patient Purge (Zero overhead/unmounted in production)
  if (process.env.NODE_ENV !== 'production') {
    app.use('/api/v1/development', developmentRoutes);
  }

  // Health check
  app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'success', message: 'HMS API is running', timestamp: new Date().toISOString() });
  });

  // Dedicated 404 handler for unmatched API routes
  app.use('/api', (req, res) => {
    res.status(404).json({
      status: 'error',
      errorCode: 'NOT_FOUND',
      message: `API Route ${req.method} ${req.originalUrl || req.path} not found`,
      timestamp: new Date().toISOString(),
    });
  });

  // SPA fallback for all non-API web routes
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    const indexPath = path.join(frontendDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('HMS Frontend production build not found. Please run "npm run build" in frontend/');
    }
  });

  // Central error handler (must be last)
  app.use(errorHandler);

  return app;
};

module.exports = { createApp };

