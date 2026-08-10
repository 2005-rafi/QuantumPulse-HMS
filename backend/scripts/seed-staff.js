/**
 * STAFF SEED SCRIPT
 * Seeds one staff member for every position in each role with full optional details.
 * 
 * Usage: node scripts/seed-staff.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../src/core/config');
const { ROLES, PERMISSIONS, ROLE_PERMISSIONS, DEPARTMENTS, ACCOUNT_STATUS, STAFF_STATUS } = require('../src/core/constants');

// Load models
const Department = require('../src/modules/administration/department.model');
const Role = require('../src/modules/administration/role.model');
const Permission = require('../src/modules/administration/permission.model');
const RolePermission = require('../src/modules/administration/rolePermission.model');
const Staff = require('../src/modules/staff/staff.model');
const Identity = require('../src/modules/identity/identity.model');

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
];

// Helper to generate a random 10-digit phone
const randPhone = (base) => `+91${base}${Math.floor(10000000 + Math.random() * 90000000)}`;

async function seedStaff() {
  if (config.env === 'production') {
    console.error('ERROR: Seed script is disabled in production.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongoUri);
  console.log('Connected.');

  // 1. Seed All Departments
  console.log('\n[1/5] Seeding all departments...');
  const deptMap = {};
  for (const dept of DEPARTMENTS) {
    const d = await Department.findOneAndUpdate({ name: dept.name }, dept, { upsert: true, new: true });
    deptMap[dept.code] = d;
  }
  console.log('Departments populated.');

  // 2. Seed All Roles
  console.log('[2/5] Seeding roles...');
  const roleMap = {};
  for (const roleName of Object.values(ROLES)) {
    const role = await Role.findOneAndUpdate({ name: roleName }, { name: roleName }, { upsert: true, new: true });
    roleMap[roleName] = role;
  }
  console.log('Roles populated.');

  // 3. Seed Permissions
  console.log('[3/5] Seeding permissions...');
  const permMap = {};
  for (const perm of PERMISSION_DEFS) {
    const p = await Permission.findOneAndUpdate({ code: perm.code }, perm, { upsert: true, new: true });
    permMap[perm.code] = p;
  }
  console.log('Permissions populated.');

  // 4. Assign permissions to roles
  console.log('[4/5] Assigning role permissions...');
  for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = roleMap[roleName];
    if (!role) continue;
    for (const code of permCodes) {
      const perm = permMap[code];
      if (!perm) continue;
      await RolePermission.findOneAndUpdate(
        { roleId: role._id, permissionId: perm._id },
        { roleId: role._id, permissionId: perm._id },
        { upsert: true }
      );
    }
  }
  console.log('Role permissions assigned.');

  // 5. Seed Staff Members & Identities
  console.log('[5/5] Seeding staff members & login accounts...');

  const passwordHash = await bcrypt.hash('Temp@123', config.bcryptRounds);
  let empCounter = 2; // EMP-00001 is CEO/Admin

  const staffSeeds = [
    // --- DOCTORS ---
    {
      username: 'doctor_cmo',
      role: ROLES.DOCTOR,
      position: 'Chief Medical Officer',
      rank: 9,
      deptCode: 'GEN',
      firstName: 'Swaminathan',
      lastName: 'Iyer',
      gender: 'Male',
      dob: '1970-04-12',
      license: 'LIC-DOC-CMO-001',
      spec: 'General Medicine',
      fee: 1000
    },
    {
      username: 'doctor_ms',
      role: ROLES.DOCTOR,
      position: 'Medical Superintendent',
      rank: 8,
      deptCode: 'NEURO',
      firstName: 'Ramakrishnan',
      lastName: 'Swamy',
      gender: 'Male',
      dob: '1975-08-22',
      license: 'LIC-DOC-MS-001',
      spec: 'Neurology',
      fee: 900
    },
    {
      username: 'doctor_hod',
      role: ROLES.DOCTOR,
      position: 'Head of Department',
      rank: 7,
      deptCode: 'ORTH',
      firstName: 'Anjali',
      lastName: 'Krishnan',
      gender: 'Female',
      dob: '1981-11-05',
      license: 'LIC-DOC-HOD-001',
      spec: 'Orthopedics',
      fee: 800
    },
    {
      username: 'doctor-CARD-01',
      role: ROLES.DOCTOR,
      position: 'Senior Consultant',
      rank: 6,
      deptCode: 'CARD',
      firstName: 'Rajesh',
      lastName: 'Kannan',
      gender: 'Male',
      dob: '1980-05-15',
      license: 'LIC-DOC-CARD-001',
      spec: 'Cardiology',
      fee: 800
    },
    {
      username: 'doctor_con',
      role: ROLES.DOCTOR,
      position: 'Consultant',
      rank: 5,
      deptCode: 'NEURO',
      firstName: 'Shalini',
      lastName: 'Menon',
      gender: 'Female',
      dob: '1985-02-18',
      license: 'LIC-DOC-CON-001',
      spec: 'Neurology',
      fee: 700
    },
    {
      username: 'doctor_assoc',
      role: ROLES.DOCTOR,
      position: 'Associate Consultant',
      rank: 4,
      deptCode: 'CARD',
      firstName: 'Vikram',
      lastName: 'Dev',
      gender: 'Male',
      dob: '1988-06-25',
      license: 'LIC-DOC-ASC-001',
      spec: 'Cardiology',
      fee: 650
    },
    {
      username: 'doctor_jr',
      role: ROLES.DOCTOR,
      position: 'Junior Consultant',
      rank: 3,
      deptCode: 'ORTH',
      firstName: 'Adarsh',
      lastName: 'Nair',
      gender: 'Male',
      dob: '1990-09-30',
      license: 'LIC-DOC-JRC-001',
      spec: 'Orthopedics',
      fee: 500
    },
    {
      username: 'doctor_res',
      role: ROLES.DOCTOR,
      position: 'Resident Doctor',
      rank: 2,
      deptCode: 'GEN',
      firstName: 'Harish',
      lastName: 'Prasad',
      gender: 'Male',
      dob: '1992-12-05',
      license: 'LIC-DOC-RES-001',
      spec: 'General Medicine',
      fee: 400
    },
    {
      username: 'doctor_int',
      role: ROLES.DOCTOR,
      position: 'Intern',
      rank: 1,
      deptCode: 'CARD',
      firstName: 'Pooja',
      lastName: 'Ravindran',
      gender: 'Female',
      dob: '1998-03-14',
      license: 'LIC-DOC-INT-001',
      spec: 'General Medicine',
      fee: 200
    },

    // --- NURSES ---
    {
      username: 'nurse_cno',
      role: ROLES.NURSE,
      position: 'Chief Nursing Officer',
      rank: 8,
      deptCode: 'GEN',
      firstName: 'Mary',
      lastName: 'Mathew',
      gender: 'Female',
      dob: '1972-07-15',
      license: 'LIC-NUR-CNO-001',
      spec: 'Nursing Administration'
    },
    {
      username: 'nurse_ns',
      role: ROLES.NURSE,
      position: 'Nursing Superintendent',
      rank: 7,
      deptCode: 'CARD',
      firstName: 'Saradha',
      lastName: 'Devi',
      gender: 'Female',
      dob: '1976-10-10',
      license: 'LIC-NUR-SUP-001',
      spec: 'Critical Care'
    },
    {
      username: 'nurse_dns',
      role: ROLES.NURSE,
      position: 'Deputy Nursing Superintendent',
      rank: 6,
      deptCode: 'NEURO',
      firstName: 'Elizabeth',
      lastName: 'Joseph',
      gender: 'Female',
      dob: '1980-04-05',
      license: 'LIC-NUR-DNS-001',
      spec: 'Neurology Nursing'
    },
    {
      username: 'nurse01',
      role: ROLES.NURSE,
      position: 'Head Nurse',
      rank: 5,
      deptCode: 'CARD',
      firstName: 'Priya',
      lastName: 'Subramanian',
      gender: 'Female',
      dob: '1984-01-20',
      license: 'LIC-NUR-HN-001',
      spec: 'Cardiac Care'
    },
    {
      username: 'nurse_sr',
      role: ROLES.NURSE,
      position: 'Senior Staff Nurse',
      rank: 4,
      deptCode: 'NEURO',
      firstName: 'Lakshmi',
      lastName: 'Nair',
      gender: 'Female',
      dob: '1988-08-14',
      license: 'LIC-NUR-SSN-001',
      spec: 'OT Nursing'
    },
    {
      username: 'nurse_staff',
      role: ROLES.NURSE,
      position: 'Staff Nurse',
      rank: 3,
      deptCode: 'ORTH',
      firstName: 'Divya',
      lastName: 'Saji',
      gender: 'Female',
      dob: '1992-05-25',
      license: 'LIC-NUR-SN-001',
      spec: 'General Ward'
    },
    {
      username: 'nurse_jr',
      role: ROLES.NURSE,
      position: 'Junior Nurse',
      rank: 2,
      deptCode: 'GEN',
      firstName: 'Anjali',
      lastName: 'Gopal',
      gender: 'Female',
      dob: '1995-09-12',
      license: 'LIC-NUR-JN-001',
      spec: 'OPD Ward'
    },
    {
      username: 'nurse_asst',
      role: ROLES.NURSE,
      position: 'Nursing Assistant',
      rank: 1,
      deptCode: 'GEN',
      firstName: 'Manoj',
      lastName: 'Kumar',
      gender: 'Male',
      dob: '1991-03-30',
      license: 'LIC-NUR-NA-001',
      spec: 'Triage Assistance'
    },

    // --- LABORATORY ---
    {
      username: 'lab_dir',
      role: ROLES.LABORATORY,
      position: 'Laboratory Director',
      rank: 7,
      deptCode: 'HAEM',
      firstName: 'Madhavan',
      lastName: 'Pillai',
      gender: 'Male',
      dob: '1968-12-15',
      license: 'CERT-LAB-DIR-001',
      spec: 'Pathology & Haematology'
    },
    {
      username: 'lab_mgr',
      role: ROLES.LABORATORY,
      position: 'Laboratory Manager',
      rank: 6,
      deptCode: 'BCHEM',
      firstName: 'Srinivasan',
      lastName: 'Raj',
      gender: 'Male',
      dob: '1974-06-18',
      license: 'CERT-LAB-MGR-001',
      spec: 'Clinical Biochemistry'
    },
    {
      username: 'lab_sup',
      role: ROLES.LABORATORY,
      position: 'Laboratory Supervisor',
      rank: 5,
      deptCode: 'MICRO',
      firstName: 'Gokul',
      lastName: 'Nath',
      gender: 'Male',
      dob: '1979-09-10',
      license: 'CERT-LAB-SUP-001',
      spec: 'Microbiology Operations'
    },
    {
      username: 'lab-tech01',
      role: ROLES.LABORATORY,
      position: 'Senior Technologist',
      rank: 4,
      deptCode: 'HAEM',
      firstName: 'Sudheer',
      lastName: 'Kumar',
      gender: 'Male',
      dob: '1982-11-20',
      license: 'CERT-LAB-ST-001',
      spec: 'Sample Extraction'
    },
    {
      username: 'lab_tech',
      role: ROLES.LABORATORY,
      position: 'Lab Technologist',
      rank: 3,
      deptCode: 'BCHEM',
      firstName: 'Reshma',
      lastName: 'Rajendran',
      gender: 'Female',
      dob: '1987-03-24',
      license: 'CERT-LAB-LT-001',
      spec: 'Automated Assays'
    },
    {
      username: 'lab_tchn',
      role: ROLES.LABORATORY,
      position: 'Lab Technician',
      rank: 2,
      deptCode: 'MICRO',
      firstName: 'Arun',
      lastName: 'Lal',
      gender: 'Male',
      dob: '1991-08-31',
      license: 'CERT-LAB-TECH-001',
      spec: 'Culture Plate Preparation'
    },
    {
      username: 'lab_asst',
      role: ROLES.LABORATORY,
      position: 'Lab Assistant',
      rank: 1,
      deptCode: 'RAD',
      firstName: 'Kavitha',
      lastName: 'Suresh',
      gender: 'Female',
      dob: '1994-05-12',
      license: 'CERT-LAB-ASST-001',
      spec: 'Lab Sanitation & Intake'
    },

    // --- PHARMACY ---
    {
      username: 'pharmacy01',
      role: ROLES.PHARMACY,
      position: 'Chief Pharmacist',
      rank: 6,
      deptCode: 'PHARM',
      firstName: 'Ramesh',
      lastName: 'Balakrishnan',
      gender: 'Male',
      dob: '1977-02-15',
      license: 'LIC-PHM-CP-001',
      spec: 'M.Pharm'
    },
    {
      username: 'pharm_mgr',
      role: ROLES.PHARMACY,
      position: 'Pharmacy Manager',
      rank: 5,
      deptCode: 'PHARM',
      firstName: 'Suresh',
      lastName: 'Nair',
      gender: 'Male',
      dob: '1980-05-18',
      license: 'LIC-PHM-MGR-001',
      spec: 'B.Pharm'
    },
    {
      username: 'pharm_sr',
      role: ROLES.PHARMACY,
      position: 'Senior Pharmacist',
      rank: 4,
      deptCode: 'PHARM',
      firstName: 'Deepa',
      lastName: 'Krishnan',
      gender: 'Female',
      dob: '1984-07-22',
      license: 'LIC-PHM-SR-001',
      spec: 'B.Pharm'
    },
    {
      username: 'pharm_phm',
      role: ROLES.PHARMACY,
      position: 'Pharmacist',
      rank: 3,
      deptCode: 'PHARM',
      firstName: 'Harish',
      lastName: 'Kumar',
      gender: 'Male',
      dob: '1989-10-30',
      license: 'LIC-PHM-PH-001',
      spec: 'D.Pharm'
    },
    {
      username: 'pharm_tech',
      role: ROLES.PHARMACY,
      position: 'Pharmacy Technician',
      rank: 2,
      deptCode: 'PHARM',
      firstName: 'Vipin',
      lastName: 'Chandran',
      gender: 'Male',
      dob: '1992-04-12',
      license: 'LIC-PHM-PT-001',
      spec: 'D.Pharm'
    },
    {
      username: 'pharm_asst',
      role: ROLES.PHARMACY,
      position: 'Pharmacy Assistant',
      rank: 1,
      deptCode: 'PHARM',
      firstName: 'Athira',
      lastName: 'Nair',
      gender: 'Female',
      dob: '1995-12-05',
      license: 'LIC-PHM-PA-001',
      spec: 'Retail Help'
    },

    // --- RECEPTION ---
    {
      username: 'reception_fom',
      role: ROLES.RECEPTION,
      position: 'Front Office Manager',
      rank: 5,
      deptCode: 'RECEP',
      firstName: 'Meera',
      lastName: 'Sreedhar',
      gender: 'Female',
      dob: '1981-08-15',
      spec: 'Customer Relations'
    },
    {
      username: 'reception_sup',
      role: ROLES.RECEPTION,
      position: 'Reception Supervisor',
      rank: 4,
      deptCode: 'RECEP',
      firstName: 'Sandhya',
      lastName: 'Raman',
      gender: 'Female',
      dob: '1985-05-12',
      spec: 'Shift Operations'
    },
    {
      username: 'reception_sr',
      role: ROLES.RECEPTION,
      position: 'Senior Receptionist',
      rank: 3,
      deptCode: 'RECEP',
      firstName: 'Keerthi',
      lastName: 'Nair',
      gender: 'Female',
      dob: '1988-11-20',
      spec: 'Corporate Accounts'
    },
    {
      username: 'reception01',
      role: ROLES.RECEPTION,
      position: 'Receptionist',
      rank: 2,
      deptCode: 'RECEP',
      firstName: 'Swathy',
      lastName: 'Kumar',
      gender: 'Female',
      dob: '1993-02-14',
      spec: 'General Front Office'
    },
    {
      username: 'reception_fda',
      role: ROLES.RECEPTION,
      position: 'Front Desk Assistant',
      rank: 1,
      deptCode: 'RECEP',
      firstName: 'Akhil',
      lastName: 'Dev',
      gender: 'Male',
      dob: '1996-06-30',
      spec: 'Queue Management'
    },

    // --- ADMINISTRATORS ---
    {
      username: 'admin_dir',
      role: ROLES.ADMINISTRATOR,
      position: 'Administrative Director',
      rank: 3,
      deptCode: 'ADMIN',
      firstName: 'Vinod',
      lastName: 'Nair',
      gender: 'Male',
      dob: '1973-10-15',
      spec: 'Operations management'
    },
    {
      username: 'admin_off',
      role: ROLES.ADMINISTRATOR,
      position: 'Admin Officer',
      rank: 2,
      deptCode: 'ADMIN',
      firstName: 'Sreejith',
      lastName: 'K',
      gender: 'Male',
      dob: '1979-05-14',
      spec: 'Procurement'
    },
    {
      username: 'admin_asst',
      role: ROLES.ADMINISTRATOR,
      position: 'Admin Assistant',
      rank: 1,
      deptCode: 'ADMIN',
      firstName: 'Neethu',
      lastName: 'P',
      gender: 'Female',
      dob: '1992-01-30',
      spec: 'IT Support'
    }
  ];

  for (const s of staffSeeds) {
    const dept = deptMap[s.deptCode];
    const role = roleMap[s.role];

    if (!dept) {
      console.warn(`WARNING: Department code "${s.deptCode}" not found for staff seed: ${s.firstName}. Skipping...`);
      continue;
    }
    if (!role) {
      console.warn(`WARNING: Role "${s.role}" not found for staff seed: ${s.firstName}. Skipping...`);
      continue;
    }

    const employeeId = `EMP-${String(empCounter).padStart(5, '0')}`;
    empCounter++;

    let staffDoc = await Staff.findOne({ employeeId });
    if (!staffDoc) {
      // Build dynamic role specific fields
      const roleFields = {};
      if (s.role === ROLES.DOCTOR) {
        roleFields.medicalLicenseNumber = s.license;
        roleFields.medicalCouncil = 'Medical Council of India';
        roleFields.licenseRegistrationDate = new Date('2015-01-01');
        roleFields.licenseExpiryDate = new Date('2035-01-01');
        roleFields.primaryQualification = 'MBBS';
        roleFields.highestQualification = s.position.includes('Intern') ? 'MBBS' : 'MD';
        roleFields.primarySpecialization = s.spec;
        roleFields.consultationType = 'Both';
        roleFields.consultingFee = s.fee;
        roleFields.followUpFee = s.fee / 2;
        roleFields.languagesKnown = ['English', 'Tamil', 'Malayalam'];
      } else if (s.role === ROLES.NURSE) {
        roleFields.nursingLicenseNumber = s.license;
        roleFields.nursingSpecialization = s.spec;
      } else if (s.role === ROLES.LABORATORY) {
        roleFields.labCertificationCode = s.license;
        roleFields.labQualification = s.spec;
      } else if (s.role === ROLES.PHARMACY) {
        roleFields.pharmacyLicenseNumber = s.license;
        roleFields.pharmacyQualification = s.spec;
      }

      staffDoc = await Staff.create({
        employeeId,
        fullName: `${s.firstName} ${s.lastName}`,
        firstName: s.firstName,
        lastName: s.lastName,
        departmentId: dept._id,
        roleId: role._id,
        position: s.position,
        positionRank: s.rank,
        status: STAFF_STATUS.ACTIVE,
        gender: s.gender,
        dateOfBirth: new Date(s.dob),
        bloodGroup: 'O+',
        maritalStatus: 'Married',
        nationality: 'Indian',
        phone: randPhone('9'),
        alternatePhone: randPhone('8'),
        email: `${s.username}@hospital.local`,
        addressLine1: 'Building 14, Phase 2',
        addressLine2: 'Metro Residency',
        area: 'Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        postalCode: '560038',
        emergencyContactName: 'Family Member',
        emergencyContactNumber: randPhone('7'),
        employmentType: 'Full-time',
        joiningDate: new Date('2024-01-01'),
        shift: 'Morning',
        yearsOfExperience: 10,
        ...roleFields
      });
      console.log(`Staff created: ${staffDoc.fullName} (${employeeId})`);
    }

    const identityDoc = await Identity.findOne({ staffId: staffDoc._id });
    if (!identityDoc) {
      await Identity.create({
        staffId: staffDoc._id,
        username: s.username,
        passwordHash,
        accountStatus: ACCOUNT_STATUS.ACTIVE
      });
      console.log(`Identity created: username: "${s.username}" / password: "Temp@123"`);
    }
  }

  console.log('\nAll positions successfully seeded!');
  await mongoose.disconnect();
  process.exit(0);
}

seedStaff().catch((err) => {
  console.error('Staff Seeding failed:', err);
  process.exit(1);
});
