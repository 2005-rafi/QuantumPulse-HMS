require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const mongoose = require('mongoose');
const Patient = require('../src/modules/patient/patient.model');
const Visit = require('../src/modules/visits/visit.model');
const Department = require('../src/modules/administration/department.model');
const Staff = require('../src/modules/staff/staff.model');
const { encryptDeterministic, encryptRandom } = require('../src/core/utils/encryption');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hms_opd');
    console.log('Connected to MongoDB.');

    // 1. Get General Medicine department
    const dept = await Department.findOne({ code: 'GEN' });
    if (!dept) {
      console.error('GEN Department not found. Run seed-admin.js first!');
      process.exit(1);
    }

    // 2. Get a registered staff member
    const staff = await Staff.findOne({});
    if (!staff) {
      console.error('No staff found. Run seed-staff.js first!');
      process.exit(1);
    }

    // 3. Find or Create patient
    let patient = await Patient.findOne({ firstName: 'Test Patient one' });
    if (!patient) {
      console.log('Creating mock patient...');
      patient = await Patient.create({
        firstName: 'Test Patient one',
        lastName: 'GEN-001',
        dob: new Date('1985-05-15'),
        gender: 'Male',
        mrn: 'MRN-' + Math.floor(100000 + Math.random() * 900000),
        phone: encryptDeterministic('+919999999011'),
        email: encryptDeterministic('testpatient@hospital.local'),
        allergies: encryptRandom('Penicillin, Dust'),
        operations: encryptRandom('Appendectomy (2018)'),
        chronicConditions: ['Hypertension']
      });
    }

    // 4. Create visit in WAITING_DOCTOR status
    const dateStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
    const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
    const visitNumber = `VST-${dateStr}-${randomStr}`;

    const visit = await Visit.create({
      visitNumber,
      tokenString: 'GEN-001',
      tokenSerial: 1,
      patientId: patient._id,
      registeredBy: staff._id,
      departmentId: dept._id,
      status: 'WAITING_DOCTOR',
      vitals: {
        height: 175,
        weight: 70,
        bloodPressure: '120/80',
        temperature: 98.6,
        pulse: 72,
        oxygenSaturation: 98,
        chiefComplaint: 'Severe headache and throbbing pain behind left eye for 2 days.',
        recordedBy: staff._id,
        recordedAt: new Date()
      }
    });

    console.log(`Visit seeded successfully! Visit Number: ${visit.visitNumber}, Status: ${visit.status}`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding visit:', err);
    process.exit(1);
  }
};

seed();
