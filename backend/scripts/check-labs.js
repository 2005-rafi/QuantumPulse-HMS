require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
const mongoose = require('mongoose');
const Laboratory = require('../src/modules/laboratory/laboratory.model');
const Department = require('../src/modules/administration/department.model');
const config = require('../src/core/config');

async function checkLabs() {
  await mongoose.connect(config.mongoUri);
  const labs = await Laboratory.find({}).populate('departmentId').lean();
  console.log('LABS FOUND:', labs.length);
  labs.forEach(l => {
    console.log(`\n=== Laboratory: ${l.name} (_id: ${l._id}) ===`);
    console.log(`Department: ${l.departmentId?.name} (code: ${l.departmentId?.code}, _id: ${l.departmentId?._id})`);
    console.log('Test Catalog:');
    (l.testCatalog || []).forEach(t => {
      console.log(`  - Test Name: "${t.name}" | Code: "${t.testCode || t.code}" | Sample: "${t.sampleType}"`);
      console.log(`    Result Fields (${t.resultFields?.length || 0}):`, t.resultFields?.map(f => `${f.label} (${f.type}${f.unit ? ' ' + f.unit : ''})`).join(', '));
    });
  });
  await mongoose.disconnect();
}

checkLabs().catch(console.error);
