/**
 * frontend/src/utils/omnisearchNavigation.js
 * Role-Aware Dynamic Navigation Resolver for Omnisearch & Clinical Command Palette.
 *
 * SOLID Principles:
 *   SRP — Responsible strictly for resolving destination URLs based on entity type and user role.
 *   OCP — Easily extensible with new entity types or specialized clinical roles without touching UI components.
 */

/**
 * resolveRoleNavigation — Maps a search/recent item to the user's role-specific clinical or administrative workspace.
 * Prevents non-reception roles from being incorrectly redirected to Reception views.
 *
 * @param {Object} item - Search result or recently visited record
 * @param {string} userRole - Current authenticated role ('Doctor', 'Surgeon', 'Billing', 'Reception', 'Administrator', etc.)
 * @returns {string} Target route URL
 */
export const resolveRoleNavigation = (item, userRole) => {
  if (!item) return '/dashboard';
  const role = (userRole || '').trim();
  const patientId = item.patientId || (item.type === 'PATIENT' ? item.id : null);
  const admissionId = item.admissionId || (item.type === 'ADMISSION' ? item.id : null);
  const billId = item.billId || (item.type === 'BILL' ? item.id : null);
  const visitId = item.visitId || (item.type === 'LAB' ? item.id : null);

  // 1. DOCTOR / SURGEON CLINICAL WORKSPACES
  if (role === 'Doctor' || role === 'Surgeon') {
    if (item.type === 'ADMISSION' && admissionId) {
      return `/dashboard/doctor/ipd/${admissionId}`;
    }
    if (item.type === 'PATIENT' && patientId) {
      // If admission exists for this patient, route to IPD cockpit
      if (admissionId) {
        return `/dashboard/doctor/ipd/${admissionId}`;
      }
      return `/dashboard/doctor/patients/${patientId}`;
    }
    if (item.type === 'LAB' && visitId) {
      return `/dashboard/doctor/consultation?visitId=${visitId}`;
    }
    if (item.type === 'BILL') {
      return `/dashboard/doctor/consultation`;
    }
    return `/dashboard/doctor/consultation`;
  }

  // 2. BILLING & CASHIER WORKSTATIONS
  if (role === 'Billing' || role === 'Cashier') {
    if (item.type === 'BILL' && billId) {
      return `/dashboard/billing?billId=${billId}`;
    }
    if (item.type === 'ADMISSION' && admissionId) {
      return `/dashboard/billing?admissionId=${admissionId}`;
    }
    if (item.type === 'PATIENT' && patientId) {
      return `/dashboard/billing?patientId=${patientId}`;
    }
    if (item.type === 'LAB' && patientId) {
      return `/dashboard/billing?patientId=${patientId}`;
    }
    return `/dashboard/billing`;
  }

  // 3. RECEPTION & FRONT DESK DIRECTORY
  if (role === 'Reception') {
    if (item.type === 'PATIENT' && patientId) {
      return `/dashboard/reception/patients/${patientId}`;
    }
    if (item.type === 'ADMISSION') {
      return `/dashboard/reception/bed-map`;
    }
    if (item.type === 'BILL') {
      return `/dashboard/reception/receipts`;
    }
    if (item.type === 'LAB' && patientId) {
      return `/dashboard/reception/patients/${patientId}`;
    }
    return `/dashboard/reception/patients`;
  }

  // 4. HOSPITAL ADMINISTRATOR
  if (role === 'Administrator') {
    if (item.type === 'PATIENT' && patientId) {
      return `/dashboard/administrator/patients/${patientId}`;
    }
    if (item.type === 'ADMISSION') {
      return `/dashboard/administrator/census`;
    }
    if (item.type === 'BILL' && billId) {
      return `/dashboard/billing?billId=${billId}`;
    }
    if (item.type === 'LAB') {
      return `/dashboard/administrator/laboratories`;
    }
    return `/dashboard/administrator/patients`;
  }

  // Fallback to item.link if provided
  return item.link || '/dashboard';
};

export default resolveRoleNavigation;
