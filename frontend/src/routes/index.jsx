/**
 * routes/index.jsx
 * Centralized route configuration using React Router v6 createBrowserRouter.
 *
 * SOLID:
 *   SRP  — Routing configuration is isolated here; App.jsx is not a router.
 *   OCP  — Add routes by extending this array, never modifying App.jsx.
 *   DIP  — Route guards (ProtectedRoute, RoleRoute) depend on AuthContext abstraction.
 *
 * Architecture:
 *   / and /dashboard/* → redirect to /login
 *   /login             → GuestRoute (redirect away if already authenticated)
 *   /dashboard         → ProtectedRoute > AppShell (layout shell)
 *     /dashboard/reception        → RoleRoute[Reception]  > ReceptionDashboard
 *     /dashboard/nurse            → RoleRoute[Nurse]      > NurseDashboard
 *     /dashboard/doctor           → RoleRoute[Doctor]     > DoctorDashboard
 *     /dashboard/laboratory       → RoleRoute[Laboratory] > LabDashboard
 *     /dashboard/pharmacy         → RoleRoute[Pharmacy]   > PharmacyDashboard
 *     /dashboard/administrator    → RoleRoute[Admin]      > AdministratorDashboard
 */

import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';

// Auth Guards
import { ProtectedRoute, RoleRoute, GuestRoute } from './AppRouter';

// Pages
import LoginPage from '../features/auth/LoginPage';
import ReceptionDashboard from '../pages/ReceptionDashboard';
import NurseDashboard from '../pages/NurseDashboard';
import DoctorDashboard from '../pages/DoctorDashboard';
import LabDashboard from '../pages/LabDashboard';
import PharmacyDashboard from '../pages/PharmacyDashboard';
import AdministratorDashboard from '../pages/AdministratorDashboard';
import WardOperationsDashboard from '../pages/WardOperationsDashboard';
import UserProfilePage from '../pages/UserProfilePage';
// Child Views for Named Routing
import { ReceptionPatientsView, ReceptionAppointmentsView } from '../features/patients/ReceptionViews';
import { DoctorConsultationView, DoctorAppointmentsView, DoctorDeletionRequestsView, DoctorConsultationHistoryView } from '../features/doctor/DoctorViews';
import { NurseTriageView } from '../features/nurse/NurseViews';
import { LabProcessingView, LabSpecimensView, LabReportedView } from '../features/laboratory/LabViews';
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
import AdminPatientManager from '../features/admin/AdminPatientManager';
import AdminStaffManager from '../features/admin/AdminStaffManager';
import AdminDepartmentManager from '../features/admin/AdminDepartmentManager';
import AdminLabManager from '../features/admin/AdminLabManager';
import AdminSettings from '../features/admin/AdminSettings';
import AdminAuditLogs from '../features/admin/AdminAuditLogs';
import AdminTariffBilling from '../features/admin/AdminTariffBilling';
import StorageAnalyticsTab from '../features/admin/StorageAnalyticsTab';
import AppointmentDashboard from '../features/appointments/AppointmentDashboard';
import ReceptionBedMap from '../features/ipd/ReceptionBedMap';
import AdminFacilityBuilder from '../features/ipd/AdminFacilityBuilder';
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
 * ProtectedLayout — Wraps all dashboard routes in ProtectedRoute and SessionGuard.
 * Enforces authentication, automatic inactivity logoff (HIPAA § 164.312),
 * and shoulder-surfing privacy blur.
 */
const ProtectedLayout = () => (
  <ProtectedRoute>
    <SessionGuard>
      <Outlet />
    </SessionGuard>
  </ProtectedRoute>
);

export const router = createBrowserRouter([
  // ── Public ──────────────────────────────────────────────────
  {
    path: '/login',
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
    errorElement: <Md3RouteErrorBoundary />,
  },

  // ── Protected Dashboard Routes ───────────────────────────────
  {
    path: '/dashboard',
    element: <ProtectedLayout />,
    errorElement: <Md3RouteErrorBoundary />,
    children: [
      // Default /dashboard → redirect to login (role redirect handled by AppRouter)
      { index: true, element: <Navigate to="/login" replace /> },

      // Reception — Named tab routing: /patients, /appointments
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
          { path: 'appointments', element: <ReceptionAppointmentsView /> },
          { path: 'bed-map', element: <ReceptionBedMap /> },
        ],
      },

      // Nurse — Named tab routing: /triage, /ipd
      {
        path: 'nurse',
        element: (
          <RoleRoute role="Nurse">
            <NurseDashboard />
          </RoleRoute>
        ),
        children: [
          { index: true, element: <Navigate to="triage" replace /> },
          { path: 'triage', element: <NurseTriageView /> },
          { path: 'ipd', element: <NurseIpdStation /> },
          { path: 'ipd/:admissionId', element: <NurseIpdStation /> },
        ],
      },

      // Doctor — Named tab routing: /consultation, /ipd, /appointments, /deletion-requests
      {
        path: 'doctor',
        element: (
          <RoleRoute role="Doctor">
            <DoctorDashboard />
          </RoleRoute>
        ),
        children: [
          { index: true, element: <Navigate to="consultation" replace /> },
          { path: 'consultation', element: <DoctorConsultationView /> },
          { path: 'history', element: <DoctorConsultationHistoryView /> },
          { path: 'ipd', element: <DoctorIpdCockpit /> },
          { path: 'ipd/:admissionId', element: <DoctorIpdCockpit /> },
          { path: 'appointments', element: <DoctorAppointmentsView /> },
          { path: 'deletion-requests', element: <DoctorDeletionRequestsView /> },
        ],
      },

      // Laboratory — Named tab routing: /processing, /specimens, /reported
      {
        path: 'laboratory',
        element: (
          <RoleRoute role="Laboratory">
            <LabDashboard />
          </RoleRoute>
        ),
        children: [
          { index: true, element: <Navigate to="processing" replace /> },
          { path: 'processing', element: <LabProcessingView /> },
          { path: 'specimens', element: <LabSpecimensView /> },
          { path: 'reported', element: <LabReportedView /> },
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
          { path: 'storage', element: <StorageAnalyticsTab /> },
          { path: 'patients', element: <AdminPatientManager /> },
          { path: 'staff', element: <AdminStaffManager /> },
          { path: 'facility-builder', element: <AdminFacilityBuilder /> },
          { path: 'departments', element: <AdminDepartmentManager /> },
          { path: 'laboratories', element: <AdminLabManager /> },
          { path: 'billing', element: <AdminTariffBilling /> },
          { path: 'settings', element: <Navigate to="/dashboard/administrator/billing" replace /> },
          { path: 'audit', element: <AdminAuditLogs /> },
          { path: 'appointments', element: <AdminAppointmentsWrapper /> },
        ]
      },

      // Ward Operations (Bed & Facility Manager) — Named tab routing: /bed-map, /time-monitoring, /facility-builder, /transfers
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
        ],
      },

      // ── Dedicated Inpatient Department (IPD) Clinical Workstations ──
      { path: 'ipd/bed-map', element: <ReceptionBedMap /> },
      { path: 'ipd/nursing', element: <NurseIpdStation /> },
      { path: 'ipd/nursing/:admissionId', element: <NurseIpdStation /> },
      { path: 'ipd/doctor', element: <DoctorIpdCockpit /> },
      { path: 'ipd/doctor/:admissionId', element: <DoctorIpdCockpit /> },
      { path: 'ipd/billing', element: <IpdLedgerView /> },
      { path: 'ipd/billing/:admissionId', element: <IpdLedgerView /> },
      { path: 'ipd/pharmacy', element: <PharmacyFloorRequisitions /> },
      { path: 'ipd/facility-builder', element: <AdminFacilityBuilder /> },
      // Profile (Accessible by all authenticated roles) — Named Tab Routing
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
    ],
  },

  // ── Root & Catch-all Redirects ───────────────────────────────
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
