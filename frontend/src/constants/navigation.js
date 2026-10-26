/**
 * src/constants/navigation.js
 * Centralized Navigation Routes, Role Landing Paths, and Route Names.
 * Single Source of Truth for frontend routing and navigation links.
 */

export const ROUTE_PATHS = {
  // Public
  LOGIN: '/login',
  ROOT: '/',
  NOT_FOUND: '/404',

  // Shell & Main Workspaces
  DASHBOARD: '/dashboard',
  RECEPTION: '/dashboard/reception',
  NURSE: '/dashboard/nurse',
  DOCTOR: '/dashboard/doctor',
  SURGEON: '/dashboard/surgeon',
  LABORATORY: '/dashboard/laboratory',
  PHARMACY: '/dashboard/pharmacy',
  ADMINISTRATOR: '/dashboard/administrator',
  WARD_OPERATIONS: '/dashboard/ward-operations',
  BILLING: '/dashboard/billing',
  PROFILE: '/dashboard/profile',

  // Named Sub-routes
  RECEPTION_PATIENTS: '/dashboard/reception/patients',
  RECEPTION_APPOINTMENTS: '/dashboard/reception/appointments',
  RECEPTION_BED_MAP: '/dashboard/reception/bed-map',
  RECEPTION_RECEIPTS: '/dashboard/reception/receipts',

  NURSE_TRIAGE: '/dashboard/nurse/triage',
  NURSE_HISTORY: '/dashboard/nurse/history',
  NURSE_IPD: '/dashboard/nurse/ipd',
  NURSE_IPD_OPERATIONS: '/dashboard/nurse/ipd-operations',

  DOCTOR_CONSULTATION: '/dashboard/doctor/consultation',
  DOCTOR_HISTORY: '/dashboard/doctor/history',
  DOCTOR_SURGERIES: '/dashboard/doctor/surgeries',
  DOCTOR_IPD: '/dashboard/doctor/ipd',
  DOCTOR_APPOINTMENTS: '/dashboard/doctor/appointments',
  DOCTOR_DELETIONS: '/dashboard/doctor/deletion-requests',

  LAB_PROCESSING: '/dashboard/laboratory/processing',
  LAB_VERIFICATION: '/dashboard/laboratory/verification',
  LAB_SPECIMENS: '/dashboard/laboratory/specimens',
  LAB_REPORTED: '/dashboard/laboratory/reported',

  ADMIN_ANALYTICS: '/dashboard/administrator/analytics',
  ADMIN_SURGERIES: '/dashboard/administrator/surgeries',
  ADMIN_BILLING: '/dashboard/administrator/billing',
  ADMIN_BED_MAP: '/dashboard/administrator/bed-map',
  ADMIN_PATIENTS: '/dashboard/administrator/patients',
  ADMIN_APPOINTMENTS: '/dashboard/administrator/appointments',
  ADMIN_STAFF: '/dashboard/administrator/staff',
  ADMIN_DEPARTMENTS: '/dashboard/administrator/departments',
  ADMIN_LABORATORIES: '/dashboard/administrator/laboratories',
  ADMIN_STORAGE: '/dashboard/administrator/storage',
  ADMIN_AUDIT: '/dashboard/administrator/audit',

  WARD_BED_MAP: '/dashboard/ward-operations/bed-map',
  WARD_TIME_MONITORING: '/dashboard/ward-operations/time-monitoring',
  WARD_FACILITY_BUILDER: '/dashboard/ward-operations/facility-builder',
  WARD_TRANSFERS: '/dashboard/ward-operations/transfers',

  // Standalone IPD Workstation Views
  IPD_BED_MAP: '/dashboard/ipd/bed-map',
  IPD_NURSING: '/dashboard/ipd/nursing',
  IPD_DOCTOR: '/dashboard/ipd/doctor',
  IPD_BILLING: '/dashboard/ipd/billing',
  IPD_PHARMACY: '/dashboard/ipd/pharmacy',
  IPD_FACILITY_BUILDER: '/dashboard/ipd/facility-builder',
};

export const ROLE_DEFAULT_ROUTES = {
  Reception: ROUTE_PATHS.RECEPTION,
  Nurse: ROUTE_PATHS.NURSE,
  'OPD Nurse': ROUTE_PATHS.NURSE,
  'IPD Nurse': ROUTE_PATHS.NURSE,
  'Lab Nurse': ROUTE_PATHS.LABORATORY,
  Doctor: ROUTE_PATHS.DOCTOR,
  Surgeon: ROUTE_PATHS.SURGEON,
  Laboratory: ROUTE_PATHS.LABORATORY,
  Pharmacy: ROUTE_PATHS.PHARMACY,
  'Ward Operations': ROUTE_PATHS.WARD_OPERATIONS,
  Administrator: ROUTE_PATHS.ADMINISTRATOR,
  Billing: ROUTE_PATHS.BILLING,
};

export const ROLE_LABELS = {
  Reception: 'Front Desk / Reception',
  Nurse: 'Clinical Nurse',
  'OPD Nurse': 'Outpatient Nurse',
  'IPD Nurse': 'Inpatient Nurse',
  'Lab Nurse': 'Phlebotomist / Lab Nurse',
  Doctor: 'Attending Physician',
  Surgeon: 'Surgeon / Operative Lead',
  Laboratory: 'Laboratory Technologist',
  Pharmacy: 'Pharmacist',
  'Ward Operations': 'Ward Operations Manager',
  Administrator: 'System Administrator',
  Billing: 'Cashier & Billing Specialist',
};

export default {
  ROUTE_PATHS,
  ROLE_DEFAULT_ROUTES,
  ROLE_LABELS,
};
