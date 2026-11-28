/**
 * backend/src/core/database/register-models.js
 * Centralized Mongoose Model Registry.
 *
 * Guarantees that all database schemas and models are registered into Mongoose memory
 * on startup, completely preventing MissingSchemaError during cross-collection populate() operations.
 */

const registerAllModels = () => {
  // 1. Core Database & Identity
  require('./counter.model');
  require('../../modules/identity/identity.model');
  require('../../modules/audit/audit.model');
  require('../../modules/notifications/notification.model');

  // 2. Administration & Staff
  require('../../modules/administration/department.model');
  require('../../modules/administration/permission.model');
  require('../../modules/administration/role.model');
  require('../../modules/administration/role-permission.model');
  require('../../modules/administration/setting.model');
  require('../../modules/staff/staff.model');
  require('../../modules/staff/position-history.model');

  // 3. Patients & Encounters
  require('../../modules/patient/patient.model');
  require('../../modules/patient/deletion-request.model');
  require('../../modules/patient/break-glass-grant.model');
  require('../../modules/visits/visit.model');
  require('../../modules/visits/token-counter.model');
  require('../../modules/appointments/appointment.model');
  require('../../modules/appointments/doctor-schedule.model');

  // 4. Inpatient (IPD) Suite
  require('../../modules/ipd/admission/ipd-admission.model');
  require('../../modules/ipd/beds/bed.model');
  require('../../modules/ipd/beds/room.model');
  require('../../modules/ipd/beds/floor.model');
  require('../../modules/ipd/beds/bed-allocation.model');
  require('../../modules/ipd/billing/advance-deposit.model');
  require('../../modules/ipd/discharge/ipd-clearance.model');
  require('../../modules/ipd/cpoe/cpoe-order.model');
  require('../../modules/ipd/cpoe/ward-round.model');
  require('../../modules/ipd/nursing/emar-record.model');
  require('../../modules/ipd/nursing/io-balance.model');
  require('../../modules/ipd/nursing/shift-handover.model');
  require('../../modules/ipd/nursing/vitals-flowsheet.model');
  require('../../modules/ipd/ot/ot-session.model');
  require('../../modules/ipd/ot/ot-consumable.model');

  // 5. Billing & Tariffs
  require('../../modules/billing/bill.model');
  require('../../modules/tariff/service-master.model');
  require('../../modules/tariff/tariff-rule.model');

  // 6. Pharmacy & Laboratory
  require('../../modules/pharmacy/medicine-price.model');
  require('../../modules/pharmacy/models/pharmacy-item.model');
  require('../../modules/pharmacy/models/pharmacy-batch.model');
  require('../../modules/pharmacy/models/stock-ledger.model');
  require('../../modules/laboratory/laboratory.model');
  require('../../modules/laboratory/laboratory-scan.model');
};

module.exports = { registerAllModels };
