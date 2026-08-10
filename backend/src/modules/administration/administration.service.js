const repo = require('./administration.repository');
const AppError = require('../../core/errors/AppError');

// ── Role & Permission Operations ─────────────────────────────────────────────────

const listRoles = () => repo.listRoles();

const listPermissions = () => repo.listPermissions();

const createRole = async (name, description) => {
  const existing = await repo.findRoleByName(name);
  if (existing) throw new AppError('BUSINESS_001');
  return repo.createRole({ name, description });
};

const assignPermissionsToRole = async (roleId, permissionIds) => {
  const role = await repo.findRoleById(roleId);
  if (!role) throw new AppError('NOT_FOUND', 'Role not found');
  
  // Verify all permissionIds exist
  const existingPermissions = await repo.findPermissionsByIds(permissionIds);
  if (existingPermissions.length !== permissionIds.length) {
    throw new AppError('VALIDATION_002', 'One or more permission IDs are invalid');
  }

  await repo.assignPermissionsToRole(roleId, permissionIds);
  return repo.getPermissionsForRole(roleId);
};

/**
 * Exported interface — used by auth middleware to resolve permissions for a role.
 * Other modules call this function, never direct DB access.
 */
const getPermissionCodesForRole = (roleId) => repo.getPermissionCodesForRole(roleId);

// ── Department Operations ────────────────────────────────────────────────────────

const getDepartmentById = async (id) => {
  const dept = await repo.findDepartmentById(id);
  if (!dept) throw new AppError('NOT_FOUND', 'Department not found');
  return dept;
};

/** Active departments — used by all modules that need to display dept options. */
const listDepartments = () => repo.listDepartments();

/** All departments including inactive — for admin management view. */
const listAllDepartments = () => repo.listAllDepartments();

/**
 * Create a new department.
 * Enforces: name uniqueness, code uniqueness, required fields.
 * Does NOT assign HOD — that is a separate lifecycle step per docs/file.md.
 */
const createDepartment = async (data) => {
  const existingName = await repo.findDepartmentByName(data.name);
  if (existingName) throw new AppError('BUSINESS_001', `Department name "${data.name}" already exists`);

  const existingCode = await repo.findDepartmentByCode(data.code);
  if (existingCode) throw new AppError('BUSINESS_001', `Department code "${data.code.toUpperCase()}" is already in use`);

  // Guard: Vitals schema only allowed for CLINICAL or CLINICAL/DIAGNOSTIC departments
  const deptType = data.type;
  if (deptType !== 'CLINICAL' && deptType !== 'CLINICAL/DIAGNOSTIC') {
    if (data.vitalFields && data.vitalFields.length > 0) {
      throw new AppError('BUSINESS_002', 'Vitals schema can only be configured for CLINICAL or CLINICAL/DIAGNOSTIC departments');
    }
  }

  return repo.createDepartment(data);
};

/**
 * Update department fields.
 * code/name uniqueness re-checked on change.
 */
const updateDepartment = async (id, data) => {
  const existing = await repo.findDepartmentById(id);
  if (!existing) throw new AppError('NOT_FOUND', 'Department not found');

  if (data.name && data.name !== existing.name) {
    const duplicate = await repo.findDepartmentByName(data.name);
    if (duplicate) throw new AppError('BUSINESS_001', `Department name "${data.name}" already exists`);
  }

  if (data.code && data.code.toUpperCase() !== existing.code) {
    const duplicate = await repo.findDepartmentByCode(data.code);
    if (duplicate) throw new AppError('BUSINESS_001', `Department code "${data.code.toUpperCase()}" is already in use`);
  }

  // Guard: Vitals schema only allowed for CLINICAL or CLINICAL/DIAGNOSTIC departments
  const newType = data.type || existing.type;
  if (newType !== 'CLINICAL' && newType !== 'CLINICAL/DIAGNOSTIC') {
    if (data.vitalFields && data.vitalFields.length > 0) {
      throw new AppError('BUSINESS_002', 'Vitals schema can only be configured for CLINICAL or CLINICAL/DIAGNOSTIC departments');
    }
    // Automatically clear vitalFields if department is updated to non-clinical type
    if (existing.vitalFields && existing.vitalFields.length > 0) {
      data.vitalFields = [];
    }
  }

  return repo.updateDepartment(id, data);
};

/**
 * Assign Head of Department.
 * Business rules per docs/file.md §Head of Department Workflow:
 *   1. Department must exist.
 *   2. Staff member must exist.
 *   3. Staff must be assigned to this department.
 *
 * SOLID / DIP: Lazy-loads staffService to prevent circular dependency at startup.
 */
const assignHod = async (deptId, staffId) => {
  const dept = await repo.findDepartmentById(deptId);
  if (!dept) throw new AppError('NOT_FOUND', 'Department not found');

  if (dept.status !== 'Active') {
    throw new AppError('BUSINESS_002', 'Cannot assign Head of Department to an inactive department');
  }

  // Lazy-load to prevent circular dependency
  const staffService = require('../staff/staff.service');
  const staff = await staffService.getById(staffId);
  if (!staff) throw new AppError('NOT_FOUND', 'Staff member not found');

  if (staff.status !== 'Active') {
    throw new AppError('BUSINESS_002', `Cannot appoint inactive staff member "${staff.fullName}" as HOD`);
  }

  // Guard: staff must belong to this department
  const staffDeptId = staff.departmentId?._id?.toString() || staff.departmentId?.toString();
  if (staffDeptId !== deptId.toString()) {
    throw new AppError(
      'BUSINESS_002',
      `Staff member "${staff.fullName}" is not assigned to this department and cannot be appointed as HOD`
    );
  }

  return repo.updateDepartment(deptId, { headOfDepartment: staffId });
};

/**
 * Soft-delete a department: marks status as Inactive.
 * Guards: cannot deactivate if active staff are assigned or labs are linked.
 */
const deleteDepartment = async (id) => {
  const existing = await repo.findDepartmentById(id);
  if (!existing) throw new AppError('NOT_FOUND', 'Department not found');

  // Check active staff
  const getStaffService = () => require('../staff/staff.service');
  const staffResponse = await getStaffService().list({ departmentId: id, status: 'Active', limit: 1 });
  if (staffResponse.total > 0) {
    throw new AppError('BUSINESS_002', 'Cannot deactivate department: active staff are still assigned to it');
  }

  // Check linked laboratories
  const getLabService = () => require('../laboratory/laboratory.service');
  const labs = await getLabService().getAllLaboratories({ departmentId: id });
  if (labs.length > 0) {
    throw new AppError('BUSINESS_002', 'Cannot deactivate department: it is linked to existing laboratories');
  }

  // Check for active patient visits currently routed to this department
  const Visit = require('../visits/visit.model');
  const activeVisitsCount = await Visit.countDocuments({
    departmentId: id,
    status: { $nin: ['COMPLETED', 'CANCELLED'] }
  });
  if (activeVisitsCount > 0) {
    throw new AppError('BUSINESS_002', 'Cannot deactivate department: active patient visits are still routed to it');
  }

  return repo.softDeleteDepartment(id);
};

// ── Settings Operations ──────────────────────────────────────────────────────────

const getSetting = async (key) => {
  const setting = await repo.getSetting(key);
  if (!setting) return null;
  return setting.value;
};

const updateSetting = async (key, value) => {
  const setting = await repo.updateSetting(key, value);
  return setting.value;
};

module.exports = {
  listRoles,
  listPermissions,
  createRole,
  assignPermissionsToRole,
  getPermissionCodesForRole,
  getDepartmentById,
  listDepartments,
  listAllDepartments,
  createDepartment,
  updateDepartment,
  assignHod,
  deleteDepartment,
  getSetting,
  updateSetting,
};

