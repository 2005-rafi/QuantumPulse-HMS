/**
 * scripts/test-ward-operations-role.js
 * Verification test for Ward Operations role, positions, permissions sync, staff registration, and login.
 */
require('dotenv').config({ path: '../secrets/backend.env' });
const mongoose = require('mongoose');
const { ROLES, POSITIONS } = require('../src/core/constants');
const { syncSystemPermissions } = require('../src/modules/administration/permission.sync');
const Role = require('../src/modules/administration/role.model');
const Department = require('../src/modules/administration/department.model');
const Permission = require('../src/modules/administration/permission.model');
const RolePermission = require('../src/modules/administration/rolePermission.model');
const staffService = require('../src/modules/staff/staff.service');
const identityService = require('../src/modules/identity/identity.service');

async function runTest() {
  console.log('--- STARTING WARD OPERATIONS ROLE VERIFICATION ---');
  await mongoose.connect(process.env.MONGO_URI);

  try {
    // 1. Sync System Permissions
    console.log('[1/4] Running syncSystemPermissions()...');
    await syncSystemPermissions();

    // 2. Verify Role & Department
    const roleDoc = await Role.findOne({ name: ROLES.WARD_OPERATIONS });
    console.log('[2/4] Ward Operations Role in DB:', roleDoc ? `Found (_id: ${roleDoc._id})` : 'NOT FOUND');
    if (!roleDoc) throw new Error('Ward Operations Role not found in database');

    const deptDoc = await Department.findOne({ code: 'WARD' });
    console.log('[2/4] Ward Operations Department in DB:', deptDoc ? `Found (${deptDoc.name}, _id: ${deptDoc._id})` : 'NOT FOUND');

    const rolePerms = await RolePermission.find({ roleId: roleDoc._id }).populate('permissionId');
    console.log(`[2/4] Ward Operations Permissions Count: ${rolePerms.length}`);
    const permCodes = rolePerms.map(rp => rp.permissionId?.code).filter(Boolean);
    console.log('[2/4] Perm Codes:', permCodes);

    // 3. Test Staff Registration under Ward Operations
    console.log('[3/4] Testing Staff Registration for Operations Manager...');
    const testEmail = `wardops_${Date.now()}@quantum.care`;
    const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

    const newStaff = await staffService.create({
      fullName: 'Vikram Ward Manager',
      firstName: 'Vikram',
      lastName: 'Manager',
      email: testEmail,
      phone: testPhone,
      roleId: roleDoc._id,
      departmentId: deptDoc._id,
      position: 'Operations Manager',
      employmentType: 'Full-time',
      joiningDate: new Date(),
      addressLine1: 'Facility Block 4B',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      country: 'India',
    });

    console.log('✅ Staff Created:', {
      _id: newStaff._id,
      employeeId: newStaff.employeeId,
      fullName: newStaff.fullName,
      position: newStaff.position,
      role: newStaff.roleId?.name,
    });

    // 4. Test Identity Creation and Login Authentication
    console.log('[4/4] Testing Identity Creation & Login Authentication...');
    const username = `WARD${Math.floor(1000 + Math.random() * 9000)}`;
    const tempPassword = 'WardSecurePass123!';

    const identity = await identityService.createIdentity({
      staffId: newStaff._id,
      username,
      password: tempPassword,
    });
    console.log('✅ Identity Created for Username:', identity.username);

    const loginResult = await identityService.authenticate({
      username,
      password: tempPassword,
      ipAddress: '127.0.0.1',
      userAgent: 'TestRunner/1.0',
    });

    console.log('✅ Login Succeeded! User Payload:', {
      userId: loginResult.user?.id,
      username: loginResult.user?.username,
      role: loginResult.user?.role,
      permissions: loginResult.user?.permissions?.length,
      firstLogin: loginResult.user?.firstLogin,
    });

    console.log('\n========================================');
    console.log('🎉 ALL TESTS PASSED! WARD OPERATIONS ROLE FULLY OPERATIONAL!');
    console.log('========================================\n');
  } catch (err) {
    console.error('❌ Test Failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
