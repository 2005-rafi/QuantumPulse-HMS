/**
 * CONSOLIDATED COMPLETE HMS SEED SCRIPT
 * Seeds all departments, roles, permissions, staff configurations (with HODs),
 * laboratories, test catalogs, and patients in 5 key states of the OPD workflow.
 *
 * Passwords for all accounts: Password123!
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
];

const ROLE_PERMISSIONS = {
  'Administrator': PERMISSION_DEFS.map(p => p.code),
  'Reception': ['PATIENT_REGISTER', 'PATIENT_UPDATE', 'PATIENT_VIEW', 'VISIT_CREATE', 'VISIT_VIEW', 'BILL_GENERATE', 'PAYMENT_RECORD'],
  'Nurse': ['PATIENT_VIEW', 'VISIT_VIEW', 'VITALS_RECORD', 'NOTE_OPEN'],
  'Doctor': ['PATIENT_VIEW', 'VISIT_VIEW', 'NOTE_OPEN', 'NOTE_UPDATE', 'NOTE_FINALIZE', 'NOTE_AMEND', 'RX_CREATE', 'RX_CANCEL', 'LAB_ORDER_CREATE'],
  'Laboratory': ['PATIENT_VIEW', 'VISIT_VIEW', 'LAB_PROCESS', 'LAB_VERIFY'],
  'Pharmacy': ['PATIENT_VIEW', 'VISIT_VIEW', 'MEDICINE_DISPENSE', 'BILL_GENERATE', 'PAYMENT_RECORD', 'VISIT_CLOSE']
};

const seedAll = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Connected.');

    // --- CLEAR COLLECTIONS ---
    console.log('Clearing old system collections...');
    await Promise.all([
      Department.deleteMany({}),
      Staff.deleteMany({}),
      Identity.deleteMany({}),
      Role.deleteMany({}),
      Permission.deleteMany({}),
      RolePermission.deleteMany({}),
      Laboratory.deleteMany({}),
      Patient.deleteMany({}),
      Visit.deleteMany({})
    ]);
    console.log('Collections cleared.');

    const passwordHash = await bcrypt.hash('Password123!', config.bcryptRounds || 10);

    // 1. Seed Roles & Permissions
    console.log('Seeding Roles & Permissions...');
    const roleMap = {};
    const permMap = {};

    for (const perm of PERMISSION_DEFS) {
      const p = await Permission.create(perm);
      permMap[perm.code] = p;
    }

    for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
      const r = await Role.create({ name: roleName });
      roleMap[roleName] = r;

      const permCodes = ROLE_PERMISSIONS[roleName];
      for (const code of permCodes) {
        const p = permMap[code];
        if (p) {
          await RolePermission.create({ roleId: r._id, permissionId: p._id });
        }
      }
    }
    console.log('Roles and Permissions seeded.');

    // 2. Seed Departments
    console.log('Seeding Departments...');
    const depts = {
      ADM: await Department.create({
        name: 'Administration',
        code: 'ADM',
        type: 'ADMINISTRATIVE',
        description: 'Hospital operations and administration'
      }),
      GEN: await Department.create({
        name: 'General Medicine',
        code: 'GEN',
        type: 'CLINICAL',
        description: 'Primary clinical diagnostic and treatment ward',
        vitalFields: [
          { name: 'bp', label: 'Blood Pressure', type: 'text', unit: 'mmHg', required: true },
          { name: 'pulse', label: 'Pulse Rate', type: 'number', unit: 'bpm', required: true },
          { name: 'temp', label: 'Body Temperature', type: 'number', unit: 'F', required: false }
        ]
      }),
      CAR: await Department.create({
        name: 'Cardiology',
        code: 'CAR',
        type: 'CLINICAL',
        description: 'Heart and vascular clinical department',
        vitalFields: [
          { name: 'bp', label: 'Blood Pressure', type: 'text', unit: 'mmHg', required: true },
          { name: 'pulse', label: 'Pulse Rate', type: 'number', unit: 'bpm', required: true },
          { name: 'spo2', label: 'Oxygen Saturation', type: 'number', unit: '%', required: true },
          { name: 'ecg_rhythm', label: 'ECG Lead II Rhythm', type: 'text', unit: '', required: false }
        ]
      }),
      LAB: await Department.create({
        name: 'Hematology & Pathology',
        code: 'LAB',
        type: 'DIAGNOSTIC',
        description: 'Laboratory diagnostic unit'
      }),
      PHM: await Department.create({
        name: 'Pharmacy',
        code: 'PHM',
        type: 'SUPPORT',
        description: 'Hospital dispensary and billing gateway'
      })
    };
    console.log('Departments seeded.');

    // 3. Seed Staff and User Accounts (Identities)
    console.log('Seeding Staff & Login Accounts...');
    const staffDefs = [
      {
        employeeId: 'EMP-00001',
        fullName: 'System Administrator',
        firstName: 'Admin',
        lastName: 'User',
        roleName: 'Administrator',
        deptCode: 'ADM',
        position: 'Chief Executive Officer',
        positionRank: 4,
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
        employeeId: 'EMP-00003',
        fullName: 'Dr. John General',
        firstName: 'John',
        lastName: 'General',
        roleName: 'Doctor',
        deptCode: 'GEN',
        position: 'Head of Department',
        positionRank: 7,
        username: 'doctor',
        email: 'doctor@hospital.local',
        extra: {
          medicalLicenseNumber: 'LIC-MED-77119',
          consultingFee: 500
        }
      },
      {
        employeeId: 'EMP-00004',
        fullName: 'Dr. Sarah Heart',
        firstName: 'Sarah',
        lastName: 'Heart',
        roleName: 'Doctor',
        deptCode: 'CAR',
        position: 'Senior Consultant',
        positionRank: 6,
        username: 'cardio_doc',
        email: 'sarah.doc@hospital.local',
        extra: {
          medicalLicenseNumber: 'LIC-CAR-99120',
          consultingFee: 800
        }
      },
      {
        employeeId: 'EMP-00005',
        fullName: 'Nancy Nurse',
        firstName: 'Nancy',
        lastName: 'Nurse',
        roleName: 'Nurse',
        deptCode: 'GEN',
        position: 'Head Nurse',
        positionRank: 5,
        username: 'nurse',
        email: 'nurse@hospital.local'
      },
      {
        employeeId: 'EMP-00006',
        fullName: 'Bob Cardioward',
        firstName: 'Bob',
        lastName: 'Cardioward',
        roleName: 'Nurse',
        deptCode: 'CAR',
        position: 'Staff Nurse',
        positionRank: 3,
        username: 'cardio_nurse',
        email: 'bob.nurse@hospital.local'
      },
      {
        employeeId: 'EMP-00007',
        fullName: 'Larry Labtech',
        firstName: 'Larry',
        lastName: 'Labtech',
        roleName: 'Laboratory',
        deptCode: 'LAB',
        position: 'Senior Technologist',
        positionRank: 4,
        username: 'labtech',
        email: 'labtech@hospital.local'
      },
      {
        employeeId: 'EMP-00008',
        fullName: 'Dr. Helen Labhead',
        firstName: 'Helen',
        lastName: 'Labhead',
        roleName: 'Laboratory',
        deptCode: 'LAB',
        position: 'Laboratory Director',
        positionRank: 7,
        username: 'lab_director',
        email: 'helen.director@hospital.local'
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
        email: 'pharmacy@hospital.local'
      }
    ];

    const staffMap = {};
    for (const sd of staffDefs) {
      const staff = await Staff.create({
        employeeId: sd.employeeId,
        fullName: sd.fullName,
        firstName: sd.firstName,
        lastName: sd.lastName,
        departmentId: depts[sd.deptCode]._id,
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
      });
      staffMap[sd.username] = staff;

      await Identity.create({
        staffId: staff._id,
        username: sd.username,
        passwordHash,
        accountStatus: 'Active'
      });
    }
    console.log('Staff and identities seeded.');

    // 4. Update HODs for Departments
    console.log('Updating HOD mappings...');
    await Department.findByIdAndUpdate(depts.GEN._id, { headOfDepartment: staffMap.doctor._id });
    await Department.findByIdAndUpdate(depts.CAR._id, { headOfDepartment: staffMap.cardio_doc._id });
    await Department.findByIdAndUpdate(depts.LAB._id, { headOfDepartment: staffMap.lab_director._id });
    console.log('HODs updated.');

    // 5. Seed Laboratory Config & Test Catalogs
    console.log('Seeding Laboratory config...');
    const lab = await Laboratory.create({
      name: 'Pathology & Blood Laboratory',
      description: 'Primary diagnostic laboratory for haematological and biochemical analysis',
      departmentId: depts.LAB._id,
      testCatalog: [
        {
          name: 'Complete Blood Count (CBC)',
          testCode: 'CBC',
          sampleType: 'EDTA Blood (3 mL)',
          resultFields: [
            { key: 'haemoglobin', label: 'Haemoglobin', type: 'Number', unit: 'g/dL', reference: '12.0–17.5', required: true },
            { key: 'wbc', label: 'WBC Count', type: 'Number', unit: 'thousands/µL', reference: '4.5–11.0', required: true },
            { key: 'platelets', label: 'Platelet Count', type: 'Number', unit: 'thousands/µL', reference: '150–400', required: true }
          ]
        },
        {
          name: 'Lipid Profile (LPD)',
          testCode: 'LPD',
          sampleType: 'Serum (5 mL)',
          resultFields: [
            { key: 'cholesterol', label: 'Total Cholesterol', type: 'Number', unit: 'mg/dL', reference: '<200', required: true },
            { key: 'triglycerides', label: 'Triglycerides', type: 'Number', unit: 'mg/dL', reference: '<150', required: true },
            { key: 'hdl', label: 'HDL Cholesterol', type: 'Number', unit: 'mg/dL', reference: '>40', required: true },
            { key: 'ldl', label: 'LDL Cholesterol', type: 'Number', unit: 'mg/dL', reference: '<100', required: true }
          ]
        }
      ]
    });
    console.log('Laboratory seeded.');

    // 6. Seed Patient Records (8 Patients with encrypted data)
    console.log('Seeding Patients...');
    const patientsData = [
      { first: 'John', last: 'Doe', dob: '1990-01-15', gender: 'Male', allergies: 'Peanuts' },
      { first: 'Jane', last: 'Smith', dob: '1985-05-23', gender: 'Female', allergies: 'Penicillin' },
      { first: 'Robert', last: 'Johnson', dob: '1975-11-04', gender: 'Male', allergies: 'None' },
      { first: 'Emily', last: 'Williams', dob: '1998-08-30', gender: 'Female', allergies: 'Sulfonamides' },
      { first: 'Michael', last: 'Brown', dob: '1962-03-12', gender: 'Male', allergies: 'Dust' },
      { first: 'Sarah', last: 'Davis', dob: '1989-12-25', gender: 'Female', allergies: 'None' },
      { first: 'David', last: 'Miller', dob: '1970-07-18', gender: 'Male', allergies: 'Shellfish' },
      { first: 'Jessica', last: 'Wilson', dob: '1993-09-09', gender: 'Female', allergies: 'Aspirin' }
    ];

    const patientDocs = [];
    for (let i = 0; i < patientsData.length; i++) {
      const p = patientsData[i];
      const doc = await Patient.create({
        firstName: p.first,
        lastName: p.last,
        dob: new Date(p.dob),
        gender: p.gender,
        mrn: `MRN-${100000 + i}`,
        phone: encryptDeterministic(`+91999999900${i}`),
        email: encryptDeterministic(`${p.first.toLowerCase()}@example.com`),
        allergies: encryptRandom(p.allergies),
        operations: encryptRandom('None'),
        chronicConditions: []
      });
      patientDocs.push(doc);
    }
    console.log('Patients seeded.');

    // 7. Seed Visit Records across OPD lifecycle stages
    console.log('Seeding Visits across OPD stages...');

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

    // --- STAGE 1: Nurse Triage (2 Patients: John Doe, Jane Smith - status: WAITING_TRIAGE) ---
    console.log('  Seeding Nurse Triage Queue...');
    await Visit.create(createBaseVisit(patientDocs[0], depts.GEN, 1, 'WAITING_TRIAGE'));
    await Visit.create(createBaseVisit(patientDocs[1], depts.CAR, 2, 'WAITING_TRIAGE'));

    // --- STAGE 2: Doctor Waiting (2 Patients: Robert Johnson - status: WAITING_DOCTOR, Emily Williams - status: IN_PROGRESS) ---
    console.log('  Seeding Doctor Workstation Queue...');
    // Robert Johnson
    await Visit.create({
      ...createBaseVisit(patientDocs[2], depts.GEN, 3, 'WAITING_DOCTOR'),
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
    // Emily Williams
    await Visit.create({
      ...createBaseVisit(patientDocs[3], depts.CAR, 4, 'IN_PROGRESS'),
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

    // --- STAGE 3: Laboratory (2 Patients: Michael Brown - WAITING_LAB, Sarah Davis - PROCESSING) ---
    console.log('  Seeding Laboratory Worksheet...');
    // Michael Brown
    await Visit.create({
      ...createBaseVisit(patientDocs[4], depts.GEN, 5, 'WAITING_LAB'),
      vitals: {
        height: 172,
        weight: 80,
        bloodPressure: '130/85',
        temperature: 99.0,
        pulse: 78,
        oxygenSaturation: 97,
        chiefComplaint: 'Chronic fatigue and joint ache',
        recordedBy: staffMap.nurse._id,
        recordedAt: new Date()
      },
      consultation: {
        doctorId: staffMap.doctor._id,
        chiefComplaint: 'Chronic fatigue and joint ache',
        historyOfPresentIllness: 'Patient reports progressive fatigue.',
        diagnosis: 'Anemia screen',
        treatmentPlan: 'Order haematology review',
        status: 'FINALIZED',
        recordedAt: new Date()
      },
      labOrders: [{
        laboratoryId: lab._id,
        labDepartmentId: depts.LAB._id,
        testName: 'Complete Blood Count (CBC)',
        labName: lab.name,
        sampleType: 'EDTA Blood (3 mL)',
        priority: 'ROUTINE',
        status: 'PENDING_SAMPLE'
      }]
    });
    // Sarah Davis
    await Visit.create({
      ...createBaseVisit(patientDocs[5], depts.GEN, 6, 'WAITING_LAB'), 
      vitals: {
        height: 160,
        weight: 54,
        bloodPressure: '110/70',
        temperature: 98.2,
        pulse: 70,
        oxygenSaturation: 99,
        chiefComplaint: 'Routine wellness profile check',
        recordedBy: staffMap.nurse._id,
        recordedAt: new Date()
      },
      consultation: {
        doctorId: staffMap.doctor._id,
        chiefComplaint: 'Routine wellness profile check',
        historyOfPresentIllness: 'Requested lipid profiles and routine screens.',
        diagnosis: 'Hyperlipidemia evaluation',
        treatmentPlan: 'Order cholesterol assay',
        status: 'FINALIZED',
        recordedAt: new Date()
      },
      labOrders: [{
        laboratoryId: lab._id,
        labDepartmentId: depts.LAB._id,
        testName: 'Lipid Profile (LPD)',
        labName: lab.name,
        sampleType: 'Serum (5 mL)',
        priority: 'URGENT',
        status: 'PROCESSING',
        sampleCollectedAt: new Date()
      }]
    });

    // --- STAGE 4: Pharmacy Billing (2 Patients: David Miller, Jessica Wilson - status: WAITING_PHARMACY) ---
    console.log('  Seeding Pharmacy & Billing Area...');
    // David Miller
    await Visit.create({
      ...createBaseVisit(patientDocs[6], depts.GEN, 7, 'WAITING_PHARMACY'),
      vitals: {
        height: 180,
        weight: 90,
        bloodPressure: '140/90',
        temperature: 98.6,
        pulse: 88,
        oxygenSaturation: 97,
        chiefComplaint: 'Dry cough and sore throat for 5 days',
        recordedBy: staffMap.nurse._id,
        recordedAt: new Date()
      },
      consultation: {
        doctorId: staffMap.doctor._id,
        chiefComplaint: 'Dry cough and sore throat',
        historyOfPresentIllness: 'Upper respiratory infection symptoms.',
        diagnosis: 'Acute Pharyngitis',
        treatmentPlan: 'Antibiotic therapy and symptomatic cough syrups.',
        status: 'FINALIZED',
        recordedAt: new Date()
      },
      prescribedMedications: [
        {
          recommended: 'Amoxicillin 500mg',
          dosage: '1-0-1',
          duration: '5 days',
          route: 'Oral',
          frequency: 'Post Food',
          notes: 'Take with full glass of water'
        },
        {
          recommended: 'Cough Syrup 100ml',
          dosage: '0-0-1',
          duration: '3 days',
          route: 'Oral',
          frequency: 'At bedtime',
          notes: 'May cause drowsiness'
        }
      ]
    });
    // Jessica Wilson
    await Visit.create({
      ...createBaseVisit(patientDocs[7], depts.CAR, 8, 'WAITING_PHARMACY'),
      vitals: {
        height: 168,
        weight: 60,
        bloodPressure: '125/80',
        temperature: 98.4,
        pulse: 74,
        oxygenSaturation: 99,
        chiefComplaint: 'Palpitations post-caffeine consumption',
        recordedBy: staffMap.cardio_nurse._id,
        recordedAt: new Date()
      },
      consultation: {
        doctorId: staffMap.cardio_doc._id,
        chiefComplaint: 'Palpitations post-caffeine',
        historyOfPresentIllness: 'Episodes of racing pulse after drinking tea.',
        diagnosis: 'Sinus Tachycardia (mild)',
        treatmentPlan: 'Reduce caffeine intake and follow up in 2 weeks.',
        status: 'FINALIZED',
        recordedAt: new Date()
      },
      prescribedMedications: [
        {
          recommended: 'Propranolol 10mg',
          dosage: '1-0-0',
          duration: '10 days',
          route: 'Oral',
          frequency: 'Pre Food',
          notes: 'Take in morning'
        }
      ]
    });

    console.log('\n==================================================');
    console.log('  CONSOLIDATED HMS SEED COMPLETE!');
    console.log('  Seeded:');
    console.log('  - 5 Departments (ADM, GEN, CAR, LAB, PHM)');
    console.log('  - 9 Staff members & User Identities');
    console.log('  - 1 Laboratory config with 2 Test Catalogs (CBC, LPD)');
    console.log('  - 8 Patients with encrypted data profiles');
    console.log('  - 8 Visits seeded in active states across Triage,');
    console.log('    Doctor, Laboratory, and Pharmacy queues.');
    console.log('  Passwords for all accounts: Password123!');
    console.log('==================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Consolidated seeding error:', err);
    process.exit(1);
  }
};

seedAll();
