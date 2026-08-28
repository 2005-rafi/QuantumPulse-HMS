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

  rejectDeletion: async (id) => {
    const response = await api.patch(`/patients/deletion-requests/${id}/reject`);
    return response.data;
  }
};
