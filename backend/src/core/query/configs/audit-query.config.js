const DomainQueryConfig = require('./domain-query.config');

const AuditQueryConfig = new DomainQueryConfig({
  search: {
    exactFields: ['targetId', 'ipAddress'],
    prefixFields: ['action'],
  },
  filters: {
    allowedFields: {
      action: { field: 'action', type: 'exact' },
      actions: { field: 'action', type: 'in' },
      category: { field: 'category', type: 'exact' },
      severity: { field: 'severity', type: 'exact' },
      actorRole: { field: 'actorRole', type: 'exact' },
      actorId: { field: 'actorId', type: 'exact', cast: 'objectId' },
      targetId: { field: 'targetId', type: 'exact' },
    },
    dateRanges: {
      timestamp: { field: 'timestamp', startParam: 'startDate', endParam: 'endDate' },
    },
  },
  sort: {
    allowedFields: {
      timestamp: 'timestamp',
      action: 'action',
      chainIndex: 'chainIndex',
    },
    shortcuts: {
      newest: { timestamp: -1, _id: -1 },
      oldest: { timestamp: 1, _id: 1 },
    },
    defaultSort: { timestamp: -1, _id: -1 },
  },
  projection: {
    profiles: {
      list: {
        action: 1,
        category: 1,
        severity: 1,
        actorId: 1,
        actorRole: 1,
        actorSnapshot: 1,
        targetId: 1,
        targetSnapshot: 1,
        statusChange: 1,
        details: 1,
        ipAddress: 1,
        chainIndex: 1,
        prevHash: 1,
        hash: 1,
        timestamp: 1,
      },
    },
  },
});

module.exports = AuditQueryConfig;
