/**
 * src/services/visitAPI.js
 * Outpatient visits, clinical triage, consultation workflow, and token state transitions.
 */
import api from './api';
import { API_ENDPOINTS } from '../constants/endpoints';

export const visitApi = {
  create: (data) => api.post(API_ENDPOINTS.VISITS.BASE, data),
  getPatientVisits: (patientId) => {
    const cleanId = typeof patientId === 'object' ? (patientId?._id || patientId?.id) : patientId;
    if (!cleanId || typeof cleanId !== 'string' || cleanId.trim() === '') {
      return Promise.resolve({ data: { data: [] } });
    }
    return api.get(API_ENDPOINTS.VISITS.BY_PATIENT(cleanId.trim()));
  },
  getQueue: (status, params) => api.get(API_ENDPOINTS.VISITS.QUEUE(status), { params }),
  getStats: () => api.get(API_ENDPOINTS.VISITS.STATS),
  recordVitals: (id, vitalsData) => api.patch(API_ENDPOINTS.VISITS.VITALS(id), vitalsData),
  startConsultation: (id) => api.patch(API_ENDPOINTS.VISITS.START(id)),
  saveDraft: (id, data) => api.patch(API_ENDPOINTS.VISITS.CONSULTATION_DRAFT(id), data),
  orderLabsAndRoute: (id, data) => api.patch(API_ENDPOINTS.VISITS.CONSULTATION_ORDER_LABS(id), data),
  finalizeConsultation: (id, data) => api.patch(API_ENDPOINTS.VISITS.CONSULTATION_FINALIZE(id), data),

  // Queue state transitions (token-based FIFO)
  callPatient: (id) => api.patch(API_ENDPOINTS.VISITS.CALL(id)),
  skipVisit: (id) => api.patch(API_ENDPOINTS.VISITS.SKIP(id)),
  requeueVisit: (id) => api.patch(API_ENDPOINTS.VISITS.REQUEUE(id)),
  cancelVisit: (id, data) => {
    const payload = typeof data === 'string'
      ? { cancellationReason: data }
      : (data?.cancellationReason ? data : { cancellationReason: data?.reason || '' });
    return api.patch(API_ENDPOINTS.VISITS.CANCEL(id), payload);
  },

  // Nurse Fast-Track & Revocation
  skipTriage: (id, data) => api.patch(API_ENDPOINTS.VISITS.SKIP_TRIAGE(id), data || {}),
  revokeTriageSkip: (id, data) => api.patch(API_ENDPOINTS.VISITS.REVOKE_TRIAGE_SKIP(id), data || {}),

  // Clinical histories (Isolated per role/department)
  getDoctorConsultationHistory: (params) => api.get(API_ENDPOINTS.VISITS.DOCTOR_HISTORY, { params }),
  getNurseTriageHistory: (params) => api.get(API_ENDPOINTS.VISITS.NURSE_HISTORY, { params }),

  // Lab & Pharmacy
  processLab: (id, labData) => api.patch(API_ENDPOINTS.LABORATORY.PROCESS_VISIT(id), labData),
  dispenseMedicine: (id, pharmacyData) => api.patch(API_ENDPOINTS.PHARMACY.DISPENSE_VISIT(id), pharmacyData),
};

export const visitAPI = visitApi;
export default visitApi;
