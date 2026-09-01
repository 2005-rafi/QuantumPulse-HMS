const AuditLog = require('./audit.model');
const fs = require('fs');
const path = require('path');

const logToFileFallback = (logData, error) => {
  try {
    const logDir = path.resolve(__dirname, '../../../../storage/logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFilePath = path.join(logDir, 'audit_fallback.log');
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...logData,
      writeError: error.message
    }) + '\n';
    fs.appendFileSync(logFilePath, entry, 'utf8');
  } catch (fileErr) {
    console.error('CRITICAL: Audit log file fallback failed!', fileErr);
  }
};

const SENSITIVE_PHI_KEYS = new Set([
  'password', 'passwordhash', 'token', 'refreshtoken', 'accesstoken',
  'aadhaar', 'phone', 'whatsapp', 'email', 'name', 'fullname', 'firstname', 'lastname'
]);

const sanitizeAuditDetails = (details) => {
  if (!details || typeof details !== 'object') return details;
  if (Array.isArray(details)) return details.map(sanitizeAuditDetails);

  const clean = {};
  for (const key of Object.keys(details)) {
    if (SENSITIVE_PHI_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED_PHI]';
    } else if (typeof details[key] === 'object' && details[key] !== null) {
      clean[key] = sanitizeAuditDetails(details[key]);
    } else {
      clean[key] = details[key];
    }
  }
  return clean;
};

class AuditService {
  /**
   * Log a system event
   * @param {string} actorId - ObjectId of the staff member
   * @param {string} actorRole - Role name
   * @param {string} action - Action identifier (e.g., 'LOGIN', 'PATIENT_REGISTER', 'PATIENT_RECORD_ACCESSED')
   * @param {string} targetId - ID of the affected entity (optional)
   * @param {Object} details - Additional metadata/payload (optional, automatically sanitized against PHI leaks)
   * @param {string} ipAddress - IP address of the request (optional)
   */
  async logEvent(actorId, actorRole, action, targetId = null, details = null, ipAddress = null) {
    const cleanDetails = sanitizeAuditDetails(details);
    const logData = {
      actorId,
      actorRole,
      action,
      targetId: targetId ? String(targetId) : null,
      details: cleanDetails,
      ipAddress
    };

    try {
      // Fire and forget - do not await in the main request lifecycle to prevent blocking
      AuditLog.create(logData).catch(err => {
        console.error('Failed to write audit log to database, falling back to file:', err.message);
        logToFileFallback(logData, err);
      });
    } catch (err) {
      console.error('Audit Service Error:', err.message);
      logToFileFallback(logData, err);
    }
  }

  async getLogs(filters = {}, page = 1, limit = 50, q = null) {
    const { QueryContext, QueryBuilder, AuditQueryConfig } = require('../../core/query');

    const queryContext = new QueryContext({
      filters,
      q,
      page,
      limit,
      cursor: filters.cursor,
      sortBy: filters.sortBy || 'timestamp',
      sortOrder: filters.sortOrder || 'desc',
    });

    return await QueryBuilder.execute(AuditLog, queryContext, AuditQueryConfig, {
      populate: { path: 'actorId', select: 'fullName username' },
    });
  }
}

module.exports = new AuditService();
