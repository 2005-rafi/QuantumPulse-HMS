/**
 * src/services/adminAPI.js
 * Admin settings, storage analytics, and system configurations.
 */
import api from './api';
import { API_ENDPOINTS } from '../constants/endpoints';

export const adminApi = {
  getSetting: (key) => api.get(API_ENDPOINTS.ADMIN.SETTING_BY_KEY(key)),
  updateSetting: (key, value) => api.put(API_ENDPOINTS.ADMIN.SETTING_BY_KEY(key), { value }),
  getStorageAnalytics: () => api.get(API_ENDPOINTS.ADMIN.STORAGE_ANALYTICS),
};

export const adminAPI = adminApi;
export default adminApi;
