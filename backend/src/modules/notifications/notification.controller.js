/**
 * backend/src/modules/notifications/notification.controller.js
 */
const notificationService = require('./notification.service');
const { success } = require('../../core/responses');
const catchAsync = require('../../core/utils/catch-async');

class NotificationController {
  getNotifications = catchAsync(async (req, res) => {
    const { limit, unreadOnly } = req.query;
    const result = await notificationService.getUserNotifications(req.user, {
      limit,
      unreadOnly: unreadOnly === 'true',
    });
    return success(res, result, 'Notifications fetched successfully', 200);
  });

  markAsRead = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await notificationService.markAsRead(id, req.user);
    return success(res, result, 'Notification marked as read', 200);
  });

  markAllAsRead = catchAsync(async (req, res) => {
    const result = await notificationService.markAllAsRead(req.user);
    return success(res, result, 'All notifications marked as read', 200);
  });

  createNotification = catchAsync(async (req, res) => {
    const result = await notificationService.createNotification(req.body);
    return success(res, result, 'Notification created successfully', 201);
  });
}

module.exports = new NotificationController();
