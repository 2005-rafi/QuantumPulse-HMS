/**
 * src/services/staffAPI.js
 * Staff administration, credentials, position history, and status management.
 */
import api from './api';
import { API_ENDPOINTS } from '../constants/endpoints';

export const staffApi = {
  list: async (page = 1, limit = 20, status = '') => {
    let params = {};
    if (typeof page === 'object' && page !== null) {
      params = page;
    } else {
      params = { page, limit, status };
    }
    const response = await api.get(API_ENDPOINTS.STAFF.BASE, { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(API_ENDPOINTS.STAFF.BY_ID(id));
    return response.data;
  },

  create: async (staffData) => {
    const response = await api.post(API_ENDPOINTS.STAFF.BASE, staffData);
    return response.data;
  },

  generateUsername: async () => {
    const response = await api.get(API_ENDPOINTS.STAFF.GENERATE_USERNAME);
    return response.data;
  },

  update: async (id, staffData) => {
    const response = await api.put(API_ENDPOINTS.STAFF.BY_ID(id), staffData);
    return response.data;
  },

  disable: async (id) => {
    const response = await api.patch(API_ENDPOINTS.STAFF.DISABLE(id));
    return response.data;
  },

  enable: async (id) => {
    const response = await api.patch(API_ENDPOINTS.STAFF.ENABLE(id));
    return response.data;
  },

  unlock: async (id) => {
    const response = await api.patch(API_ENDPOINTS.STAFF.UNLOCK(id));
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(API_ENDPOINTS.STAFF.BY_ID(id));
    return response.data;
  },

  changePosition: async (id, position, reason) => {
    const response = await api.put(API_ENDPOINTS.STAFF.POSITION(id), { position, reason });
    return response.data;
  },

  getPositionHistory: async (id) => {
    const response = await api.get(API_ENDPOINTS.STAFF.POSITION_HISTORY(id));
    return response.data;
  },

  uploadCertificate: async (formData) => {
    const response = await api.post(API_ENDPOINTS.STAFF.UPLOAD_DOCUMENT, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export const staffAPI = staffApi;
export default staffApi;
