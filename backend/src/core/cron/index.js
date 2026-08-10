const logger = require('../logger');

// Nightly cron age recalculation is retired.
// Patient age is now computed dynamically on reads in the repository layer.
const setupCronJobs = () => {
  logger.info('Cron jobs: Nightly age recalculation retired (now computed dynamically on-the-fly).');
};

module.exports = { setupCronJobs };
