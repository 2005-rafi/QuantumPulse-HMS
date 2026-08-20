/**
 * CONSOLIDATED IDEMPOTENT COMPLETE HMS SEED SCRIPT (South Indian Style)
 * Seeds 30 departments, roles, permissions, staff configurations (with HODs),
 * laboratories, test catalogs, and patients.
 *
 * Password for all accounts: Password123!
 *
 * Usage: node backend/scripts/seed-complete-hms.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../src/core/config');
const { connectDB } = require('../src/core/database/connection');
const { encryptDeterministic, encryptRandom } = require('../src/core/utils/encryption');

// Load Models
const Department = require('../src/modules/administration/department.model');
const Role = require('../src/modules/administration/role.model');
const Permission = require('../src/modules/administration/permission.model');
const RolePermission = require('../src/modules/administration/rolePermission.model');
const Staff = require('../src/modules/staff/staff.model');
const Identity = require('../src/modules/identity/identity.model');
const Laboratory = require('../src/modules/laboratory/laboratory.model');
const Patient = require('../src/modules/patient/patient.model');
const Visit = require('../src/modules/visits/visit.model');

const PERMISSION_DEFS = [
  { code: 'PATIENT_REGISTER',  module: 'patients',       description: 'Create a new patient record' },
  { code: 'PATIENT_UPDATE',    module: 'patients',       description: 'Update patient demographics' },
  { code: 'PATIENT_VIEW',      module: 'patients',       description: 'View patient identity and history' },
  { code: 'PATIENT_DELETE',    module: 'patients',       description: 'Request patient deletion' },
  { code: 'VISIT_CREATE',      module: 'visits',         description: 'Create a visit' },
  { code: 'VISIT_VIEW',        module: 'visits',         description: 'View visit details' },
  { code: 'VISIT_CLOSE',       module: 'visits',         description: 'Close a visit' },
  { code: 'VITALS_RECORD',     module: 'nursing',        description: 'Record vitals and observations' },
  { code: 'NOTE_OPEN',         module: 'nursing',        description: 'Open a doctor note' },
  { code: 'NOTE_UPDATE',       module: 'doctor-notes',   description: 'Edit draft or in-progress note' },
  { code: 'NOTE_FINALIZE',     module: 'doctor-notes',   description: 'Finalize consultation' },
  { code: 'NOTE_AMEND',        module: 'doctor-notes',   description: 'Submit or approve amendment' },
  { code: 'RX_CREATE',         module: 'prescriptions',  description: 'Create prescription' },
  { code: 'RX_CANCEL',         module: 'prescriptions',  description: 'Cancel prescription before finalization' },
  { code: 'LAB_ORDER_CREATE',  module: 'laboratory',     description: 'Order investigation' },
  { code: 'LAB_PROCESS',       module: 'laboratory',     description: 'Collect sample, run test, upload result' },
  { code: 'LAB_VERIFY',        module: 'laboratory',     description: 'Verify lab report' },
  { code: 'LAB_MANAGE',        module: 'laboratory',     description: 'Create/update/delete laboratories and test catalogs (admin only)' },
  { code: 'MEDICINE_DISPENSE', module: 'pharmacy',       description: 'Dispense medicine' },
  { code: 'BILL_GENERATE',     module: 'billing',        description: 'Generate bill' },
  { code: 'PAYMENT_RECORD',    module: 'billing',        description: 'Record payment' },
  { code: 'MANAGE_USERS',      module: 'administration', description: 'Create and update staff, identity, roles, permissions' },
  { code: 'APPROVE_DELETION',  module: 'administration', description: 'Approve or reject deletion requests' },
  { code: 'VIEW_AUDIT',        module: 'audit',          description: 'Read activity logs' },
  { code: 'APPOINTMENT_VIEW',            module: 'appointments', description: 'View appointment list and details' },
  { code: 'APPOINTMENT_CREATE',          module: 'appointments', description: 'Book new appointments' },
  { code: 'APPOINTMENT_UPDATE',          module: 'appointments', description: 'Reschedule or update appointment details' },
  { code: 'APPOINTMENT_CANCEL',          module: 'appointments', description: 'Cancel scheduled appointments' },
  { code: 'APPOINTMENT_CHECKIN',         module: 'appointments', description: 'Check-in patient and generate OPD visit ticket' },
  { code: 'APPOINTMENT_MARK_MISSED',     module: 'appointments', description: 'Mark unattended appointments as missed' },
  { code: 'APPOINTMENT_MANAGE_SCHEDULE', module: 'appointments', description: 'Configure doctor weekly schedules and slot capacity' }
];

const ROLE_PERMISSIONS = {
  'Administrator': PERMISSION_DEFS.map(p => p.code),
  'Reception': [
    'PATIENT_REGISTER', 'PATIENT_UPDATE', 'PATIENT_VIEW', 'VISIT_CREATE', 'VISIT_VIEW', 'VISIT_CLOSE',
    'BILL_GENERATE', 'PAYMENT_RECORD',
    'APPOINTMENT_VIEW', 'APPOINTMENT_CREATE', 'APPOINTMENT_UPDATE', 'APPOINTMENT_CANCEL', 'APPOINTMENT_CHECKIN', 'APPOINTMENT_MARK_MISSED'
  ],
  'Nurse': [
    'PATIENT_VIEW', 'VISIT_VIEW', 'VITALS_RECORD', 'NOTE_OPEN'
  ],
  'Doctor': [
    'PATIENT_VIEW', 'VISIT_VIEW', 'NOTE_UPDATE', 'NOTE_FINALIZE', 'NOTE_AMEND', 'RX_CREATE', 'RX_CANCEL',
    'LAB_ORDER_CREATE', 'APPROVE_DELETION', 'APPOINTMENT_VIEW'
  ],
  'Laboratory': [
    'VISIT_VIEW', 'LAB_PROCESS', 'LAB_VERIFY'
  ],
  'Pharmacy': [
    'PATIENT_VIEW', 'VISIT_VIEW', 'VISIT_CREATE', 'MEDICINE_DISPENSE', 'BILL_GENERATE'
  ]
};

const DEPT_DEFS = [
  // CLINICAL (10)
  { name: 'General Medicine', code: 'GEN', type: 'CLINICAL', description: 'Primary outpatient medical ward for general care' },
  { name: 'Cardiology', code: 'CAR', type: 'CLINICAL', description: 'Advanced cardiovascular care and consultation' },
  { name: 'Pediatrics', code: 'PED', type: 'CLINICAL', description: 'Comprehensive childcare and developmental tracking' },
  { name: 'Neurology', code: 'NEU', type: 'CLINICAL', description: 'Neurological consultations and brain health' },
  { name: 'Dermatology', code: 'DER', type: 'CLINICAL', description: 'Skin care, allergies, and aesthetic treatments' },
  { name: 'Orthopedics', code: 'ORT', type: 'CLINICAL', description: 'Bone, joint, and musculoskeletal therapy' },
  { name: 'Pulmonology', code: 'PUL', type: 'CLINICAL', description: 'Respiratory diseases and asthma clinic' },
  { name: 'Nephrology', code: 'NEP', type: 'CLINICAL', description: 'Kidney care, hypertension, and renal counseling' },
  { name: 'Oncology', code: 'ONC', type: 'CLINICAL', description: 'Cancer consultation, staging, and post-chemo care' },
  { name: 'Gynecology', code: 'GYN', type: 'CLINICAL', description: 'Women health and antenatal consultation' },

  // DIAGNOSTIC (10)
  { name: 'Hematology Lab', code: 'HEM', type: 'DIAGNOSTIC', description: 'Blood analysis and cellular diagnostic services' },
  { name: 'Biochemistry Lab', code: 'BIO', type: 'DIAGNOSTIC', description: 'Chemical and metabolic serum screening' },
  { name: 'Microbiology Lab', code: 'MIC', type: 'DIAGNOSTIC', description: 'Bacterial and fungal culture identification' },
  { name: 'Pathology Lab', code: 'PAT', type: 'DIAGNOSTIC', description: 'Tissue specimen and body fluid testing' },
  { name: 'Radiology Scan', code: 'RAD', type: 'DIAGNOSTIC', description: 'Medical imaging, X-Ray, CT, and MRI scans' },
  { name: 'Histopathology Lab', code: 'HIS', type: 'DIAGNOSTIC', description: 'Biopsy and cellular structure biopsy analyses' },
  { name: 'Serology Lab', code: 'SER', type: 'DIAGNOSTIC', description: 'Antibody screening and infectious serotesting' },
  { name: 'Clinical Pathology Lab', code: 'CLP', type: 'DIAGNOSTIC', description: 'Routine urinalysis and stool analysis' },
  { name: 'Cytogenetics Lab', code: 'CYT', type: 'DIAGNOSTIC', description: 'Karyotyping and genetic sequence testing' },
  { name: 'Molecular Diagnostics Lab', code: 'MOL', type: 'DIAGNOSTIC', description: 'PCR and genetic amplification diagnostics' },

  // CLINICAL/DIAGNOSTIC (10)
  { name: 'Gastroenterology & Endoscopy', code: 'GAS', type: 'CLINICAL/DIAGNOSTIC', description: 'Digestive tract care and endoscopy scans' },
  { name: 'Nephrology & Dialysis', code: 'NDI', type: 'CLINICAL/DIAGNOSTIC', description: 'Renal outpatient care and active dialysis runs' },
  { name: 'Cardiology & Cath Lab', code: 'CCL', type: 'CLINICAL/DIAGNOSTIC', description: 'Cardiac interventions and angiography runs' },
  { name: 'Pulmonary & Bronchoscopy', code: 'PBR', type: 'CLINICAL/DIAGNOSTIC', description: 'Lungs diagnosis and active bronchoscopy scans' },
  { name: 'Urology & Cystoscopy', code: 'URO', type: 'CLINICAL/DIAGNOSTIC', description: 'Urinary tract care and cystoscopy scans' },
  { name: 'Ophthalmology & Retinal Scans', code: 'OPH', type: 'CLINICAL/DIAGNOSTIC', description: 'Eye consultation and digital retinal scans' },
  { name: 'ENT & Audiology', code: 'ENT', type: 'CLINICAL/DIAGNOSTIC', description: 'Ear, nose, throat care and audiometric scans' },
  { name: 'Endocrinology & Lab', code: 'END', type: 'CLINICAL/DIAGNOSTIC', description: 'Hormonal disorders and dynamic hormone panels' },
  { name: 'Rheumatology & Immunology', code: 'RHE', type: 'CLINICAL/DIAGNOSTIC', description: 'Autoimmune care and immunological diagnostic panels' },
  { name: 'Sports Medicine & Motion Lab', code: 'SPO', type: 'CLINICAL/DIAGNOSTIC', description: 'Injury rehabilitation and gait analysis scans' },

  // SUPPORT & ADMINISTRATIVE
  { name: 'Administration', code: 'ADM', type: 'ADMINISTRATIVE', description: 'Hospital operations and administration' },
  { name: 'Pharmacy', code: 'PHM', type: 'SUPPORT', description: 'Hospital dispensary and billing gateway' }
];

const getVitalsForDept = (code) => {
  return [
    { name: 'bp', label: 'Blood Pressure', type: 'text', unit: 'mmHg', required: true },
    { name: 'pulse', label: 'Pulse Rate', type: 'number', unit: 'bpm', required: true },
    { name: 'temp', label: 'Body Temperature', type: 'number', unit: 'F', required: true },
    { name: 'spo2', label: 'Oxygen Saturation', type: 'number', unit: '%', required: true },
    { name: 'resp_rate', label: 'Respiratory Rate', type: 'number', unit: 'breaths/min', required: false },
    { name: 'height', label: 'Height', type: 'number', unit: 'cm', required: false },
    { name: 'weight', label: 'Weight', type: 'number', unit: 'kg', required: false },
    { name: 'bmi', label: 'Body Mass Index', type: 'number', unit: 'kg/m²', required: false },
    { name: 'pain_scale', label: 'Pain Scale (1-10)', type: 'number', unit: '', required: false },
    { name: 'sugar', label: 'Random Blood Sugar', type: 'number', unit: 'mg/dL', required: false }
  ];
};

const SOUTH_INDIAN_DOCS = {
  GEN: { first: 'Ramesh', last: 'Krishnan', license: 'MCI-TN-45211' },
  CAR: { first: 'Balaji', last: 'Swaminathan', license: 'MCI-TN-98522' },
  PED: { first: 'Anitha', last: 'Venkat', license: 'MCI-TN-36521' },
  NEU: { first: 'Sridhar', last: 'Ramaswamy', license: 'MCI-TN-87422' },
  DER: { first: 'Meera', last: 'Selvan', license: 'MCI-TN-54129' },
  ORT: { first: 'Raghavan', last: 'Iyer', license: 'MCI-TN-63201' },
  PUL: { first: 'Shankar', last: 'Mahadevan', license: 'MCI-TN-71409' },
  NEP: { first: 'Suresh', last: 'Gopalan', license: 'MCI-TN-89501' },
  ONC: { first: 'Chitra', last: 'Viswanathan', license: 'MCI-TN-96302' },
  GYN: { first: 'Prema', last: 'Sundaram', license: 'MCI-TN-12409' },
  HEM: { first: 'Karthik', last: 'Subramanian', license: 'MCI-TN-23091' },
  BIO: { first: 'Vijay', last: 'Srinivasan', license: 'MCI-TN-35201' },
  MIC: { first: 'Deepa', last: 'Sundar', license: 'MCI-TN-49801' },
  PAT: { first: 'Kumaraswamy', last: 'Naidu', license: 'MCI-TN-50123' },
  RAD: { first: 'Anand', last: 'Rajan', license: 'MCI-TN-61204' },
  HIS: { first: 'Selvaraj', last: 'Pandian', license: 'MCI-TN-78213' },
  SER: { first: 'Radhika', last: 'Devi', license: 'MCI-TN-89102' },
  CLP: { first: 'Hariharan', last: 'Natarajan', license: 'MCI-TN-90124' },
  CYT: { first: 'Priya', last: 'Chelliah', license: 'MCI-TN-10293' },
  MOL: { first: 'Venkatraman', last: 'Ramalingam', license: 'MCI-TN-20394' },
  GAS: { first: 'Murugan', last: 'Palaniswamy', license: 'MCI-TN-30491' },
  NDI: { first: 'Ganeshan', last: 'Pillai', license: 'MCI-TN-40592' },
  CCL: { first: 'Viswanathan', last: 'Chettiar', license: 'MCI-TN-50693' },
  PBR: { first: 'Rajendra', last: 'Prasad', license: 'MCI-TN-60794' },
  URO: { first: 'Madhavan', last: 'Nair', license: 'MCI-TN-70895' },
  OPH: { first: 'Kalyani', last: 'Sen', license: 'MCI-TN-80996' },
  ENT: { first: 'Sundararajan', last: 'Swamy', license: 'MCI-TN-91097' },
  END: { first: 'Padmanabhan', last: 'Rao', license: 'MCI-TN-12098' },
  RHE: { first: 'Vasudevan', last: 'Moorthy', license: 'MCI-TN-23099' },
  SPO: { first: 'Alagappan', last: 'Muthu', license: 'MCI-TN-34080' }
};

const seedAll = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Connected.');

    const passwordHash = await bcrypt.hash('Password123!', config.bcryptRounds || 10);

    // 1. Seed Roles & Permissions (Idempotent)
    console.log('Seeding Roles & Permissions...');
    const roleMap = {};
    const permMap = {};

    for (const perm of PERMISSION_DEFS) {
      const p = await Permission.findOneAndUpdate({ code: perm.code }, perm, { upsert: true, new: true });
      permMap[perm.code] = p;
    }

    for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
      const r = await Role.findOneAndUpdate({ name: roleName }, { name: roleName }, { upsert: true, new: true });
      roleMap[roleName] = r;

      const permCodes = ROLE_PERMISSIONS[roleName];
      // Sync permissions for this role
      await RolePermission.deleteMany({ roleId: r._id });
      for (const code of permCodes) {
        const p = permMap[code];
        if (p) {
          await RolePermission.create({ roleId: r._id, permissionId: p._id });
        }
      }
    }
    console.log('Roles and Permissions seeded.');

    // 2. Seed Departments (Idempotent)
    console.log('Seeding Departments...');
    const deptMap = {};
    for (const dDef of DEPT_DEFS) {
      const vitalFields = getVitalsForDept(dDef.code);
      const payload = {
        name: dDef.name,
        code: dDef.code,
        type: dDef.type,
        description: dDef.description,
        vitalFields
      };
      const dept = await Department.findOneAndUpdate(
        { code: dDef.code },
        { $set: payload },
        { upsert: true, new: true }
      );
      deptMap[dDef.code] = dept;
    }
    console.log('Departments seeded.');

    // 3. Seed Default System Staff Accounts (Backward compatibility)
    console.log('Seeding Core System Staff & Login Accounts...');
    const systemStaffDefs = [
      {
        employeeId: 'EMP-00001',
        fullName: 'System Administrator',
        firstName: 'Admin',
        lastName: 'User',
        roleName: 'Administrator',
        deptCode: 'ADM',
        position: 'Chief Executive Officer',
        positionRank: 9,
        username: 'admin',
        email: 'admin@hospital.local'
      },
      {
        employeeId: 'EMP-00002',
        fullName: 'Alice Receptionist',
        firstName: 'Alice',
        lastName: 'Receptionist',
        roleName: 'Reception',
        deptCode: 'ADM',
        position: 'Senior Receptionist',
        positionRank: 3,
        username: 'reception',
        email: 'reception@hospital.local'
      },
      {
        employeeId: 'EMP-00005',
        fullName: 'Meena Rajan',
        firstName: 'Meena',
        lastName: 'Rajan',
        roleName: 'Nurse',
        deptCode: 'GEN',
        position: 'Head Nurse',
        positionRank: 5,
        username: 'nurse',
        email: 'nurse@hospital.local',
        extra: { nursingLicenseNumber: 'LIC-NUR-11005', nursingSpecialization: 'Critical Care' }
      },
      {
        employeeId: 'EMP-00006',
        fullName: 'Vidya Shankar',
        firstName: 'Vidya',
        lastName: 'Shankar',
        roleName: 'Nurse',
        deptCode: 'CAR',
        position: 'Staff Nurse',
        positionRank: 3,
        username: 'cardio_nurse',
        email: 'vidya.nurse@hospital.local',
        extra: { nursingLicenseNumber: 'LIC-NUR-11006', nursingSpecialization: 'Cardiac Ward' }
      },
      {
        employeeId: 'EMP-00007',
        fullName: 'Karthik Sundaram',
        firstName: 'Karthik',
        lastName: 'Sundaram',
        roleName: 'Laboratory',
        deptCode: 'HEM',
        position: 'Senior Technologist',
        positionRank: 5,
        username: 'labtech',
        email: 'karthik.tech@hospital.local',
        extra: { labCertificationCode: 'CRT-LAB-007', labQualification: 'M.Sc Biochemistry' }
      },
      {
        employeeId: 'EMP-00008',
        fullName: 'Suresh Laboratory Tech',
        firstName: 'Suresh',
        lastName: 'LabTech',
        roleName: 'Laboratory',
        deptCode: 'HEM',
        position: 'Laboratory Technician',
        positionRank: 4,
        username: 'lab-tech',
        email: 'labtech@hospital.local',
        extra: { labCertificationCode: 'CRT-LAB-008', labQualification: 'DMLT / B.Sc MLT' }
      },
      {
        employeeId: 'EMP-00003',
        fullName: 'Dr. Ramesh Krishnan',
        firstName: 'Ramesh',
        lastName: 'Krishnan',
        roleName: 'Doctor',
        deptCode: 'GEN',
        position: 'Senior Consultant Physician',
        positionRank: 7,
        username: 'doctor',
        email: 'doctor@hospital.local',
        extra: {
          medicalLicenseNumber: 'MCI-TN-45211',
          medicalCouncil: 'Tamil Nadu Medical Council',
          consultingFee: 500,
          followUpFee: 250,
          primaryQualification: 'MBBS',
          highestQualification: 'MD (General Medicine)',
          primarySpecialization: 'General Medicine'
        }
      },
      {
        employeeId: 'EMP-00009',
        fullName: 'Phil Pharmacist',
        firstName: 'Phil',
        lastName: 'Pharmacist',
        roleName: 'Pharmacy',
        deptCode: 'PHM',
        position: 'Pharmacy Manager',
        positionRank: 5,
        username: 'pharmacy',
        email: 'pharmacy@hospital.local',
        extra: { pharmacyLicenseNumber: 'LIC-PHM-991', pharmacyQualification: 'B.Pharm' }
      }
    ];

    const staffMap = {};

    for (const sd of systemStaffDefs) {
      const payload = {
        employeeId: sd.employeeId,
        fullName: sd.fullName,
        firstName: sd.firstName,
        lastName: sd.lastName,
        departmentId: deptMap[sd.deptCode]._id,
        roleId: roleMap[sd.roleName]._id,
        position: sd.position,
        positionRank: sd.positionRank,
        status: 'Active',
        email: sd.email,
        phone: '+919876543210',
        gender: 'Male',
        dateOfBirth: new Date('1988-06-15'),
        joiningDate: new Date(),
        employmentType: 'Full-time',
        ...sd.extra
      };
      const staff = await Staff.findOneAndUpdate(
        { employeeId: sd.employeeId },
        { $set: payload },
        { upsert: true, new: true }
      );
      staffMap[sd.username] = staff;

      await Identity.findOneAndUpdate(
        { username: sd.username.toLowerCase() },
        {
          $set: {
            staffId: staff._id,
            username: sd.username.toLowerCase(),
            passwordHash,
            accountStatus: 'Active',
            firstLogin: false
          }
        },
        { upsert: true }
      );
    }

    // 4. Seed unique South Indian HOD Doctor and Staff for ALL 30 Departments
    console.log('Seeding unique Doctors (HODs) & Staff for all 30 departments...');
    for (const dDef of DEPT_DEFS) {
      const code = dDef.code;
      if (code === 'ADM' || code === 'PHM') continue;

      const hodDef = SOUTH_INDIAN_DOCS[code];
      const hodEmpId = `EMP-HOD-${code}`;
      const hodUsername = `hod_${code.toLowerCase()}`;

      // A. Seed Doctor HOD
      const hodPayload = {
        employeeId: hodEmpId,
        fullName: `Dr. ${hodDef.first} ${hodDef.last}`,
        firstName: hodDef.first,
        lastName: hodDef.last,
        departmentId: deptMap[code]._id,
        roleId: roleMap['Doctor']._id,
        position: 'Head of Department',
        positionRank: 7,
        status: 'Active',
        email: `hod.${code.toLowerCase()}@hospital.local`,
        phone: '+919988776655',
        gender: 'Male',
        dateOfBirth: new Date('1975-04-12'),
        joiningDate: new Date('2020-01-01'),
        employmentType: 'Full-time',
        medicalLicenseNumber: hodDef.license,
        medicalCouncil: 'Tamil Nadu Medical Council',
        consultingFee: code === 'CAR' ? 800 : 500,
        followUpFee: code === 'CAR' ? 400 : 250,
        primaryQualification: 'MBBS',
        highestQualification: 'MD / DM',
        primarySpecialization: dDef.name
      };

      const hodStaff = await Staff.findOneAndUpdate(
        { employeeId: hodEmpId },
        { $set: hodPayload },
        { upsert: true, new: true }
      );
      staffMap[hodUsername] = hodStaff;

      // Update Department HOD
      await Department.findByIdAndUpdate(deptMap[code]._id, { headOfDepartment: hodStaff._id });

      // Create identity for Doctor HOD
      await Identity.findOneAndUpdate(
        { username: hodUsername },
        {
          $set: {
            staffId: hodStaff._id,
            username: hodUsername,
            passwordHash,
            accountStatus: 'Active',
            firstLogin: false
          }
        },
        { upsert: true }
      );

      // B. Seed Department Staff based on type
      if (dDef.type === 'CLINICAL' || dDef.type === 'CLINICAL/DIAGNOSTIC') {
        // Seed a Nurse
        const nurseEmpId = `EMP-NUR-${code}`;
        const nurseUsername = `nurse_${code.toLowerCase()}`;
        const nursePayload = {
          employeeId: nurseEmpId,
          fullName: `Sister Revathi ${hodDef.last}`,
          firstName: 'Revathi',
          lastName: hodDef.last,
          departmentId: deptMap[code]._id,
          roleId: roleMap['Nurse']._id,
          position: 'Staff Nurse',
          positionRank: 4,
          status: 'Active',
          email: `nurse.${code.toLowerCase()}@hospital.local`,
          phone: '+919988774433',
          gender: 'Female',
          dateOfBirth: new Date('1990-08-20'),
          joiningDate: new Date(),
          employmentType: 'Full-time',
          nursingLicenseNumber: `LIC-NUR-${code}`,
          nursingSpecialization: `${dDef.name} Care`
        };

        const nurseStaff = await Staff.findOneAndUpdate(
          { employeeId: nurseEmpId },
          { $set: nursePayload },
          { upsert: true, new: true }
        );

        await Identity.findOneAndUpdate(
          { username: nurseUsername },
          {
            $set: {
              staffId: nurseStaff._id,
              username: nurseUsername,
              passwordHash,
              accountStatus: 'Active',
              firstLogin: false
            }
          },
          { upsert: true }
        );
      }

      if (dDef.type === 'DIAGNOSTIC' || dDef.type === 'CLINICAL/DIAGNOSTIC') {
        // Seed a Lab Technician
        const techEmpId = `EMP-TEC-${code}`;
        const techUsername = `tech_${code.toLowerCase()}`;
        const techPayload = {
          employeeId: techEmpId,
          fullName: `Selvam ${hodDef.last}`,
          firstName: 'Selvam',
          lastName: hodDef.last,
          departmentId: deptMap[code]._id,
          roleId: roleMap['Laboratory']._id,
          position: 'Laboratory Technician',
          positionRank: 4,
          status: 'Active',
          email: `tech.${code.toLowerCase()}@hospital.local`,
          phone: '+919988771122',
          gender: 'Male',
          dateOfBirth: new Date('1993-02-15'),
          joiningDate: new Date(),
          employmentType: 'Full-time',
          labCertificationCode: `CRT-LAB-${code}`,
          labQualification: 'B.Sc Medical Laboratory Technology'
        };

        const techStaff = await Staff.findOneAndUpdate(
          { employeeId: techEmpId },
          { $set: techPayload },
          { upsert: true, new: true }
        );

        await Identity.findOneAndUpdate(
          { username: techUsername },
          {
            $set: {
              staffId: techStaff._id,
              username: techUsername,
              passwordHash,
              accountStatus: 'Active',
              firstLogin: false
            }
          },
          { upsert: true }
        );
      }
    }
    console.log('All unique Doctors, HODs, Nurses, and Lab Techs seeded.');

    // 5. Seed 5 Laboratories & 10 Test Catalogs per Lab (Idempotent)
    console.log('Seeding 5 Laboratories & 10 Test Catalogs...');
    const labsDefs = [
      {
        name: 'Central Biochemistry Laboratory',
        description: 'Primary biochemistry testing center for biochemical, liver, kidney and mineral blood tests',
        deptCode: 'BIO',
        testCatalog: [
          {
            name: 'Fasting Blood Glucose',
            testCode: 'FBG',
            sampleType: 'Fluoride Plasma (2 mL)',
            resultFields: [
              { key: 'glucose', label: 'Glucose Fasting', type: 'Number', unit: 'mg/dL', reference: '70–100', required: true }
            ]
          },
          {
            name: 'HbA1c Glycated Haemoglobin',
            testCode: 'HBA1C',
            sampleType: 'EDTA Whole Blood (2 mL)',
            resultFields: [
              { key: 'hba1c', label: 'HbA1c Value', type: 'Number', unit: '%', reference: '4.0–5.6', required: true }
            ]
          },
          {
            name: 'Serum Creatinine',
            testCode: 'SCRE',
            sampleType: 'Serum (2 mL)',
            resultFields: [
              { key: 'creatinine', label: 'Serum Creatinine', type: 'Number', unit: 'mg/dL', reference: '0.6–1.2', required: true }
            ]
          },
          {
            name: 'Blood Urea Nitrogen',
            testCode: 'BUN',
            sampleType: 'Serum (2 mL)',
            resultFields: [
              { key: 'bun', label: 'Blood Urea Nitrogen', type: 'Number', unit: 'mg/dL', reference: '7–20', required: true }
            ]
          },
          {
            name: 'Serum Uric Acid',
            testCode: 'SUA',
            sampleType: 'Serum (2 mL)',
            resultFields: [
              { key: 'uric_acid', label: 'Uric Acid', type: 'Number', unit: 'mg/dL', reference: '3.5–7.2', required: true }
            ]
          },
          {
            name: 'Total Bilirubin',
            testCode: 'TBIL',
            sampleType: 'Serum (2 mL)',
            resultFields: [
              { key: 'bilirubin', label: 'Total Bilirubin', type: 'Number', unit: 'mg/dL', reference: '0.2–1.2', required: true }
            ]
          },
          {
            name: 'SGOT / AST',
            testCode: 'SGOT',
            sampleType: 'Serum (2 mL)',
            resultFields: [
              { key: 'sgot', label: 'SGOT (AST)', type: 'Number', unit: 'U/L', reference: '8–48', required: true }
            ]
          },
          {
            name: 'SGPT / ALT',
            testCode: 'SGPT',
            sampleType: 'Serum (2 mL)',
            resultFields: [
              { key: 'sgpt', label: 'SGPT (ALT)', type: 'Number', unit: 'U/L', reference: '7–56', required: true }
            ]
          },
          {
            name: 'Alkaline Phosphatase',
            testCode: 'ALP',
            sampleType: 'Serum (2 mL)',
            resultFields: [
              { key: 'alp', label: 'Alkaline Phosphatase', type: 'Number', unit: 'U/L', reference: '44–147', required: true }
            ]
          },
          {
            name: 'Total Protein',
            testCode: 'TPROT',
            sampleType: 'Serum (2 mL)',
            resultFields: [
              { key: 'protein', label: 'Total Protein', type: 'Number', unit: 'g/dL', reference: '6.0–8.3', required: true }
            ]
          }
        ]
      },
      {
        name: 'Clinical Pathology & Haematology Laboratory',
        description: 'Advanced hematological scans, cell counting, coagulation studies, and smears',
        deptCode: 'HEM',
        testCatalog: [
          {
            name: 'Hemoglobin',
            testCode: 'HB',
            sampleType: 'EDTA Whole Blood (2 mL)',
            resultFields: [
              { key: 'haemoglobin', label: 'Hemoglobin', type: 'Number', unit: 'g/dL', reference: '12.0–17.5', required: true }
            ]
          },
          {
            name: 'Packed Cell Volume',
            testCode: 'PCV',
            sampleType: 'EDTA Whole Blood (2 mL)',
            resultFields: [
              { key: 'pcv', label: 'Packed Cell Volume', type: 'Number', unit: '%', reference: '36–50', required: true }
            ]
          },
          {
            name: 'Total WBC Count',
            testCode: 'WBC',
            sampleType: 'EDTA Whole Blood (2 mL)',
            resultFields: [
              { key: 'wbc', label: 'Total WBC Count', type: 'Number', unit: 'cells/µL', reference: '4000–11000', required: true }
            ]
          },
          {
            name: 'Platelet Count',
            testCode: 'PLT',
            sampleType: 'EDTA Whole Blood (2 mL)',
            resultFields: [
              { key: 'platelets', label: 'Platelet Count', type: 'Number', unit: 'cells/µL', reference: '150000–450000', required: true }
            ]
          },
          {
            name: 'RBC Count',
            testCode: 'RBC',
            sampleType: 'EDTA Whole Blood (2 mL)',
            resultFields: [
              { key: 'rbc', label: 'RBC Count', type: 'Number', unit: 'million/µL', reference: '4.5–5.9', required: true }
            ]
          },
          {
            name: 'ESR (Erythrocyte Sedimentation Rate)',
            testCode: 'ESR',
            sampleType: 'Citrate Blood (3 mL)',
            resultFields: [
              { key: 'esr', label: 'ESR Value', type: 'Number', unit: 'mm/hr', reference: '0–15', required: true }
            ]
          },
          {
            name: 'Bleeding Time',
            testCode: 'BT',
            sampleType: 'Capillary Blood',
            resultFields: [
              { key: 'bt', label: 'Bleeding Time', type: 'Text', unit: 'min:sec', reference: '2:00–7:00', required: true }
            ]
          },
          {
            name: 'Clotting Time',
            testCode: 'CT',
            sampleType: 'Whole Blood',
            resultFields: [
              { key: 'ct', label: 'Clotting Time', type: 'Text', unit: 'min:sec', reference: '5:00–11:00', required: true }
            ]
          },
          {
            name: 'Peripheral Smear Study',
            testCode: 'PS',
            sampleType: 'Blood Smear slide',
            resultFields: [
              { key: 'ps_findings', label: 'Smear Findings', type: 'Text', unit: '', reference: 'Normal morphology', required: true }
            ]
          },
          {
            name: 'Reticulocyte Count',
            testCode: 'RETIC',
            sampleType: 'EDTA Whole Blood (2 mL)',
            resultFields: [
              { key: 'retic', label: 'Reticulocytes', type: 'Number', unit: '%', reference: '0.5–2.0', required: true }
            ]
          }
        ]
      },
      {
        name: 'Microbiology & Serology Laboratory',
        description: 'Fungal cultures, bacterial screens, serology diagnostics and antibody checks',
        deptCode: 'MIC',
        testCatalog: [
          {
            name: 'Urine Culture & Sensitivity',
            testCode: 'URC',
            sampleType: 'Midstream Urine (10 mL)',
            resultFields: [
              { key: 'growth', label: 'Bacterial Growth', type: 'Text', unit: '', reference: 'No growth after 48h', required: true }
            ]
          },
          {
            name: 'Blood Culture',
            testCode: 'BLC',
            sampleType: 'Whole Blood (5 mL)',
            resultFields: [
              { key: 'blood_growth', label: 'Blood Culture Findings', type: 'Text', unit: '', reference: 'No growth after 5 days', required: true }
            ]
          },
          {
            name: 'Sputum Culture',
            testCode: 'SPC',
            sampleType: 'Morning Sputum',
            resultFields: [
              { key: 'sputum_growth', label: 'Sputum Findings', type: 'Text', unit: '', reference: 'No pathogenic growth', required: true }
            ]
          },
          {
            name: 'Dengue NS1 Antigen',
            testCode: 'DENG',
            sampleType: 'Serum (2 mL)',
            resultFields: [
              { key: 'dengue_ns1', label: 'Dengue NS1 Antigen', type: 'Yes/No', unit: '', reference: 'Negative', required: true }
            ]
          },
          {
            name: 'Typhoid Widal Slide Test',
            testCode: 'WIDAL',
            sampleType: 'Serum (2 mL)',
            resultFields: [
              { key: 'widal_saty', label: 'Widal Agglutination', type: 'Text', unit: 'Titre', reference: 'Negative (<1:80)', required: true }
            ]
          },
          {
            name: 'HIV I & II Antibody',
            testCode: 'HIV',
            sampleType: 'Serum (2 mL)',
            resultFields: [
              { key: 'hiv_status', label: 'HIV Antibody Status', type: 'Text', unit: '', reference: 'Non-Reactive', required: true }
            ]
          },
          {
            name: 'HBsAg (Hepatitis B)',
            testCode: 'HBSAG',
            sampleType: 'Serum (2 mL)',
            resultFields: [
              { key: 'hbsag_status', label: 'HBsAg Status', type: 'Text', unit: '', reference: 'Non-Reactive', required: true }
            ]
          },
          {
            name: 'Rheumatoid Factor Quantitative',
            testCode: 'RF',
            sampleType: 'Serum (2 mL)',
            resultFields: [
              { key: 'rf_value', label: 'Rheumatoid Factor', type: 'Number', unit: 'IU/mL', reference: '<14', required: true }
            ]
          },
          {
            name: 'C-Reactive Protein',
            testCode: 'CRP',
            sampleType: 'Serum (2 mL)',
            resultFields: [
              { key: 'crp_value', label: 'CRP Value', type: 'Number', unit: 'mg/L', reference: '<5.0', required: true }
            ]
          },
          {
            name: 'VDRL / RPR Slide Test',
            testCode: 'VDRL',
            sampleType: 'Serum (2 mL)',
            resultFields: [
              { key: 'vdrl_status', label: 'Syphilis Screen', type: 'Text', unit: '', reference: 'Non-Reactive', required: true }
            ]
          }
        ]
      },
      {
        name: 'Pathology & Fluid Laboratory',
        description: 'Body fluid examinations, semen assays, PAP smears, and fine needle cytologies',
        deptCode: 'PAT',
        testCatalog: [
          {
            name: 'Urine Routine Examination',
            testCode: 'URIN',
            sampleType: 'Random Urine (15 mL)',
            resultFields: [
              { key: 'uro_color', label: 'Urine Color', type: 'Text', unit: '', reference: 'Pale Yellow', required: true },
              { key: 'uro_ph', label: 'Urine pH', type: 'Number', unit: '', reference: '4.5–8.0', required: true },
              { key: 'uro_protein', label: 'Urine Protein', type: 'Text', unit: '', reference: 'Nil', required: true }
            ]
          },
          {
            name: 'Stool Routine Examination',
            testCode: 'STOL',
            sampleType: 'Stool sample (5 g)',
            resultFields: [
              { key: 'stool_color', label: 'Stool Color', type: 'Text', unit: '', reference: 'Brown', required: true },
              { key: 'stool_parasites', label: 'Cysts & Parasites', type: 'Text', unit: '', reference: 'None Seen', required: true }
            ]
          },
          {
            name: 'Semen Analysis',
            testCode: 'SEMEN',
            sampleType: 'Semen specimen',
            resultFields: [
              { key: 'semen_count', label: 'Total Sperm Count', type: 'Number', unit: 'million/mL', reference: '>15', required: true },
              { key: 'semen_motility', label: 'Total Motility', type: 'Number', unit: '%', reference: '>40', required: true }
            ]
          },
          {
            name: 'Pap Smear Cytology',
            testCode: 'PAP',
            sampleType: 'Cervical smear slide',
            resultFields: [
              { key: 'pap_result', label: 'Smear Classification', type: 'Text', unit: '', reference: 'Negative for Malignancy', required: true }
            ]
          },
          {
            name: 'FNAC Cytopathology',
            testCode: 'FNAC',
            sampleType: 'Aspiration smear',
            resultFields: [
              { key: 'fnac_report', label: 'Aspiration Findings', type: 'Text', unit: '', reference: 'Diagnostic Report', required: true }
            ]
          },
          {
            name: 'Sputum for AFB Stain',
            testCode: 'AFB',
            sampleType: 'Sputum (3 mL)',
            resultFields: [
              { key: 'afb_status', label: 'Acid Fast Bacilli', type: 'Text', unit: '', reference: 'Negative for AFB', required: true }
            ]
          },
          {
            name: 'Prothrombin Time (PT/INR)',
            testCode: 'PTINR',
            sampleType: 'Sodium Citrate Plasma',
            resultFields: [
              { key: 'pt_seconds', label: 'PT (Seconds)', type: 'Number', unit: 'sec', reference: '11–13.5', required: true },
              { key: 'inr_ratio', label: 'INR Ratio', type: 'Number', unit: '', reference: '0.8–1.2', required: true }
            ]
          },
          {
            name: 'G6PD Enzyme Assay',
            testCode: 'G6PD',
            sampleType: 'EDTA Whole Blood (2 mL)',
            resultFields: [
              { key: 'g6pd_val', label: 'G6PD Activity', type: 'Number', unit: 'U/g Hb', reference: '4.6–13.5', required: true }
            ]
          },
          {
            name: 'Serum Electrolytes Panel',
            testCode: 'ELEC',
            sampleType: 'Serum (2 mL)',
            resultFields: [
              { key: 'sodium', label: 'Sodium (Na+)', type: 'Number', unit: 'mmol/L', reference: '135–145', required: true },
              { key: 'potassium', label: 'Potassium (K+)', type: 'Number', unit: 'mmol/L', reference: '3.5–5.0', required: true }
            ]
          },
          {
            name: 'Ascitic Fluid Cytology',
            testCode: 'FLUID',
            sampleType: 'Ascitic Fluid (10 mL)',
            resultFields: [
              { key: 'fluid_report', label: 'Cytology Description', type: 'Text', unit: '', reference: 'Diagnostic Report', required: true }
            ]
          }
        ]
      },
      {
        name: 'Advanced Medical Imaging & Radiology',
        description: 'Advanced scanning services, MRI scans, CT scans, ultrasounds and standard X-Rays',
        deptCode: 'RAD',
        testCatalog: [
          {
            name: 'Chest X-Ray PA View',
            testCode: 'XRAY',
            sampleType: 'None (Imaging scan)',
            resultFields: [
              { key: 'xray_report', label: 'Radiologist Findings', type: 'Text', unit: '', reference: 'Normal lung fields & cardiothoracic ratio', required: true }
            ]
          },
          {
            name: 'Ultrasound Abdomen & Pelvis',
            testCode: 'USG',
            sampleType: 'None (Imaging scan)',
            resultFields: [
              { key: 'usg_report', label: 'USG Findings', type: 'Text', unit: '', reference: 'Normal abdominal viscera study', required: true }
            ]
          },
          {
            name: 'CT Brain Plain',
            testCode: 'CT',
            sampleType: 'None (Imaging scan)',
            resultFields: [
              { key: 'ct_report', label: 'CT Scan Brain Findings', type: 'Text', unit: '', reference: 'Normal brain parenchyma study', required: true }
            ]
          },
          {
            name: 'MRI Lumbar Spine',
            testCode: 'MRI',
            sampleType: 'None (Imaging scan)',
            resultFields: [
              { key: 'mri_report', label: 'Spine MRI Description', type: 'Text', unit: '', reference: 'Normal vertebral alignment & disc heights', required: true }
            ]
          },
          {
            name: 'Mammography Bilateral',
            testCode: 'MAM',
            sampleType: 'None (Imaging scan)',
            resultFields: [
              { key: 'mam_report', label: 'Mammogram Findings', type: 'Text', unit: '', reference: 'BIRADS Category I (Normal)', required: true }
            ]
          },
          {
            name: 'Echocardiogram (2D Echo)',
            testCode: 'ECHO',
            sampleType: 'None (Imaging scan)',
            resultFields: [
              { key: 'echo_report', label: 'Echocardiography findings', type: 'Text', unit: '', reference: 'LVEF 55-60%, Normal study', required: true }
            ]
          },
          {
            name: 'DEXA Bone Densitometry',
            testCode: 'DEXA',
            sampleType: 'None (Imaging scan)',
            resultFields: [
              { key: 'dexa_report', label: 'DEXA Score', type: 'Number', unit: 'T-Score', reference: '> -1.0', required: true }
            ]
          },
          {
            name: 'Thyroid Ultrasound',
            testCode: 'THYUS',
            sampleType: 'None (Imaging scan)',
            resultFields: [
              { key: 'thy_usg_report', label: 'Thyroid USG findings', type: 'Text', unit: '', reference: 'Normal thyroid gland dimensions', required: true }
            ]
          },
          {
            name: 'Carotid Doppler Study',
            testCode: 'CAROT',
            sampleType: 'None (Imaging scan)',
            resultFields: [
              { key: 'doppler_report', label: 'Doppler Findings', type: 'Text', unit: '', reference: 'No significant carotid stenosis', required: true }
            ]
          },
          {
            name: 'Orthopantomogram (OPG)',
            testCode: 'OPG',
            sampleType: 'None (Imaging scan)',
            resultFields: [
              { key: 'opg_report', label: 'OPG Jaw Scan report', type: 'Text', unit: '', reference: 'Normal dentition study', required: true }
            ]
          }
        ]
      }
    ];

    for (const lDef of labsDefs) {
      const payload = {
        name: lDef.name,
        description: lDef.description,
        departmentId: deptMap[lDef.deptCode]._id,
        isActive: true,
        testCatalog: lDef.testCatalog
      };
      await Laboratory.findOneAndUpdate(
        { name: lDef.name },
        { $set: payload },
        { upsert: true, new: true }
      );

      // Appoint Laboratory staffs specifically for this lab's department
      const deptCode = lDef.deptCode;
      const positions = [
        { title: 'Laboratory Director', roleName: 'Laboratory', rank: 7, userSuffix: 'director', name: 'Dr. Helen Labhead', license: `LIC-DIR-${deptCode}` },
        { title: 'Senior Technologist', roleName: 'Laboratory', rank: 5, userSuffix: 'senior', name: 'Larry Labtech', license: `LIC-SR-${deptCode}` },
        { title: 'Lab Assistant', roleName: 'Laboratory', rank: 3, userSuffix: 'assistant', name: 'Appu Nair', license: `LIC-AST-${deptCode}` }
      ];

      for (const pos of positions) {
        const empId = `EMP-${deptCode}-${pos.userSuffix.toUpperCase()}`;
        const username = `lab_${deptCode.toLowerCase()}_${pos.userSuffix}`;
        const names = pos.name.split(' ');
        
        const staffPayload = {
          employeeId: empId,
          fullName: pos.name,
          firstName: names[0],
          lastName: names[1] || 'User',
          departmentId: deptMap[deptCode]._id,
          roleId: roleMap[pos.roleName]._id,
          position: pos.title,
          positionRank: pos.rank,
          status: 'Active',
          email: `${pos.userSuffix}.${deptCode.toLowerCase()}@hospital.local`,
          phone: '+919900887766',
          gender: 'Male',
          dateOfBirth: new Date('1985-05-15'),
          joiningDate: new Date(),
          employmentType: 'Full-time',
          labCertificationCode: pos.license,
          labQualification: 'M.Sc Biochemistry'
        };

        const labStaff = await Staff.findOneAndUpdate(
          { employeeId: empId },
          { $set: staffPayload },
          { upsert: true, new: true }
        );

        await Identity.findOneAndUpdate(
          { username: username },
          {
            $set: {
              staffId: labStaff._id,
              username: username,
              passwordHash,
              accountStatus: 'Active',
              firstLogin: false
            }
          },
          { upsert: true }
        );
      }
    }
    console.log('5 Laboratories with 10 test catalog items and appointed staffs seeded successfully.');

    // 6. Seed Patient Records (8 Patients with encrypted data - Idempotent)
    console.log('Seeding Patients...');
    const patientsData = [
      { mrn: 'MRN-100000', first: 'John', last: 'Doe', dob: '1990-01-15', gender: 'Male', allergies: 'Peanuts' },
      { mrn: 'MRN-100001', first: 'Jane', last: 'Smith', dob: '1985-05-23', gender: 'Female', allergies: 'Penicillin' },
      { mrn: 'MRN-100002', first: 'Robert', last: 'Johnson', dob: '1975-11-04', gender: 'Male', allergies: 'None' },
      { mrn: 'MRN-100003', first: 'Emily', last: 'Williams', dob: '1998-08-30', gender: 'Female', allergies: 'Sulfonamides' },
      { mrn: 'MRN-100004', first: 'Michael', last: 'Brown', dob: '1962-03-12', gender: 'Male', allergies: 'Dust' },
      { mrn: 'MRN-100005', first: 'Sarah', last: 'Davis', dob: '1989-12-25', gender: 'Female', allergies: 'None' },
      { mrn: 'MRN-100006', first: 'David', last: 'Miller', dob: '1970-07-18', gender: 'Male', allergies: 'Shellfish' },
      { mrn: 'MRN-100007', first: 'Jessica', last: 'Wilson', dob: '1993-09-09', gender: 'Female', allergies: 'Aspirin' }
    ];

    const patientDocs = [];
    for (let i = 0; i < patientsData.length; i++) {
      const p = patientsData[i];
      const payload = {
        firstName: p.first,
        lastName: p.last,
        dob: new Date(p.dob),
        gender: p.gender,
        mrn: p.mrn,
        phone: encryptDeterministic(`+91999999900${i}`),
        email: encryptDeterministic(`${p.first.toLowerCase()}@example.com`),
        allergies: encryptRandom(p.allergies),
        operations: encryptRandom('None'),
        chronicConditions: []
      };
      const doc = await Patient.findOneAndUpdate(
        { mrn: p.mrn },
        { $set: payload },
        { upsert: true, new: true }
      );
      patientDocs.push(doc);
    }
    console.log('Patients seeded.');

    // 7. Seed Visit Records across OPD lifecycle stages (Idempotent check)
    console.log('Seeding Visits across OPD stages...');
    const visitCount = await Visit.countDocuments({});
    if (visitCount === 0) {
      const createBaseVisit = (patient, dept, tokenIndex, status) => {
        const tokenSerial = 100 + tokenIndex;
        return {
          visitNumber: `VST-${Date.now()}-${1000 + tokenIndex}`,
          tokenString: `${dept.code}-${tokenSerial}`,
          tokenSerial,
          patientId: patient._id,
          visitType: 'OPD',
          reasonForVisit: 'General checkup',
          departmentId: dept._id,
          status,
          registeredBy: staffMap.reception._id,
          receptionPayment: {
            registrationFee: 100,
            consultationFee: dept.code === 'CAR' ? 800 : 500,
            paymentMethod: 'UPI'
          }
        };
      };

      // Waiting Triage
      await Visit.create(createBaseVisit(patientDocs[0], deptMap.GEN, 1, 'WAITING_TRIAGE'));
      await Visit.create(createBaseVisit(patientDocs[1], deptMap.CAR, 2, 'WAITING_TRIAGE'));

      // Waiting Doctor
      await Visit.create({
        ...createBaseVisit(patientDocs[2], deptMap.GEN, 3, 'WAITING_DOCTOR'),
        vitals: {
          height: 178,
          weight: 76,
          bloodPressure: '120/80',
          temperature: 98.6,
          pulse: 72,
          oxygenSaturation: 99,
          chiefComplaint: 'Migraine and light sensitivity',
          recordedBy: staffMap.nurse._id,
          recordedAt: new Date()
        }
      });

      // In Progress
      await Visit.create({
        ...createBaseVisit(patientDocs[3], deptMap.CAR, 4, 'IN_PROGRESS'),
        calledAt: new Date(),
        vitals: {
          height: 165,
          weight: 58,
          bloodPressure: '115/75',
          temperature: 98.4,
          pulse: 82,
          oxygenSaturation: 98,
          chiefComplaint: 'Chest tightness during cardio exercises',
          recordedBy: staffMap.cardio_nurse._id,
          recordedAt: new Date()
        },
        consultation: {
          doctorId: staffMap.cardio_doc._id,
          chiefComplaint: 'Chest tightness during cardio exercises',
          historyOfPresentIllness: 'Symptoms started 3 weeks ago.',
          status: 'DRAFT',
          recordedAt: new Date()
        }
      });
      console.log('Opd active visits seeded.');
    } else {
      console.log('Active visits already exist, skipping visit generation to prevent E2E collision.');
    }

    console.log('Consolidated Seeding process completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding process failed:', err);
    process.exit(1);
  }
};

seedAll();
