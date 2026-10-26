/**
 * Centralized Patient & Visit Status Registry — Single Source of Truth (Frontend)
 *
 * Provides centralized control to add, edit, or remove patient statuses
 * with human labels, descriptions, MD3 badge variants, Material Symbol icons,
 * active encounter indicators, and station ownership.
 *
 * No hardcoded status strings or switches anywhere in UI components.
 */

export const PATIENT_STATUS_CODES = Object.freeze({
  REGISTERED_IDLE: 'REGISTERED_IDLE',
  WAITING_TRIAGE: 'WAITING_TRIAGE',
  IN_TRIAGE: 'IN_TRIAGE',
  CALLED: 'CALLED',
  WAITING_DOCTOR: 'WAITING_DOCTOR',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_CONSULTATION: 'IN_CONSULTATION',
  WAITING_LAB: 'WAITING_LAB',
  IN_LAB: 'IN_LAB',
  WAITING_DOCTOR_REVIEW: 'WAITING_DOCTOR_REVIEW',
  WAITING_PHARMACY: 'WAITING_PHARMACY',
  MEDICATIONS_DISPENSED: 'MEDICATIONS_DISPENSED',
  WAITING_BILLING: 'WAITING_BILLING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  SKIPPED: 'SKIPPED',
  ADMISSION_RECOMMENDED: 'ADMISSION_RECOMMENDED',
  ADMITTED_IPD: 'ADMITTED_IPD',
  DISCHARGED_IPD: 'DISCHARGED_IPD',
});

export const PATIENT_STATUS_REGISTRY = Object.freeze({
  [PATIENT_STATUS_CODES.REGISTERED_IDLE]: {
    code: PATIENT_STATUS_CODES.REGISTERED_IDLE,
    label: 'Registered / Idle',
    shortLabel: 'Registered',
    description: 'Patient master record registered; no active clinical encounters currently in hospital workflow.',
    category: 'REGISTRY',
    station: 'Reception',
    badgeVariant: 'neutral',
    badgeClass: 'md3-status-badge--neutral',
    colorHex: '#64748b',
    icon: 'person',
    isActive: false,
    canCancel: false,
    stageOrder: 0,
  },
  [PATIENT_STATUS_CODES.WAITING_TRIAGE]: {
    code: PATIENT_STATUS_CODES.WAITING_TRIAGE,
    label: 'Waiting Nurse',
    shortLabel: 'Triage Queue',
    description: 'OPD visit token generated; patient waiting in lounge for initial nursing vitals assessment.',
    category: 'OPD',
    station: 'Nurse Triage',
    badgeVariant: 'primary',
    badgeClass: 'md3-status-badge--primary',
    colorHex: '#2563eb',
    icon: 'hourglass_top',
    isActive: true,
    canCancel: true,
    stageOrder: 1,
  },
  [PATIENT_STATUS_CODES.IN_TRIAGE]: {
    code: PATIENT_STATUS_CODES.IN_TRIAGE,
    label: 'With Nurse',
    shortLabel: 'Triage Active',
    description: 'Nurse actively conducting clinical intake, recording vitals, blood pressure, and department metrics.',
    category: 'OPD',
    station: 'Nurse Triage',
    badgeVariant: 'info',
    badgeClass: 'md3-status-badge--info',
    colorHex: '#0891b2',
    icon: 'vital_signs',
    isActive: true,
    canCancel: false,
    stageOrder: 2,
  },
  [PATIENT_STATUS_CODES.CALLED]: {
    code: PATIENT_STATUS_CODES.CALLED,
    label: 'Summoned to Desk',
    shortLabel: 'Called',
    description: 'Chime or screen callout active summoning patient to nurse or physician desk.',
    category: 'OPD',
    station: 'Nurse / Doctor',
    badgeVariant: 'warning',
    badgeClass: 'md3-status-badge--warning',
    colorHex: '#d97706',
    icon: 'campaign',
    isActive: true,
    canCancel: true,
    stageOrder: 3,
  },
  [PATIENT_STATUS_CODES.WAITING_DOCTOR]: {
    code: PATIENT_STATUS_CODES.WAITING_DOCTOR,
    label: 'Waiting Doctor',
    shortLabel: 'Doctor Queue',
    description: 'Nursing vitals completed; patient waiting in physician queue for consultation.',
    category: 'OPD',
    station: 'Doctor Desk',
    badgeVariant: 'primary',
    badgeClass: 'md3-status-badge--primary',
    colorHex: '#3b82f6',
    icon: 'stethoscope',
    isActive: true,
    canCancel: false,
    stageOrder: 4,
  },
  [PATIENT_STATUS_CODES.IN_PROGRESS]: {
    code: PATIENT_STATUS_CODES.IN_PROGRESS,
    label: 'In Consultation',
    shortLabel: 'Consultation',
    description: 'Attending physician currently examining patient and formulating care plan.',
    category: 'OPD',
    station: 'Doctor Desk',
    badgeVariant: 'info',
    badgeClass: 'md3-status-badge--info',
    colorHex: '#0284c7',
    icon: 'clinical_notes',
    isActive: true,
    canCancel: false,
    stageOrder: 5,
  },
  [PATIENT_STATUS_CODES.IN_CONSULTATION]: {
    code: PATIENT_STATUS_CODES.IN_CONSULTATION,
    label: 'In Consultation',
    shortLabel: 'Consultation',
    description: 'Attending physician currently examining patient and formulating care plan.',
    category: 'OPD',
    station: 'Doctor Desk',
    badgeVariant: 'info',
    badgeClass: 'md3-status-badge--info',
    colorHex: '#0284c7',
    icon: 'clinical_notes',
    isActive: true,
    canCancel: false,
    stageOrder: 5,
  },
  [PATIENT_STATUS_CODES.WAITING_LAB]: {
    code: PATIENT_STATUS_CODES.WAITING_LAB,
    label: 'In Phlebotomy / Lab',
    shortLabel: 'Lab Requisition',
    description: 'Diagnostic investigations ordered; patient routed to laboratory for specimen collection.',
    category: 'DIAGNOSTICS',
    station: 'Laboratory',
    badgeVariant: 'warning',
    badgeClass: 'md3-status-badge--warning',
    colorHex: '#d97706',
    icon: 'science',
    isActive: true,
    canCancel: false,
    stageOrder: 6,
  },
  [PATIENT_STATUS_CODES.IN_LAB]: {
    code: PATIENT_STATUS_CODES.IN_LAB,
    label: 'Specimen in Analyzer',
    shortLabel: 'Lab Processing',
    description: 'Specimen accessioned; automated hematology/biochemistry analyzer testing underway.',
    category: 'DIAGNOSTICS',
    station: 'Laboratory',
    badgeVariant: 'warning',
    badgeClass: 'md3-status-badge--warning',
    colorHex: '#ea580c',
    icon: 'biotech',
    isActive: true,
    canCancel: false,
    stageOrder: 7,
  },
  [PATIENT_STATUS_CODES.WAITING_DOCTOR_REVIEW]: {
    code: PATIENT_STATUS_CODES.WAITING_DOCTOR_REVIEW,
    label: 'Lab Results Ready',
    shortLabel: 'Doctor Review',
    description: 'Pathologist authorized test results; patient returned to physician review queue for revisit.',
    category: 'OPD',
    station: 'Doctor Desk',
    badgeVariant: 'secondary',
    badgeClass: 'md3-status-badge--secondary',
    colorHex: '#9333ea',
    icon: 'assignment_turned_in',
    isActive: true,
    canCancel: false,
    stageOrder: 8,
  },
  [PATIENT_STATUS_CODES.WAITING_PHARMACY]: {
    code: PATIENT_STATUS_CODES.WAITING_PHARMACY,
    label: 'In Pharmacy Queue',
    shortLabel: 'Pharmacy',
    description: 'Prescription e-signed by physician; awaiting medication rating and dispensation.',
    category: 'PHARMACY',
    station: 'Pharmacy',
    badgeVariant: 'warning',
    badgeClass: 'md3-status-badge--warning',
    colorHex: '#d97706',
    icon: 'prescriptions',
    isActive: true,
    canCancel: false,
    stageOrder: 9,
  },
  [PATIENT_STATUS_CODES.MEDICATIONS_DISPENSED]: {
    code: PATIENT_STATUS_CODES.MEDICATIONS_DISPENSED,
    label: 'Medications Dispensed',
    shortLabel: 'Dispensed',
    description: 'Medicines dispensed from inventory; financial ledger committed to Central Billing.',
    category: 'PHARMACY',
    station: 'Pharmacy',
    badgeVariant: 'info',
    badgeClass: 'md3-status-badge--info',
    colorHex: '#0d9488',
    icon: 'medication',
    isActive: true,
    canCancel: false,
    stageOrder: 10,
  },
  [PATIENT_STATUS_CODES.WAITING_BILLING]: {
    code: PATIENT_STATUS_CODES.WAITING_BILLING,
    label: 'At Cashier Desk',
    shortLabel: 'Billing Queue',
    description: 'All consultation, diagnostic, and medication charges aggregated; pending payment settlement.',
    category: 'BILLING',
    station: 'Central Billing',
    badgeVariant: 'warning',
    badgeClass: 'md3-status-badge--warning',
    colorHex: '#b45309',
    icon: 'payments',
    isActive: true,
    canCancel: false,
    stageOrder: 11,
  },
  [PATIENT_STATUS_CODES.COMPLETED]: {
    code: PATIENT_STATUS_CODES.COMPLETED,
    label: 'Visit Concluded',
    shortLabel: 'Completed',
    description: 'Encounter balance settled in full (₹0.00 Due); official tax invoice locked and printed.',
    category: 'TERMINAL',
    station: 'Central Billing',
    badgeVariant: 'success',
    badgeClass: 'md3-status-badge--success',
    colorHex: '#16a34a',
    icon: 'check_circle',
    isActive: false,
    canCancel: false,
    stageOrder: 12,
  },
  [PATIENT_STATUS_CODES.CANCELLED]: {
    code: PATIENT_STATUS_CODES.CANCELLED,
    label: 'Visit Cancelled',
    shortLabel: 'Cancelled',
    description: 'Encounter cancelled and queue token revoked before clinical intake commenced.',
    category: 'TERMINAL',
    station: 'Reception',
    badgeVariant: 'error',
    badgeClass: 'md3-status-badge--error',
    colorHex: '#dc2626',
    icon: 'cancel',
    isActive: false,
    canCancel: false,
    stageOrder: 99,
  },
  [PATIENT_STATUS_CODES.SKIPPED]: {
    code: PATIENT_STATUS_CODES.SKIPPED,
    label: 'No Show / Skipped',
    shortLabel: 'Skipped',
    description: 'Patient did not respond to station callouts; held aside for recall or cancellation.',
    category: 'OPD',
    station: 'Nurse / Doctor',
    badgeVariant: 'neutral',
    badgeClass: 'md3-status-badge--neutral',
    colorHex: '#64748b',
    icon: 'person_cancel',
    isActive: true,
    canCancel: true,
    stageOrder: 98,
  },
  [PATIENT_STATUS_CODES.ADMISSION_RECOMMENDED]: {
    code: PATIENT_STATUS_CODES.ADMISSION_RECOMMENDED,
    label: 'Admission Advised',
    shortLabel: 'IPD Referral',
    description: 'Physician advised Inpatient Admission; pending ward management bed allocation.',
    category: 'IPD',
    station: 'Ward Operations',
    badgeVariant: 'secondary',
    badgeClass: 'md3-status-badge--secondary',
    colorHex: '#7c3aed',
    icon: 'hotel',
    isActive: true,
    canCancel: false,
    stageOrder: 13,
  },
  [PATIENT_STATUS_CODES.ADMITTED_IPD]: {
    code: PATIENT_STATUS_CODES.ADMITTED_IPD,
    label: 'Inpatient Admitted',
    shortLabel: 'Admitted',
    description: 'Patient admitted to inpatient ward; bed allocated and eMAR nursing active.',
    category: 'IPD',
    station: 'Ward Operations',
    badgeVariant: 'primary',
    badgeClass: 'md3-status-badge--primary',
    colorHex: '#2563eb',
    icon: 'bed',
    isActive: true,
    canCancel: false,
    stageOrder: 14,
  },
  [PATIENT_STATUS_CODES.DISCHARGED_IPD]: {
    code: PATIENT_STATUS_CODES.DISCHARGED_IPD,
    label: 'IPD Discharged',
    shortLabel: 'Discharged',
    description: 'Inpatient stay completed, final clearance audited, patient discharged from facility.',
    category: 'TERMINAL',
    station: 'Ward Operations',
    badgeVariant: 'success',
    badgeClass: 'md3-status-badge--success',
    colorHex: '#16a34a',
    icon: 'meeting_room',
    isActive: false,
    canCancel: false,
    stageOrder: 15,
  },
});

export const ACTIVE_STATUS_CODES = Object.freeze(
  Object.values(PATIENT_STATUS_REGISTRY)
    .filter((s) => s.isActive)
    .map((s) => s.code)
);

/**
 * Returns full status metadata for a given status code with safe fallback.
 * @param {string} code Status string or code
 * @returns {object} Status metadata definition
 */
export const getPatientStatus = (code) => {
  if (!code) return PATIENT_STATUS_REGISTRY[PATIENT_STATUS_CODES.REGISTERED_IDLE];
  const normalized = String(code).trim().toUpperCase();
  return PATIENT_STATUS_REGISTRY[normalized] || {
    code: normalized,
    label: normalized.replace(/_/g, ' '),
    shortLabel: normalized.replace(/_/g, ' '),
    description: 'Clinical encounter status',
    category: 'OPD',
    station: 'Hospital Workflow',
    badgeVariant: 'neutral',
    badgeClass: 'md3-status-badge--neutral',
    colorHex: '#64748b',
    icon: 'info',
    isActive: ACTIVE_STATUS_CODES.includes(normalized),
    canCancel: false,
    stageOrder: 50,
  };
};

/**
 * Returns true if the status code represents an active encounter currently in hospital workflow.
 */
export const isEncounterActive = (code) => {
  if (!code) return false;
  return ACTIVE_STATUS_CODES.includes(String(code).trim().toUpperCase());
};

/**
 * Formats a clean presentation label for visit / patient status.
 */
export const formatStatusLabel = (code) => {
  return getPatientStatus(code).label;
};

/**
 * Returns all registered statuses as an array for UI filters, dropdowns, and matrix filters.
 */
export const getAllStatuses = () => Object.values(PATIENT_STATUS_REGISTRY);

/**
 * Returns filtered statuses by category ('OPD' | 'IPD' | 'DIAGNOSTICS' | 'PHARMACY' | 'BILLING' | 'TERMINAL').
 */
export const getStatusesByCategory = (category) => {
  if (!category) return getAllStatuses();
  return Object.values(PATIENT_STATUS_REGISTRY).filter((s) => s.category === category);
};
