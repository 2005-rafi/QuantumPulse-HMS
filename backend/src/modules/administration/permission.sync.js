const Permission = require('./permission.model');
const Role = require('./role.model');
const RolePermission = require('./rolePermission.model');
const { ROLE_PERMISSIONS } = require('../../core/constants');
const logger = require('../../core/logger');

const ALL_PERMISSION_DEFS = [
  // Patients
  { code: 'PATIENT_REGISTER',  module: 'patients',       description: 'Create a new patient record' },
  { code: 'PATIENT_UPDATE',    module: 'patients',       description: 'Update patient demographics' },
  { code: 'PATIENT_VIEW',      module: 'patients',       description: 'View patient identity and history' },
  { code: 'PATIENT_DELETE',    module: 'patients',       description: 'Request patient deletion' },
  // Visits
  { code: 'VISIT_CREATE',      module: 'visits',         description: 'Create a visit' },
  { code: 'VISIT_VIEW',        module: 'visits',         description: 'View visit details' },
  { code: 'VISIT_CLOSE',       module: 'visits',         description: 'Close a visit' },
  // Clinical Notes & Vitals
  { code: 'VITALS_RECORD',     module: 'nursing',        description: 'Record vitals and observations' },
  { code: 'NOTE_OPEN',         module: 'nursing',        description: 'Open a doctor note' },
  { code: 'NOTE_UPDATE',       module: 'doctor-notes',   description: 'Edit draft or in-progress note' },
  { code: 'NOTE_FINALIZE',     module: 'doctor-notes',   description: 'Finalize consultation' },
  { code: 'NOTE_AMEND',        module: 'doctor-notes',   description: 'Submit or approve amendment' },
  // Prescriptions
  { code: 'RX_CREATE',         module: 'prescriptions',  description: 'Create prescription' },
  { code: 'RX_CANCEL',         module: 'prescriptions',  description: 'Cancel prescription before finalization' },
  // Laboratory
  { code: 'LAB_ORDER_CREATE',  module: 'laboratory',     description: 'Order investigation' },
  { code: 'LAB_PROCESS',       module: 'laboratory',     description: 'Collect sample, run test, upload result' },
  { code: 'LAB_VERIFY',        module: 'laboratory',     description: 'Verify lab report' },
  { code: 'LAB_MANAGE',        module: 'laboratory',     description: 'Create/update/delete laboratories and test catalogs' },
  // Pharmacy
  { code: 'MEDICINE_DISPENSE', module: 'pharmacy',       description: 'Dispense medicine' },
  // Billing
  { code: 'BILL_GENERATE',     module: 'billing',        description: 'Generate bill' },
  { code: 'PAYMENT_RECORD',    module: 'billing',        description: 'Record payment' },
  // Administration & Auditing
  { code: 'MANAGE_USERS',      module: 'administration', description: 'Create and update staff, identity, roles, permissions' },
  { code: 'APPROVE_DELETION',  module: 'administration', description: 'Approve or reject deletion requests' },
  { code: 'VIEW_AUDIT',        module: 'audit',          description: 'Read activity logs' },
  // Appointments
  { code: 'APPOINTMENT_VIEW',            module: 'appointments', description: 'View appointment list and details' },
  { code: 'APPOINTMENT_CREATE',          module: 'appointments', description: 'Book new appointments' },
  { code: 'APPOINTMENT_UPDATE',          module: 'appointments', description: 'Reschedule or update appointment details' },
  { code: 'APPOINTMENT_CANCEL',          module: 'appointments', description: 'Cancel scheduled appointments' },
  { code: 'APPOINTMENT_CHECKIN',         module: 'appointments', description: 'Check-in patient and generate OPD visit ticket' },
  { code: 'APPOINTMENT_MARK_MISSED',     module: 'appointments', description: 'Mark unattended appointments as missed' },
  { code: 'APPOINTMENT_MANAGE_SCHEDULE', module: 'appointments', description: 'Configure doctor weekly schedules and slot capacity' },
  // Tariff & Financial Governance
  { code: 'TARIFF_VIEW',           module: 'tariff',         description: 'View service master catalog and tariff rules' },
  { code: 'TARIFF_MANAGE',         module: 'tariff',         description: 'Create, update, publish, or cancel tariff rules' },
  { code: 'MEDICINE_PRICE_MANAGE', module: 'pharmacy',       description: 'Manage pharmacy medicine pricing catalog' },
  { code: 'BILL_VIEW',             module: 'billing',        description: 'View patient bills, line items, and receipts' },
  { code: 'BILL_FINALIZE',         module: 'billing',        description: 'Finalize and lock patient bills' },
  { code: 'ADJUSTMENT_REQUEST',    module: 'billing',        description: 'Request financial adjustments and refunds' },
  { code: 'ADJUSTMENT_APPROVE',    module: 'billing',        description: 'Approve or reject financial adjustments' },
  { code: 'FINANCIAL_ANALYTICS',   module: 'billing',        description: 'Access financial revenue charts and analytics' },
];

/**
 * Idempotently synchronizes all system permission definitions and role-permission mappings.
 * Automatically executed during server bootstrap to ensure zero permission drift.
 */
async function syncSystemPermissions() {
  try {
    // 1. Upsert all permission definitions
    const permMap = {};
    for (const def of ALL_PERMISSION_DEFS) {
      const doc = await Permission.findOneAndUpdate(
        { code: def.code },
        { $set: def },
        { upsert: true, returnDocument: 'after' }
      );
      permMap[def.code] = doc;
    }

    // 2. Sync role-permission mappings from ROLE_PERMISSIONS
    let mappedCount = 0;
    for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
      const role = await Role.findOne({ name: roleName });
      if (!role) continue;

      for (const code of permCodes) {
        const permDoc = permMap[code];
        if (!permDoc) continue;

        await RolePermission.findOneAndUpdate(
          { roleId: role._id, permissionId: permDoc._id },
          { $set: { roleId: role._id, permissionId: permDoc._id } },
          { upsert: true }
        );
        mappedCount++;
      }
    }

    logger.info(`System permissions synchronized successfully (${Object.keys(permMap).length} permissions, ${mappedCount} role bindings active)`);
  } catch (err) {
    logger.error('Failed to synchronize system permissions on bootstrap', { error: err.message, stack: err.stack });
  }
}

module.exports = { syncSystemPermissions, ALL_PERMISSION_DEFS };
