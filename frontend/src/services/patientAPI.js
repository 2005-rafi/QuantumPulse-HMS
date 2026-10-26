/**
 * src/services/patientAPI.js
 * Patient registry, demographics, history, deletion requests, and bulk export.
 */
import api from './api';
import { API_ENDPOINTS } from '../constants/endpoints';

export const patientApi = {
  checkDuplicates: async (patientData) => {
    const response = await api.post(API_ENDPOINTS.PATIENTS.CHECK_DUPLICATES, patientData);
    return response.data;
  },

  register: async (patientData) => {
    const response = await api.post(API_ENDPOINTS.PATIENTS.BASE, patientData);
    return response.data;
  },

  registerWithVisit: async (payload) => {
    const response = await api.post(API_ENDPOINTS.PATIENTS.REGISTER_WITH_VISIT, payload);
    return response.data;
  },

  search: async (query, page = 1, limit = 20, options = {}) => {
    const response = await api.get(API_ENDPOINTS.PATIENTS.SEARCH, {
      params: { q: query, page, limit, ...options },
    });
    return response.data;
  },

  list: async (page = 1, limit = 20, query = '', options = {}) => {
    const response = await api.get(API_ENDPOINTS.PATIENTS.BASE, {
      params: { q: query, page, limit, ...options },
    });
    return response.data;
  },

  getByMrn: async (mrn) => {
    const response = await api.get(API_ENDPOINTS.PATIENTS.BY_MRN(mrn));
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(API_ENDPOINTS.PATIENTS.BY_ID(id));
    return response.data;
  },

  update: async (id, patientData) => {
    const response = await api.put(API_ENDPOINTS.PATIENTS.BY_ID(id), patientData);
    return response.data;
  },

  addHistory: async (id, historyData) => {
    const response = await api.post(API_ENDPOINTS.PATIENTS.HISTORY(id), historyData);
    return response.data;
  },

  requestDeletion: async (id, reason) => {
    const response = await api.post(API_ENDPOINTS.PATIENTS.DELETION_REQUESTS(id), { reason });
    return response.data;
  },

  getDeleted: async (page = 1, limit = 20, query = '') => {
    const response = await api.get(API_ENDPOINTS.PATIENTS.DELETED, {
      params: { page, limit, q: query },
    });
    return response.data;
  },

  restore: async (id) => {
    const response = await api.patch(API_ENDPOINTS.PATIENTS.RESTORE(id));
    return response.data;
  },

  getPendingDeletionRequests: async () => {
    const response = await api.get(API_ENDPOINTS.PATIENTS.DELETION_REQUESTS_PENDING);
    return response.data;
  },

  approveDeletion: async (id) => {
    const response = await api.patch(API_ENDPOINTS.PATIENTS.DELETION_APPROVE(id));
    return response.data;
  },

  rejectDeletion: async (id, reason = 'Rejected by clinician') => {
    const response = await api.patch(API_ENDPOINTS.PATIENTS.DELETION_REJECT(id), { reason });
    return response.data;
  },

  rejectDeletionRequest: async (id, reason) => {
    const response = await api.patch(API_ENDPOINTS.PATIENTS.DELETION_REJECT(id), { reason });
    return response.data;
  },

  /**
   * Stream export patient records with live chunk progress and auth management
   */
  exportData: async (exportOptions, onProgress, abortSignal) => {
    try {
      const response = await api.post(API_ENDPOINTS.PATIENTS.EXPORT, exportOptions, {
        responseType: 'blob',
        signal: abortSignal,
        onDownloadProgress: (progressEvent) => {
          if (onProgress && progressEvent.loaded) {
            onProgress({ receivedBytes: progressEvent.loaded });
          }
        },
      });

      const contentDisposition = response.headers['content-disposition'] || '';
      let filename = `patient_export_${exportOptions.scope || 'data'}.${exportOptions.format === 'json' ? 'json' : 'csv'}`;
      if (contentDisposition && contentDisposition.includes('filename=')) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const blob = new Blob([response.data], {
        type: exportOptions.format === 'json' ? 'application/json' : 'text/csv; charset=utf-8',
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      return { success: true, filename, totalBytes: blob.size };
    } catch (err) {
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          throw new Error(json.message || json.error?.message || 'Export failed.');
        } catch {
          // fall through
        }
      }
      throw err;
    }
  },
};

export const patientAPI = patientApi;
export default patientApi;
