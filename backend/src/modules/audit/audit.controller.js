/**
 * backend/src/modules/audit/audit.controller.js
 * Admin Audit Governance Controller.
 */
const auditService = require('./audit.service');
const { success } = require('../../core/responses');
const catchAsync = require('../../core/utils/catch-async');

class AuditController {
  getLogs = catchAsync(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    const filters = {};
    if (req.query.action) filters.action = req.query.action;
    if (req.query.category && req.query.category !== 'ALL') filters.category = req.query.category;
    if (req.query.severity && req.query.severity !== 'ALL') filters.severity = req.query.severity;
    if (req.query.actorRole) filters.actorRole = req.query.actorRole;
    if (req.query.actorId) filters.actorId = req.query.actorId;
    if (req.query.targetId) filters.targetId = req.query.targetId;
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;

    const q = req.query.q || req.query.search || null;

    const result = await auditService.getLogs(filters, page, limit, q);
    return success(res, result, 'Audit logs retrieved successfully');
  });

  getMetrics = catchAsync(async (req, res) => {
    const metrics = await auditService.getAuditMetrics();
    return success(res, metrics, 'Audit telemetry metrics retrieved successfully');
  });

  verifyIntegrity = catchAsync(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 1000, 5000);
    const verification = await auditService.verifyIntegrity(limit);
    return success(res, verification, 'Cryptographic chain verification completed');
  });

  exportLogs = catchAsync(async (req, res) => {
    const filters = {
      category: req.query.category,
      action: req.query.action,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const limit = Math.min(parseInt(req.query.limit, 10) || 5000, 10000);
    const csvContent = await auditService.exportCsv(filters, limit);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="quantum_careone_audit_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return res.status(200).send(csvContent);
  });
}

module.exports = new AuditController();
