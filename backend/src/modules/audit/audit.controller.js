const auditService = require('./audit.service');
const { success } = require('../../core/responses');

class AuditController {
  async getLogs(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100); // Exhaustion guard
      
      const filters = {};
      if (req.query.action) filters.action = req.query.action;
      if (req.query.actorRole) filters.actorRole = req.query.actorRole;
      if (req.query.actorId) filters.actorId = req.query.actorId;
      if (req.query.targetId) filters.targetId = req.query.targetId;
      if (req.query.startDate) filters.startDate = req.query.startDate;
      if (req.query.endDate) filters.endDate = req.query.endDate;

      const q = req.query.q || req.query.search || null;

      const result = await auditService.getLogs(filters, page, limit, q);
      return success(res, result, 'Audit logs retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuditController();
