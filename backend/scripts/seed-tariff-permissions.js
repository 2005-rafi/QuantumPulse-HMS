/**
 * SEED SCRIPT — Tariff & Financial Governance Permissions Seed
 * Synchronizes all tariff, billing, and pharmacy price permissions and maps them to appropriate roles.
 *
 * Usage: node backend/scripts/seed-tariff-permissions.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const config = require('../src/core/config');
const { syncSystemPermissions } = require('../src/modules/administration/permission.sync');

async function run() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(config.mongoUri);
  console.log('Connected.');

  console.log('Synchronizing system permissions & role bindings...');
  await syncSystemPermissions();

  console.log('🎉 Permission synchronization completed successfully.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Permission sync failed:', err);
  process.exit(1);
});
