import api from './api';

export const patientAPI = {
  checkDuplicates: async (patientData) => {
    const response = await api.post('/patients/check-duplicates', patientData);
    return response.data;
  },
  register: async (patientData) => {
    const response = await api.post('/patients', patientData);
    return response.data;
  },
  registerWithVisit: async (payload) => {
    const response = await api.post('/patients/register-with-visit', payload);
    return response.data;
  },

  search: async (query, page = 1, limit = 20, options = {}) => {
    const response = await api.get('/patients', {
      params: { q: query, page, limit, ...options }
    });
    return response.data;
  },

  list: async (page = 1, limit = 20, query = '', options = {}) => {
    const response = await api.get('/patients', {
      params: { q: query, page, limit, ...options }
    });
    return response.data;
  },

  getByMrn: async (mrn) => {
    const response = await api.get(`/patients/mrn/${mrn}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/patients/${id}`);
    return response.data;
  },

  update: async (id, patientData) => {
    const response = await api.put(`/patients/${id}`, patientData);
    return response.data;
  },

  addHistory: async (id, historyData) => {
    const response = await api.post(`/patients/${id}/history`, historyData);
    return response.data;
  },

  requestDeletion: async (id, reason) => {
    const response = await api.post(`/patients/${id}/deletion-requests`, { reason });
    return response.data;
  },

  getPendingDeletionRequests: async () => {
    const response = await api.get('/patients/deletion-requests/pending');
    return response.data;
  },

  approveDeletion: async (id) => {
    const response = await api.patch(`/patients/deletion-requests/${id}/approve`);
    return response.data;
  },

  rejectDeletion: async (id, reason = 'Rejected by clinician') => {
    const response = await api.patch(`/patients/deletion-requests/${id}/reject`, { reason });
    return response.data;
  },

  rejectDeletionRequest: async (id, reason) => {
    const response = await api.patch(`/patients/deletion-requests/${id}/reject`, { reason });
    return response.data;
  },

  /**
   * Stream export patient records with live chunk progress and auth management
   */
  exportData: async (exportOptions, onProgress, abortSignal) => {
    try {
      const response = await api.post('/patients/export', exportOptions, {
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
        // Parse blob error back to JSON message
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
