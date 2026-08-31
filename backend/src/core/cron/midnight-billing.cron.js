/**
 * core/cron/midnight-billing.cron.js
 * Nightly cron job to ingest recurring room rent, nursing care, and RMO charges for all active IPD admissions.
 */
const cron = require('node-cron');
const IPDAdmission = require('../../modules/ipd/admission/ipd-admission.model');
const ipdBillingService = require('../../modules/ipd/billing/ipd-billing.service');
const logger = require('../logger');

const runNightlyIPDChargeIngestion = async () => {
  logger.info('Starting scheduled midnight IPD daily charge ingestion...');
  try {
    const activeAdmissions = await IPDAdmission.find({ status: 'ADMITTED' });
    let successCount = 0;
    let failCount = 0;

    for (const adm of activeAdmissions) {
      try {
        await ipdBillingService.ingestDailyCharges(adm._id);
        successCount++;
      } catch (err) {
        failCount++;
        logger.error(`Nightly billing failed for admission ${adm.admissionNumber}:`, { error: err.message });
      }
    }

    logger.info(`Completed midnight IPD daily charge ingestion. Ingested: ${successCount}, Failed: ${failCount}`);
  } catch (err) {
    logger.error('CRITICAL: Midnight IPD charge cron failure:', { error: err.message });
  }
};

const setupMidnightBillingCron = () => {
  // Runs every midnight at 00:00:00
  cron.schedule('0 0 * * *', () => {
    runNightlyIPDChargeIngestion();
  });
  logger.info('Cron jobs: Scheduled midnight IPD charge ingestion (0 0 * * *).');
};

module.exports = {
  setupMidnightBillingCron,
  runNightlyIPDChargeIngestion,
};
