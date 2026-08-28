const DomainQueryConfig = require('./DomainQueryConfig');

const LaboratoryQueryConfig = new DomainQueryConfig({
  search: {
    exactFields: ['code', 'roomNumber'],
    prefixFields: ['name'],
  },
  filters: {
    allowedFields: {
      isActive: { field: 'isActive', type: 'boolean' },
      departmentId: { field: 'departmentId', type: 'exact', cast: 'objectId' },
    },
  },
  sort: {
    allowedFields: {
      name: 'name',
      code: 'code',
      createdAt: 'createdAt',
    },
    defaultSort: { name: 1, _id: 1 },
  },
  projection: {
    profiles: {
      list: {
        name: 1,
        code: 1,
        departmentId: 1,
        roomNumber: 1,
        inChargeStaffId: 1,
        isActive: 1,
        testCatalog: 1,
        createdAt: 1,
      },
    },
  },
});

module.exports = LaboratoryQueryConfig;
