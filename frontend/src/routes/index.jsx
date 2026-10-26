/**
 * routes/index.jsx
 * Centralized route configuration using React Router v6 createBrowserRouter.
 *
 * SOLID:
 *   SRP  â€” Routing configuration is isolated here; App.jsx is not a router.
 *   OCP  â€” Add routes by extending this array, never modifying App.jsx.
 *   DIP  â€” Route guards (ProtectedRoute, RoleRoute) depend on AuthContext abstraction.
 *
 * Architecture:
 *   / and /dashboard/* â†’ redirect to /login
 *   /login             â†’ GuestRoute (redirect away if already authenticated)
 *   /dashboard         â†’ ProtectedRoute > AppShell (layout shell)
 *     /dashboard/reception        â†’ RoleRoute[Reception]  > ReceptionDashboard
 *     /dashboard/nurse            â†’ RoleRoute[Nurse]      > NurseDashboard
 *     /dashboard/doctor           â†’ RoleRoute[Doctor]     > DoctorDashboard
 *     /dashboard/laboratory       â†’ RoleRoute[Laboratory] > LabDashboard
 *     /dashboard/pharmacy         â†’ RoleRoute[Pharmacy]   > PharmacyDashboard
 *     /dashboard/administrator    â†’ RoleRoute[Admin]      > AdministratorDashboard
 */

import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';

// Auth Guards
import { ProtectedRoute, RoleRoute, GuestRoute } from './AppRouter';

// Pages (Lazy Loaded for route code splitting and fast initial bundle)
import LoginPage from '../features/auth/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
const ReceptionDashboard = React.lazy(() => import('../pages/ReceptionDashboard'));
const NurseDashboard = React.lazy(() => import('../pages/NurseDashboard'));
const DoctorDashboard = React.lazy(() => import('../pages/DoctorDashboard'));
const LabDashboard = React.lazy(() => import('../pages/LabDashboard'));
const PharmacyDashboard = React.lazy(() => import('../pages/PharmacyDashboard'));
const AdministratorDashboard = React.lazy(() => import('../pages/AdministratorDashboard'));
const WardOperationsDashboard = React.lazy(() => import('../pages/WardOperationsDashboard'));
const SurgeonDashboard = React.lazy(() => import('../pages/SurgeonDashboard'));
const BillingDashboard = React.lazy(() => import('../pages/BillingDashboard'));
const UserProfilePage = React.lazy(() => import('../pages/UserProfilePage'));
import { ReceptionPatientsView, ReceptionAppointmentsView, ReceptionReceiptsView } from '../features/patients/ReceptionViews';
import {
  DoctorConsultationView,
  DoctorAppointmentsView,
  DoctorDeletionRequestsView,
  DoctorConsultationHistoryView,
  DoctorPatientProfileView,
} from '../features/doctor/DoctorViews';
import { NurseTriageView, NurseTriageHistoryView } from '../features/nurse/NurseViews';
import { LabProcessingView, LabSpecimensView, LabReportedView, LabVerificationView } from '../features/laboratory/LabViews';
import { WardTimeMonitoringView } from '../features/ipd/WardTimeMonitoringView';
import { WardTransferLedgerView } from '../features/ipd/WardTransferLedgerView';
import {
  ProfileOverviewView,
  ProfileEmploymentView,
  ProfileAccessView,
  ProfileCredentialsView,
  ProfileDocumentsView,
  ProfileHistoryView,
  ProfileSettingsView,
} from '../features/profile/ProfileViews';

import AdminAnalytics from '../features/admin/AdminAnalytics';
import AdminSurgeriesView from '../features/admin/AdminSurgeriesView';
import DoctorSurgeryTracker from '../features/doctor/DoctorSurgeryTracker';
import AdminPatientManager from '../features/admin/AdminPatientManager';
import AdminStaffManager from '../features/admin/AdminStaffManager';
import AdminDepartmentManager from '../features/admin/AdminDepartmentManager';
import AdminLabManager from '../features/admin/AdminLabManager';
import AdminSettings from '../features/admin/AdminSettings';
import AdminAuditLogs from '../features/admin/AdminAuditLogs';
import AdminTariffBilling from '../features/admin/AdminTariffBilling';
import StorageAnalyticsTab from '../features/admin/StorageAnalyticsTab';
import AdminDevelopmentView from '../features/admin/AdminDevelopmentView';
import AppointmentDashboard from '../features/appointments/AppointmentDashboard';
import ReceptionBedMap from '../features/ipd/ReceptionBedMap';
import AdminFacilityBuilder from '../features/ipd/AdminFacilityBuilder';
import AdminIpdRecordsManager from '../features/admin/AdminIpdRecordsManager';
import NurseIpdStation from '../features/ipd/NurseIpdStation';
import DoctorIpdCockpit from '../features/ipd/DoctorIpdCockpit';
import IpdLedgerView from '../features/ipd/IpdLedgerView';
import PharmacyFloorRequisitions from '../features/ipd/PharmacyFloorRequisitions';
import { useAuth } from '../context/AuthContext';
import { SessionGuard } from '../components/shell/SessionGuard';

import { Md3RouteErrorBoundary } from '../components/md3/Md3ErrorBoundary';

const AdminAppointmentsWrapper = () => {
  const { user } = useAuth();
  return <AppointmentDashboard user={user} />;
};

/**
 * ProtectedLayout â€” Wraps all dashboard routes in ProtectedRoute and SessionGuard.
 * Enforces authentication, automatic inactivity logoff (HIPAA Â§ 164.312),
 * and shoulder-surfing privacy blur.
 */
const ProtectedLayout = () => (
  <ProtectedRoute>
    <SessionGuard>
      <React.Suspense
        fallback={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100vh',
              gap: '16px',
              color: 'var(--md-sys-color-primary, #006a6a)',
              fontFamily: 'Roboto, sans-serif',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 500 }}>Quantum CareOne HMS</div>
            <div style={{ fontSize: '14px', color: 'var(--md-sys-color-outline, #707978)' }}>Loading workspace...</div>
          </div>
        }
      >
        <Outlet />
      </React.Suspense>
    </SessionGuard>
  </ProtectedRoute>
);

const LabIndexRedirect = () => {
  const { user } = useAuth();
  const isDoctor = user?.role === 'Laboratory' || user?.isDoctor;
  return <Navigate to={isDoctor ? 'verification' : 'processing'} replace />;
};

export const router = createBrowserRouter([
  // â”€â”€ Public â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    path: '/login',
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
    errorElement: <Md3RouteErrorBoundary />,
  },

  // â”€â”€ Protected Dashboard Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    path: '/dashboard',
    element: <ProtectedLayout />,
    errorElement: <Md3RouteErrorBoundary />,
    children: [
      // Default /dashboard â†’ redirect to login (role redirect handled by AppRouter)
      { index: true, element: <Navigate to="/login" replace /> },

      // Reception â€” Named tab routing: /patients, /appointments
      {
        path: 'reception',
        element: (
          <RoleRoute role="Reception">
            <ReceptionDashboard />
          </RoleRoute>
        ),
        children: [
          { index: true, element: <Navigate to="patients" replace /> },
          { path: 'patients', element: <ReceptionPatientsView /> },
          { path: 'patients/:patientId', element: <ReceptionPatientsView /> },
          { path: 'appointments', element: <ReceptionAppointmentsView /> },
          { path: 'bed-map', element: <ReceptionBedMap /> },
          { path: 'receipts', element: <ReceptionReceiptsView /> },
        ],
      },

      // Nurse â€” Named tab routing: /triage, /history, /ipd, /ipd-operations
      {
        path: 'nurse',
        element: (
          <RoleRoute role={['Nurse', 'OPD Nurse', 'IPD Nurse']}>
            <NurseDashboard />
          </RoleRoute>
        ),
        children: [
          { index: true, element: <Navigate to="triage" replace /> },
          { path: 'triage', element: <NurseTriageView /> },
          { path: 'nursing', element: <NurseTriageView /> },
          { path: 'history', element: <NurseTriageHistoryView /> },
          { path: 'ipd', element: <NurseIpdStation /> },
          { path: 'ipd/:admissionId', element: <NurseIpdStation /> },
          { path: 'ipd-operations', element: <NurseIpdStation defaultMode="OPERATIONS" /> },
        ],
      },

      // Doctor â€” Named tab routing: /consultation, /history, /surgeries, /ipd, /appointments, /deletion-requests
      {
        path: 'doctor',
        element: (
          <RoleRoute role={['Doctor', 'Surgeon']}>
            <DoctorDashboard />
          </RoleRoute>
        ),
        children: [
          { index: true, element: <Navigate to="consultation" replace /> },
          { path: 'consultation', element: <DoctorConsultationView /> },
          { path: 'history', element: <DoctorConsultationHistoryView /> },
          { path: 'surgeries', element: <DoctorSurgeryTracker /> },
          { path: 'ipd', element: <DoctorIpdCockpit /> },
          { path: 'ipd/:admissionId', element: <DoctorIpdCockpit /> },
          { path: 'appointments', element: <DoctorAppointmentsView /> },
          { path: 'patients/:patientId', element: <DoctorPatientProfileView /> },
          { path: 'deletion-requests', element: <DoctorDeletionRequestsView /> },
          { path: 'staff', element: <AdminStaffManager /> },
        ],
      },

      // Surgeon â€” Dedicated Operating Theatre & Surgical Board
      {
        path: 'surgeon',
        element: (
          <RoleRoute role={['Surgeon', 'Doctor', 'Ward Operations', 'Administrator']}>
            <SurgeonDashboard />
          </RoleRoute>
        ),
      },

      // Laboratory â€” Named tab routing: /processing, /specimens, /reported
      {
        path: 'laboratory',
        element: (
          <RoleRoute role={['Laboratory', 'Lab Nurse']}>
            <LabDashboard />
          </RoleRoute>
        ),
        children: [
          { index: true, element: <LabIndexRedirect /> },
          { path: 'processing', element: <LabProcessingView /> },
          { path: 'verification', element: <LabVerificationView /> },
          { path: 'specimens', element: <LabSpecimensView /> },
          { path: 'reported', element: <LabReportedView /> },
          { path: 'staff', element: <AdminStaffManager /> },
        ],
      },

      // Pharmacy
      {
        path: 'pharmacy',
        element: (
          <RoleRoute role="Pharmacy">
            <PharmacyDashboard />
          </RoleRoute>
        ),
      },

      // Administrator
      {
        path: 'administrator',
        element: (
          <RoleRoute role="Administrator">
            <AdministratorDashboard />
          </RoleRoute>
        ),
        children: [
          { index: true, element: <Navigate to="analytics" replace /> },
          { path: 'analytics', element: <AdminAnalytics /> },
          { path: 'surgeries', element: <AdminSurgeriesView /> },
          { path: 'ot', element: <Navigate to="/dashboard/administrator/surgeries" replace /> },
          { path: 'billing', element: <AdminTariffBilling /> },
          { path: 'bed-map', element: <AdminFacilityBuilder /> },
          { path: 'census', element: <AdminIpdRecordsManager /> },
          { path: 'ipd-records', element: <AdminIpdRecordsManager /> },
          { path: 'facility-builder', element: <Navigate to="/dashboard/administrator/bed-map" replace /> },
          { path: 'facility', element: <Navigate to="/dashboard/administrator/bed-map" replace /> },
          { path: 'ipd', element: <Navigate to="/dashboard/administrator/census" replace /> },
          { path: 'patients', element: <AdminPatientManager /> },
          { path: 'patients/:patientId', element: <AdminPatientManager /> },
          { path: 'appointments', element: <AdminAppointmentsWrapper /> },
          { path: 'staff', element: <AdminStaffManager /> },
          { path: 'departments', element: <AdminDepartmentManager /> },
          { path: 'laboratories', element: <AdminLabManager /> },
          { path: 'storage', element: <StorageAnalyticsTab /> },
          { path: 'settings', element: <Navigate to="/dashboard/administrator/billing" replace /> },
          { path: 'audit', element: <AdminAuditLogs /> },
          { path: 'development', element: <AdminDevelopmentView /> },
        ]
      },

      // Ward Operations (Bed & Facility Manager) â€” Named tab routing: /bed-map, /time-monitoring, /facility-builder, /transfers
      {
        path: 'ward-operations',
        element: (
          <RoleRoute role="Ward Operations">
            <WardOperationsDashboard />
          </RoleRoute>
        ),
        children: [
          { index: true, element: <Navigate to="bed-map" replace /> },
          { path: 'bed-map', element: <ReceptionBedMap /> },
          { path: 'time-monitoring', element: <WardTimeMonitoringView /> },
          { path: 'facility-builder', element: <AdminFacilityBuilder /> },
          { path: 'transfers', element: <WardTransferLedgerView /> },
          { path: 'staff', element: <AdminStaffManager /> },
        ],
      },

      // Billing â€” Dedicated Billing & Cashier Workstation
      {
        path: 'billing',
        element: (
          <RoleRoute role={['Billing', 'Administrator']}>
            <BillingDashboard />
          </RoleRoute>
        ),
      },

      // Global navigation aliases & shortcuts
      { path: 'surgeries', element: <Navigate to="/dashboard/administrator/surgeries" replace /> },
      { path: 'ot', element: <Navigate to="/dashboard/administrator/surgeries" replace /> },
      { path: 'ipd', element: <Navigate to="/dashboard/administrator/bed-map" replace /> },
      { path: 'ipd/ot-scheduler', element: <Navigate to="/dashboard/administrator/surgeries" replace /> },

      // â”€â”€ Dedicated Inpatient Department (IPD) Clinical Workstations â”€â”€
      { path: 'ipd/bed-map', element: <ReceptionBedMap /> },
      { path: 'ipd/nursing', element: <NurseIpdStation /> },
      { path: 'ipd/nursing/:admissionId', element: <NurseIpdStation /> },
      { path: 'ipd/doctor', element: <DoctorIpdCockpit /> },
      { path: 'ipd/doctor/:admissionId', element: <DoctorIpdCockpit /> },
      { path: 'ipd/billing', element: <IpdLedgerView /> },
      { path: 'ipd/billing/:admissionId', element: <IpdLedgerView /> },
      { path: 'ipd/pharmacy', element: <PharmacyFloorRequisitions /> },
      { path: 'ipd/facility-builder', element: <AdminFacilityBuilder /> },
      // Profile (Accessible by all authenticated roles) â€” Named Tab Routing
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <UserProfilePage />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="overview" replace /> },
          { path: 'overview', element: <ProfileOverviewView /> },
          { path: 'employment', element: <ProfileEmploymentView /> },
          { path: 'access', element: <ProfileAccessView /> },
          { path: 'credentials', element: <ProfileCredentialsView /> },
          { path: 'documents', element: <ProfileDocumentsView /> },
          { path: 'history', element: <ProfileHistoryView /> },
          { path: 'settings', element: <ProfileSettingsView /> },
        ],
      },

      // Unmatched dashboard route
      { path: '*', element: <NotFoundPage /> },
    ],
  },

  // â”€â”€ Public 404 & Catch-all Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: '/404', element: <NotFoundPage /> },
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <NotFoundPage /> },
]);

