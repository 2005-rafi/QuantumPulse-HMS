/**
 * src/constants/endpoints.js
 * Centralized Single Source of Truth for all Backend API Endpoints.
 * Standardized across all HTTP client services and feature modules.
 */

export const API_ENDPOINTS = {
  HEALTH: '/health',

  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    UNLOCK: '/auth/unlock',
    ME: '/auth/me',
    BOOTSTRAP: '/auth/bootstrap',
  },

  STAFF: {
    BASE: '/staff',
    BY_ID: (id) => `/staff/${id}`,
    GENERATE_USERNAME: '/staff/generate-username',
    POSITION: (id) => `/staff/${id}/position`,
    POSITION_HISTORY: (id) => `/staff/${id}/position-history`,
    DISABLE: (id) => `/staff/${id}/disable`,
    ENABLE: (id) => `/staff/${id}/enable`,
    UNLOCK: (id) => `/staff/${id}/unlock`,
    UPLOAD_DOCUMENT: '/staff/upload-document',
  },

  IDENTITY: {
    PROFILE: '/identity/profile',
    UPDATE_CREDENTIALS: '/identity/credentials',
    ACTIVITY: '/identity/activity',
  },

  PATIENTS: {
    BASE: '/patients',
    BY_ID: (id) => `/patients/${id}`,
    BY_MRN: (mrn) => `/patients/mrn/${mrn}`,
    SEARCH: '/patients',
    CHECK_DUPLICATES: '/patients/check-duplicates',
    REGISTER_WITH_VISIT: '/patients/register-with-visit',
    HISTORY: (id) => `/patients/${id}/history`,
    EXPORT: '/patients/export',
    DELETED: '/patients/deleted',
    RESTORE: (id) => `/patients/${id}/restore`,
    DELETION_REQUESTS: (id) => `/patients/${id}/deletion-requests`,
    DELETION_REQUESTS_PENDING: '/patients/deletion-requests/pending',
    DELETION_APPROVE: (id) => `/patients/deletion-requests/${id}/approve`,
    DELETION_REJECT: (id) => `/patients/deletion-requests/${id}/reject`,
  },

  APPOINTMENTS: {
    BASE: '/appointments',
    BY_ID: (id) => `/appointments/${id}`,
    AVAILABILITY: '/appointments/availability',
    DOCTORS: '/appointments/doctors',
    DOCTOR_APPOINTMENTS: (doctorId) => `/appointments/doctor/${doctorId}`,
    CHECK_IN: (id) => `/appointments/${id}/check-in`,
    CANCEL: (id) => `/appointments/${id}/cancel`,
    RESCHEDULE: (id) => `/appointments/${id}/reschedule`,
    MISSED: (id) => `/appointments/${id}/missed`,
    SCHEDULES: '/appointments/schedules',
    SCHEDULE_BY_ID: (id) => `/appointments/schedules/${id}`,
    SCHEDULES_BY_DOCTOR: (doctorId) => `/appointments/schedules/doctor/${doctorId}`,
  },

  VISITS: {
    BASE: '/visits',
    BY_ID: (id) => `/visits/${id}`,
    BY_PATIENT: (patientId) => `/visits/patient/${patientId}`,
    QUEUE: (status) => `/visits/queue/${status}`,
    STATS: '/visits/stats',
    VITALS: (id) => `/visits/${id}/vitals`,
    START: (id) => `/visits/${id}/start`,
    CONSULTATION_DRAFT: (id) => `/visits/${id}/consultation/draft`,
    CONSULTATION_ORDER_LABS: (id) => `/visits/${id}/consultation/order-labs`,
    CONSULTATION_FINALIZE: (id) => `/visits/${id}/consultation/finalize`,
    CALL: (id) => `/visits/${id}/call`,
    SKIP: (id) => `/visits/${id}/skip`,
    REQUEUE: (id) => `/visits/${id}/requeue`,
    CANCEL: (id) => `/visits/${id}/cancel`,
    SKIP_TRIAGE: (id) => `/visits/${id}/skip-triage`,
    REVOKE_TRIAGE_SKIP: (id) => `/visits/${id}/revoke-triage-skip`,
    DOCTOR_HISTORY: '/visits/doctor/history',
    NURSE_HISTORY: '/visits/nurse/history',
  },

  BILLING: {
    BASE: '/bills',
    ENCOUNTERS_QUEUE: '/bills/encounters-queue',
    BY_ID: (id) => `/bills/${id}`,
    BY_VISIT: (visitId) => `/bills/visit/${visitId}`,
    GET_OR_CREATE_FOR_VISIT: (visitId) => `/bills/visit/${visitId}/get-or-create`,
    GET_OR_CREATE_FOR_ADMISSION: (admissionId) => `/bills/admission/${admissionId}/get-or-create`,
    OUTSTANDING: '/bills/outstanding',
    LINE_ITEMS: (id) => `/bills/${id}/line-items`,
    PAYMENTS: (id) => `/bills/${id}/payments`,
    FINALIZE: (id) => `/bills/${id}/finalize`,
    ADJUSTMENTS: (id) => `/bills/${id}/adjustments`,
    APPROVE_ADJUSTMENT: (id, adjId) => `/bills/${id}/adjustments/${adjId}/approve`,
    ANALYTICS_SUMMARY: '/bills/analytics/summary',
    ANALYTICS_BY_CATEGORY: '/bills/analytics/by-category',
    ANALYTICS_TREND: '/bills/analytics/trend',
    ANALYTICS_PAYMENT_METHODS: '/bills/analytics/payment-methods',
    ANALYTICS_DAY_OF_WEEK: '/bills/analytics/day-of-week',
    ANALYTICS_WATERFALL: '/bills/analytics/waterfall',
  },

  TARIFF: {
    SERVICES: '/tariff/services',
    SERVICE_BY_ID: (id) => `/tariff/services/${id}`,
    RULES: '/tariff/rules',
    RULE_BY_ID: (id) => `/tariff/rules/${id}`,
    RULE_PUBLISH: (id) => `/tariff/rules/${id}/publish`,
    RULE_CANCEL: (id) => `/tariff/rules/${id}/cancel`,
    RULE_IMPACT: (id) => `/tariff/rules/${id}/impact`,
    RESOLVE: '/tariff/resolve',
    MEDICINE_PRICES: '/tariff/medicine-prices',
    MEDICINE_PRICE_BY_ID: (id) => `/tariff/medicine-prices/${id}`,
    MEDICINE_PRICE_LOOKUP: (name) => `/tariff/medicine-prices/lookup/${encodeURIComponent(name)}`,
  },

  IPD: {
    // Beds, Floors & Rooms
    BED_MAP: '/ipd/beds/map',
    FLOORS: '/ipd/beds/floors',
    FLOOR_BY_ID: (id) => `/ipd/beds/floors/${id}`,
    ROOMS: '/ipd/beds/rooms',
    ROOM_BY_ID: (id) => `/ipd/beds/rooms/${id}`,
    ROOMS_BY_FLOOR: (floorId) => `/ipd/beds/rooms/${floorId}`,
    BEDS: '/ipd/beds/beds',
    BED_BY_ID: (id) => `/ipd/beds/beds/${id}`,
    BED_STATUS: (id) => `/ipd/beds/beds/${id}/status`,
    BED_TRANSFERS: '/ipd/beds/transfers',
    BED_TRANSFER_ADMISSION: (admissionId) => `/ipd/beds/admissions/${admissionId}/transfer`,
    BED_ALLOCATIONS: (admissionId) => `/ipd/beds/admissions/${admissionId}/allocations`,

    // Admissions
    ADMISSIONS: '/ipd/admissions',
    ADMISSION_BY_ID: (id) => `/ipd/admissions/${id}`,
    ADMISSION_HISTORY: '/ipd/admissions/history',
    ADMISSION_CASE_FILE: (id) => `/ipd/admissions/${id}/case-file`,
    ADMISSIONS_EXPORT: '/ipd/admissions/export',
    ADMISSION_FROM_OPD: '/ipd/admissions/from-opd',
    ADMISSION_RECOMMEND: '/ipd/admissions/recommend',
    ADMISSIONS_PENDING_ADVICE: '/ipd/admissions/pending-advice',

    // Nursing & EMAR
    VITALS: (admissionId) => `/ipd/nursing/${admissionId}/vitals`,
    VITALS_LATEST: (admissionId) => `/ipd/nursing/${admissionId}/vitals/latest`,
    VITALS_TRENDS: (admissionId) => `/ipd/nursing/${admissionId}/vitals/trends`,
    VITALS_FREQUENCY: (admissionId) => `/ipd/nursing/${admissionId}/vitals/frequency`,
    EMAR: (admissionId) => `/ipd/nursing/${admissionId}/emar`,
    EMAR_STATUS: (emarId) => `/ipd/nursing/emar/${emarId}/status`,
    IO: (admissionId) => `/ipd/nursing/${admissionId}/io`,
    HANDOVER: (admissionId) => `/ipd/nursing/${admissionId}/handover`,
    HANDOVER_ACKNOWLEDGE: (handoverId) => `/ipd/nursing/handover/${handoverId}/acknowledge`,

    // CPOE & Ward Rounds
    CPOE_ORDERS: (admissionId) => `/ipd/cpoe/${admissionId}/orders`,
    CPOE_ORDER_STATUS: (orderId) => `/ipd/cpoe/orders/${orderId}/status`,
    WARD_ROUNDS: (admissionId) => `/ipd/cpoe/${admissionId}/ward-rounds`,

    // Operating Theatre (OT)
    OT_SESSIONS: '/ipd/ot/sessions',
    OT_SESSION_BY_ID: (id) => `/ipd/ot/sessions/${id}`,
    OT_SESSION_REQUEST: '/ipd/ot/sessions/request',
    OT_SESSION_SCHEDULE: (id) => `/ipd/ot/sessions/${id}/schedule`,
    OT_SESSION_REJECT: (id) => `/ipd/ot/sessions/${id}/reject`,
    OT_SESSION_CHECKLIST: (id) => `/ipd/ot/sessions/${id}/checklist`,
    OT_SESSION_MILESTONE: (id) => `/ipd/ot/sessions/${id}/milestone`,
    OT_SESSION_COMPLETE_HANDOFF: (id) => `/ipd/ot/sessions/${id}/complete-handoff`,
    OT_SESSION_STATUS: (id) => `/ipd/ot/sessions/${id}/status`,
    OT_CONSUMABLES: (sessionId) => `/ipd/ot/sessions/${sessionId}/consumables`,

    // IPD Billing & Deposits
    RESOLVE_BED_TARIFF: '/ipd/billing/resolve-tariff',
    LEDGER: (admissionId) => `/ipd/billing/${admissionId}/ledger`,
    DEPOSITS: (admissionId) => `/ipd/billing/${admissionId}/deposits`,
    INGEST_CHARGES: (admissionId) => `/ipd/billing/${admissionId}/ingest-charges`,
    FINALIZE_SETTLEMENT: (admissionId) => `/ipd/billing/${admissionId}/finalize-settlement`,

    // Discharge & Clearance
    DISCHARGE_INITIATE: (admissionId) => `/ipd/discharge/${admissionId}/initiate`,
    DISCHARGE_CLEARANCE: (admissionId) => `/ipd/discharge/${admissionId}/clearance`,
    DISCHARGE_CLEARANCE_DEPT: (admissionId, department) => `/ipd/discharge/${admissionId}/clearance/${department}`,
    DISCHARGE_FINALIZE: (admissionId) => `/ipd/discharge/${admissionId}/finalize`,
    DISCHARGE_GATE_PASS: (admissionId) => `/ipd/discharge/${admissionId}/gate-pass`,
  },

  LABORATORY: {
    BASE: '/laboratory',
    ORDERS: '/laboratory/orders',
    PROCESS_VISIT: (id) => `/laboratory/visits/${id}/process`,
    SCAN_UPLOAD: (visitId, orderId) => `/laboratory/orders/${visitId}/${orderId}/scan`,
    CONFIG: '/laboratory/config',
  },

  PHARMACY: {
    BASE: '/pharmacy',
    DISPENSE_VISIT: (id) => `/pharmacy/visits/${id}/dispense`,
  },

  ADMIN: {
    DEPARTMENTS: '/departments',
    DEPARTMENT_BY_ID: (id) => `/departments/${id}`,
    ROLES: '/roles',
    SETTINGS: '/settings',
    SETTING_BY_KEY: (key) => `/settings/${key}`,
    STORAGE_ANALYTICS: '/admin/storage-analytics',
  },

  AUDIT: {
    BASE: '/audit',
    METRICS: '/audit/metrics',
    VERIFY_INTEGRITY: '/audit/verify-integrity',
    EXPORT: '/audit/export',
  },

  DEVELOPMENT: {
    PURGE_PATIENT: (id) => `/development/patients/${id}/purge`,
    PURGE_PREVIEW: (id) => `/development/patients/${id}/purge-preview`,
    GHOST_RECORDS: '/development/ghost-records',
    PURGE_GHOST_RECORD: (type, id) => `/development/ghost-records/${type}/${id}`,
    PURGE_ALL_GHOSTS: '/development/ghost-records/purge-all',
  },

  REALTIME: {
    PATIENT_STATUS_SSE: '/realtime/patient-status',
  },

  OMNISEARCH: {
    SEARCH: '/omnisearch',
  },

  NOTIFICATIONS: {
    BASE: '/notifications',
    MARK_READ: (id) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
  },
};

export default API_ENDPOINTS;


