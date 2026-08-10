/**
 * SEED SCRIPT — One-time bootstrap.
 * Creates the initial system data: departments, roles, permissions, and the first Administrator.
 *
 * Usage: node scripts/seed-admin.js
 * WARNING: Never expose this as an API route.
 * Guard: Refuses to run in production mode.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../src/core/config');
const { ROLES, PERMISSIONS, ROLE_PERMISSIONS, DEPARTMENTS, ACCOUNT_STATUS, STAFF_STATUS } = require('../src/core/constants');

// Load models
const Department = require('../src/modules/administration/department.model');
const Role = require('../src/modules/administration/role.model');
const Permission = require('../src/modules/administration/permission.model');
const RolePermission = require('../src/modules/administration/rolePermission.model');
const Staff = require('../src/modules/staff/staff.model');
const Identity = require('../src/modules/identity/identity.model');

// Permission definitions (code → module)
const PERMISSION_DEFS = [
  { code: 'PATIENT_REGISTER',  module: 'patients',       description: 'Create a new patient record' },
  { code: 'PATIENT_UPDATE',    module: 'patients',       description: 'Update patient demographics' },
  { code: 'PATIENT_VIEW',      module: 'patients',       description: 'View patient identity and history' },
  { code: 'PATIENT_DELETE',    module: 'patients',       description: 'Request patient deletion' },
  { code: 'VISIT_CREATE',      module: 'visits',         description: 'Create a visit' },
  { code: 'VISIT_VIEW',        module: 'visits',         description: 'View visit details' },
  { code: 'VISIT_CLOSE',       module: 'visits',         description: 'Close a visit' },
  { code: 'VITALS_RECORD',     module: 'nursing',        description: 'Record vitals and observations' },
  { code: 'NOTE_OPEN',         module: 'nursing',        description: 'Open a doctor note' },
  { code: 'NOTE_UPDATE',       module: 'doctor-notes',   description: 'Edit draft or in-progress note' },
  { code: 'NOTE_FINALIZE',     module: 'doctor-notes',   description: 'Finalize consultation' },
  { code: 'NOTE_AMEND',        module: 'doctor-notes',   description: 'Submit or approve amendment' },
  { code: 'RX_CREATE',         module: 'prescriptions',  description: 'Create prescription' },
  { code: 'RX_CANCEL',         module: 'prescriptions',  description: 'Cancel prescription before finalization' },
  { code: 'LAB_ORDER_CREATE',  module: 'laboratory',     description: 'Order investigation' },
  { code: 'LAB_PROCESS',       module: 'laboratory',     description: 'Collect sample, run test, upload result' },
  { code: 'LAB_VERIFY',        module: 'laboratory',     description: 'Verify lab report' },
  { code: 'LAB_MANAGE',        module: 'laboratory',     description: 'Create/update/delete laboratories and test catalogs (admin only)' },
  { code: 'MEDICINE_DISPENSE', module: 'pharmacy',       description: 'Dispense medicine' },
  { code: 'BILL_GENERATE',     module: 'billing',        description: 'Generate bill' },
  { code: 'PAYMENT_RECORD',    module: 'billing',        description: 'Record payment' },
  { code: 'MANAGE_USERS',      module: 'administration', description: 'Create and update staff, identity, roles, permissions' },
  { code: 'APPROVE_DELETION',  module: 'administration', description: 'Approve or reject deletion requests' },
  { code: 'VIEW_AUDIT',        module: 'audit',          description: 'Read activity logs' },
];

async function seed() {
  if (config.env === 'production') {
    console.error('ERROR: Seed script is disabled in production.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongoUri);
  console.log('Connected.');

  // 1. Seed Departments (Only the Administration department is mandatory for bootstrapping the Administrator)
  console.log('\n[1/6] Seeding mandatory departments...');
  const mandatoryDepts = DEPARTMENTS.filter(dept => dept.name === 'Administration');
  for (const dept of mandatoryDepts) {
    await Department.findOneAndUpdate({ name: dept.name }, dept, { upsert: true, new: true });
    process.stdout.write('.');
  }
  console.log(' Done.');

  // 2. Seed Roles
  console.log('[2/6] Seeding roles...');
  const roleMap = {};
  for (const roleName of Object.values(ROLES)) {
    const role = await Role.findOneAndUpdate({ name: roleName }, { name: roleName }, { upsert: true, new: true });
    roleMap[roleName] = role;
    process.stdout.write('.');
  }
  console.log(' Done.');

  // 3. Seed Permissions
  console.log('[3/6] Seeding permissions...');
  const permMap = {};
  for (const perm of PERMISSION_DEFS) {
    const p = await Permission.findOneAndUpdate({ code: perm.code }, perm, { upsert: true, new: true });
    permMap[perm.code] = p;
    process.stdout.write('.');
  }
  console.log(' Done.');

  // 4. Assign permissions to roles
  console.log('[4/6] Assigning role permissions...');
  for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = roleMap[roleName];
    if (!role) continue;
    for (const code of permCodes) {
      const perm = permMap[code];
      if (!perm) continue;
      await RolePermission.findOneAndUpdate(
        { roleId: role._id, permissionId: perm._id },
        { roleId: role._id, permissionId: perm._id },
        { upsert: true }
      );
    }
    process.stdout.write('.');
  }
  console.log(' Done.');

  // 5. Create Administrator staff record
  console.log('[5/6] Creating administrator staff record...');
  const adminDept = await Department.findOne({ name: 'Administration' });
  const adminRole = roleMap[ROLES.ADMINISTRATOR];

  let adminStaff = await Staff.findOne({ employeeId: 'EMP-00001' });
  if (!adminStaff) {
    adminStaff = await Staff.create({
      employeeId: 'EMP-00001',
      fullName: 'System Administrator',
      departmentId: adminDept._id,
      roleId: adminRole._id,
      position: 'Chief Executive Officer',
      status: STAFF_STATUS.ACTIVE,
      email: 'admin@hospital.local',
    });
    console.log(' Created.');
  } else {
    console.log(' Already exists.');
  }

  // 6. Create Administrator login account
  console.log('[6/6] Creating administrator login account...');
  const existing = await Identity.findOne({ staffId: adminStaff._id });
  const adminUsername = (config.initialAdmin?.username || 'admin').toLowerCase();
  const adminPassword = config.initialAdmin?.password || 'Password123!';

  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, config.bcryptRounds);
    await Identity.create({
      staffId: adminStaff._id,
      username: adminUsername,
      passwordHash,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    });
    console.log(' Created.');
  } else {
    console.log(' Already exists.');
  }

  console.log('\n========================================');
  console.log('  Seed complete!');
  console.log(`  Login:    username: ${adminUsername}`);
  console.log(`  Password: ${adminPassword}`);
  console.log('  CHANGE THIS PASSWORD IMMEDIATELY.');
  console.log('========================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
