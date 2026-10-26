/**
 * Unified Billing & Template Printing Engine
 * Centralized, lightweight, and flexible document rendering across all hospital modules.
 */

export { default as UnifiedPrintEngine, printViaIframe, printElement, normalizeBillData } from './UnifiedPrintEngine';
export { default as UnifiedBillPrintModal } from './UnifiedBillPrintModal';
export { default as A4HospitalInvoiceTemplate, A4HospitalInvoiceTemplate as A4Template } from './A4HospitalInvoiceTemplate';
export { default as ThermalPosTokenSlip, ThermalPosTokenSlip as PosTokenSlip } from './ThermalPosTokenSlip';
