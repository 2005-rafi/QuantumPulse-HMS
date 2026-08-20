require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const mongoose = require('mongoose');
const config = require('../src/core/config');
const { ROLE_PERMISSIONS } = require('../src/core/constants');

const Role = require('../src/modules/administration/role.model');
const Permission = require('../src/modules/administration/permission.model');
const RolePermission = require('../src/modules/administration/rolePermission.model');

const ALL_PERMISSION_DEFS = [
  { code: 'PATIENT_REGISTER',  module: 'patients',       description: 'Register new patients' },
  { code: 'PATIENT_UPDATE',    module: 'patients',       description: 'Update patient demographics' },
  { code: 'PATIENT_VIEW',      module: 'patients',       description: 'Search and read patient records' },
  { code: 'PATIENT_DELETE',    module: 'patients',       description: 'Submit patient deletion request' },
  { code: 'VISIT_CREATE',      module: 'visits',         description: 'Check in a patient for a visit' },
  { code: 'VISIT_VIEW',        module: 'visits',         description: 'View patient visits and queue' },
  { code: 'VISIT_CLOSE',       module: 'visits',         description: 'Mark visit completed or cancelled' },
  { code: 'VITALS_RECORD',     module: 'visits',         description: 'Record triage vitals' },
  { code: 'NOTE_OPEN',         module: 'consultations',  description: 'Start consultation, set status in-progress' },
  { code: 'NOTE_UPDATE',       module: 'consultations',  description: 'Save draft consultation note' },
  { code: 'NOTE_FINALIZE',     module: 'consultations',  description: 'Finalize consultation note' },
  { code: 'NOTE_AMEND',        module: 'consultations',  description: 'Amend finalized consultation note' },
  { code: 'RX_CREATE',         module: 'pharmacy',       description: 'Write prescription' },
  { code: 'RX_CANCEL',         module: 'pharmacy',       description: 'Cancel prescription' },
  { code: 'MEDICINE_DISPENSE', module: 'pharmacy',       description: 'Dispense prescription medications' },
  { code: 'LAB_ORDER_CREATE',  module: 'laboratory',     description: 'Order lab tests' },
  { code: 'LAB_PROCESS',       module: 'laboratory',     description: 'Record test results' },
  { code: 'LAB_VERIFY',        module: 'laboratory',     description: 'Sign off verified lab result' },
  { code: 'LAB_MANAGE',        module: 'laboratory',     description: 'Configure lab types, tests, pricing' },
  { code: 'BILL_GENERATE',     module: 'billing',        description: 'Generate itemized bills and print' },
  { code: 'PAYMENT_RECORD',    module: 'billing',        description: 'Record payment for billed items' },
  { code: 'MANAGE_USERS',      module: 'administration', description: 'Create and update staff, identity, roles, permissions' },
  { code: 'APPROVE_DELETION',  module: 'administration', description: 'Approve or reject deletion requests' },
  { code: 'VIEW_AUDIT',        module: 'audit',          description: 'Read activity logs' },
  { code: 'APPOINTMENT_VIEW',            module: 'appointments', description: 'View appointment list and details' },
  { code: 'APPOINTMENT_CREATE',          module: 'appointments', description: 'Book new appointments' },
  { code: 'APPOINTMENT_UPDATE',          module: 'appointments', description: 'Reschedule or update appointment details' },
  { code: 'APPOINTMENT_CANCEL',          module: 'appointments', description: 'Cancel scheduled appointments' },
  { code: 'APPOINTMENT_CHECKIN',         module: 'appointments', description: 'Check-in patient and generate OPD visit ticket' },
  { code: 'APPOINTMENT_MARK_MISSED',     module: 'appointments', description: 'Mark unattended appointments as missed' },
  { code: 'APPOINTMENT_MANAGE_SCHEDULE', module: 'appointments', description: 'Configure doctor weekly schedules and slot capacity' },
];

async function syncAllRolePermissions() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongoUri);
  console.log('Connected to DB.');

  console.log('\n[1/3] Upserting all Permission records...');
  const permMap = {};
  for (const pDef of ALL_PERMISSION_DEFS) {
    const perm = await Permission.findOneAndUpdate(
      { code: pDef.code },
      { $set: pDef },
      { upsert: true, returnDocument: 'after' }
    );
    permMap[pDef.code] = perm;
  }
  console.log(`Upserted ${Object.keys(permMap).length} permissions.`);

  console.log('\n[2/3] Syncing role-to-permission mappings...');
  for (const [roleName, codeList] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await Role.findOne({ name: roleName });
    if (!role) {
      console.warn(`Role ${roleName} not found in DB, skipping...`);
      continue;
    }

    console.log(`Syncing role: ${roleName}...`);
    for (const code of codeList) {
      const perm = permMap[code];
      if (!perm) {
        console.warn(`Permission code ${code} not in definitions!`);
        continue;
      }

      await RolePermission.findOneAndUpdate(
        { roleId: role._id, permissionId: perm._id },
        { $set: { roleId: role._id, permissionId: perm._id } },
        { upsert: true, returnDocument: 'after' }
      );
      console.log(`  ✓ ${roleName} -> ${code}`);
    }
  }

  console.log('\n[3/3] Permission sync complete!');
  await mongoose.disconnect();
}

syncAllRolePermissions().catch((err) => {
  console.error('Permission sync failed:', err);
  process.exit(1);
});
