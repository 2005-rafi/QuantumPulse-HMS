require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const mongoose = require('mongoose');
const config = require('../src/core/config');
const Patient = require('../src/modules/patient/patient.model');
const Department = require('../src/modules/administration/department.model');
const Visit = require('../src/modules/visits/visit.model');
const Laboratory = require('../src/modules/laboratory/laboratory.model');

async function verifyQueue() {
  await mongoose.connect(config.mongoUri);
  const lab = await Laboratory.findOne({ name: /Haematology/i }).lean();
  console.log(`\n=== LABORATORY: ${lab.name} ===`);
  console.log(`Test catalog contains ${lab.testCatalog?.length || 0} tests.`);

  const visits = await Visit.find({
    status: 'WAITING_LAB',
    'labOrders.0': { $exists: true },
  })
    .populate('patientId')
    .populate('departmentId')
    .sort({ createdAt: -1 })
    .lean();

  console.log(`\nTotal visits waiting at laboratory: ${visits.length}`);
  visits.forEach((v, idx) => {
    const p = v.patientId || {};
    console.log(`\n[${idx + 1}] Token: ${v.tokenString} | ${p.firstName} ${p.lastName} (${p.gender}, Age ${new Date().getFullYear() - new Date(p.dob).getFullYear()}) | MRN: ${p.mrn} | Blood: ${p.bloodGroup}`);
    console.log(`    Dept: ${v.departmentId?.name} | Vitals: BP ${v.vitals?.bloodPressure}, Temp ${v.vitals?.temperature}°F, HR ${v.vitals?.pulse} bpm, SpO2 ${v.vitals?.oxygenSaturation}%`);
    console.log(`    Complaint: ${v.vitals?.chiefComplaint}`);
    console.log(`    Lab Orders (${v.labOrders?.length || 0}):`);
    v.labOrders.forEach(o => {
      console.log(`      - [${o.priority}] ${o.testName} (${o.sampleType}) -> Status: ${o.status}`);
    });
  });

  await mongoose.disconnect();
}

verifyQueue().catch(console.error);
