const DomainQueryConfig = require('./DomainQueryConfig');

const BillQueryConfig = new DomainQueryConfig({
  search: {
    exactFields: ['billNumber'],
  },
  filters: {
    allowedFields: {
      status: { field: 'status', type: 'exact' },
      patientId: { field: 'patientId', type: 'exact', cast: 'objectId' },
      visitId: { field: 'visitId', type: 'exact', cast: 'objectId' },
      departmentId: { field: 'departmentId', type: 'exact', cast: 'objectId' },
    },
    dateRanges: {
      serviceDate: { field: 'serviceDate', startParam: 'from', endParam: 'to' },
    },
  },
  sort: {
    allowedFields: {
      serviceDate: 'serviceDate',
      billedAmount: 'billedAmount',
      outstandingAmount: 'outstandingAmount',
      createdAt: 'createdAt',
    },
    shortcuts: {
      newest: { serviceDate: -1, _id: -1 },
      oldest: { serviceDate: 1, _id: 1 },
      highestOutstanding: { outstandingAmount: -1, _id: -1 },
    },
    defaultSort: { serviceDate: -1, _id: -1 },
  },
  projection: {
    profiles: {
      list: {
        billNumber: 1,
        patientId: 1,
        visitId: 1,
        serviceDate: 1,
        billedAmount: 1,
        collectedAmount: 1,
        adjustedAmount: 1,
        outstandingAmount: 1,
        status: 1,
        createdAt: 1,
      },
    },
  },
});

module.exports = BillQueryConfig;
