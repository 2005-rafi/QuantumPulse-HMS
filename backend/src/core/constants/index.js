const ROLES = {
  RECEPTION: 'Reception',
  OPD_NURSE: 'OPD Nurse',
  IPD_NURSE: 'IPD Nurse',
  LAB_NURSE: 'Lab Nurse',
  DOCTOR: 'Doctor',
  SURGEON: 'Surgeon',
  LABORATORY: 'Laboratory',
  PHARMACY: 'Pharmacy',
  WARD_OPERATIONS: 'Ward Operations',
  ADMINISTRATOR: 'Administrator',
  BILLING: 'Billing',
};

const PERMISSIONS = {
  PATIENT_REGISTER: 'PATIENT_REGISTER',
  PATIENT_UPDATE: 'PATIENT_UPDATE',
  PATIENT_VIEW: 'PATIENT_VIEW',
  PATIENT_BASIC_VIEW: 'PATIENT_BASIC_VIEW',
  PATIENT_DELETE: 'PATIENT_DELETE',
  VISIT_CREATE: 'VISIT_CREATE',
  VISIT_VIEW: 'VISIT_VIEW',
  VISIT_CLOSE: 'VISIT_CLOSE',
  VITALS_RECORD: 'VITALS_RECORD',
  NOTE_OPEN: 'NOTE_OPEN',
  NOTE_UPDATE: 'NOTE_UPDATE',
  NOTE_FINALIZE: 'NOTE_FINALIZE',
  NOTE_AMEND: 'NOTE_AMEND',
  RX_CREATE: 'RX_CREATE',
  RX_CANCEL: 'RX_CANCEL',
  LAB_ORDER_CREATE: 'LAB_ORDER_CREATE',
  LAB_PROCESS: 'LAB_PROCESS',
  LAB_VERIFY: 'LAB_VERIFY',
  LAB_MANAGE: 'LAB_MANAGE',  // Admin-only: create/update/delete labs and test catalogs
  MEDICINE_DISPENSE: 'MEDICINE_DISPENSE',
  BILL_GENERATE: 'BILL_GENERATE',
  PAYMENT_RECORD: 'PAYMENT_RECORD',
  MANAGE_USERS: 'MANAGE_USERS',
  APPROVE_DELETION: 'APPROVE_DELETION',
  VIEW_AUDIT: 'VIEW_AUDIT',
  // Appointments
  APPOINTMENT_VIEW: 'APPOINTMENT_VIEW',
  APPOINTMENT_CREATE: 'APPOINTMENT_CREATE',
  APPOINTMENT_UPDATE: 'APPOINTMENT_UPDATE',
  APPOINTMENT_CANCEL: 'APPOINTMENT_CANCEL',
  APPOINTMENT_CHECKIN: 'APPOINTMENT_CHECKIN',
  APPOINTMENT_MARK_MISSED: 'APPOINTMENT_MARK_MISSED',
  APPOINTMENT_MANAGE_SCHEDULE: 'APPOINTMENT_MANAGE_SCHEDULE',
  // Tariff & Billing
  TARIFF_VIEW: 'TARIFF_VIEW',
  TARIFF_MANAGE: 'TARIFF_MANAGE',
  MEDICINE_PRICE_MANAGE: 'MEDICINE_PRICE_MANAGE',
  BILL_VIEW: 'BILL_VIEW',
  BILL_FINALIZE: 'BILL_FINALIZE',
  ADJUSTMENT_REQUEST: 'ADJUSTMENT_REQUEST',
  ADJUSTMENT_APPROVE: 'ADJUSTMENT_APPROVE',
  FINANCIAL_ANALYTICS: 'FINANCIAL_ANALYTICS',
  // Inpatient & Ward Operations
  BED_VIEW: 'BED_VIEW',
  BED_ALLOCATE: 'BED_ALLOCATE',
  BED_TRANSFER: 'BED_TRANSFER',
  BED_STATUS_UPDATE: 'BED_STATUS_UPDATE',
  FACILITY_VIEW: 'FACILITY_VIEW',
  FACILITY_MANAGE: 'FACILITY_MANAGE',
  DISCHARGE_VIEW: 'DISCHARGE_VIEW',
  DISCHARGE_INITIATE: 'DISCHARGE_INITIATE',
  TIME_MONITOR_VIEW: 'TIME_MONITOR_VIEW',
  HOUSEKEEPING_UPDATE: 'HOUSEKEEPING_UPDATE',
  // Nursing Domain Specific
  EMAR_RECORD: 'EMAR_RECORD',
  IO_BALANCE_LOG: 'IO_BALANCE_LOG',
  SHIFT_HANDOVER: 'SHIFT_HANDOVER',
  NURSING_CARE_PLAN: 'NURSING_CARE_PLAN',
  OPD_TRIAGE: 'OPD_TRIAGE',
  // Surgery & Operating Theatre (OT)
  OT_REQUEST: 'OT_REQUEST',
  OT_BOOK: 'OT_BOOK',
  OT_MANAGE: 'OT_MANAGE',
  OT_CONSUMABLE_LOG: 'OT_CONSUMABLE_LOG',
  OT_VIEW: 'OT_VIEW',
  SURGICAL_NOTES: 'SURGICAL_NOTES',
  ICU_TRANSFER: 'ICU_TRANSFER',
};

const ACCOUNT_STATUS = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  LOCKED: 'Locked',
  DISABLED: 'Disabled',
};

const STAFF_STATUS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

// ACL Matrix — role to permissions mapping (for seeding)
const ROLE_PERMISSIONS = {
  [ROLES.RECEPTION]: [
    PERMISSIONS.PATIENT_REGISTER,
    PERMISSIONS.PATIENT_UPDATE,
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.VISIT_CREATE,
    PERMISSIONS.VISIT_VIEW,
    PERMISSIONS.VISIT_CLOSE,
    PERMISSIONS.BILL_GENERATE,
    PERMISSIONS.PAYMENT_RECORD,
    PERMISSIONS.BILL_VIEW,
    PERMISSIONS.APPOINTMENT_VIEW,
    PERMISSIONS.APPOINTMENT_CREATE,
    PERMISSIONS.APPOINTMENT_UPDATE,
    PERMISSIONS.APPOINTMENT_CANCEL,
    PERMISSIONS.APPOINTMENT_CHECKIN,
    PERMISSIONS.APPOINTMENT_MARK_MISSED,
    PERMISSIONS.BED_VIEW,
  ],
  [ROLES.LAB_NURSE]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.VISIT_VIEW,
    PERMISSIONS.VITALS_RECORD,
    PERMISSIONS.LAB_ORDER_CREATE,
    PERMISSIONS.LAB_PROCESS,
  ],
  [ROLES.OPD_NURSE]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.VISIT_VIEW,
    PERMISSIONS.VITALS_RECORD,
    PERMISSIONS.NOTE_OPEN,
    PERMISSIONS.OPD_TRIAGE,
    PERMISSIONS.APPOINTMENT_VIEW,
    PERMISSIONS.APPOINTMENT_CHECKIN,
  ],
  [ROLES.IPD_NURSE]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.VISIT_VIEW,
    PERMISSIONS.VITALS_RECORD,
    PERMISSIONS.NOTE_OPEN,
    PERMISSIONS.BED_VIEW,
    PERMISSIONS.BED_STATUS_UPDATE,
    PERMISSIONS.EMAR_RECORD,
    PERMISSIONS.IO_BALANCE_LOG,
    PERMISSIONS.SHIFT_HANDOVER,
    PERMISSIONS.NURSING_CARE_PLAN,
    PERMISSIONS.DISCHARGE_VIEW,
    PERMISSIONS.DISCHARGE_INITIATE,
  ],
  [ROLES.DOCTOR]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.VISIT_VIEW,
    PERMISSIONS.NOTE_UPDATE,
    PERMISSIONS.NOTE_FINALIZE,
    PERMISSIONS.NOTE_AMEND,
    PERMISSIONS.RX_CREATE,
    PERMISSIONS.RX_CANCEL,
    PERMISSIONS.LAB_ORDER_CREATE,
    PERMISSIONS.APPROVE_DELETION,
    PERMISSIONS.APPOINTMENT_VIEW,
    PERMISSIONS.BED_VIEW,
    PERMISSIONS.BED_ALLOCATE,
    PERMISSIONS.OT_REQUEST,
    PERMISSIONS.OT_VIEW,
  ],
  [ROLES.SURGEON]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.VISIT_VIEW,
    PERMISSIONS.BED_VIEW,
    PERMISSIONS.BED_ALLOCATE,
    PERMISSIONS.BED_TRANSFER,
    PERMISSIONS.OT_REQUEST,
    PERMISSIONS.OT_BOOK,
    PERMISSIONS.OT_MANAGE,
    PERMISSIONS.OT_CONSUMABLE_LOG,
    PERMISSIONS.OT_VIEW,
    PERMISSIONS.NOTE_UPDATE,
    PERMISSIONS.NOTE_FINALIZE,
    PERMISSIONS.NOTE_AMEND,
    PERMISSIONS.SURGICAL_NOTES,
    PERMISSIONS.LAB_ORDER_CREATE,
    PERMISSIONS.RX_CREATE,
    PERMISSIONS.ICU_TRANSFER,
    PERMISSIONS.DISCHARGE_VIEW,
    PERMISSIONS.DISCHARGE_INITIATE,
  ],
  [ROLES.LABORATORY]: [
    PERMISSIONS.VISIT_VIEW,
    PERMISSIONS.LAB_PROCESS,
    PERMISSIONS.LAB_VERIFY,
  ],
  [ROLES.PHARMACY]: [
    PERMISSIONS.PATIENT_BASIC_VIEW,
    PERMISSIONS.VISIT_VIEW,
    PERMISSIONS.VISIT_CREATE,
    PERMISSIONS.MEDICINE_DISPENSE,
    PERMISSIONS.BILL_GENERATE,
    PERMISSIONS.BILL_VIEW,
    PERMISSIONS.MEDICINE_PRICE_MANAGE,
  ],
  [ROLES.WARD_OPERATIONS]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.VISIT_VIEW,
    PERMISSIONS.BED_VIEW,
    PERMISSIONS.BED_ALLOCATE,
    PERMISSIONS.BED_TRANSFER,
    PERMISSIONS.BED_STATUS_UPDATE,
    PERMISSIONS.FACILITY_VIEW,
    PERMISSIONS.FACILITY_MANAGE,
    PERMISSIONS.DISCHARGE_VIEW,
    PERMISSIONS.DISCHARGE_INITIATE,
    PERMISSIONS.TIME_MONITOR_VIEW,
    PERMISSIONS.HOUSEKEEPING_UPDATE,
    PERMISSIONS.OT_VIEW,
  ],
  [ROLES.ADMINISTRATOR]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.PATIENT_DELETE,
    PERMISSIONS.VISIT_VIEW,
    PERMISSIONS.NOTE_AMEND,
    PERMISSIONS.BILL_GENERATE,
    PERMISSIONS.PAYMENT_RECORD,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_AUDIT,
    PERMISSIONS.LAB_MANAGE,
    PERMISSIONS.LAB_PROCESS,
    PERMISSIONS.LAB_VERIFY,
    PERMISSIONS.APPOINTMENT_VIEW,
    PERMISSIONS.APPOINTMENT_CREATE,
    PERMISSIONS.APPOINTMENT_UPDATE,
    PERMISSIONS.APPOINTMENT_CANCEL,
    PERMISSIONS.APPOINTMENT_CHECKIN,
    PERMISSIONS.APPOINTMENT_MARK_MISSED,
    PERMISSIONS.APPOINTMENT_MANAGE_SCHEDULE,
    // Tariff & Billing
    PERMISSIONS.TARIFF_VIEW,
    PERMISSIONS.TARIFF_MANAGE,
    PERMISSIONS.MEDICINE_PRICE_MANAGE,
    PERMISSIONS.BILL_VIEW,
    PERMISSIONS.BILL_FINALIZE,
    PERMISSIONS.ADJUSTMENT_REQUEST,
    PERMISSIONS.ADJUSTMENT_APPROVE,
    PERMISSIONS.FINANCIAL_ANALYTICS,
    // Inpatient & Ward Operations
    PERMISSIONS.BED_VIEW,
    PERMISSIONS.BED_ALLOCATE,
    PERMISSIONS.BED_TRANSFER,
    PERMISSIONS.BED_STATUS_UPDATE,
    PERMISSIONS.FACILITY_VIEW,
    PERMISSIONS.FACILITY_MANAGE,
    PERMISSIONS.DISCHARGE_VIEW,
    PERMISSIONS.DISCHARGE_INITIATE,
    PERMISSIONS.TIME_MONITOR_VIEW,
    PERMISSIONS.HOUSEKEEPING_UPDATE,
    // Nursing & Surgery
    PERMISSIONS.EMAR_RECORD,
    PERMISSIONS.IO_BALANCE_LOG,
    PERMISSIONS.SHIFT_HANDOVER,
    PERMISSIONS.NURSING_CARE_PLAN,
    PERMISSIONS.OPD_TRIAGE,
    PERMISSIONS.OT_REQUEST,
    PERMISSIONS.OT_BOOK,
    PERMISSIONS.OT_MANAGE,
    PERMISSIONS.OT_CONSUMABLE_LOG,
    PERMISSIONS.OT_VIEW,
    PERMISSIONS.SURGICAL_NOTES,
    PERMISSIONS.ICU_TRANSFER,
  ],
  [ROLES.BILLING]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.VISIT_VIEW,
    PERMISSIONS.BILL_GENERATE,
    PERMISSIONS.PAYMENT_RECORD,
    PERMISSIONS.BILL_VIEW,
    PERMISSIONS.BILL_FINALIZE,
    PERMISSIONS.ADJUSTMENT_REQUEST,
    PERMISSIONS.FINANCIAL_ANALYTICS,
    PERMISSIONS.TARIFF_VIEW,
    PERMISSIONS.BED_VIEW,
    PERMISSIONS.OT_VIEW,
    PERMISSIONS.DISCHARGE_VIEW,
  ],
};

const TARIFF_GRADES = {
  GRADE_1: 'GRADE_1', // positionRank 1-2 (Intern/Junior)
  GRADE_2: 'GRADE_2', // positionRank 3-4 (Resident/Associate)
  GRADE_3: 'GRADE_3', // positionRank 5-6 (Consultant/Senior Consultant)
  GRADE_4: 'GRADE_4', // positionRank 7-8 (Head of Dept/Superintendent)
  GRADE_5: 'GRADE_5', // positionRank 9 (Chief Medical Officer)
};

const getTariffGrade = (positionRank) => {
  if (positionRank <= 2) return TARIFF_GRADES.GRADE_1;
  if (positionRank <= 4) return TARIFF_GRADES.GRADE_2;
  if (positionRank <= 6) return TARIFF_GRADES.GRADE_3;
  if (positionRank <= 8) return TARIFF_GRADES.GRADE_4;
  return TARIFF_GRADES.GRADE_5;
};

const SALARY_BANDS = {
  [TARIFF_GRADES.GRADE_1]: {
    band: 'Band A',
    label: 'Entry / Support',
    minSalary: 20000,
    maxSalary: 35000,
    description: 'Entry-level support, junior reception, interns, nursing assistants'
  },
  [TARIFF_GRADES.GRADE_2]: {
    band: 'Band B',
    label: 'Operational / Associate',
    minSalary: 35000,
    maxSalary: 60000,
    description: 'Staff nurses, front desk supervisors, lab technicians, residents'
  },
  [TARIFF_GRADES.GRADE_3]: {
    band: 'Band C',
    label: 'Senior / Specialist',
    minSalary: 60000,
    maxSalary: 120000,
    description: 'Senior consultants, head nurses, lab supervisors, managers'
  },
  [TARIFF_GRADES.GRADE_4]: {
    band: 'Band D',
    label: 'Leadership / Department Head',
    minSalary: 120000,
    maxSalary: 250000,
    description: 'Heads of departments, nursing superintendents, senior medical officers'
  },
  [TARIFF_GRADES.GRADE_5]: {
    band: 'Band E',
    label: 'Executive / CMO',
    minSalary: 250000,
    maxSalary: 500000,
    description: 'Chief Medical Officer, Chief Executive Officer, Medical Director'
  }
};

const DEPARTMENTS = [
  // Clinical departments
  { name: 'General Medicine', code: 'GEN',   description: 'General OPD consultations',           type: 'CLINICAL' },
  { name: 'Cardiology',       code: 'CARD',  description: 'Heart and cardiovascular care',        type: 'CLINICAL' },
  { name: 'Neurology',        code: 'NEURO', description: 'Brain and nervous system care',        type: 'CLINICAL' },
  { name: 'Orthopedics',      code: 'ORTH',  description: 'Bone and joint care',                  type: 'CLINICAL' },
  // Diagnostic (laboratory) departments
  { name: 'Haematology',      code: 'HAEM',  description: 'Blood and haematology diagnostics',    type: 'DIAGNOSTIC' },
  { name: 'Biochemistry',     code: 'BCHEM', description: 'Biochemical and metabolic testing',    type: 'DIAGNOSTIC' },
  { name: 'Microbiology',     code: 'MICRO', description: 'Infection and pathogen diagnostics',   type: 'DIAGNOSTIC' },
  { name: 'Radiology',        code: 'RAD',   description: 'Imaging and scan reports',              type: 'DIAGNOSTIC' },
  { name: 'Histopathology',   code: 'HISTO', description: 'Tissue and biopsy analysis',           type: 'DIAGNOSTIC' },
  // Support departments
  { name: 'Pharmacy',         code: 'PHARM', description: 'Medicine dispensing and management',   type: 'SUPPORT' },
  { name: 'Blood Bank',       code: 'BBANK', description: 'Blood storage and transfusion',        type: 'SUPPORT' },
  { name: 'Ward Operations',  code: 'WARD',  description: 'Inpatient bed allocation, facility & time monitoring', type: 'SUPPORT' },
  // Administrative departments
  { name: 'Reception',        code: 'RECEP', description: 'Patient registration and front desk',  type: 'ADMINISTRATIVE' },
  { name: 'Billing',          code: 'BILL',  description: 'Billing, accounts and payments',       type: 'ADMINISTRATIVE' },
  { name: 'Human Resources',  code: 'HR',    description: 'Staff recruitment and management',     type: 'ADMINISTRATIVE' },
  { name: 'Administration',   code: 'ADMIN', description: 'Hospital administration and IT',       type: 'ADMINISTRATIVE' },
];

const POSITIONS = {
  [ROLES.DOCTOR]: [
    { title: 'Chief Medical Officer', rank: 9 },
    { title: 'Medical Superintendent', rank: 8 },
    { title: 'Head of Department', rank: 7 },
    { title: 'Senior Consultant', rank: 6 },
    { title: 'Consultant', rank: 5 },
    { title: 'Associate Consultant', rank: 4 },
    { title: 'Junior Consultant', rank: 3 },
    { title: 'Resident Doctor', rank: 2 },
    { title: 'Intern', rank: 1 }
  ],
  [ROLES.SURGEON]: [
    { title: 'Chief Surgeon', rank: 9 },
    { title: 'Medical Superintendent', rank: 8 },
    { title: 'Head of Surgery Department', rank: 7 },
    { title: 'Senior Consultant Surgeon', rank: 6 },
    { title: 'Consultant Surgeon', rank: 5 },
    { title: 'Associate Consultant Surgeon', rank: 4 },
    { title: 'Junior Consultant Surgeon', rank: 3 },
    { title: 'Surgical Resident', rank: 2 },
    { title: 'Surgical Intern', rank: 1 }
  ],
  [ROLES.LAB_NURSE]: [
    { title: 'Chief Lab Nursing Officer', rank: 7 },
    { title: 'Head Lab Nurse / Phlebotomy Lead', rank: 5 },
    { title: 'Senior Lab Staff Nurse', rank: 4 },
    { title: 'Lab Staff Nurse', rank: 3 },
    { title: 'Junior Lab Nurse', rank: 2 },
    { title: 'Lab Nursing Assistant', rank: 1 }
  ],
  [ROLES.OPD_NURSE]: [
    { title: 'Head OPD Nurse', rank: 5 },
    { title: 'Senior OPD Staff Nurse', rank: 4 },
    { title: 'OPD Staff Nurse', rank: 3 },
    { title: 'Junior OPD Nurse', rank: 2 },
    { title: 'OPD Nursing Assistant', rank: 1 }
  ],
  [ROLES.IPD_NURSE]: [
    { title: 'Chief Nursing Officer', rank: 8 },
    { title: 'Nursing Superintendent', rank: 7 },
    { title: 'Deputy Nursing Superintendent', rank: 6 },
    { title: 'Head Ward Nurse', rank: 5 },
    { title: 'Senior Ward Staff Nurse', rank: 4 },
    { title: 'Ward Staff Nurse', rank: 3 },
    { title: 'Junior Ward Nurse', rank: 2 },
    { title: 'Ward Nursing Assistant', rank: 1 }
  ],
  [ROLES.LABORATORY]: [
    { title: 'Laboratory Director', rank: 7 },
    { title: 'Laboratory Manager', rank: 6 },
    { title: 'Laboratory Supervisor', rank: 5 },
    { title: 'Senior Technologist', rank: 4 },
    { title: 'Lab Technologist', rank: 3 },
    { title: 'Lab Technician', rank: 2 },
    { title: 'Lab Assistant', rank: 1 }
  ],
  [ROLES.PHARMACY]: [
    { title: 'Chief Pharmacist', rank: 6 },
    { title: 'Pharmacy Manager', rank: 5 },
    { title: 'Senior Pharmacist', rank: 4 },
    { title: 'Pharmacist', rank: 3 },
    { title: 'Pharmacy Technician', rank: 2 },
    { title: 'Pharmacy Assistant', rank: 1 }
  ],
  [ROLES.WARD_OPERATIONS]: [
    { title: 'Head of Department', rank: 5 },
    { title: 'Operations Manager', rank: 4 },
    { title: 'Senior Ward Executive', rank: 3 },
    { title: 'Junior Ward Executive', rank: 2 },
    { title: 'Housekeeping', rank: 1 }
  ],
  [ROLES.RECEPTION]: [
    { title: 'Front Office Manager', rank: 5 },
    { title: 'Reception Supervisor', rank: 4 },
    { title: 'Senior Receptionist', rank: 3 },
    { title: 'Front Desk Supervisor', rank: 2 },
    { title: 'Receptionist', rank: 2 },
    { title: 'Front Desk Assistant', rank: 1 }
  ],
  [ROLES.ADMINISTRATOR]: [
    { title: 'Chief Executive Officer', rank: 4 },
    { title: 'Administrative Director', rank: 3 },
    { title: 'Admin Officer', rank: 2 },
    { title: 'Admin Assistant', rank: 1 }
  ],
  [ROLES.BILLING]: [
    { title: 'Billing Manager / Finance Lead', rank: 5 },
    { title: 'Billing Manager', rank: 5 },
    { title: 'Senior Billing Officer', rank: 4 },
    { title: 'Senior Billing Executive', rank: 4 },
    { title: 'Billing Executive', rank: 3 },
    { title: 'Cashier / Billing Associate', rank: 2 },
    { title: 'Junior Billing Executive', rank: 2 },
    { title: 'Billing Assistant', rank: 1 }
  ],
  Nurse: [
    { title: 'Chief Nursing Officer', rank: 8 },
    { title: 'Nursing Superintendent', rank: 7 },
    { title: 'Deputy Nursing Superintendent', rank: 6 },
    { title: 'Head Nurse', rank: 5 },
    { title: 'Senior Staff Nurse', rank: 4 },
    { title: 'Staff Nurse', rank: 3 },
    { title: 'Junior Nurse', rank: 2 },
    { title: 'Nursing Assistant', rank: 1 }
  ]
};

const {
  PATIENT_STATUS_CODES,
  PATIENT_STATUS_REGISTRY,
  ACTIVE_STATUS_CODES,
  getPatientStatus,
  isEncounterActive,
} = require('./patient-status.constants');

module.exports = {
  ROLES,
  PERMISSIONS,
  ACCOUNT_STATUS,
  STAFF_STATUS,
  ROLE_PERMISSIONS,
  DEPARTMENTS,
  POSITIONS,
  TARIFF_GRADES,
  getTariffGrade,
  SALARY_BANDS,
  PATIENT_STATUS_CODES,
  PATIENT_STATUS_REGISTRY,
  ACTIVE_STATUS_CODES,
  getPatientStatus,
  isEncounterActive,
};
