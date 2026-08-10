const service = require('./identity.service');
const { success } = require('../../core/responses');

const create = async (req, res, next) => {
  try {
    const identity = await service.createIdentity(req.body);
    return success(res, identity, 'Login account created successfully', 201);
  } catch (err) { next(err); }
};

const changeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
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
