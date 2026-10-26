/**
 * backend/src/modules/auth/bootstrap.controller.js
 * BFF Session Bootstrapper: Single-roundtrip atomic session hydration controller.
 * Eliminates client-side request waterfalls and layout shifts (CLS) on app boot.
 */
const authService = require('./auth.service');
const notificationService = require('../notifications/notification.service');
const Department = require('../administration/department.model');
const { success } = require('../../core/responses');
const logger = require('../../core/logger');

/**
 * Determine active hospital clinical shift based on local server hour
 */
const resolveHospitalShift = () => {
  const currentHour = new Date().getHours();
  if (currentHour >= 8 && currentHour < 16) return 'MORNING_SHIFT';
  if (currentHour >= 16 && currentHour < 24) return 'EVENING_SHIFT';
  return 'NIGHT_SHIFT';
};

/**
 * Session bootstrap handler
 * GET /api/v1/auth/bootstrap
 */
const bootstrapSession = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthenticated session' });
    }

    // 1. Fetch current authenticated user with permissions & role details
    const user = await authService.me(userId);

    // 2. Concurrently fetch department details and notifications in parallel
    const [departmentDoc, notificationSummary] = await Promise.all([
      user.departmentId
        ? Department.findById(user.departmentId).lean().catch(() => null)
        : null,
      notificationService
        ? notificationService.getUserNotifications(user, { limit: 5 }).catch((err) => {
            logger.warn('Failed to load notifications during bootstrap', { error: err.message });
            return { notifications: [], unreadCount: 0 };
          })
        : Promise.resolve({ notifications: [], unreadCount: 0 }),
    ]);

    // 3. Determine break-glass override authorization
    const breakGlassEligibleRoles = [
      'Administrator',
      'Doctor',
      'Surgeon',
      'Head of Department',
      'Emergency Physician',
      'Nurse',
    ];
    const isBreakGlassEligible =
      breakGlassEligibleRoles.includes(user.role) ||
      user.isHod ||
      (user.positionRank && user.positionRank >= 2);

    // 4. Construct composite bootstrap payload
    const bootstrapPayload = {
      user: {
        id: user.id,
        staffId: user.staffId,
        username: user.username,
        fullName: user.fullName,
        employeeId: user.employeeId,
        role: user.role,
        department: user.department,
        departmentId: user.departmentId,
        isHod: user.isHod,
        hodDepartmentId: user.hodDepartmentId,
        position: user.position,
        positionRank: user.positionRank,
        permissions: user.permissions || [],
      },
      department: departmentDoc
        ? {
            id: departmentDoc._id.toString(),
            name: departmentDoc.name,
            code: departmentDoc.code,
            description: departmentDoc.description || '',
            isActive: departmentDoc.isActive !== false,
          }
        : {
            id: user.departmentId || null,
            name: user.department || 'General',
            code: 'GEN',
            isActive: true,
          },
      notifications: {
        unreadCount: notificationSummary?.unreadCount || 0,
        recent: (notificationSummary?.notifications || []).slice(0, 5),
      },
      security: {
        breakGlassEligible: isBreakGlassEligible,
        encryptionStandard: 'AES-256-GCM',
        sessionHydratedAt: new Date().toISOString(),
      },
      facility: {
        name: 'Quantum CareOne Medical Center',
        status: 'OPERATIONAL',
        timezone: 'Asia/Kolkata',
        currentShift: resolveHospitalShift(),
        serverTime: new Date().toISOString(),
      },
    };

    return success(res, bootstrapPayload, 'Session bootstrapped successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  bootstrapSession,
  resolveHospitalShift,
};
