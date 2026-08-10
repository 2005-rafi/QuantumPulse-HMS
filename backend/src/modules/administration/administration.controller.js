const service = require('./administration.service');
const catchAsync = require('../../core/utils/catchAsync');
const { success } = require('../../core/responses');

// Lazy-load laboratoryService to avoid circular dependency at startup.
const getLabService = () => require('../laboratory/laboratory.service');

// ── Role & Permission Handlers ────────────────────────────────────────────────────

const listRoles = catchAsync(async (req, res) => {
  const roles = await service.listRoles();
  return success(res, roles, 'Roles retrieved successfully');
});

const listPermissions = catchAsync(async (req, res) => {
  const permissions = await service.listPermissions();
  return success(res, permissions, 'Permissions retrieved successfully');
});

const createRole = catchAsync(async (req, res) => {
  const { name, description } = req.body;
  const role = await service.createRole(name, description);
  return success(res, role, 'Role created successfully', 201);
});

const assignPermissionsToRole = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { permissionIds } = req.body;
  const permissions = await service.assignPermissionsToRole(id, permissionIds);
  return success(res, permissions, 'Permissions assigned successfully');
});

// ── Department Handlers ───────────────────────────────────────────────────────────

/** Active departments — used by all role dropdowns across the system. */
const listDepartments = catchAsync(async (req, res) => {
  const departments = await service.listDepartments();
  return success(res, departments, 'Departments retrieved successfully');
});

/** All departments including inactive — admin management only. */
const listAllDepartments = catchAsync(async (req, res) => {
  const departments = await service.listAllDepartments();
  return success(res, departments, 'All departments retrieved successfully');
});

const createDepartment = catchAsync(async (req, res) => {
  const dept = await service.createDepartment(req.body);
  return success(res, dept, 'Department created successfully', 201);
});

const updateDepartment = catchAsync(async (req, res) => {
  const dept = await service.updateDepartment(req.params.id, req.body);
  return success(res, dept, 'Department updated successfully');
});

const deleteDepartment = catchAsync(async (req, res) => {
  await service.deleteDepartment(req.params.id);
  return success(res, null, 'Department deactivated successfully');
});

/**
 * Assign Head of Department.
 * Body: { staffId }
 * Validates that staff belongs to this department before assigning.
 */
const assignHod = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { staffId } = req.body;
  const dept = await service.assignHod(id, staffId);
  return success(res, dept, 'Head of Department assigned successfully');
});

/**
 * Admin view: list all active laboratories for a given department.
 * Delegates to laboratoryService so business logic stays in one place.
 */
const getLaboratoriesByDepartment = catchAsync(async (req, res) => {
  const labs = await getLabService().getAllLaboratories({ departmentId: req.params.id });
  return success(res, labs, 'Laboratories for department retrieved successfully');
});

// ── Settings Handlers ─────────────────────────────────────────────────────────────

const getSetting = catchAsync(async (req, res) => {
  const value = await service.getSetting(req.params.key);
  return success(res, value, 'Setting retrieved successfully');
});

const updateSetting = catchAsync(async (req, res) => {
  const updatedValue = await service.updateSetting(req.params.key, req.body.value);
  return success(res, updatedValue, 'Setting updated successfully');
});

module.exports = {
  listRoles, listPermissions, createRole, assignPermissionsToRole,
  listDepartments, listAllDepartments, createDepartment, updateDepartment, deleteDepartment, assignHod,
  getLaboratoriesByDepartment,
  getSetting, updateSetting,
};


