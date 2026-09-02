/**
 * modules/ipd/billing/ipd-billing.controller.js
 * Inpatient billing controllers.
 */
const ipdBillingService = require('./ipd-billing.service');
const { success } = require('../../../core/responses');

class IPDBillingController {
  async getRunningLedger(req, res, next) {
    try {
      const ledger = await ipdBillingService.getRunningLedger(req.params.admissionId);
      return success(res, ledger, 'Running IPD ledger retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async recordAdvanceDeposit(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const deposit = await ipdBillingService.recordAdvanceDeposit(req.params.admissionId, req.body, staffId);
      return success(res, deposit, 'Advance deposit recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getAdvanceDeposits(req, res, next) {
    try {
      const deposits = await ipdBillingService.getAdvanceDeposits(req.params.admissionId);
      return success(res, deposits, 'Advance deposit history retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async resolveBedTariff(req, res, next) {
    try {
      const tariff = await ipdBillingService.resolveBedTariff({
        bedId: req.query.bedId,
        floorId: req.query.floorId,
        wardClass: req.query.wardClass,
        comfortTier: req.query.comfortTier,
        sharingType: req.query.sharingType,
      });
      return success(res, tariff, 'Bed tariff resolved successfully');
    } catch (err) {
      next(err);
    }
  }

  async ingestDailyCharges(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const result = await ipdBillingService.ingestDailyCharges(req.params.admissionId, staffId);
      return success(res, result, 'Daily IPD charges ingested successfully');
    } catch (err) {
      next(err);
    }
  }

  async finalizeSettlement(req, res, next) {
    try {
      const staffId = req.user.staffId || req.user.id;
      const result = await ipdBillingService.finalizeSettlement(req.params.admissionId, req.body, staffId);
      return success(res, result, 'Final settlement processed successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new IPDBillingController();
