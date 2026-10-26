const service = require('./identity.service');
const { success } = require('../../core/responses');

const create = async (req, res, next) => {
  try {
    const isCallerAdmin = req.user?.role === 'Administrator' || req.user?.permissions?.includes('MANAGE_USERS');
    const isCallerHod = Boolean(req.user?.isHod) && !isCallerAdmin;

    if (isCallerHod) {
      const staffService = require('../staff/staff.service');
      const targetStaff = await staffService.getById(req.body.staffId);
      const hodDept = String(req.user.hodDepartmentId || req.user.departmentId);
      const targetDept = targetStaff.departmentId?._id ? String(targetStaff.departmentId._id) : String(targetStaff.departmentId || '');
      if (targetDept !== hodDept) {
        const AppError = require('../../core/errors/app-error');
        throw new AppError('FORBIDDEN', 'HOD can only create credentials for staff in their own department.');
      }
    }

    const identity = await service.createIdentity(req.body);
    return success(res, identity, 'Login account created successfully', 201);
  } catch (err) { next(err); }
};

const changeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const isCallerAdmin = req.user?.role === 'Administrator' || req.user?.permissions?.includes('MANAGE_USERS');
    const isCallerHod = Boolean(req.user?.isHod) && !isCallerAdmin;

    if (isCallerHod) {
      const AppError = require('../../core/errors/app-error');
      if (String(req.user.userId) === String(id)) {
        throw new AppError('FORBIDDEN', 'HOD cannot alter status of their own account.');
      }
      const targetIdentity = await service.getById(id);
      if (!targetIdentity) throw new AppError('NOT_FOUND', 'Target identity not found');
      
      const staffService = require('../staff/staff.service');
      const targetStaff = await staffService.getById(targetIdentity.staffId.toString());
      const hodDept = String(req.user.hodDepartmentId || req.user.departmentId);
      const targetDept = targetStaff.departmentId?._id ? String(targetStaff.departmentId._id) : String(targetStaff.departmentId || '');
      if (targetDept !== hodDept) {
        throw new AppError('FORBIDDEN', 'HOD can only alter accounts for staff in their own department.');
      }
    }

    const identity = await service.changeStatus(id, status);
    return success(res, identity, `Account status changed to ${status}`);
  } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Self-service OR admin: id must match req.user.userId or user must have MANAGE_USERS
    const isSelf = req.user.userId === id;
    const isAdmin = req.user.permissions.includes('MANAGE_USERS');
    if (!isSelf && !isAdmin) {
      const { error: sendError } = require('../../core/responses');
      return sendError(res, 'AUTHZ_001', 'Permission not granted', null, 403);
    }
    const result = await service.changePassword(id, req.body.password);
    return success(res, result, 'Password changed successfully');
  } catch (err) { next(err); }
};

module.exports = { create, changeStatus, changePassword };
