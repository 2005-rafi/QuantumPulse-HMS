import api from './api';

export const medicinePriceAPI = {
  list: (params = {}) => api.get('/tariff/medicine-prices', { params }),
  getByName: (name) => api.get(`/tariff/medicine-prices/lookup/${encodeURIComponent(name)}`),
  create: (data) => api.post('/tariff/medicine-prices', data),
  update: (id, data) => api.put(`/tariff/medicine-prices/${id}`, data),
  deactivate: (id) => api.delete(`/tariff/medicine-prices/${id}`),
};

export default medicinePriceAPI;
