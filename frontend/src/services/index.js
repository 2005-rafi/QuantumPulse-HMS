/**
 * src/services/index.js
 * Unified Barrel Export for all HTTP API Clients and Services.
 * Provides both modern camelCase and legacy uppercase identifiers.
 */

export { default as api } from './api';
export * from './api';

export { default as adminApi, adminAPI } from './adminAPI';
export * from './adminAPI';

export { default as appointmentApi, appointmentAPI } from './appointmentAPI';
export * from './appointmentAPI';

export { default as auditApi, auditAPI } from './auditAPI';
export * from './auditAPI';

export { default as billingApi, billingAPI } from './billingAPI';
export * from './billingAPI';

export { default as ipdApi, ipdAPI } from './ipdApi';
export * from './ipdApi';

export { default as medicinePriceApi, medicinePriceAPI } from './medicinePriceAPI';
export * from './medicinePriceAPI';

export { default as patientApi, patientAPI } from './patientAPI';
export * from './patientAPI';

export { default as staffApi, staffAPI } from './staffAPI';
export * from './staffAPI';

export { default as tariffApi, tariffAPI } from './tariffAPI';
export * from './tariffAPI';

export { default as visitApi, visitAPI } from './visitAPI';
export * from './visitAPI';
