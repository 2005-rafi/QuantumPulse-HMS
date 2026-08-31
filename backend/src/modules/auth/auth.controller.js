const service = require('./auth.service');
const { success } = require('../../core/responses');
const auditService = require('../audit/audit.service');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await service.login(username, password);
    
    // Log audit event
    auditService.logEvent(
      result.user.staffId,
      result.user.role,
      'LOGIN',
      null,
      { username },
      req.ip
    );

    return success(res, result, 'Login successful');
  } catch (err) { next(err); }
};

const logout = async (req, res, next) => {
  try {
    await service.logout(req.user.userId);
    return success(res, null, 'Logged out successfully');
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await service.refresh(refreshToken);
    return success(res, tokens, 'Token refreshed successfully');
  } catch (err) { next(err); }
};

const me = async (req, res, next) => {
  try {
    const user = await service.me(req.user.userId);
    return success(res, user, 'User info retrieved successfully');
  } catch (err) { next(err); }
};

const unlock = async (req, res, next) => {
  try {
    const { password, username } = req.body;
    const userId = req.user?.userId || null;
    const result = await service.unlock(userId, username, password);
    
    // Log audit event
    auditService.logEvent(
      result.user.staffId,
      result.user.role,
      'TERMINAL_UNLOCKED',
      null,
      { userId: result.user.userId },
      req.ip
    );

    return success(res, result, 'Workstation unlocked successfully');
  } catch (err) { next(err); }
};

module.exports = { login, logout, refresh, me, unlock };
