require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const config = require('../src/core/config');
const staffService = require('../src/modules/staff/staff.service');
const Department = require('../src/modules/administration/department.model');
const Role = require('../src/modules/administration/role.model');

async function testStaffRoleQueries() {
  console.log('=== 🩺 TESTING STAFF ROLE & DEPARTMENT QUERIES FOR ALL ROLES ===\n');

  await mongoose.connect(config.mongoUri);
  console.log('Connected to MongoDB.\n');

  try {
    const departments = await Department.find({ isActive: true }).lean();
    const deptId = departments[0]?._id?.toString();
    console.log(`Using Department: ${departments[0]?.name} (${deptId})\n`);

    const rolesToTest = ['Doctor', 'Nurse', 'Administrator', 'Laboratory', 'Pharmacy', 'Receptionist'];

    for (const roleName of rolesToTest) {
      console.log(`--- Testing query: { role: '${roleName}', departmentId: '${deptId}' } ---`);
      const result = await staffService.list({ role: roleName, departmentId: deptId });
      console.log(`✅ Success for ${roleName}! Total matching staff: ${result.total}, Page items: ${result.items?.length}`);
    }

    console.log('\n--- Testing query with direct roleId ---');
    const doctorRole = await Role.findOne({ name: 'Doctor' });
    if (doctorRole) {
      const result2 = await staffService.list({ roleId: doctorRole._id, departmentId: deptId });
      console.log(`✅ Success for direct roleId (${doctorRole._id})! Matching: ${result2.total}`);
    }

    console.log('\n--- Testing query with multiple roles & status ---');
    const result3 = await staffService.list({ status: 'ACTIVE' });
    console.log(`✅ Success for general active staff query! Matching: ${result3.total}`);

    console.log('\n🎉 ALL ROLE AND STAFF QUERIES PASSED WITH 0 ERRORS!');
  } catch (err) {
    console.error('❌ Error during staff query test:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

testStaffRoleQueries();
