import api from './api';

export const adminAPI = {
  getSetting: (key) => api.get(`/settings/${key}`),
  updateSetting: (key, value) => api.put(`/settings/${key}`, { value }),
  getStorageAnalytics: () => api.get('/admin/storage-analytics'),
};
