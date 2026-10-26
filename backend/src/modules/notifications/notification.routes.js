/**
 * backend/src/modules/notifications/notification.routes.js
 */
const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const authenticate = require('../../core/middleware/authenticate.middleware');

router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.post('/read-all', notificationController.markAllAsRead);
router.post('/', notificationController.createNotification);

module.exports = router;
