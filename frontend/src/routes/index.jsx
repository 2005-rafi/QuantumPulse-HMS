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
import UserProfilePage from '../pages/UserProfilePage';
import AdminAnalytics from '../features/admin/AdminAnalytics';
import AdminPatientManager from '../features/admin/AdminPatientManager';
import AdminStaffManager from '../features/admin/AdminStaffManager';
import AdminDepartmentManager from '../features/admin/AdminDepartmentManager';
import AdminLabManager from '../features/admin/AdminLabManager';
import AdminSettings from '../features/admin/AdminSettings';
import AdminAuditLogs from '../features/admin/AdminAuditLogs';

/**
 * ProtectedLayout — Wraps all dashboard routes in ProtectedRoute.
 * Renders AppShell-aware Outlet for all nested dashboard routes.
 * Each dashboard manages its own layout (header, shell) via CommonHeader.
 */
const ProtectedLayout = () => (
  <ProtectedRoute>
    <Outlet />
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
  },

  // ── Protected Dashboard Routes ───────────────────────────────
  {
    path: '/dashboard',
    element: <ProtectedLayout />,
    children: [
      // Default /dashboard → redirect to login (role redirect handled by AppRouter)
      { index: true, element: <Navigate to="/login" replace /> },

      // Reception
      {
        path: 'reception',
        element: (
          <RoleRoute role="Reception">
            <ReceptionDashboard />
          </RoleRoute>
        ),
      },

      // Nurse
      {
        path: 'nurse',
        element: (
          <RoleRoute role="Nurse">
            <NurseDashboard />
          </RoleRoute>
        ),
      },

      // Doctor — nested patient workspace routes for deep-linking
      {
        path: 'doctor',
        element: (
          <RoleRoute role="Doctor">
            <DoctorDashboard />
          </RoleRoute>
        ),
      },

      // Laboratory
      {
        path: 'laboratory',
        element: (
          <RoleRoute role="Laboratory">
            <LabDashboard />
          </RoleRoute>
        ),
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
          { path: 'patients', element: <AdminPatientManager /> },
          { path: 'staff', element: <AdminStaffManager /> },
          { path: 'departments', element: <AdminDepartmentManager /> },
          { path: 'laboratories', element: <AdminLabManager /> },
          { path: 'settings', element: <AdminSettings /> },
          { path: 'audit', element: <AdminAuditLogs /> },
        ]
      },
      // Profile (Accessible by all authenticated roles)
      {
        path: 'profile',
        element: <UserProfilePage />
      },
    ],
  },

  // ── Root & Catch-all Redirects ───────────────────────────────
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
