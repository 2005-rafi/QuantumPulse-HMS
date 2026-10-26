/**
 * src/services/medicinePriceAPI.js
 * Medicine catalog price configuration and lookups.
 */
import api from './api';
import { API_ENDPOINTS } from '../constants/endpoints';

export const medicinePriceApi = {
  list: (params = {}) => api.get(API_ENDPOINTS.TARIFF.MEDICINE_PRICES, { params }),
  getByName: (name) => api.get(API_ENDPOINTS.TARIFF.MEDICINE_PRICE_LOOKUP(name)),
  create: (data) => api.post(API_ENDPOINTS.TARIFF.MEDICINE_PRICES, data),
  update: (id, data) => api.put(API_ENDPOINTS.TARIFF.MEDICINE_PRICE_BY_ID(id), data),
  deactivate: (id) => api.delete(API_ENDPOINTS.TARIFF.MEDICINE_PRICE_BY_ID(id)),
};

export const medicinePriceAPI = medicinePriceApi;
export default medicinePriceApi;
