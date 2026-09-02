/**
 * services/ipdApi.js
 * Comprehensive Axios client for all Inpatient Department (IPD) endpoints.
 */
import api from './api';

export const ipdApi = {
  // ── 1. Floors, Rooms & Beds (Physical Facility) ─────────────
  getBedMap: () => api.get('/ipd/beds/map'),
  getFloors: () => api.get('/ipd/beds/floors'),
  createFloor: (data) => api.post('/ipd/beds/floors', data),
  updateFloor: (id, data) => api.patch(`/ipd/beds/floors/${id}`, data),

  getRooms: (params) => api.get('/ipd/beds/rooms', { params }),
  getRoomsByFloor: (floorId) => api.get(`/ipd/beds/rooms/${floorId}`),
  createRoom: (data) => api.post('/ipd/beds/rooms', data),
  updateRoom: (id, data) => api.patch(`/ipd/beds/rooms/${id}`, data),

  getBeds: (params) => api.get('/ipd/beds/beds', { params }),
  getBedById: (id) => api.get(`/ipd/beds/beds/${id}`),
  createBed: (data) => api.post('/ipd/beds/beds', data),
  updateBed: (id, data) => api.patch(`/ipd/beds/beds/${id}`, data),
  updateBedStatus: (id, status, notes = '') => api.patch(`/ipd/beds/beds/${id}/status`, { status, notes }),

  // ── 2. Inpatient Admissions ─────────────────────────────────
  admitPatient: (data) => api.post('/ipd/admissions', data),
  getAdmissions: (params) => api.get('/ipd/admissions', { params }),
  getAdmissionById: (id) => api.get(`/ipd/admissions/${id}`),
  updateAdmission: (id, data) => api.patch(`/ipd/admissions/${id}`, data),
  transferBed: (admissionId, targetBedId, transferReason) =>
    api.post(`/ipd/beds/admissions/${admissionId}/transfer`, { targetBedId, transferReason }),

  // ── 3. Nursing Station ──────────────────────────────────────
  recordVitals: (admissionId, data) => api.post(`/ipd/nursing/${admissionId}/vitals`, data),
  getVitals: (admissionId) => api.get(`/ipd/nursing/${admissionId}/vitals`),
  getLatestVitals: (admissionId) => api.get(`/ipd/nursing/${admissionId}/vitals/latest`),

  getEmarGrid: (admissionId, params) => api.get(`/ipd/nursing/${admissionId}/emar`, { params }),
  updateEmarStatus: (emarId, status, details = {}) =>
    api.patch(`/ipd/nursing/emar/${emarId}/status`, { status, ...details }),

  logIO: (admissionId, data) => api.post(`/ipd/nursing/${admissionId}/io`, data),
  getIO: (admissionId) => api.get(`/ipd/nursing/${admissionId}/io`),

  createHandover: (admissionId, data) => api.post(`/ipd/nursing/${admissionId}/handover`, data),
  getHandovers: (admissionId) => api.get(`/ipd/nursing/${admissionId}/handover`),
  acknowledgeHandover: (handoverId) => api.patch(`/ipd/nursing/handover/${handoverId}/acknowledge`),

  // ── 4. Doctor Inpatient Cockpit & CPOE ───────────────────────
  createCpoeOrder: (admissionId, data) => api.post(`/ipd/cpoe/${admissionId}/orders`, data),
  getCpoeOrders: (admissionId, params) => api.get(`/ipd/cpoe/${admissionId}/orders`, { params }),
  updateCpoeOrderStatus: (orderId, status) => api.patch(`/ipd/cpoe/orders/${orderId}/status`, { status }),

  recordWardRound: (admissionId, data) => api.post(`/ipd/cpoe/${admissionId}/ward-rounds`, data),
  getWardRounds: (admissionId) => api.get(`/ipd/cpoe/${admissionId}/ward-rounds`),

  // ── 5. Operating Theatre (OT) ───────────────────────────────
  bookOtSession: (data) => api.post('/ipd/ot/sessions', data),
  getOtSessions: (params) => api.get('/ipd/ot/sessions', { params }),
  getOtSessionById: (id) => api.get(`/ipd/ot/sessions/${id}`),
  updateOtSessionStatus: (id, status, operativeNotes) =>
    api.patch(`/ipd/ot/sessions/${id}/status`, { status, operativeNotes }),

  logConsumable: (sessionId, data) => api.post(`/ipd/ot/sessions/${sessionId}/consumables`, data),
  getConsumables: (sessionId) => api.get(`/ipd/ot/sessions/${sessionId}/consumables`),

  // ── 6. Inpatient Billing & Ledger ───────────────────────────
  resolveBedTariff: (params) => api.get('/ipd/billing/resolve-tariff', { params }),
  getRunningLedger: (admissionId) => api.get(`/ipd/billing/${admissionId}/ledger`),
  recordAdvanceDeposit: (admissionId, data) => api.post(`/ipd/billing/${admissionId}/deposits`, data),
  getAdvanceDeposits: (admissionId) => api.get(`/ipd/billing/${admissionId}/deposits`),
  ingestDailyCharges: (admissionId) => api.post(`/ipd/billing/${admissionId}/ingest-charges`),
  finalizeSettlement: (admissionId, data) => api.post(`/ipd/billing/${admissionId}/finalize-settlement`, data),

  // ── 7. Discharge & 3-Way Clearance Kanban ───────────────────
  initiateDischarge: (admissionId, data) => api.post(`/ipd/discharge/${admissionId}/initiate`, data),
  getClearanceStatus: (admissionId) => api.get(`/ipd/discharge/${admissionId}/clearance`),
  getClearance: (admissionId) => api.get(`/ipd/discharge/${admissionId}/clearance`),
  markClearance: (admissionId, department, data = {}) =>
    api.patch(`/ipd/discharge/${admissionId}/clearance/${department}`, data),
  finalizeDischarge: (admissionId) => api.post(`/ipd/discharge/${admissionId}/finalize`),
  getGatePass: (admissionId) => api.get(`/ipd/discharge/${admissionId}/gate-pass`),
};

export default ipdApi;
