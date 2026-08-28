require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const mongoose = require('mongoose');
const config = require('../src/core/config');
const Patient = require('../src/modules/patient/patient.model');
const Department = require('../src/modules/administration/department.model');
const Staff = require('../src/modules/staff/staff.model');
const Visit = require('../src/modules/visits/visit.model');

async function inspectReported() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to DB:', mongoose.connection.name);

  // Find all visits that have at least one completed lab order
  const visitsWithCompleted = await Visit.find({
    'labOrders.0': { $exists: true },
    'labOrders.status': 'COMPLETED',
  })
    .populate('patientId')
    .populate('departmentId')
    .populate('consultation.doctorId')
    .lean();

  console.log(`\nTotal visits with completed lab orders in DB: ${visitsWithCompleted.length}`);
  visitsWithCompleted.forEach((v, i) => {
    const p = v.patientId || {};
    const completedOrders = (v.labOrders || []).filter(o => o.status === 'COMPLETED');
    console.log(`\n[${i + 1}] Visit ${v.visitNumber} (${v.status}) - Patient: ${p.firstName} ${p.lastName} (MRN: ${p.mrn})`);
    console.log(`    Completed orders (${completedOrders.length}):`);
    completedOrders.forEach(o => {
      console.log(`      - ${o.testName || o.labName} | Results:`, o.results, `| Notes: ${o.notes || 'none'}`);
    });
  });

  await mongoose.disconnect();
}

inspectReported().catch(console.error);
