const DomainQueryConfig = require('./DomainQueryConfig');

const AppointmentQueryConfig = new DomainQueryConfig({
  search: {
    exactFields: ['appointmentNumber'],
  },
  filters: {
    allowedFields: {
      status: { field: 'status', type: 'exact' },
      statuses: { field: 'status', type: 'in' },
      patientId: { field: 'patientId', type: 'exact', cast: 'objectId' },
      doctorId: { field: 'doctorId', type: 'exact', cast: 'objectId' },
      departmentId: { field: 'departmentId', type: 'exact', cast: 'objectId' },
      appointmentType: { field: 'appointmentType', type: 'exact' },
    },
    dateRanges: {
      appointmentDate: { field: 'appointmentDate', startParam: 'startDate', endParam: 'endDate' },
      createdDate: { field: 'createdAt', startParam: 'createdFrom', endParam: 'createdTo' },
    },
  },
  sort: {
    allowedFields: {
      appointmentDate: 'appointmentDate',
      startTime: 'startTime',
      createdAt: 'createdAt',
      status: 'status',
    },
    shortcuts: {
      chronological: { appointmentDate: 1, startTime: 1, _id: 1 },
      newest: { createdAt: -1, _id: -1 },
      oldest: { createdAt: 1, _id: 1 },
    },
    defaultSort: { appointmentDate: 1, startTime: 1, _id: 1 },
  },
  projection: {
    profiles: {
      list: {
        appointmentNumber: 1,
        patientId: 1,
        departmentId: 1,
        doctorId: 1,
        appointmentType: 1,
        appointmentDate: 1,
        startTime: 1,
        endTime: 1,
        status: 1,
        reason: 1,
        source: 1,
        visitId: 1,
        createdAt: 1,
      },
    },
  },
});

module.exports = AppointmentQueryConfig;
