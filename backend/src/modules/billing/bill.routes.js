const express = require('express');
const router = express.Router();
const controller = require('./bill.controller');
const authenticate = require('../../core/middleware/authenticate.middleware');
const { requirePermission } = require('../../core/middleware/authorize.middleware');
const { PERMISSIONS } = require('../../core/constants');

router.use(authenticate);

// Bill lookup & Cashier queue
router.get('/encounters-queue', requirePermission(PERMISSIONS.BILL_VIEW), controller.getEncountersQueue);
router.get('/', requirePermission(PERMISSIONS.BILL_VIEW), controller.listBills);
router.get('/outstanding', requirePermission(PERMISSIONS.FINANCIAL_ANALYTICS), controller.getOutstandingBills);
router.get('/visit/:visitId', requirePermission(PERMISSIONS.BILL_VIEW), controller.getBillByVisit);
router.post('/visit/:visitId/get-or-create', requirePermission([PERMISSIONS.BILL_VIEW, PERMISSIONS.BILL_GENERATE]), controller.getOrCreateForVisit);
router.post('/admission/:admissionId/get-or-create', requirePermission([PERMISSIONS.BILL_VIEW, PERMISSIONS.BILL_GENERATE]), controller.getOrCreateForAdmission);
router.get('/:id', requirePermission(PERMISSIONS.BILL_VIEW), controller.getBillById);

// Bill management
router.post('/:id/line-items', requirePermission(PERMISSIONS.BILL_GENERATE), controller.addLineItem);
router.post('/:id/payments', requirePermission(PERMISSIONS.PAYMENT_RECORD), controller.recordPayment);
router.post('/:id/finalize', requirePermission([PERMISSIONS.BILL_FINALIZE, PERMISSIONS.BILL_GENERATE]), controller.finalizeBill);
router.post('/:id/adjustments', requirePermission(PERMISSIONS.ADJUSTMENT_REQUEST), controller.requestAdjustment);
router.put('/:id/adjustments/:adjId/approve', requirePermission(PERMISSIONS.ADJUSTMENT_APPROVE), controller.approveAdjustment);

// Analytics (ADMIN only)
router.get('/analytics/summary', requirePermission(PERMISSIONS.FINANCIAL_ANALYTICS), controller.getAnalyticsSummary);
router.get('/analytics/by-category', requirePermission(PERMISSIONS.FINANCIAL_ANALYTICS), controller.getAnalyticsByCategory);
router.get('/analytics/trend', requirePermission(PERMISSIONS.FINANCIAL_ANALYTICS), controller.getAnalyticsTrend);
router.get('/analytics/payment-methods', requirePermission(PERMISSIONS.FINANCIAL_ANALYTICS), controller.getAnalyticsPaymentMethods);
router.get('/analytics/day-of-week', requirePermission(PERMISSIONS.FINANCIAL_ANALYTICS), controller.getAnalyticsDayOfWeek);
router.get('/analytics/waterfall', requirePermission(PERMISSIONS.FINANCIAL_ANALYTICS), controller.getAnalyticsStatusWaterfall);

module.exports = router;
