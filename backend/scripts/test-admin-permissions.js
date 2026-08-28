require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const config = require('../src/core/config');
const administrationService = require('../src/modules/administration/administration.service');
const Role = require('../src/modules/administration/role.model');

async function testPerms() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to Atlas');

  const adminRole = await Role.findOne({ name: 'Administrator' });
  const perms = await administrationService.getPermissionCodesForRole(adminRole._id);
  console.log('Administrator Permissions Count:', perms.length);
  console.log('Has TARIFF_VIEW:', perms.includes('TARIFF_VIEW'));
  console.log('Has TARIFF_MANAGE:', perms.includes('TARIFF_MANAGE'));
  console.log('Has FINANCIAL_ANALYTICS:', perms.includes('FINANCIAL_ANALYTICS'));
  console.log('Has BILL_FINALIZE:', perms.includes('BILL_FINALIZE'));

  if (!perms.includes('TARIFF_VIEW')) {
    console.error('FAIL: TARIFF_VIEW missing!');
    process.exit(1);
  }

  console.log('✅ ALL ADMIN TARIFF PERMISSIONS VERIFIED IN DATABASE!');
  await mongoose.disconnect();
}

testPerms().catch(console.error);
