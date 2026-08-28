import api from './api';

export const billingAPI = {
  // Bills Lookup
  listBills: (params = {}) => api.get('/bills', { params }),
  getBillById: (id) => api.get(`/bills/${id}`),
  getBillByVisit: (visitId) => api.get(`/bills/visit/${visitId}`),
  getOutstandingBills: (params = {}) => api.get('/bills/outstanding', { params }),

  // Bill Actions
  recordPayment: (id, data) => api.post(`/bills/${id}/payments`, data),
  finalizeBill: (id) => api.post(`/bills/${id}/finalize`),
  requestAdjustment: (id, data) => api.post(`/bills/${id}/adjustments`, data),
  approveAdjustment: (id, adjId) => api.put(`/bills/${id}/adjustments/${adjId}/approve`),

  // Financial Analytics
  getSummary: (params) => api.get('/bills/analytics/summary', { params }),
  getByCategory: (params) => api.get('/bills/analytics/by-category', { params }),
  getTrend: (params) => api.get('/bills/analytics/trend', { params }),
  getPaymentMethods: (params) => api.get('/bills/analytics/payment-methods', { params }),
  getDayOfWeek: (params) => api.get('/bills/analytics/day-of-week', { params }),
  getWaterfall: (params) => api.get('/bills/analytics/waterfall', { params }),
};

export default billingAPI;
