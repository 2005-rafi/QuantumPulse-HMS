/**
 * src/services/ipdApi.js
 * Comprehensive Axios client for all Inpatient Department (IPD) endpoints.
 * Powered by centralized API_ENDPOINTS.
 */
import api from './api';
import { API_ENDPOINTS } from '../constants/endpoints';

export const ipdApi = {
  // ── 1. Floors, Rooms & Beds (Physical Facility) ─────────────
  getBedMap: () => api.get(API_ENDPOINTS.IPD.BED_MAP),
  getFloors: () => api.get(API_ENDPOINTS.IPD.FLOORS),
  createFloor: (data) => api.post(API_ENDPOINTS.IPD.FLOORS, data),
  updateFloor: (id, data) => api.patch(API_ENDPOINTS.IPD.FLOOR_BY_ID(id), data),
  deleteFloor: (id) => api.delete(API_ENDPOINTS.IPD.FLOOR_BY_ID(id)),

  getRooms: (params) => api.get(API_ENDPOINTS.IPD.ROOMS, { params }),
  getRoomsByFloor: (floorId) => api.get(API_ENDPOINTS.IPD.ROOMS_BY_FLOOR(floorId)),
  createRoom: (data) => api.post(API_ENDPOINTS.IPD.ROOMS, data),
  updateRoom: (id, data) => api.patch(API_ENDPOINTS.IPD.ROOM_BY_ID(id), data),
  deleteRoom: (id) => api.delete(API_ENDPOINTS.IPD.ROOM_BY_ID(id)),

  getBeds: (params) => api.get(API_ENDPOINTS.IPD.BEDS, { params }),
  getBedById: (id) => api.get(API_ENDPOINTS.IPD.BED_BY_ID(id)),
  createBed: (data) => api.post(API_ENDPOINTS.IPD.BEDS, data),
  updateBed: (id, data) => api.patch(API_ENDPOINTS.IPD.BED_BY_ID(id), data),
  deleteBed: (id) => api.delete(API_ENDPOINTS.IPD.BED_BY_ID(id)),
  updateBedStatus: (id, status, notes = '') => api.patch(API_ENDPOINTS.IPD.BED_STATUS(id), { status, notes }),

  // ── 2. Inpatient Admissions ─────────────────────────────────
  admitPatient: (data) => api.post(API_ENDPOINTS.IPD.ADMISSIONS, data),
  convertFromOpd: (data) => api.post(API_ENDPOINTS.IPD.ADMISSION_FROM_OPD, data),
  recommendAdmission: (data) => api.post(API_ENDPOINTS.IPD.ADMISSION_RECOMMEND, data),
  getPendingAdmissionAdvice: () => api.get(API_ENDPOINTS.IPD.ADMISSIONS_PENDING_ADVICE),
  getAdmissions: (params) => api.get(API_ENDPOINTS.IPD.ADMISSIONS, { params }),
  getAdmissionById: (id) => api.get(API_ENDPOINTS.IPD.ADMISSION_BY_ID(id)),
  getHistory: (params) => api.get(API_ENDPOINTS.IPD.ADMISSION_HISTORY, { params }),
  getCaseFile: (id) => api.get(API_ENDPOINTS.IPD.ADMISSION_CASE_FILE(id)),
  exportAdmissions: (data) => api.post(API_ENDPOINTS.IPD.ADMISSIONS_EXPORT, data, { responseType: 'blob' }),
  updateAdmission: (id, data) => api.patch(API_ENDPOINTS.IPD.ADMISSION_BY_ID(id), data),
  transferBed: (admissionId, targetBedId, transferReason) =>
    api.post(API_ENDPOINTS.IPD.BED_TRANSFER_ADMISSION(admissionId), { targetBedId, transferReason }),
  getAdmissionAllocations: (admissionId) => api.get(API_ENDPOINTS.IPD.BED_ALLOCATIONS(admissionId)),
  getBedTransfers: (params) => api.get(API_ENDPOINTS.IPD.BED_TRANSFERS, { params }),

  // ── 3. Nursing Station ──────────────────────────────────────
  recordVitals: (admissionId, data) => api.post(API_ENDPOINTS.IPD.VITALS(admissionId), data),
  getVitals: (admissionId) => api.get(API_ENDPOINTS.IPD.VITALS(admissionId)),
  getLatestVitals: (admissionId) => api.get(API_ENDPOINTS.IPD.VITALS_LATEST(admissionId)),
  getVitalsTrends: (admissionId, params) => api.get(API_ENDPOINTS.IPD.VITALS_TRENDS(admissionId), { params }),
  updateVitalsFrequency: (admissionId, data) => api.patch(API_ENDPOINTS.IPD.VITALS_FREQUENCY(admissionId), data),

  getEmarGrid: (admissionId, params) => api.get(API_ENDPOINTS.IPD.EMAR(admissionId), { params }),
  updateEmarStatus: (emarId, status, details = {}) =>
    api.patch(API_ENDPOINTS.IPD.EMAR_STATUS(emarId), { status, ...details }),

  logIO: (admissionId, data) => api.post(API_ENDPOINTS.IPD.IO(admissionId), data),
  getIO: (admissionId) => api.get(API_ENDPOINTS.IPD.IO(admissionId)),

  createHandover: (admissionId, data) => api.post(API_ENDPOINTS.IPD.HANDOVER(admissionId), data),
  getHandovers: (admissionId) => api.get(API_ENDPOINTS.IPD.HANDOVER(admissionId)),
  acknowledgeHandover: (handoverId) => api.patch(API_ENDPOINTS.IPD.HANDOVER_ACKNOWLEDGE(handoverId)),

  // ── 4. Doctor Inpatient Cockpit & CPOE ───────────────────────
  createCpoeOrder: (admissionId, data) => api.post(API_ENDPOINTS.IPD.CPOE_ORDERS(admissionId), data),
  getCpoeOrders: (admissionId, params) => api.get(API_ENDPOINTS.IPD.CPOE_ORDERS(admissionId), { params }),
  updateCpoeOrderStatus: (orderId, status) => api.patch(API_ENDPOINTS.IPD.CPOE_ORDER_STATUS(orderId), { status }),

  recordWardRound: (admissionId, data) => api.post(API_ENDPOINTS.IPD.WARD_ROUNDS(admissionId), data),
  getWardRounds: (admissionId) => api.get(API_ENDPOINTS.IPD.WARD_ROUNDS(admissionId)),

  // ── 5. Operating Theatre (OT) ───────────────────────────────
  bookOtSession: (data) => api.post(API_ENDPOINTS.IPD.OT_SESSIONS, data),
  requestSurgery: (data) => api.post(API_ENDPOINTS.IPD.OT_SESSION_REQUEST, data),
  approveAndScheduleOtSession: (id, data) => api.patch(API_ENDPOINTS.IPD.OT_SESSION_SCHEDULE(id), data),
  rejectOtRequest: (id, reason) => api.patch(API_ENDPOINTS.IPD.OT_SESSION_REJECT(id), { reason }),
  updateOtChecklist: (id, checklistData) => api.patch(API_ENDPOINTS.IPD.OT_SESSION_CHECKLIST(id), checklistData),
  updateOtMilestone: (id, milestone, notes = '') => api.patch(API_ENDPOINTS.IPD.OT_SESSION_MILESTONE(id), { milestone, notes }),
  completeOtWithHandoff: (id, handoffData) => api.patch(API_ENDPOINTS.IPD.OT_SESSION_COMPLETE_HANDOFF(id), handoffData),
  getOtSessions: (params) => api.get(API_ENDPOINTS.IPD.OT_SESSIONS, { params }),
  getOtSessionById: (id) => api.get(API_ENDPOINTS.IPD.OT_SESSION_BY_ID(id)),
  updateOtSessionStatus: (id, status, operativeNotes) =>
    api.patch(API_ENDPOINTS.IPD.OT_SESSION_STATUS(id), { status, operativeNotes }),

  logConsumable: (sessionId, data) => api.post(API_ENDPOINTS.IPD.OT_CONSUMABLES(sessionId), data),
  getConsumables: (sessionId) => api.get(API_ENDPOINTS.IPD.OT_CONSUMABLES(sessionId)),

  // ── 6. Inpatient Billing & Ledger ───────────────────────────
  resolveBedTariff: (params) => api.get(API_ENDPOINTS.IPD.RESOLVE_BED_TARIFF, { params }),
  getRunningLedger: (admissionId) => api.get(API_ENDPOINTS.IPD.LEDGER(admissionId)),
  recordAdvanceDeposit: (admissionId, data) => api.post(API_ENDPOINTS.IPD.DEPOSITS(admissionId), data),
  getAdvanceDeposits: (admissionId) => api.get(API_ENDPOINTS.IPD.DEPOSITS(admissionId)),
  ingestDailyCharges: (admissionId) => api.post(API_ENDPOINTS.IPD.INGEST_CHARGES(admissionId)),
  finalizeSettlement: (admissionId, data) => api.post(API_ENDPOINTS.IPD.FINALIZE_SETTLEMENT(admissionId), data),

  // ── 7. Discharge & 3-Way Clearance Kanban ───────────────────
  initiateDischarge: (admissionId, data) => api.post(API_ENDPOINTS.IPD.DISCHARGE_INITIATE(admissionId), data),
  getClearanceStatus: (admissionId) => api.get(API_ENDPOINTS.IPD.DISCHARGE_CLEARANCE(admissionId)),
  getClearance: (admissionId) => api.get(API_ENDPOINTS.IPD.DISCHARGE_CLEARANCE(admissionId)),
  markClearance: (admissionId, department, data = {}) =>
    api.patch(API_ENDPOINTS.IPD.DISCHARGE_CLEARANCE_DEPT(admissionId, department), data),
  finalizeDischarge: (admissionId) => api.post(API_ENDPOINTS.IPD.DISCHARGE_FINALIZE(admissionId)),
  getGatePass: (admissionId) => api.get(API_ENDPOINTS.IPD.DISCHARGE_GATE_PASS(admissionId)),
};

export const ipdAPI = ipdApi;
export default ipdApi;
