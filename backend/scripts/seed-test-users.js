/**
 * TEST USERS SEED SCRIPT
 * Seeds simple one-word test accounts for reception, nurse, doctor, labtech, and pharmacy.
 * Password: Password123!
 *
 * Usage: node scripts/seed-test-users.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../src/core/config');
const { connectDB } = require('../src/core/database/connection');

// Load models
const Staff = require('../src/modules/staff/staff.model');
const Identity = require('../src/modules/identity/identity.model');
const Role = require('../src/modules/administration/role.model');
const Department = require('../src/modules/administration/department.model');

const seedData = [
  {
    roleName: 'Reception',
    deptCode: 'RECEP',
    username: 'reception',
    fullName: 'Test Receptionist',
    firstName: 'Test',
    lastName: 'Receptionist',
    position: 'Receptionist',
    positionRank: 2,
    email: 'reception@hospital.local',
    phone: '+919999999001',
    employeeId: 'EMP-99001'
  },
  {
    roleName: 'Nurse',
    deptCode: 'GEN',
    username: 'nurse',
    fullName: 'Test Nurse',
    firstName: 'Test',
    lastName: 'Nurse',
    position: 'Staff Nurse',
    positionRank: 3,
    email: 'nurse@hospital.local',
    phone: '+919999999002',
    employeeId: 'EMP-99002',
    extra: {
      nursingLicenseNumber: 'LIC-NUR-TEST-999',
      nursingSpecialization: 'General Ward'
    }
  },
  {
    roleName: 'Doctor',
    deptCode: 'GEN',
    username: 'doctor',
    fullName: 'Test Doctor',
    firstName: 'Test',
    lastName: 'Doctor',
    position: 'Consultant',
    positionRank: 5,
    email: 'doctor@hospital.local',
    phone: '+919999999003',
    employeeId: 'EMP-99003',
    extra: {
      medicalLicenseNumber: 'LIC-DOC-TEST-999',
      medicalCouncil: 'Medical Council of India',
      licenseRegistrationDate: new Date('2020-01-01'),
      licenseExpiryDate: new Date('2035-01-01'),
      primaryQualification: 'MBBS',
      highestQualification: 'MD',
      primarySpecialization: 'General Medicine',
      consultationType: 'Both',
      consultingFee: 500,
      followUpFee: 250,
      languagesKnown: ['English', 'Hindi']
    }
  },
  {
    roleName: 'Laboratory',
    deptCode: 'HAEM',
    username: 'labtech',
    fullName: 'Test Lab Technician',
    firstName: 'Test',
    lastName: 'Labtech',
    position: 'Lab Technologist',
    positionRank: 3,
    email: 'labtech@hospital.local',
    phone: '+919999999004',
    employeeId: 'EMP-99004',
    extra: {
      labCertificationCode: 'CERT-LAB-TEST-999',
      labQualification: 'B.Sc MLT'
    }
  },
  {
    roleName: 'Pharmacy',
    deptCode: 'PHARM',
    username: 'pharmacy',
    fullName: 'Test Pharmacist',
    firstName: 'Test',
    lastName: 'Pharmacist',
    position: 'Pharmacist',
    positionRank: 3,
    email: 'pharmacy@hospital.local',
    phone: '+919999999005',
    employeeId: 'EMP-99005',
    extra: {
      pharmacyLicenseNumber: 'LIC-PHM-TEST-999',
      pharmacyQualification: 'B.Pharm'
    }
  }
];

const seedTestUsers = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Connected to database.');

    const passwordHash = await bcrypt.hash('Password123!', config.bcryptRounds);

    for (const item of seedData) {
      console.log(`\nProcessing user: ${item.username} (${item.roleName})`);

      // 1. Resolve role
      const role = await Role.findOne({ name: item.roleName });
      if (!role) {
        console.warn(`WARNING: Role "${item.roleName}" not found. Skipping user "${item.username}".`);
        continue;
      }

      // 2. Resolve department
      const dept = await Department.findOne({ code: item.deptCode });
      if (!dept) {
        console.warn(`WARNING: Department with code "${item.deptCode}" not found. Skipping user "${item.username}".`);
        continue;
      }

      // 3. Find or Create Staff member
      let staff = await Staff.findOne({ employeeId: item.employeeId });
      const staffFields = {
        employeeId: item.employeeId,
        fullName: item.fullName,
        firstName: item.firstName,
        lastName: item.lastName,
        departmentId: dept._id,
        roleId: role._id,
        position: item.position,
        positionRank: item.positionRank,
        status: 'Active',
        email: item.email,
        phone: item.phone,
        gender: 'Other',
        dateOfBirth: new Date('1990-01-01'),
        joiningDate: new Date(),
        employmentType: 'Full-time',
        ...item.extra
      };

      if (!staff) {
        staff = await Staff.create(staffFields);
        console.log(`  Staff created: ${staff.fullName} (${staff.employeeId})`);
      } else {
        staff = await Staff.findByIdAndUpdate(staff._id, staffFields, { new: true });
        console.log(`  Staff updated: ${staff.fullName} (${staff.employeeId})`);
      }

      // 4. Find or Create Identity / Login Account
      let identity = await Identity.findOne({ staffId: staff._id });
      if (!identity) {
        // Also check by username to prevent duplicate username collisions
        identity = await Identity.findOne({ username: item.username });
      }

      const identityFields = {
        staffId: staff._id,
        username: item.username,
        passwordHash,
        accountStatus: 'Active'
      };

      if (!identity) {
        identity = await Identity.create(identityFields);
        console.log(`  Identity created: "${item.username}"`);
      } else {
        identity = await Identity.findByIdAndUpdate(identity._id, identityFields, { new: true });
        console.log(`  Identity updated: "${item.username}"`);
      }
    }

    console.log('\nTest users seeding complete successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedTestUsers();
