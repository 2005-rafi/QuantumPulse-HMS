/**
 * backend/src/modules/notifications/notification.service.js
 * Persistent notification service handling role-based broadcasts and user-specific alerts.
 */
const Notification = require('./notification.model');

class NotificationService {
  /**
   * Fetch notifications targeted to the authenticated user's role or user ID.
   * Calculates accurate unread count for badge indicators.
   */
  async getUserNotifications(user, options = {}) {
    const userId = user._id || user.id || user.staffId;
    const userRole = (user.role || '').toUpperCase();
    const limit = parseInt(options.limit, 10) || 20;

    const baseRoleFilter = {
      $or: [
        { recipientUserId: userId },
        { recipientRole: 'ALL' },
        { recipientRole: userRole },
      ],
    };

    // Unread check: Not flagged isRead AND user._id not in readBy array
    const unreadCondition = {
      isRead: false,
      'readBy.userId': { $ne: userId },
    };

    const queryFilter = options.unreadOnly
      ? { ...baseRoleFilter, ...unreadCondition }
      : baseRoleFilter;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(queryFilter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({ ...baseRoleFilter, ...unreadCondition }),
    ]);

    // Format list, adding isReadForUser boolean flag
    const formatted = (notifications || []).map((n) => {
      const isReadForThisUser =
        n.isRead ||
        Boolean(n.readBy && n.readBy.some((r) => String(r.userId) === String(userId)));
      return {
        ...n,
        isRead: isReadForThisUser,
      };
    });

    return {
      notifications: formatted,
      unreadCount,
    };
  }

  /**
   * Mark a specific notification as read by this user.
   */
  async markAsRead(notificationId, user) {
    const userId = user._id || user.id || user.staffId;
    const notification = await Notification.findById(notificationId);
    if (!notification) return null;

    if (notification.recipientUserId && String(notification.recipientUserId) === String(userId)) {
      notification.isRead = true;
    }

    const alreadyRead = notification.readBy.some((r) => String(r.userId) === String(userId));
    if (!alreadyRead) {
      notification.readBy.push({ userId, readAt: new Date() });
    }

    await notification.save();
    return notification;
  }

  /**
   * Mark all active notifications for this user as read.
   */
  async markAllAsRead(user) {
    const userId = user._id || user.id || user.staffId;
    const userRole = (user.role || '').toUpperCase();

    const roleFilter = {
      $or: [
        { recipientUserId: userId },
        { recipientRole: 'ALL' },
        { recipientRole: userRole },
      ],
    };

    // 1. Mark direct user notifications
    await Notification.updateMany(
      { recipientUserId: userId, isRead: false },
      { $set: { isRead: true } }
    );

    // 2. Add user to readBy for role notifications
    await Notification.updateMany(
      {
        ...roleFilter,
        'readBy.userId': { $ne: userId },
      },
      {
        $push: { readBy: { userId, readAt: new Date() } },
      }
    );

    return { success: true };
  }

  /**
   * Dispatch a new notification alert.
   */
  async createNotification(data) {
    return await Notification.create(data);
  }
}

module.exports = new NotificationService();
