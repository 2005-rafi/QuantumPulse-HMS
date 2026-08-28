import api from './api';

export const tariffAPI = {
  // Service Master
  listServices: (params = {}) => api.get('/tariff/services', { params }),
  createService: (data) => api.post('/tariff/services', data),
  updateService: (id, data) => api.put(`/tariff/services/${id}`, data),

  // Tariff Rules
  listRules: (params = {}) => api.get('/tariff/rules', { params }),
  getRule: (id) => api.get(`/tariff/rules/${id}`),
  createRule: (data) => api.post('/tariff/rules', data),
  updateRule: (id, data) => api.put(`/tariff/rules/${id}`, data),
  publishRule: (id, data = {}) => api.post(`/tariff/rules/${id}/publish`, data),
  cancelRule: (id, data = {}) => api.post(`/tariff/rules/${id}/cancel`, data),
  getImpact: (id) => api.get(`/tariff/rules/${id}/impact`),

  // Price Resolver (authoritative display query)
  resolvePrice: (params) => api.get('/tariff/resolve', { params }),
};

export default tariffAPI;
