const Role = require('./role.model');
const Permission = require('./permission.model');
const RolePermission = require('./rolePermission.model');
const Department = require('./department.model');
const Setting = require('./setting.model');

// ── Role & Permission Queries ────────────────────────────────────────────────────

const findRoleByName = (name) => Role.findOne({ name });
const findRoleById = (id) => Role.findById(id);
const listRoles = () => Role.find().lean();
const createRole = (data) => Role.create(data);

const findPermissionByCode = (code) => Permission.findOne({ code });
const listPermissions = () => Permission.find().lean();
const createPermission = (data) => Permission.create(data);
const findPermissionsByIds = (ids) => Permission.find({ _id: { $in: ids } }).lean();

const getPermissionsForRole = async (roleId) => {
  const rps = await RolePermission.find({ roleId }).populate('permissionId').lean();
  return rps.map((rp) => rp.permissionId);
};

const assignPermissionsToRole = async (roleId, permissionIds) => {
  const ops = permissionIds.map((pid) => ({
    updateOne: {
      filter: { roleId, permissionId: pid },
      update: { roleId, permissionId: pid },
      upsert: true,
    },
  }));
  return RolePermission.bulkWrite(ops);
};

const getPermissionCodesForRole = async (roleId) => {
  const perms = await getPermissionsForRole(roleId);
  return perms.map((p) => p.code);
};

// ── Department Queries ───────────────────────────────────────────────────────────

const findDepartmentById = (id) =>
  Department.findById(id).populate('headOfDepartment', 'fullName employeeId position').lean();

const findDepartmentByName = (name) => Department.findOne({ name }).lean();

const findDepartmentByCode = (code) => Department.findOne({ code: code.toUpperCase() }).lean();

/** Active departments only (operational listing). */
const listDepartments = () =>
  Department.find({ status: 'Active' })
    .populate('headOfDepartment', 'fullName employeeId position')
    .lean();

/** All departments including inactive — for admin management. */
const listAllDepartments = () =>
  Department.find({})
    .populate('headOfDepartment', 'fullName employeeId position')
    .lean();

const createDepartment = (data) => Department.create(data);

const updateDepartment = (id, data) =>
  Department.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true })
    .populate('headOfDepartment', 'fullName employeeId position')
    .lean();

/** Soft-delete: marks department Inactive. Never hard-deletes. */
const softDeleteDepartment = (id) =>
  Department.findByIdAndUpdate(id, { status: 'Inactive' }, { returnDocument: 'after' }).lean();

// ── Settings Queries ─────────────────────────────────────────────────────────────

const getSetting = (key) => Setting.findOne({ key }).lean();
const updateSetting = (key, value) =>
  Setting.findOneAndUpdate({ key }, { value }, { returnDocument: 'after', upsert: true }).lean();

module.exports = {
  // Role & Permission
  findRoleByName, findRoleById, listRoles, createRole,
  findPermissionByCode, listPermissions, createPermission, findPermissionsByIds,
  getPermissionsForRole, assignPermissionsToRole, getPermissionCodesForRole,
  // Department
  findDepartmentById, findDepartmentByName, findDepartmentByCode,
  listDepartments, listAllDepartments,
  createDepartment, updateDepartment, softDeleteDepartment,
  // Settings
  getSetting, updateSetting,
};

