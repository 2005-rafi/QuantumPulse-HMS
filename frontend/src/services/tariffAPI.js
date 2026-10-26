/**
 * src/services/tariffAPI.js
 * Hospital service catalog, dynamic pricing rules, simulation, and price resolver.
 */
import api from './api';
import { API_ENDPOINTS } from '../constants/endpoints';

export const tariffApi = {
  // Service Master
  listServices: (params = {}) => api.get(API_ENDPOINTS.TARIFF.SERVICES, { params }),
  createService: (data) => api.post(API_ENDPOINTS.TARIFF.SERVICES, data),
  updateService: (id, data) => api.put(API_ENDPOINTS.TARIFF.SERVICE_BY_ID(id), data),

  // Tariff Rules
  listRules: (params = {}) => api.get(API_ENDPOINTS.TARIFF.RULES, { params }),
  getRule: (id) => api.get(API_ENDPOINTS.TARIFF.RULE_BY_ID(id)),
  createRule: (data) => api.post(API_ENDPOINTS.TARIFF.RULES, data),
  updateRule: (id, data) => api.put(API_ENDPOINTS.TARIFF.RULE_BY_ID(id), data),
  publishRule: (id, data = {}) => api.post(API_ENDPOINTS.TARIFF.RULE_PUBLISH(id), data),
  cancelRule: (id, data = {}) => api.post(API_ENDPOINTS.TARIFF.RULE_CANCEL(id), data),
  getImpact: (id) => api.get(API_ENDPOINTS.TARIFF.RULE_IMPACT(id)),

  // Price Resolver (authoritative display query)
  resolvePrice: (params) => api.get(API_ENDPOINTS.TARIFF.RESOLVE, { params }),
};

export const tariffAPI = tariffApi;
export default tariffApi;
