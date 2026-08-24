const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const uri = 'mongodb+srv://mohammedrafi12543_db_user:QpJj5IkENPKkUqFy@quantum-careone.yzctpfp.mongodb.net/quantum_careone?retryWrites=true&w=majority&appName=Quantum-CareOne';

async function verifyAtlas() {
  await mongoose.connect(uri);
  console.log('Connected to Atlas DB:', mongoose.connection.name);

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('\n--- ATLAS COLLECTIONS & DOCUMENT COUNTS ---');
  for (const col of collections) {
    const count = await mongoose.connection.db.collection(col.name).countDocuments();
    console.log(`  * ${col.name.padEnd(20)}: ${count} documents`);
  }

  const identities = mongoose.connection.db.collection('identities');
  const staffs = mongoose.connection.db.collection('staffs');
  const roles = mongoose.connection.db.collection('roles');
  const departments = mongoose.connection.db.collection('departments');
  const labs = mongoose.connection.db.collection('laboratories');

  console.log('\n--- USER CREDENTIALS VERIFICATION (docs/development/users.md) ---');
  const testUsers = ['admin', 'reception', 'nurse', 'doctor', 'lab-tech', 'labtech', 'pharmacy'];

  for (const u of testUsers) {
    const ident = await identities.findOne({ username: u });
    if (!ident) {
      console.error(`  FAIL: User "${u}" NOT found in identities collection!`);
      continue;
    }
    const match = await bcrypt.compare('Password123!', ident.passwordHash);
    const staff = await staffs.findOne({ _id: ident.staffId });
    const role = staff ? await roles.findOne({ _id: staff.roleId }) : null;
    const dept = staff ? await departments.findOne({ _id: staff.departmentId }) : null;

    console.log(`  PASS: [${u.padEnd(10)}] -> Password: ${match ? 'OK' : 'MISMATCH'} | Role: ${(role?.name || 'N/A').padEnd(15)} | Dept: ${(dept?.name || 'N/A').padEnd(20)} | Name: ${staff?.fullName || 'N/A'}`);
  }

  console.log('\n--- DEPARTMENTS & DYNAMIC VITALS ---');
  const deptCount = await departments.countDocuments();
  const sampleDept = await departments.findOne({ code: 'GEN' });
  console.log(`  * Total Departments: ${deptCount}`);
  console.log(`  * General Medicine Vitals Defined: ${sampleDept?.vitalFields?.length || 0} fields`);

  console.log('\n--- LABORATORIES & TEST CATALOGS ---');
  const labList = await labs.find({}).toArray();
  console.log(`  * Total Laboratories: ${labList.length}`);
  labList.forEach(l => {
    console.log(`    - ${l.name} (${l.testCatalog?.length || 0} tests in catalog)`);
  });

  process.exit(0);
}

verifyAtlas().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
