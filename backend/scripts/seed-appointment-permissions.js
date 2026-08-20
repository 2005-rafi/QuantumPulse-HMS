/**
 * SEED SCRIPT — Appointment Permissions Seed
 * Seeds new appointment permissions and maps them to appropriate roles.
 *
 * Usage: node scripts/seed-appointment-permissions.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });

const mongoose = require('mongoose');
const config = require('../src/core/config');
const { ROLES, PERMISSIONS, ROLE_PERMISSIONS } = require('../src/core/constants');

const Role = require('../src/modules/administration/role.model');
const Permission = require('../src/modules/administration/permission.model');
const RolePermission = require('../src/modules/administration/rolePermission.model');

const APPOINTMENT_PERMISSION_DEFS = [
  { code: 'APPOINTMENT_VIEW',            module: 'appointments', description: 'View appointment list and details' },
  { code: 'APPOINTMENT_CREATE',          module: 'appointments', description: 'Book new appointments' },
  { code: 'APPOINTMENT_UPDATE',          module: 'appointments', description: 'Reschedule or update appointment details' },
  { code: 'APPOINTMENT_CANCEL',          module: 'appointments', description: 'Cancel scheduled appointments' },
  { code: 'APPOINTMENT_CHECKIN',         module: 'appointments', description: 'Check-in patient and generate OPD visit ticket' },
  { code: 'APPOINTMENT_MARK_MISSED',     module: 'appointments', description: 'Mark unattended appointments as missed' },
  { code: 'APPOINTMENT_MANAGE_SCHEDULE', module: 'appointments', description: 'Configure doctor weekly schedules and slot capacity' },
];

async function seedPermissions() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongoUri);
  console.log('Connected.');

  console.log('\n[1/2] Seeding appointment permissions...');
  const permMap = {};
  for (const perm of APPOINTMENT_PERMISSION_DEFS) {
    const p = await Permission.findOneAndUpdate(
      { code: perm.code },
      perm,
      { upsert: true, new: true }
    );
    permMap[perm.code] = p;
    console.log(`  + Permission: ${perm.code}`);
  }

  console.log('\n[2/2] Assigning appointment permissions to roles...');
  for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await Role.findOne({ name: roleName });
    if (!role) {
      console.warn(`Role ${roleName} not found in DB, skipping...`);
      continue;
    }

    const apptCodes = permCodes.filter((code) => code.startsWith('APPOINTMENT_'));
    for (const code of apptCodes) {
      const perm = permMap[code];
      if (!perm) continue;

      await RolePermission.findOneAndUpdate(
        { roleId: role._id, permissionId: perm._id },
        { roleId: role._id, permissionId: perm._id },
        { upsert: true }
      );
      console.log(`  + Assigned ${code} to ${roleName}`);
    }
  }

  console.log('\nAppointment permissions seeding complete!');
  await mongoose.disconnect();
}

seedPermissions().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
