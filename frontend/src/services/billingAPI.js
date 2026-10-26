/**
 * src/services/billingAPI.js
 * Invoices, ledger line items, payments, adjustments, and financial analytics.
 */
import api from './api';
import { API_ENDPOINTS } from '../constants/endpoints';

export const billingApi = {
  // Bills Lookup & Unified Cashier Queue
  getEncountersQueue: (params = {}) => api.get(API_ENDPOINTS.BILLING.ENCOUNTERS_QUEUE, { params }),
  listBills: (params = {}) => api.get(API_ENDPOINTS.BILLING.BASE, { params }),
  getBillById: (id) => api.get(API_ENDPOINTS.BILLING.BY_ID(id)),
  getBillByVisit: (visitId) => api.get(API_ENDPOINTS.BILLING.BY_VISIT(visitId)),
  getOutstandingBills: (params = {}) => api.get(API_ENDPOINTS.BILLING.OUTSTANDING, { params }),

  // Bill Actions
  addLineItem: (id, data) => api.post(API_ENDPOINTS.BILLING.LINE_ITEMS(id), data),
  getOrCreateForVisit: (visitId, data = {}) => api.post(API_ENDPOINTS.BILLING.GET_OR_CREATE_FOR_VISIT(visitId), data),
  getOrCreateForAdmission: (admissionId, data = {}) => api.post(API_ENDPOINTS.BILLING.GET_OR_CREATE_FOR_ADMISSION(admissionId), data),
  recordPayment: (id, data) => api.post(API_ENDPOINTS.BILLING.PAYMENTS(id), data),
  finalizeBill: (id) => api.post(API_ENDPOINTS.BILLING.FINALIZE(id)),
  requestAdjustment: (id, data) => api.post(API_ENDPOINTS.BILLING.ADJUSTMENTS(id), data),
  approveAdjustment: (id, adjId) => api.put(API_ENDPOINTS.BILLING.APPROVE_ADJUSTMENT(id, adjId)),

  // Financial Analytics
  getSummary: (params) => api.get(API_ENDPOINTS.BILLING.ANALYTICS_SUMMARY, { params }),
  getByCategory: (params) => api.get(API_ENDPOINTS.BILLING.ANALYTICS_BY_CATEGORY, { params }),
  getTrend: (params) => api.get(API_ENDPOINTS.BILLING.ANALYTICS_TREND, { params }),
  getPaymentMethods: (params) => api.get(API_ENDPOINTS.BILLING.ANALYTICS_PAYMENT_METHODS, { params }),
  getDayOfWeek: (params) => api.get(API_ENDPOINTS.BILLING.ANALYTICS_DAY_OF_WEEK, { params }),
  getWaterfall: (params) => api.get(API_ENDPOINTS.BILLING.ANALYTICS_WATERFALL, { params }),
};

export const billingAPI = billingApi;
export default billingApi;
