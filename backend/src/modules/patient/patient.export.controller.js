/**
 * PatientExportController — Handles Chunked HTTP Stream Exports with Audit Logging.
 */

const PatientExportService = require('./patient.export.service');
const auditService = require('../audit/audit.service');

class PatientExportController {
  static async exportData(req, res, next) {
    try {
      const {
        reportType = 'walkin', // 'walkin' | 'financial' | 'demographics'
        scope = 'today', // 'today' | 'dateRange' | 'all'
        startDate,
        endDate,
        format = 'csv',
        columns,
      } = req.body || {};

      const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `patient_export_${reportType}_${scope}_${nowStr}.${format === 'json' ? 'json' : 'csv'}`;
      const contentType = format === 'json' ? 'application/json' : 'text/csv; charset=utf-8';

      // Set streaming headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      // Audit log the export action for HIPAA audit compliance
      try {
        await auditService.log({
          action: 'EXPORT_PATIENT_DATA',
          userId: req.user?._id || req.user?.id,
          role: req.user?.role,
          ip: req.ip || req.connection.remoteAddress,
          details: {
            reportType,
            scope,
            startDate,
            endDate,
            format,
            filename,
            columnsCount: columns ? columns.length : 'all',
          },
        });
      } catch (auditErr) {
        console.warn('[PatientExportController] Audit logging note:', auditErr.message);
      }

      // Stream data directly into Express response object
      await PatientExportService.streamExport({
        reportType,
        scope,
        startDate,
        endDate,
        format,
        columns,
        outputStream: res,
      });
    } catch (err) {
      console.error('[PatientExportController] Export streaming failed:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: { message: 'Export streaming failed. Please try again with a narrower date range.' }
        });
      } else {
        res.end();
      }
    }
  }
}

module.exports = PatientExportController;
