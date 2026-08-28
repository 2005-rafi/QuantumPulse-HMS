require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
const mongoose = require('mongoose');
const Laboratory = require('../src/modules/laboratory/laboratory.model');
const Department = require('../src/modules/administration/department.model');
const Staff = require('../src/modules/staff/staff.model');
const Patient = require('../src/modules/patient/patient.model');
const Visit = require('../src/modules/visits/visit.model');
const config = require('../src/core/config');

async function inspect() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to DB:', mongoose.connection.name);

  const labs = await Laboratory.find({}).lean();
  console.log('\n--- LABORATORIES (' + labs.length + ') ---');
  labs.forEach(l => {
    console.log(`Lab: ${l.name} (${l._id}) - Dept: ${l.departmentId} - Tests: ${l.testCatalog?.length || 0}`);
    (l.testCatalog || []).forEach(t => {
      console.log(`   - ${t.name} (Code: ${t.testCode || t.code}) [${t.sampleType}] - Fields: ${t.resultFields?.length || 0}`);
    });
  });

  const depts = await Department.find({}).lean();
  console.log('\n--- DEPARTMENTS (' + depts.length + ') ---');
  depts.forEach(d => console.log(`Dept: ${d.name} (Code: ${d.code}) - ID: ${d._id}`));

  const staff = await Staff.find({}).lean();
  console.log('\n--- STAFF (' + staff.length + ') ---');
  staff.forEach(s => console.log(`Staff: ${s.firstName} ${s.lastName} - Role: ${s.role} - ID: ${s._id}`));

  const visits = await Visit.find({}).populate('patientId').lean();
  console.log('\n--- VISITS (' + visits.length + ') ---');
  visits.slice(0, 10).forEach(v => {
    console.log(`Visit: ${v.visitNumber} - Status: ${v.status} - Patient: ${v.patientId?.firstName} - LabOrders: ${v.labOrders?.length || 0}`);
  });

  await mongoose.disconnect();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
