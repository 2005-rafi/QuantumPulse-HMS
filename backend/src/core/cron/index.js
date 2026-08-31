const logger = require('../logger');
const { setupMidnightBillingCron } = require('./midnight-billing.cron');

const setupCronJobs = () => {
  setupMidnightBillingCron();
};

module.exports = { setupCronJobs };
