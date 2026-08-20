require('dotenv').config({ path: require('path').resolve(__dirname, '../../secrets/backend.env') });
const mongoose = require('mongoose');
const config = require('../src/core/config');
const Role = require('../src/modules/administration/role.model');
const Permission = require('../src/modules/administration/permission.model');
const RolePermission = require('../src/modules/administration/rolePermission.model');
const Staff = require('../src/modules/staff/staff.model');
const Identity = require('../src/modules/identity/identity.model');
const administrationService = require('../src/modules/administration/administration.service');

async function checkDoctor() {
  await mongoose.connect(config.mongoUri);
  console.log('Connected to DB');

  const doctorRole = await Role.findOne({ name: 'Doctor' });
  console.log('Doctor Role:', doctorRole);

  if (doctorRole) {
    const rps = await RolePermission.find({ roleId: doctorRole._id }).populate('permissionId');
    console.log('Doctor Permissions in DB count:', rps.length);
    console.log('Doctor Permissions in DB:', rps.map(rp => rp.permissionId?.code));

    const codes = await administrationService.getPermissionCodesForRole(doctorRole._id);
    console.log('Codes from administrationService:', codes);
  }

  const doctorStaff = await Staff.find().populate('roleId').populate('departmentId');
  const doctors = doctorStaff.filter(s => s.roleId?.name === 'Doctor');
  console.log('Doctor Staff count:', doctors.length);
  for (const d of doctors) {
    const ident = await Identity.findOne({ staffId: d._id });
    console.log(`Doctor: ${d.fullName}, StaffID: ${d._id}, Dept: ${d.departmentId?.name} (${d.departmentId?._id}), Username: ${ident?.username}`);
  }

  await mongoose.disconnect();
}

checkDoctor().catch(console.error);
