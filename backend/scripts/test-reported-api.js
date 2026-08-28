require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const mongoose = require('mongoose');
const config = require('../src/core/config');
const Patient = require('../src/modules/patient/patient.model');
const Department = require('../src/modules/administration/department.model');
const Staff = require('../src/modules/staff/staff.model');
const visitRepository = require('../src/modules/visits/visit.repository');
const laboratoryService = require('../src/modules/laboratory/laboratory.service');

async function testReportedVisits() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to DB:', mongoose.connection.name);

  const reportedVisits = await laboratoryService.getReportedVisits();
  console.log(`\nReported visits retrieved via laboratoryService: ${reportedVisits.length}`);

  let totalCompletedOrders = 0;
  reportedVisits.forEach((v, i) => {
    const p = v.patientId || {};
    const completed = (v.labOrders || []).filter(o => o.status === 'COMPLETED');
    totalCompletedOrders += completed.length;
    console.log(`[${i + 1}] Visit ${v.visitNumber} (${v.status}) | Patient: ${p.firstName} ${p.lastName} (MRN: ${p.mrn}) | Completed Orders: ${completed.length}`);
    completed.forEach(o => {
      console.log(`    - ${o.testName || o.labName} | Status: ${o.status}`);
    });
  });

  console.log(`\nTotal completed orders ready for Reported Results tab: ${totalCompletedOrders}`);
  await mongoose.disconnect();
}

testReportedVisits().catch(console.error);
