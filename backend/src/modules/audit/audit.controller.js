const auditService = require('./audit.service');
const { success } = require('../../core/responses');

class AuditController {
  async getLogs(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      
      const filters = {};
      if (req.query.action) filters.action = req.query.action;
      if (req.query.actorId) filters.actorId = req.query.actorId;
      if (req.query.targetId) filters.targetId = req.query.targetId;
      if (req.query.startDate) filters.startDate = req.query.startDate;
      if (req.query.endDate) filters.endDate = req.query.endDate;

      const result = await auditService.getLogs(filters, page, limit);
      return success(res, result, 'Audit logs retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuditController();
