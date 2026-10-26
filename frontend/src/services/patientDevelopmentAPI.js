/**
 * src/services/patientDevelopmentAPI.js
 * Independent API service for development-only patient purge & preview operations.
 */
import api from './api';
import { API_ENDPOINTS } from '../constants/endpoints';

export const patientDevelopmentAPI = {
  getPurgePreview: (patientId) => api.get(API_ENDPOINTS.DEVELOPMENT.PURGE_PREVIEW(patientId)),
  purgePatient: (patientId) => api.delete(API_ENDPOINTS.DEVELOPMENT.PURGE_PATIENT(patientId)),
  getGhostRecords: () => api.get(API_ENDPOINTS.DEVELOPMENT.GHOST_RECORDS),
  purgeGhostRecord: (type, id) => api.delete(API_ENDPOINTS.DEVELOPMENT.PURGE_GHOST_RECORD(type, id)),
  purgeAllGhostRecords: () => api.post(API_ENDPOINTS.DEVELOPMENT.PURGE_ALL_GHOSTS),
};

export default patientDevelopmentAPI;
