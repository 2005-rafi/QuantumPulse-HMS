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

class AuditService {
  /**
   * Log a system event
   * @param {string} actorId - ObjectId of the staff member
   * @param {string} actorRole - Role name
   * @param {string} action - Action identifier (e.g., 'LOGIN', 'PATIENT_REGISTER')
   * @param {string} targetId - ID of the affected entity (optional)
   * @param {Object} details - Additional metadata/payload (optional)
   * @param {string} ipAddress - IP address of the request (optional)
   */
  async logEvent(actorId, actorRole, action, targetId = null, details = null, ipAddress = null) {
    const logData = {
      actorId,
      actorRole,
      action,
      targetId: targetId ? String(targetId) : null,
      details,
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

  async getLogs(filters = {}, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    
    // Build query
    const query = {};
    if (filters.action) query.action = filters.action;
    if (filters.actorId) query.actorId = filters.actorId;
    if (filters.targetId) query.targetId = filters.targetId;
    
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
      if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
    }

    const items = await AuditLog.find(query)
      .populate('actorId', 'fullName username')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await AuditLog.countDocuments(query);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}

module.exports = new AuditService();
