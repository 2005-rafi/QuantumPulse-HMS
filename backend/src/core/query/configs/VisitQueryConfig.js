const DomainQueryConfig = require('./DomainQueryConfig');

const VisitQueryConfig = new DomainQueryConfig({
  search: {
    exactFields: ['visitNumber', 'tokenString'],
    prefixFields: ['tokenString'],
  },
  filters: {
    allowedFields: {
      status: { field: 'status', type: 'exact' },
      statuses: { field: 'status', type: 'in' },
      patientId: { field: 'patientId', type: 'exact', cast: 'objectId' },
      departmentId: { field: 'departmentId', type: 'exact', cast: 'objectId' },
      departmentIds: { field: 'departmentId', type: 'in', cast: 'objectId' },
      doctorId: { field: 'consultation.doctorId', type: 'exact', cast: 'objectId' },
      visitType: { field: 'visitType', type: 'exact' },
      isDirectPharmacy: { field: 'isDirectPharmacy', type: 'boolean' },
    },
    dateRanges: {
      createdAt: { field: 'createdAt', startParam: 'startDate', endParam: 'endDate' },
    },
  },
  sort: {
    allowedFields: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      tokenSerial: 'tokenSerial',
      status: 'status',
    },
    shortcuts: {
      queueFIFO: { createdAt: 1, _id: 1 },
      newest: { createdAt: -1, _id: -1 },
      oldest: { createdAt: 1, _id: 1 },
    },
    defaultSort: { createdAt: -1, _id: -1 },
  },
  projection: {
    profiles: {
      list: {
        visitNumber: 1,
        tokenString: 1,
        tokenSerial: 1,
        patientId: 1,
        departmentId: 1,
        status: 1,
        visitType: 1,
        consultation: 1,
        vitals: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  },
});

module.exports = VisitQueryConfig;
