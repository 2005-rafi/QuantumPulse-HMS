const DomainQueryConfig = require('./DomainQueryConfig');

const PatientQueryConfig = new DomainQueryConfig({
  search: {
    exactFields: ['mrn'],
    protectedFields: ['phone', 'aadhaar'],
    prefixFields: ['firstName', 'lastName'],
  },
  filters: {
    allowedFields: {
      gender: { field: 'gender', type: 'exact' },
      bloodGroup: { field: 'bloodGroup', type: 'exact' },
      city: { field: 'address.city', type: 'in' },
      state: { field: 'address.state', type: 'in' },
      country: { field: 'address.country', type: 'exact' },
      cities: { field: 'address.city', type: 'in' },
      states: { field: 'address.state', type: 'in' },
    },
    dateRanges: {
      createdAt: { field: 'createdAt', startParam: 'startDate', endParam: 'endDate' },
    },
  },
  sort: {
    allowedFields: {
      createdAt: 'createdAt',
      mrn: 'mrn',
      name: { firstName: 'inherit', lastName: 'inherit' },
    },
    shortcuts: {
      newest: { createdAt: -1, _id: -1 },
      oldest: { createdAt: 1, _id: 1 },
      'nameA-Z': { firstName: 1, lastName: 1, _id: 1 },
      'nameZ-A': { firstName: -1, lastName: -1, _id: -1 },
    },
    defaultSort: { createdAt: -1, _id: -1 },
  },
  projection: {
    profiles: {
      list: {
        mrn: 1,
        firstName: 1,
        lastName: 1,
        dob: 1,
        age: 1,
        gender: 1,
        bloodGroup: 1,
        phone: 1,
        address: 1,
        createdAt: 1,
      },
      minimal: {
        mrn: 1,
        firstName: 1,
        lastName: 1,
        phone: 1,
        age: 1,
        gender: 1,
      },
    },
  },
});

module.exports = PatientQueryConfig;
