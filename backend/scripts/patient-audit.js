const mongoose = require('mongoose');
const { connectDB } = require('../src/core/database/connection');
const Patient = require('../src/modules/patient/patient.model');
const Staff = require('../src/modules/staff/staff.model');
const Role = require('../src/modules/administration/role.model');
const identityService = require('../src/modules/identity/identity.service');
const { login } = require('../src/modules/auth/auth.service');
const patientService = require('../src/modules/patient/patient.service');
const { PERMISSIONS } = require('../src/core/constants');

const runAudit = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    
    // Find Reception Role
    const receptionRole = await Role.findOne({ name: 'Reception' });
    if (!receptionRole) throw new Error('Reception role not found in DB');
    
    // Find Doctor Role
    const doctorRole = await Role.findOne({ name: 'Doctor' });
    if (!doctorRole) throw new Error('Doctor role not found in DB');

    // Create a Receptionist if doesn't exist
    let receptionist = await Staff.findOne({ employeeId: 'EMP-REC-001' });
    if (!receptionist) {
      receptionist = await Staff.create({
        firstName: 'Test',
        lastName: 'Receptionist',
        fullName: 'Test Receptionist',
        employeeId: 'EMP-REC-001',
        departmentId: (await mongoose.model('Department').findOne())._id,
        roleId: receptionRole._id,
        email: 'reception@hms.local',
        phone: '1234567890'
      });
      await identityService.createIdentity({
        staffId: receptionist._id,
        username: 'reception1',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
      const identity = await identityService.getByStaffId(receptionist._id);
      await identityService.changeStatus(identity._id, 'Active');
    }

    // Attempt to register a patient using service
    console.log('Testing Patient Creation...');
    const newPatient = await patientService.create({
      firstName: 'Audit',
      lastName: 'Patient',
      dob: '1990-01-01',
      gender: 'Male',
      phone: '9876543210'
    });
    console.log('Patient created successfully with MRN:', newPatient.mrn);

    // Test Medical History addition
    console.log('Testing Medical History Update...');
    await patientService.addMedicalHistory(newPatient._id, {
      condition: 'Hypertension',
      notes: 'Diagnosed 5 years ago'
    }, receptionist._id);
    
    const updatedPatient = await patientService.getById(newPatient._id);
    console.log('Medical history updated. Current count:', updatedPatient.medicalHistory.length);

    console.log('Cleaning up test data...');
    await Patient.deleteMany({ mrn: newPatient.mrn });

    console.log('Patient audit completed successfully.');
  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    mongoose.disconnect();
  }
};

runAudit();
