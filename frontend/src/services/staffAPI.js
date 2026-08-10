import api from './api';

export const staffAPI = {
  list: async (page = 1, limit = 20, status = '') => {
    const response = await api.get('/staff', {
      params: { page, limit, status }
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/staff/${id}`);
    return response.data;
  },

  create: async (staffData) => {
    const response = await api.post('/staff', staffData);
    return response.data;
  },

  generateUsername: async () => {
    const response = await api.get('/staff/generate-username');
    return response.data;
  },

  update: async (id, staffData) => {
    const response = await api.put(`/staff/${id}`, staffData);
    return response.data;
  },

  disable: async (id) => {
    const response = await api.patch(`/staff/${id}/disable`);
    return response.data;
  },

  enable: async (id) => {
    const response = await api.patch(`/staff/${id}/enable`);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/staff/${id}`);
    return response.data;
  },

  changePosition: async (id, position, reason) => {
    const response = await api.put(`/staff/${id}/position`, { position, reason });
    return response.data;
  },

  getPositionHistory: async (id) => {
    const response = await api.get(`/staff/${id}/position-history`);
    return response.data;
  },

  uploadCertificate: async (formData) => {
    const response = await api.post('/staff/upload-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};
