const QueryContext = require('./query-context');
const QueryBuilder = require('./query-builder');
const SearchStrategy = require('./strategies/search.strategy');
const FilterStrategy = require('./strategies/filter.strategy');
const SortStrategy = require('./strategies/sort.strategy');
const PaginationStrategy = require('./strategies/pagination.strategy');
const ProjectionStrategy = require('./strategies/projection.strategy');

const DomainQueryConfig = require('./configs/domain-query.config');
const PatientQueryConfig = require('./configs/patient-query.config');
const VisitQueryConfig = require('./configs/visit-query.config');
const AppointmentQueryConfig = require('./configs/appointment-query.config');
const StaffQueryConfig = require('./configs/staff-query.config');
const AuditQueryConfig = require('./configs/audit-query.config');
const LaboratoryQueryConfig = require('./configs/laboratory-query.config');
const BillQueryConfig = require('./configs/bill-query.config');

module.exports = {
  QueryContext,
  QueryBuilder,
  SearchStrategy,
  FilterStrategy,
  SortStrategy,
  PaginationStrategy,
  ProjectionStrategy,
  DomainQueryConfig,
  PatientQueryConfig,
  VisitQueryConfig,
  AppointmentQueryConfig,
  StaffQueryConfig,
  AuditQueryConfig,
  LaboratoryQueryConfig,
  BillQueryConfig,
};
