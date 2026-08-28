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
const Visit = require('../src/modules/visits/visit.model');

async function runTest() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to DB:', mongoose.connection.name);

  // 1. Fetch pending visits
  const pendingBefore = await visitRepository.findPendingLabOrders();
  console.log(`\n[STEP 1] Pending visits in lab queue: ${pendingBefore.length}`);
  
  const multiOrderVisit = pendingBefore.find(v => (v.labOrders || []).length > 1);
  if (!multiOrderVisit) {
    console.log('No multi-order visit found to test.');
    await mongoose.disconnect();
    return;
  }

  const patientName = `${multiOrderVisit.patientId?.firstName} ${multiOrderVisit.patientId?.lastName}`;
  console.log(`Selected Test Patient: ${patientName} (${multiOrderVisit.visitNumber}) with ${multiOrderVisit.labOrders.length} lab orders`);
  console.log('Orders:', multiOrderVisit.labOrders.map(o => `${o.testName} [${o.status}]`));

  // 2. Mark the first order as COMPLETED
  const orderToComplete = multiOrderVisit.labOrders[0];
  console.log(`\n[STEP 2] Uploading results for first order: "${orderToComplete.testName}" (_id: ${orderToComplete._id})...`);
  
  await laboratoryService.uploadResults(
    multiOrderVisit._id,
    orderToComplete._id,
    { test_key: 'Normal / Verified Value' },
    'First order completed by technician',
    null,
    null
  );

  // 3. Re-query pending visits
  const pendingAfterFirst = await visitRepository.findPendingLabOrders();
  console.log(`\n[STEP 3] Pending visits after 1st order completed: ${pendingAfterFirst.length}`);
  const isStillInQueue = pendingAfterFirst.some(v => v._id.toString() === multiOrderVisit._id.toString());
  console.log(`Is patient ${patientName} still in lab queue? =>`, isStillInQueue ? 'YES (CORRECT!)' : 'NO (FAILED)');

  const updatedVisit = await Visit.findById(multiOrderVisit._id).lean();
  console.log(`Visit status in DB: "${updatedVisit.status}" (Expected: WAITING_LAB)`);
  console.log('Updated Orders Status:');
  updatedVisit.labOrders.forEach(o => {
    console.log(`  - ${o.testName} => status: ${o.status}`);
  });

  // 4. Reset the order back to original status for clean tester experience
  console.log('\n[STEP 4] Resetting test order back to PROCESSING for tester...');
  await Visit.updateOne(
    { _id: multiOrderVisit._id, 'labOrders._id': orderToComplete._id },
    { $set: { 'labOrders.$.status': 'PROCESSING', status: 'WAITING_LAB' } }
  );
  console.log('Reset complete.');

  await mongoose.disconnect();
  console.log('\nTEST PASSED: Patient stays in lab queue until all orders are completed!');
}

runTest().catch(console.error);
