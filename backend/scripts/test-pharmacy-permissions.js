require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const config = require('../src/core/config');
const administrationService = require('../src/modules/administration/administration.service');
const Role = require('../src/modules/administration/role.model');

async function testPharmacyPerms() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to Atlas');

  const pharmRole = await Role.findOne({ name: 'Pharmacy' });
  const perms = await administrationService.getPermissionCodesForRole(pharmRole._id);
  console.log('Pharmacy Permissions Count:', perms.length);
  console.log('Pharmacy Permissions:', perms);
  console.log('Has MEDICINE_DISPENSE:', perms.includes('MEDICINE_DISPENSE'));
  console.log('Has MEDICINE_PRICE_MANAGE:', perms.includes('MEDICINE_PRICE_MANAGE'));
  console.log('Has BILL_VIEW:', perms.includes('BILL_VIEW'));

  if (!perms.includes('MEDICINE_DISPENSE') || !perms.includes('MEDICINE_PRICE_MANAGE')) {
    console.error('FAIL: Pharmacy permissions missing!');
    process.exit(1);
  }

  console.log('✅ ALL PHARMACY PERMISSIONS VERIFIED IN DATABASE!');
  await mongoose.disconnect();
}

testPharmacyPerms().catch(console.error);
