const Permission = require('./permission.model');
const Role = require('./role.model');
const RolePermission = require('./role-permission.model');
const Department = require('./department.model');
const Staff = require('../staff/staff.model');
const Identity = require('../identity/identity.model');
const bcrypt = require('bcryptjs');
const config = require('../../core/config');
const { ROLES, ROLE_PERMISSIONS, ACCOUNT_STATUS, STAFF_STATUS } = require('../../core/constants');
const logger = require('../../core/logger');

const ALL_PERMISSION_DEFS = [
  // Patients
  { code: 'PATIENT_REGISTER',  module: 'patients',       description: 'Create a new patient record' },
  { code: 'PATIENT_UPDATE',    module: 'patients',       description: 'Update patient demographics' },
  { code: 'PATIENT_VIEW',        module: 'patients',       description: 'View patient identity and history' },
  { code: 'PATIENT_BASIC_VIEW',  module: 'patients',       description: 'View basic patient identifiers for clinical dispensing' },
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
  // Inpatient & Ward Operations
  { code: 'BED_VIEW',              module: 'ipd-beds',       description: 'View floor, room, and bed layout and live map' },
  { code: 'BED_ALLOCATE',          module: 'ipd-beds',       description: 'Admit and allocate patients to beds' },
  { code: 'BED_TRANSFER',          module: 'ipd-beds',       description: 'Transfer admitted patients between beds' },
  { code: 'BED_STATUS_UPDATE',     module: 'ipd-beds',       description: 'Update bed operational status (Maintenance, Cleaning, Vacant)' },
  { code: 'FACILITY_VIEW',         module: 'facility',       description: 'View hospital ward and physical facility structures' },
  { code: 'FACILITY_MANAGE',       module: 'facility',       description: 'Create and configure floors, rooms, and beds' },
  { code: 'DISCHARGE_VIEW',        module: 'ipd-discharge',  description: 'View inpatient discharge clearance and gate pass' },
  { code: 'DISCHARGE_INITIATE',    module: 'ipd-discharge',  description: 'Initiate or sign off departmental discharge clearance' },
  { code: 'TIME_MONITOR_VIEW',     module: 'ipd-monitoring', description: 'Access real-time bed turnaround and length-of-stay telemetry' },
  { code: 'HOUSEKEEPING_UPDATE',   module: 'housekeeping',   description: 'Execute bed cleaning timers and sanitization status' },
  // Nursing Domain Specific
  { code: 'EMAR_RECORD',           module: 'ipd-nursing',    description: 'Administer and document inpatient e-MAR medications' },
  { code: 'IO_BALANCE_LOG',        module: 'ipd-nursing',    description: 'Record fluid intake and output balance' },
  { code: 'SHIFT_HANDOVER',        module: 'ipd-nursing',    description: 'Record and acknowledge SBAR nursing shift handover' },
  { code: 'NURSING_CARE_PLAN',     module: 'ipd-nursing',    description: 'Maintain inpatient nursing care plans' },
  { code: 'OPD_TRIAGE',            module: 'nursing',        description: 'Conduct outpatient triage and record queue vitals' },
  // Surgery & Operating Theatre (OT)
  { code: 'OT_REQUEST',            module: 'ipd-ot',         description: 'Submit surgical operation theatre booking request' },
  { code: 'OT_BOOK',               module: 'ipd-ot',         description: 'Approve, schedule, and allocate OT room and staff' },
  { code: 'OT_MANAGE',             module: 'ipd-ot',         description: 'Manage active surgery session state and checklists' },
  { code: 'OT_CONSUMABLE_LOG',     module: 'ipd-ot',         description: 'Log surgical consumables and implants used in OT' },
  { code: 'OT_VIEW',               module: 'ipd-ot',         description: 'View OT session board, calendar, and surgical records' },
  { code: 'SURGICAL_NOTES',        module: 'ipd-ot',         description: 'Write operative notes and post-surgical recovery summary' },
  { code: 'ICU_TRANSFER',          module: 'ipd-ot',         description: 'Execute post-operative patient transfer to ICU/HDU/Recovery' },
];

/**
 * Idempotently synchronizes all system roles, permission definitions, role-permission mappings,
 * and ensures the initial administrator account is verified or bootstrapped without overwriting existing data.
 * Zero clinical or diagnostic departments are auto-seeded.
 */
async function syncSystemPermissions() {
  try {
    // 1. Ensure all Roles exist in a single bulk operation
    const roleBulkOps = Object.values(ROLES).map((roleName) => ({
      updateOne: {
        filter: { name: roleName },
        update: { $setOnInsert: { name: roleName, description: `${roleName} operational role` } },
        upsert: true,
      },
    }));
    await Role.bulkWrite(roleBulkOps, { ordered: false });

    // 2. Upsert all permission definitions in a single bulk operation
    const permBulkOps = ALL_PERMISSION_DEFS.map((def) => ({
      updateOne: {
        filter: { code: def.code },
        update: { $set: def },
        upsert: true,
      },
    }));
    await Permission.bulkWrite(permBulkOps, { ordered: false });

    // In-memory catalog lookup
    const [allRoles, allPerms] = await Promise.all([
      Role.find({}).lean(),
      Permission.find({}).lean(),
    ]);

    const roleMap = new Map(allRoles.map((r) => [r.name, r._id]));
    const permMap = new Map(allPerms.map((p) => [p.code, p._id]));

    // 3. Sync role-permission mappings in a single bulk operation
    const rolePermBulkOps = [];
    const roleCleanups = [];
    let mappedCount = 0;

    for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
      const roleId = roleMap.get(roleName);
      if (!roleId) continue;

      const validPermIds = [];
      for (const code of permCodes) {
        const permId = permMap.get(code);
        if (!permId) continue;

        validPermIds.push(permId);
        rolePermBulkOps.push({
          updateOne: {
            filter: { roleId, permissionId: permId },
            update: { $set: { roleId, permissionId: permId } },
            upsert: true,
          },
        });
        mappedCount++;
      }

      roleCleanups.push(
        RolePermission.deleteMany({
          roleId,
          permissionId: { $nin: validPermIds },
        })
      );
    }

    if (rolePermBulkOps.length > 0) {
      await RolePermission.bulkWrite(rolePermBulkOps, { ordered: false });
    }
    if (roleCleanups.length > 0) {
      await Promise.all(roleCleanups);
    }

    // 4. Secure Verification-Based Super Administrator Bootstrap
    try {
      const adminRole = await Role.findOne({ name: ROLES.ADMINISTRATOR });

      if (adminRole) {
        // Check if ANY active Administrator exists in the database
        const existingAdminStaff = await Staff.findOne({
          roleId: adminRole._id,
          isDeleted: false,
        });

        let existingIdentity = null;
        if (existingAdminStaff) {
          existingIdentity = await Identity.findOne({ staffId: existingAdminStaff._id });
        }
        if (!existingIdentity) {
          const adminUsername = (config.initialAdmin?.username || 'admin').trim().toLowerCase();
          existingIdentity = await Identity.findOne({ username: adminUsername });
        }

        if (existingIdentity) {
          if (existingIdentity.accountStatus === ACCOUNT_STATUS.LOCKED) {
            await Identity.findByIdAndUpdate(existingIdentity._id, {
              accountStatus: ACCOUNT_STATUS.ACTIVE,
              failedLoginAttempts: 0,
              lockUntil: null,
            });
            logger.info('[AuthBootstrap] Administrator account was locked; automatically self-healed and unlocked.');
          } else {
            logger.info('[AuthBootstrap] Active Administrator verified in database. Existing credentials kept intact (zero-overwrite).');
          }
        } else {
          // No administrator account exists: provision initial root administrator
          const adminUsername = (config.initialAdmin?.username || 'admin').trim().toLowerCase();
          const adminDept = (await Department.findOne({ name: 'Administration' })) || (await Department.findOne({ code: 'ADMIN' })) || null;

          let adminStaff = existingAdminStaff;
          if (!adminStaff) {
            adminStaff = await Staff.create({
              employeeId: 'EMP-00001',
              fullName: 'System Administrator',
              firstName: 'System',
              lastName: 'Administrator',
              departmentId: adminDept?._id || null,
              roleId: adminRole._id,
              position: 'System Administrator',
              positionRank: 4,
              status: STAFF_STATUS.ACTIVE,
              isDeleted: false,
              email: 'admin@hospital.local',
            });
          }

          const password = config.initialAdmin?.password || 'Password123!';
          const passwordHash = await bcrypt.hash(password, config.bcryptRounds || 12);

          await Identity.create({
            staffId: adminStaff._id,
            username: adminUsername,
            passwordHash,
            accountStatus: ACCOUNT_STATUS.ACTIVE,
            failedLoginAttempts: 0,
            lockUntil: null,
            firstLogin: false,
            passwordChangedAt: new Date(),
          });

          logger.info(`[AuthBootstrap] Initial root administrator provisioned successfully (username: "${adminUsername}").`);
        }
      }
    } catch (adminErr) {
      logger.warn(`Initial admin bootstrap check notice: ${adminErr.message}`);
    }

    logger.info(`System permissions & roles synchronized successfully (${Object.keys(permMap).length} permissions, ${mappedCount} role bindings active)`);
  } catch (err) {
    logger.error('Failed to synchronize system permissions on bootstrap', { error: err.message, stack: err.stack });
  }
}

module.exports = { syncSystemPermissions, ALL_PERMISSION_DEFS };
