/**
 * src/services/auditAPI.js
 * Hospital Audit Log Service with Enterprise Engine Metrics & Cryptographic Verification.
 */
import api from './api';
import { API_ENDPOINTS } from '../constants/endpoints';

export const auditApi = {
  /**
   * Fetch paginated audit log entries with multi-dimensional filtering.
   * @param {Object} params - Query filters (page, limit, category, severity, action, actorId, targetId, startDate, endDate, etc.)
   */
  getLogs: (params) => api.get(API_ENDPOINTS.AUDIT.BASE, { params }),

  /**
   * Fetch real-time audit ingestion metrics (buffer size, flush velocity, 24h count, category breakdowns).
   */
  getMetrics: () => api.get(API_ENDPOINTS.AUDIT.METRICS),

  /**
   * Run cryptographic SHA-256 chain verification.
   * @param {number} [limit=1000] - Number of recent records to verify along the hash chain.
   */
  verifyIntegrity: (limit = 1000) => api.post(API_ENDPOINTS.AUDIT.VERIFY_INTEGRITY, { limit }),

  /**
   * Export audit log records as a standardized compliance CSV file.
   * @param {Object} params - Export query parameters
   */
  exportLogs: async (params = {}) => {
    try {
      const response = await api.get(API_ENDPOINTS.AUDIT.EXPORT, {
        params,
        responseType: 'blob',
      });

      const disposition = response.headers?.['content-disposition'] || '';
      let filename = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      return { success: true, filename, size: blob.size };
    } catch (err) {
      console.error('[auditAPI] CSV Export failed:', err);
      throw err;
    }
  },
};

export const auditAPI = auditApi;
export default auditApi;
