require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const config = require('../src/core/config');
const visitService = require('../src/modules/visits/visit.service');
const Department = require('../src/modules/administration/department.model');

async function testNurseQueue() {
  console.log('=== 🩺 TESTING NURSE TRIAGE QUEUE FETCH ===\n');

  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB.\n');

  try {
    const dept = await Department.findOne({ isActive: true });
    const deptId = dept ? dept._id.toString() : undefined;

    console.log(`Testing getQueue with status 'WAITING_TRIAGE,CALLED' and departmentId '${deptId}'...`);
    const queue = await visitService.getQueue('WAITING_TRIAGE,CALLED', { departmentId: deptId });

    console.log(`✅ Success! Retrieved ${queue.length} queue entries without errors.`);
    if (queue.length > 0) {
      console.log('Sample queue record:');
      console.log({
        visitNumber: queue[0].visitNumber,
        status: queue[0].status,
        patientName: queue[0].patientId?.fullName || `${queue[0].patientId?.firstName} ${queue[0].patientId?.lastName}`,
        department: queue[0].departmentId?.name,
      });
    }
  } catch (err) {
    console.error('❌ Error during getQueue:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

testNurseQueue();
