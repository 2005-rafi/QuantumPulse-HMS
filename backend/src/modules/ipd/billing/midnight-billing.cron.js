/**
 * modules/ipd/billing/midnight-billing.cron.js
 * Automated Midnight Run Billing Cron (00:00:00 Daily).
 * Ingests daily room rent, nursing care fee, and RMO charges for all actively admitted patients.
 */
const IPDAdmission = require('../admission/ipd-admission.model');
const ipdBillingService = require('./ipd-billing.service');

class MidnightBillingCron {
  /**
   * Execute midnight billing run for all active IPD admissions.
   * @returns {Promise<{ totalProcessed: number, totalSuccess: number, totalFailed: number, results: Array }>}
   */
  async run() {
    console.log('[MidnightBillingCron] Starting daily inpatient tariff ingestion...');
    const startTime = Date.now();

    try {
      const activeAdmissions = await IPDAdmission.find({ status: 'ADMITTED' })
        .select('_id admissionNumber patientId currentBedId')
        .lean();

      let totalSuccess = 0;
      let totalFailed = 0;
      const results = [];

      for (const adm of activeAdmissions) {
        try {
          const res = await ipdBillingService.ingestDailyCharges(adm._id);
          if (res.success) {
            totalSuccess++;
            results.push({ admissionId: adm._id, admissionNumber: adm.admissionNumber, status: 'SUCCESS', amountAdded: res.amountAdded });
          } else {
            totalFailed++;
            results.push({ admissionId: adm._id, admissionNumber: adm.admissionNumber, status: 'SKIPPED', message: res.message });
          }
        } catch (err) {
          totalFailed++;
          console.error(`[MidnightBillingCron] Failed to ingest charges for ${adm.admissionNumber}:`, err.message);
          results.push({ admissionId: adm._id, admissionNumber: adm.admissionNumber, status: 'ERROR', error: err.message });
        }
      }

      const durationMs = Date.now() - startTime;
      console.log(`[MidnightBillingCron] Completed in ${durationMs}ms. Processed: ${activeAdmissions.length}, Success: ${totalSuccess}, Failed: ${totalFailed}`);

      return {
        totalProcessed: activeAdmissions.length,
        totalSuccess,
        totalFailed,
        durationMs,
        results,
      };
    } catch (err) {
      console.error('[MidnightBillingCron] Critical cron failure:', err);
      throw err;
    }
  }

  /**
   * Schedule the cron job to run daily at midnight (00:00:00).
   */
  schedule() {
    // Schedule check interval every hour or calculate time until midnight
    const runAtMidnight = () => {
      const now = new Date();
      const night = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1, // tomorrow
        0, 0, 0 // 00:00:00
      );
      const msToMidnight = night.getTime() - now.getTime();

      setTimeout(() => {
        this.run().catch((err) => console.error('[MidnightBillingCron] Cron execution error:', err));
        setInterval(() => {
          this.run().catch((err) => console.error('[MidnightBillingCron] Cron execution error:', err));
        }, 24 * 60 * 60 * 1000); // repeat every 24 hours
      }, msToMidnight);

      console.log(`[MidnightBillingCron] Scheduled next run in ${(msToMidnight / 1000 / 60).toFixed(1)} minutes (at 00:00:00).`);
    };

    runAtMidnight();
  }
}

module.exports = new MidnightBillingCron();
