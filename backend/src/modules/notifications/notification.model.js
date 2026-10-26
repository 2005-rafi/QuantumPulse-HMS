/**
 * backend/src/modules/notifications/notification.model.js
 * Persistent Notification Alert Model for Hospital Staff & Clinical Cockpits.
 */
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientRole: {
      type: String,
      enum: ['ALL', 'DOCTOR', 'NURSE', 'ADMIN', 'PHARMACIST', 'BILLING', 'LAB_TECH', 'SUPER_ADMIN'],
      default: 'ALL',
      index: true,
    },
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['INFO', 'WARNING', 'CRITICAL', 'CLINICAL_ALERT', 'PHARMACY_ALERT', 'BILLING_ALERT'],
      default: 'INFO',
    },
    link: {
      type: String,
      trim: true,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
        readAt: { type: Date, default: Date.now },
      },
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// High-speed compound indexes for role broadcasts & user alerts
notificationSchema.index({ recipientRole: 1, createdAt: -1 });
notificationSchema.index({ recipientUserId: 1, createdAt: -1 });
notificationSchema.index({ recipientRole: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
