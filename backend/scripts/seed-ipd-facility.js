/**
 * scripts/seed-ipd-facility.js
 * Comprehensive seed script for physical hospital floors, rooms, beds, and initial active inpatient admissions.
 * 
 * Usage: node backend/scripts/seed-ipd-facility.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const mongoose = require('mongoose');

const FloorMaster = require('../src/modules/ipd/beds/floor.model');
const RoomMaster = require('../src/modules/ipd/beds/room.model');
const BedMaster = require('../src/modules/ipd/beds/bed.model');
const BedAllocation = require('../src/modules/ipd/beds/bed-allocation.model');
const IPDAdmission = require('../src/modules/ipd/admission/ipd-admission.model');
const VitalsFlowsheet = require('../src/modules/ipd/nursing/vitals-flowsheet.model');
const EmarRecord = require('../src/modules/ipd/nursing/emar-record.model');
const IOBalance = require('../src/modules/ipd/nursing/io-balance.model');
const IPDClearance = require('../src/modules/ipd/discharge/ipd-clearance.model');
const Patient = require('../src/modules/patient/patient.model');
const Staff = require('../src/modules/staff/staff.model');
const Department = require('../src/modules/administration/department.model');
const Bill = require('../src/modules/billing/bill.model');

const { connectDB } = require('../src/core/database/connection');

async function seedIPDFacility() {
  console.log('Connecting to database for IPD seeding...');
  await connectDB();
  console.log('Connected to MongoDB.');

  // Find staff and departments for references
  const doctor = await Staff.findOne({ position: { $regex: /consultant|doctor|physician/i } }) || await Staff.findOne();
  const nurse = await Staff.findOne({ position: { $regex: /nurse/i } }) || doctor;
  const admin = await Staff.findOne({ position: { $regex: /admin/i } }) || doctor;
  const generalDept = await Department.findOne({ code: 'GEN' }) || await Department.findOne();

  const patients = await Patient.find({}).limit(10);
  if (!patients || patients.length === 0) {
    console.error('No patients found in DB. Please run patient seed scripts first.');
    process.exit(1);
  }

  console.log('Clearing existing IPD layout collections...');
  await FloorMaster.deleteMany({});
  await RoomMaster.deleteMany({});
  await BedMaster.deleteMany({});
  await BedAllocation.deleteMany({});
  await IPDAdmission.deleteMany({});
  await VitalsFlowsheet.deleteMany({});
  await EmarRecord.deleteMany({});
  await IOBalance.deleteMany({});
  await IPDClearance.deleteMany({});

  console.log('Seeding Floor Master...');
  const floors = await FloorMaster.create([
    {
      floorNumber: 0,
      floorName: 'Ground Floor — Emergency & Triage',
      wing: 'Emergency Wing',
      description: 'Acute emergency admissions, rapid triage, and transit bays.',
    },
    {
      floorNumber: 1,
      floorName: '1st Floor — General & Semi-Private Ward',
      wing: 'East Inpatient Wing',
      description: 'Male and Female General Wards and Step-down recovery.',
    },
    {
      floorNumber: 2,
      floorName: '2nd Floor — Deluxe & Private Suites',
      wing: 'North Executive Wing',
      description: 'Single-occupancy private and deluxe inpatient suites.',
    },
    {
      floorNumber: 3,
      floorName: '3rd Floor — Critical Care (ICU/CCU) & OT Complex',
      wing: 'Surgical & ICU Complex',
      description: 'Intensive Care Units, Coronary Care, HDU, and Major Operating Theatres.',
    },
  ]);

  console.log('Seeding Room Master...');
  // Ground Floor Rooms
  const r001 = await RoomMaster.create({
    floorId: floors[0]._id,
    roomNumber: 'G-01',
    roomName: 'Emergency Triage Bay',
    roomType: 'EMERGENCY',
    totalBeds: 4,
  });

  // 1st Floor Rooms
  const r101 = await RoomMaster.create({
    floorId: floors[1]._id,
    roomNumber: '101',
    roomName: 'Male General Ward A',
    roomType: 'GENERAL_WARD',
    genderRestriction: 'MALE_ONLY',
    totalBeds: 4,
  });

  const r102 = await RoomMaster.create({
    floorId: floors[1]._id,
    roomNumber: '102',
    roomName: 'Female General Ward B',
    roomType: 'GENERAL_WARD',
    genderRestriction: 'FEMALE_ONLY',
    totalBeds: 4,
  });

  const r103 = await RoomMaster.create({
    floorId: floors[1]._id,
    roomNumber: '103',
    roomName: 'Semi-Private Room Twin-A',
    roomType: 'SEMI_PRIVATE',
    totalBeds: 2,
  });

  // 2nd Floor Rooms
  const r201 = await RoomMaster.create({
    floorId: floors[2]._id,
    roomNumber: '201',
    roomName: 'Executive Deluxe Suite A',
    roomType: 'DELUXE_PRIVATE',
    totalBeds: 1,
  });

  const r202 = await RoomMaster.create({
    floorId: floors[2]._id,
    roomNumber: '202',
    roomName: 'Private Room 202',
    roomType: 'PRIVATE',
    totalBeds: 1,
  });

  const r203 = await RoomMaster.create({
    floorId: floors[2]._id,
    roomNumber: '203',
    roomName: 'Private Room 203',
    roomType: 'PRIVATE',
    totalBeds: 1,
  });

  // 3rd Floor Rooms
  const r301 = await RoomMaster.create({
    floorId: floors[3]._id,
    roomNumber: 'ICU-Pod-1',
    roomName: 'Intensive Care Unit (ICU Pod Alpha)',
    roomType: 'ICU',
    totalBeds: 4,
  });

  const r302 = await RoomMaster.create({
    floorId: floors[3]._id,
    roomNumber: 'CCU-01',
    roomName: 'Coronary Care Unit',
    roomType: 'CCU',
    totalBeds: 2,
  });

  const r303 = await RoomMaster.create({
    floorId: floors[3]._id,
    roomNumber: 'OT-Suite-1',
    roomName: 'Major Surgical Operating Theatre 1',
    roomType: 'OT',
    totalBeds: 1,
  });

  console.log('Seeding Bed Master (36 Total Beds)...');
  const allBeds = [];

  // Ground Floor Emergency Beds (4)
  for (let i = 1; i <= 4; i++) {
    allBeds.push({
      roomId: r001._id,
      floorId: floors[0]._id,
      bedNumber: `ER-0${i}`,
      bedLabel: `Emergency Bed 0${i}`,
      wardClass: 'EMERGENCY',
      features: ['OXYGEN_PIPED', 'MONITOR_ATTACHED', 'SUCTION_READY'],
      status: 'VACANT',
    });
  }

  // 1st Floor General Male (4)
  for (let i = 1; i <= 4; i++) {
    allBeds.push({
      roomId: r101._id,
      floorId: floors[1]._id,
      bedNumber: `G101-B${i}`,
      bedLabel: `General Bed 101-${i}`,
      wardClass: 'GENERAL_WARD',
      features: ['OXYGEN_PIPED'],
      status: 'VACANT',
    });
  }

  // 1st Floor General Female (4)
  for (let i = 1; i <= 4; i++) {
    allBeds.push({
      roomId: r102._id,
      floorId: floors[1]._id,
      bedNumber: `G102-B${i}`,
      bedLabel: `General Bed 102-${i}`,
      wardClass: 'GENERAL_WARD',
      features: ['OXYGEN_PIPED'],
      status: 'VACANT',
    });
  }

  // 1st Floor Semi-Private (2)
  for (let i = 1; i <= 2; i++) {
    allBeds.push({
      roomId: r103._id,
      floorId: floors[1]._id,
      bedNumber: `SP103-B${i}`,
      bedLabel: `Semi-Private 103-${i}`,
      wardClass: 'SEMI_PRIVATE',
      features: ['OXYGEN_PIPED', 'MONITOR_ATTACHED'],
      status: 'VACANT',
    });
  }

  // 2nd Floor Deluxe (1)
  allBeds.push({
    roomId: r201._id,
    floorId: floors[2]._id,
    bedNumber: 'DX-201',
    bedLabel: 'Deluxe Suite 201',
    wardClass: 'DELUXE_PRIVATE',
    features: ['OXYGEN_PIPED', 'MONITOR_ATTACHED', 'SUCTION_READY'],
    status: 'VACANT',
  });

  // 2nd Floor Private (2)
  allBeds.push({
    roomId: r202._id,
    floorId: floors[2]._id,
    bedNumber: 'PV-202',
    bedLabel: 'Private Room 202',
    wardClass: 'PRIVATE',
    features: ['OXYGEN_PIPED', 'MONITOR_ATTACHED'],
    status: 'VACANT',
  });
  allBeds.push({
    roomId: r203._id,
    floorId: floors[2]._id,
    bedNumber: 'PV-203',
    bedLabel: 'Private Room 203',
    wardClass: 'PRIVATE',
    features: ['OXYGEN_PIPED'],
    status: 'VACANT',
  });

  // 3rd Floor ICU Beds (4)
  for (let i = 1; i <= 4; i++) {
    allBeds.push({
      roomId: r301._id,
      floorId: floors[3]._id,
      bedNumber: `ICU-0${i}`,
      bedLabel: `ICU Bed 0${i}`,
      wardClass: 'ICU',
      features: ['VENTILATOR_READY', 'MONITOR_ATTACHED', 'OXYGEN_PIPED', 'SUCTION_READY'],
      status: 'VACANT',
    });
  }

  // 3rd Floor CCU Beds (2)
  for (let i = 1; i <= 2; i++) {
    allBeds.push({
      roomId: r302._id,
      floorId: floors[3]._id,
      bedNumber: `CCU-0${i}`,
      bedLabel: `CCU Bed 0${i}`,
      wardClass: 'CCU',
      features: ['MONITOR_ATTACHED', 'OXYGEN_PIPED', 'SUCTION_READY'],
      status: 'VACANT',
    });
  }

  // 3rd Floor OT (1)
  allBeds.push({
    roomId: r303._id,
    floorId: floors[3]._id,
    bedNumber: 'OT-01',
    bedLabel: 'OT Table 01',
    wardClass: 'OT',
    features: ['VENTILATOR_READY', 'MONITOR_ATTACHED', 'OXYGEN_PIPED', 'SUCTION_READY'],
    status: 'VACANT',
  });

  const createdBeds = await BedMaster.create(allBeds);
  console.log(`Created ${createdBeds.length} physical beds.`);

  // ── Seed 3 Sample Active Inpatient Admissions ─────────────
  console.log('Seeding Sample Active Inpatient Admissions...');

  // Patient 1 in ICU-01
  const p1 = patients[0];
  const b1 = createdBeds.find((b) => b.bedNumber === 'ICU-01');
  const adm1 = await IPDAdmission.create({
    admissionNumber: 'IPD-20260829-0001',
    patientId: p1._id,
    primaryDoctorId: doctor._id,
    admittingDepartmentId: generalDept._id,
    currentBedId: b1._id,
    currentRoomId: b1.roomId,
    currentFloorId: b1.floorId,
    admissionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    admissionType: 'EMERGENCY',
    provisionalDiagnosis: 'Acute Myocardial Infarction (Anterior Wall)',
    chiefComplaints: 'Severe retrosternal chest pain radiating to left arm for 4 hours',
    carePlan: 'Continuous cardiac telemetry, thrombolysis protocol, dual antiplatelets',
    status: 'ADMITTED',
    admittedBy: admin._id,
  });

  b1.status = 'OCCUPIED';
  b1.currentAdmissionId = adm1._id;
  b1.currentPatientId = p1._id;
  await b1.save();

  await BedAllocation.create({
    admissionId: adm1._id,
    patientId: p1._id,
    bedId: b1._id,
    roomId: b1.roomId,
    floorId: b1.floorId,
    wardClass: b1.wardClass,
    allocatedFrom: adm1.admissionDate,
    transferredBy: admin._id,
    transferReason: 'Emergency Inpatient Admission',
  });

  // Patient 2 in General Bed G101-B1
  const p2 = patients[1] || patients[0];
  const b2 = createdBeds.find((b) => b.bedNumber === 'G101-B1');
  const adm2 = await IPDAdmission.create({
    admissionNumber: 'IPD-20260829-0002',
    patientId: p2._id,
    primaryDoctorId: doctor._id,
    admittingDepartmentId: generalDept._id,
    currentBedId: b2._id,
    currentRoomId: b2.roomId,
    currentFloorId: b2.floorId,
    admissionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    admissionType: 'PLANNED',
    provisionalDiagnosis: 'Dengue Fever with Thrombocytopenia',
    chiefComplaints: 'High grade fever with body ache and petechiae for 5 days',
    carePlan: 'IV fluids hydration, platelet monitoring twice daily, paracetamol',
    status: 'ADMITTED',
    admittedBy: admin._id,
  });

  b2.status = 'OCCUPIED';
  b2.currentAdmissionId = adm2._id;
  b2.currentPatientId = p2._id;
  await b2.save();

  await BedAllocation.create({
    admissionId: adm2._id,
    patientId: p2._id,
    bedId: b2._id,
    roomId: b2.roomId,
    floorId: b2.floorId,
    wardClass: b2.wardClass,
    allocatedFrom: adm2.admissionDate,
    transferredBy: admin._id,
    transferReason: 'Planned Medical Admission',
  });

  // Patient 3 in Deluxe Suite DX-201
  const p3 = patients[2] || patients[0];
  const b3 = createdBeds.find((b) => b.bedNumber === 'DX-201');
  const adm3 = await IPDAdmission.create({
    admissionNumber: 'IPD-20260829-0003',
    patientId: p3._id,
    primaryDoctorId: doctor._id,
    admittingDepartmentId: generalDept._id,
    currentBedId: b3._id,
    currentRoomId: b3.roomId,
    currentFloorId: b3.floorId,
    admissionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    admissionType: 'PLANNED',
    provisionalDiagnosis: 'Post Laparoscopic Cholecystectomy Recovery',
    chiefComplaints: 'Post-operative recovery day 2',
    carePlan: 'Oral diet started, analgesia, mobilised',
    status: 'ADMITTED',
    admittedBy: admin._id,
  });

  b3.status = 'OCCUPIED';
  b3.currentAdmissionId = adm3._id;
  b3.currentPatientId = p3._id;
  await b3.save();

  await BedAllocation.create({
    admissionId: adm3._id,
    patientId: p3._id,
    bedId: b3._id,
    roomId: b3.roomId,
    floorId: b3.floorId,
    wardClass: b3.wardClass,
    allocatedFrom: adm3.admissionDate,
    transferredBy: admin._id,
    transferReason: 'Post-op Suite Admission',
  });

  // Seed sample vitals & NEWS2
  console.log('Seeding Sample Vitals & NEWS2 Flows...');
  await VitalsFlowsheet.create([
    {
      admissionId: adm1._id,
      patientId: p1._id,
      recordedBy: nurse._id,
      recordedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      temperature: 37.4,
      systolicBp: 135,
      diastolicBp: 88,
      heartRate: 84,
      respirationRate: 18,
      spO2: 97,
      oxygenTherapy: true,
      oxygenFlowRateLpm: 2,
      avpu: 'ALERT',
      clinicalNotes: 'Vitals stable on 2L nasal cannula oxygen.',
    },
    {
      admissionId: adm1._id,
      patientId: p1._id,
      recordedBy: nurse._id,
      recordedAt: new Date(),
      temperature: 37.1,
      systolicBp: 130,
      diastolicBp: 82,
      heartRate: 78,
      respirationRate: 16,
      spO2: 98,
      oxygenTherapy: false,
      avpu: 'ALERT',
      clinicalNotes: 'Weaned off oxygen support successfully.',
    },
  ]);

  // Seed sample e-MAR medications
  console.log('Seeding Sample e-MAR Records...');
  const now = new Date();
  await EmarRecord.create([
    {
      admissionId: adm1._id,
      patientId: p1._id,
      medicationName: 'Tab. Aspirin 75mg',
      dosage: '75mg',
      route: 'ORAL',
      frequency: 'OD',
      scheduledTime: new Date(new Date(now).setHours(8, 0, 0, 0)),
      administeredTime: new Date(new Date(now).setHours(8, 15, 0, 0)),
      status: 'GIVEN',
      administeredBy: nurse._id,
      batchNumber: 'ASP-2026-X9',
    },
    {
      admissionId: adm1._id,
      patientId: p1._id,
      medicationName: 'Inj. Heparin 5000 IU',
      dosage: '5000 IU',
      route: 'SC',
      frequency: 'BD',
      scheduledTime: new Date(new Date(now).setHours(20, 0, 0, 0)),
      status: 'DUE',
    },
  ]);

  // Seed sample Open Bills
  console.log('Seeding Sample IPD Bills...');
  const bill1 = await Bill.create({
    billNumber: `BILL-${adm1.admissionNumber}`,
    admissionId: adm1._id,
    patientId: p1._id,
    visitType: 'IPD',
    serviceDate: new Date(),
    billedAmount: 22000,
    collectedAmount: 0,
    advanceCollected: 15000,
    outstandingAmount: 7000,
    status: 'OPEN',
    lineItems: [
      { description: 'ICU Bed Rent [Day 1]', category: 'PROCEDURE', snapshotPrice: 5000, quantity: 1, lineTotal: 5000, addedBy: admin._id },
      { description: 'ICU Nursing Care [Day 1]', category: 'PROCEDURE', snapshotPrice: 1500, quantity: 1, lineTotal: 1500, addedBy: admin._id },
      { description: 'ICU Bed Rent [Day 2]', category: 'PROCEDURE', snapshotPrice: 5000, quantity: 1, lineTotal: 5000, addedBy: admin._id },
      { description: 'ICU Nursing Care [Day 2]', category: 'PROCEDURE', snapshotPrice: 1500, quantity: 1, lineTotal: 1500, addedBy: admin._id },
      { description: 'ICU Bed Rent [Day 3]', category: 'PROCEDURE', snapshotPrice: 5000, quantity: 1, lineTotal: 5000, addedBy: admin._id },
      { description: 'ICU Nursing Care [Day 3]', category: 'PROCEDURE', snapshotPrice: 1500, quantity: 1, lineTotal: 1500, addedBy: admin._id },
      { description: 'RMO Doctor Visits (3 Days)', category: 'CONSULTATION', snapshotPrice: 400, quantity: 3, lineTotal: 1200, addedBy: admin._id },
      { description: 'Troponin-I Quantitative Test', category: 'DIAGNOSTICS', snapshotPrice: 1300, quantity: 1, lineTotal: 1300, addedBy: admin._id },
    ],
    generatedBy: admin._id,
  });

  adm1.billId = bill1._id;
  await adm1.save();

  console.log('\n============================================================');
  console.log(' IPD FACILITY SEEDING COMPLETED SUCCESSFULLY!');
  console.log(' 4 Floors, 10 Rooms, 36 Beds, and 3 Active Admissions Seeded.');
  console.log('============================================================\n');

  process.exit(0);
}

seedIPDFacility().catch((err) => {
  console.error('CRITICAL SEEDING ERROR:', err);
  process.exit(1);
});
