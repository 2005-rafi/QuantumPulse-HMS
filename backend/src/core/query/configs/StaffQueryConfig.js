const DomainQueryConfig = require('./DomainQueryConfig');

const StaffQueryConfig = new DomainQueryConfig({
  search: {
    exactFields: ['employeeId', 'medicalLicenseNumber', 'nursingLicenseNumber', 'pharmacyLicenseNumber'],
    prefixFields: ['fullName', 'firstName', 'lastName'],
    containsFields: ['fullName', 'email'],
  },
  filters: {
    allowedFields: {
      status: { field: 'status', type: 'exact' },
      isDeleted: { field: 'isDeleted', type: 'boolean' },
      departmentId: { field: 'departmentId', type: 'exact', cast: 'objectId' },
      departmentIds: { field: 'departmentId', type: 'in', cast: 'objectId' },
      roleId: { field: 'roleId', type: 'exact', cast: 'objectId' },
      position: { field: 'position', type: 'exact' },
      positionRank: { field: 'positionRank', type: 'exact', cast: 'number' },
      tariffGrade: { field: 'tariffGrade', type: 'exact' },
      shift: { field: 'shift', type: 'exact' },
      employmentType: { field: 'employmentType', type: 'exact' },
      gender: { field: 'gender', type: 'exact' },
    },
    dateRanges: {
      joiningDate: { field: 'joiningDate', startParam: 'joinedFrom', endParam: 'joinedTo' },
    },
  },
  sort: {
    allowedFields: {
      fullName: 'fullName',
      positionRank: 'positionRank',
      employeeId: 'employeeId',
      createdAt: 'createdAt',
    },
    shortcuts: {
      rankSeniority: { positionRank: -1, fullName: 1, _id: 1 },
      nameA_Z: { fullName: 1, _id: 1 },
      newest: { createdAt: -1, _id: -1 },
    },
    defaultSort: { positionRank: -1, fullName: 1, _id: 1 },
  },
  projection: {
    profiles: {
      list: {
        employeeId: 1,
        fullName: 1,
        departmentId: 1,
        roleId: 1,
        position: 1,
        positionRank: 1,
        tariffGrade: 1,
        status: 1,
        phone: 1,
        email: 1,
        shift: 1,
        createdAt: 1,
      },
    },
  },
});

module.exports = StaffQueryConfig;
