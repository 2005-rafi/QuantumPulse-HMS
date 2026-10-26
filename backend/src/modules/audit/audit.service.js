/**
 * backend/src/modules/audit/audit.service.js
 * Production-Grade Enterprise Audit & Governance Service.
 * Integrated with Asynchronous Micro-Batching Engine & Cryptographic Chain of Custody.
 */
const AuditLog = require('./audit.model');
const auditBatchEngine = require('./audit-batch.engine');
const { AUDIT_CATEGORIES, AUDIT_SEVERITIES } = require('./audit-constants');

const SENSITIVE_PHI_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'refreshtoken',
  'accesstoken',
  'aadhaar',
  'phone',
  'whatsapp',
  'email',
  'name',
  'fullname',
  'firstname',
  'lastname',
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
   * Derive category from action name if not explicitly provided
   */
  _inferCategory(action = '') {
    const act = action.toUpperCase();
    if (act.startsWith('AUTH_') || act.includes('LOGIN') || act.includes('LOGOUT') || act.includes('PASSWORD') || act.includes('SESSION')) {
      return AUDIT_CATEGORIES.AUTH;
    }
    if (act.startsWith('PATIENT_') || act.includes('TRIAGE')) {
      return AUDIT_CATEGORIES.PATIENT;
    }
    if (act.startsWith('STAFF_') || act.includes('ROLE') || act.includes('PERMISSION')) {
      return AUDIT_CATEGORIES.STAFF;
    }
    if (act.startsWith('CPOE_') || act.startsWith('IPD_') || act.startsWith('VISIT_') || act.includes('EMAR')) {
      return AUDIT_CATEGORIES.CLINICAL;
    }
    if (act.startsWith('BILL_') || act.includes('PAYMENT') || act.includes('TARIFF')) {
      return AUDIT_CATEGORIES.BILLING;
    }
    if (act.startsWith('PHARMACY_') || act.includes('FEFO') || act.includes('STOCK')) {
      return AUDIT_CATEGORIES.PHARMACY;
    }
    if (act.startsWith('LAB_') || act.includes('SAMPLE')) {
      return AUDIT_CATEGORIES.LABORATORY;
    }
    return AUDIT_CATEGORIES.SYSTEM;
  }

  /**
   * Derive severity from action name if not explicitly provided
   */
  _inferSeverity(action = '') {
    const act = action.toUpperCase();
    if (act.includes('OVERRIDE') || act.includes('THREAT') || act.includes('PURGE') || act.includes('FAILURE')) {
      return AUDIT_SEVERITIES.CRITICAL;
    }
    if (act.includes('DELETE') || act.includes('DISABLED') || act.includes('LOCKED') || act.includes('REJECTED')) {
      return AUDIT_SEVERITIES.WARNING;
    }
    return AUDIT_SEVERITIES.INFO;
  }

  /**
   * Log an event asynchronously through the micro-batching ring buffer.
   * Completely non-blocking (execution time < 0.05ms).
   *
   * @param {string|Object} actorId - ObjectId or User Object
   * @param {string} actorRole - Role string
   * @param {string} action - Event action identifier
   * @param {string|Object} targetId - Identifier or Target Object
   * @param {Object} details - Arbitrary payload (automatically sanitized against PHI)
   * @param {string} ipAddress - Origin IP
   * @param {Object} [options] - Optional category, severity, statusChange
   */
  logEvent(actorId, actorRole, action, targetId = null, details = null, ipAddress = null, options = {}) {
    const cleanDetails = sanitizeAuditDetails(details);

    // 1. Resolve actor snapshot
    let actorSnapshot = null;
    let rawActorId = actorId;

    if (actorId && typeof actorId === 'object') {
      rawActorId = actorId._id || actorId.id;
      actorSnapshot = {
        id: rawActorId,
        fullName:
          actorId.fullName ||
          `${actorId.firstName || ''} ${actorId.lastName || ''}`.trim() ||
          actorId.username ||
          'Staff User',
        username: actorId.username || 'staff',
        role: actorRole || actorId.role?.name || (typeof actorId.role === 'string' ? actorId.role : 'STAFF'),
        department: actorId.departmentId?.name || actorId.department || '',
      };
    } else if (actorRole) {
      actorSnapshot = {
        id: rawActorId ? String(rawActorId) : null,
        fullName:
          actorRole === 'SUPERADMIN' || actorRole === 'ADMINISTRATOR'
            ? 'System Administrator'
            : `${actorRole} User`,
        username: actorRole.toLowerCase().replace(/\s+/g, '.'),
        role: actorRole,
        department: '',
      };
    }

    // 2. Resolve target snapshot
    let targetSnapshot = null;
    if (targetId && typeof targetId === 'object') {
      targetSnapshot = {
        id: String(targetId._id || targetId.id || ''),
        entityType:
          targetId.entityType ||
          (action.startsWith('PATIENT')
            ? 'PATIENT'
            : action.startsWith('VISIT')
            ? 'VISIT'
            : action.startsWith('BILL')
            ? 'BILL'
            : 'ENTITY'),
        identifier: targetId.mrn || targetId.tokenString || targetId.code || targetId.visitNumber || '',
        label:
          targetId.fullName ||
          `${targetId.firstName || ''} ${targetId.lastName || ''}`.trim() ||
          targetId.name ||
          targetId.label ||
          '',
      };
    } else if (targetId) {
      targetSnapshot = {
        id: String(targetId),
        entityType: action.startsWith('PATIENT')
          ? 'PATIENT'
          : action.startsWith('VISIT')
          ? 'VISIT'
          : action.startsWith('BILL')
          ? 'BILL'
          : 'ENTITY',
        identifier: details?.mrn || details?.tokenString || String(targetId),
        label: details?.patientName || details?.name || details?.fullName || String(targetId),
      };
    }

    const category = options.category || this._inferCategory(action);
    const severity = options.severity || this._inferSeverity(action);

    const logData = {
      category,
      severity,
      action,
      actorId: rawActorId,
      actorRole,
      actorSnapshot,
      targetId: targetSnapshot?.id || (targetId ? String(targetId) : null),
      targetSnapshot,
      statusChange: options.statusChange || null,
      details: cleanDetails || {},
      ipAddress: ipAddress || '127.0.0.1',
    };

    // Non-blocking asynchronous ingestion
    auditBatchEngine.enqueue(logData);
  }

  /**
   * Dedicated structured status transition auditor for patients and staff.
   * Supports both config object:
   *   logStatusChange({ actorId, actorRole, targetType, targetId, statusFrom, statusTo, reason, category, severity, details, ipAddress })
   * And positional arguments:
   *   logStatusChange(actor, entityType, targetId, fromStatus, toStatus, reason, req, extraDetails)
   */
  logStatusChange(actorOrParams, entityType, targetId, fromStatus, toStatus, reason = null, req = null, extraDetails = {}) {
    if (actorOrParams && typeof actorOrParams === 'object' && ('statusFrom' in actorOrParams || 'statusTo' in actorOrParams || 'targetType' in actorOrParams)) {
      const {
        actorId,
        actorRole,
        targetType = 'ENTITY',
        targetId: id,
        statusFrom,
        statusTo,
        reason: r,
        category,
        severity,
        details = {},
        ipAddress = '127.0.0.1',
      } = actorOrParams;

      const action = `${targetType.toUpperCase()}_STATUS_CHANGED`;

      return this.logEvent(
        actorId,
        actorRole,
        action,
        id,
        { ...details, fromStatus: statusFrom, toStatus: statusTo, reason: r },
        ipAddress,
        {
          category: category || (targetType.toUpperCase() === 'STAFF' ? AUDIT_CATEGORIES.ADMINISTRATIVE : AUDIT_CATEGORIES.CLINICAL),
          severity: severity || (statusTo === 'DELETED' || statusTo === 'CRITICAL' ? AUDIT_SEVERITIES.CRITICAL : AUDIT_SEVERITIES.INFO),
          statusChange: { from: statusFrom, to: statusTo, reason: r },
        }
      );
    }

    const action =
      entityType === 'PATIENT'
        ? 'PATIENT_STATUS_CHANGED'
        : entityType === 'STAFF'
        ? 'STAFF_STATUS_CHANGED'
        : `${entityType}_STATUS_CHANGED`;

    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || '127.0.0.1';

    this.logEvent(
      actorOrParams,
      actorOrParams?.role,
      action,
      targetId,
      { ...extraDetails, fromStatus, toStatus, reason },
      ipAddress,
      {
        category: entityType === 'STAFF' ? AUDIT_CATEGORIES.STAFF : AUDIT_CATEGORIES.PATIENT,
        severity: toStatus === 'DISABLED' || toStatus === 'LOCKED' ? AUDIT_SEVERITIES.WARNING : AUDIT_SEVERITIES.INFO,
        statusChange: { from: fromStatus, to: toStatus, reason },
      }
    );
  }

  /**
   * Query audit logs with pagination and filters
   */
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

    const result = await QueryBuilder.execute(AuditLog, queryContext, AuditQueryConfig, {
      populate: { path: 'actorId', select: 'fullName username' },
    });

    if (result && Array.isArray(result.items)) {
      result.items = result.items.map((item) => {
        const doc = item.toObject ? item.toObject() : { ...item };
        if (!doc.actorId && doc.actorSnapshot) {
          doc.actorId = {
            _id: doc.actorSnapshot.id,
            fullName: doc.actorSnapshot.fullName,
            username: doc.actorSnapshot.username,
          };
        }
        return doc;
      });
    }

    return result;
  }

  /**
   * Verifies SHA-256 cryptographic chain of custody
   */
  async verifyIntegrity(limit = 1000) {
    // Flush any pending in-memory logs before verification
    await auditBatchEngine.flush(true);
    return await auditBatchEngine.verifyChainIntegrity(limit);
  }

  /**
   * Real-time metrics and throughput telemetry for hospital administrators
   */
  async getAuditMetrics() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [totalLogs, last24hCount, last1hCount, criticalCount, categoryBreakdown] = await Promise.all([
      AuditLog.estimatedDocumentCount(),
      AuditLog.countDocuments({ timestamp: { $gte: oneDayAgo } }),
      AuditLog.countDocuments({ timestamp: { $gte: oneHourAgo } }),
      AuditLog.countDocuments({ severity: AUDIT_SEVERITIES.CRITICAL, timestamp: { $gte: oneDayAgo } }),
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: oneDayAgo } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    const velocityEventsPerMinute = Math.round(last1hCount / 60);

    return {
      totalLogs,
      last24hCount,
      last1hCount,
      velocityEventsPerMinute,
      criticalCount,
      categoryBreakdown: categoryBreakdown.reduce((acc, curr) => {
        if (curr._id) acc[curr._id] = curr.count;
        return acc;
      }, {}),
    };
  }

  /**
   * Export audit ledger in CSV format
   */
  async exportCsv(filters = {}, limit = 5000) {
    const query = {};
    if (filters.category && filters.category !== 'ALL') query.category = filters.category;
    if (filters.action) query.action = filters.action;
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
      if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    const headers = ['Timestamp', 'ChainIndex', 'Category', 'Severity', 'Action', 'Actor', 'Role', 'TargetIdentifier', 'IP', 'SHA256Hash'];
    const rows = logs.map((l) => [
      `"${new Date(l.timestamp).toISOString()}"`,
      l.chainIndex || '',
      `"${l.category || ''}"`,
      `"${l.severity || ''}"`,
      `"${l.action || ''}"`,
      `"${(l.actorSnapshot?.fullName || l.actorRole || 'System').replace(/"/g, '""')}"`,
      `"${l.actorSnapshot?.role || l.actorRole || ''}"`,
      `"${(l.targetSnapshot?.identifier || l.targetId || '').replace(/"/g, '""')}"`,
      `"${l.ipAddress || ''}"`,
      `"${l.hash || ''}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

module.exports = new AuditService();
