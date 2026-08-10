const ROLES = {
  RECEPTION: 'Reception',
  NURSE: 'Nurse',
  DOCTOR: 'Doctor',
  LABORATORY: 'Laboratory',
  PHARMACY: 'Pharmacy',
  ADMINISTRATOR: 'Administrator',
};

const PERMISSIONS = {
  PATIENT_REGISTER: 'PATIENT_REGISTER',
  PATIENT_UPDATE: 'PATIENT_UPDATE',
  PATIENT_VIEW: 'PATIENT_VIEW',
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
  ],
  [ROLES.NURSE]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.VISIT_VIEW,
    PERMISSIONS.VITALS_RECORD,
    PERMISSIONS.NOTE_OPEN,
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
  ],
  [ROLES.LABORATORY]: [
    PERMISSIONS.VISIT_VIEW,
    PERMISSIONS.LAB_PROCESS,
    PERMISSIONS.LAB_VERIFY,
  ],
  [ROLES.PHARMACY]: [
    PERMISSIONS.PATIENT_VIEW,
    PERMISSIONS.VISIT_VIEW,
    PERMISSIONS.VISIT_CREATE,
    PERMISSIONS.MEDICINE_DISPENSE,
    PERMISSIONS.BILL_GENERATE,
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
  ],
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
  [ROLES.NURSE]: [
    { title: 'Chief Nursing Officer', rank: 8 },
    { title: 'Nursing Superintendent', rank: 7 },
    { title: 'Deputy Nursing Superintendent', rank: 6 },
    { title: 'Head Nurse', rank: 5 },
    { title: 'Senior Staff Nurse', rank: 4 },
    { title: 'Staff Nurse', rank: 3 },
    { title: 'Junior Nurse', rank: 2 },
    { title: 'Nursing Assistant', rank: 1 }
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
  [ROLES.RECEPTION]: [
    { title: 'Front Office Manager', rank: 5 },
    { title: 'Reception Supervisor', rank: 4 },
    { title: 'Senior Receptionist', rank: 3 },
    { title: 'Receptionist', rank: 2 },
    { title: 'Front Desk Assistant', rank: 1 }
  ],
  [ROLES.ADMINISTRATOR]: [
    { title: 'Chief Executive Officer', rank: 4 },
    { title: 'Administrative Director', rank: 3 },
    { title: 'Admin Officer', rank: 2 },
    { title: 'Admin Assistant', rank: 1 }
  ]
};

module.exports = { ROLES, PERMISSIONS, ACCOUNT_STATUS, STAFF_STATUS, ROLE_PERMISSIONS, DEPARTMENTS, POSITIONS };
