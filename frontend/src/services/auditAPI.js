import api from './api';

export const auditAPI = {
  getLogs: (params) => api.get('/audit', { params }),
};
