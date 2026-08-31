/**
 * routes/AppRouter.jsx
 * Centralized React Router Guard Components (ProtectedRoute, RoleRoute, PermissionRoute, GuestRoute).
 * Enforces fine-grained authentication and permission validation (HIPAA § 164.312(a)(1) / OWASP ASVS V4.1).
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_DEFAULT_ROUTES = {
  Reception: '/dashboard/reception',
  Nurse: '/dashboard/nurse',
  Doctor: '/dashboard/doctor',
  Laboratory: '/dashboard/laboratory',
  Pharmacy: '/dashboard/pharmacy',
  Administrator: '/dashboard/administrator',
};

/**
 * ProtectedRoute — redirects to /login if not authenticated.
 */
export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e0e8e4', borderTopColor: '#0e6b5c', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7c75', fontSize: '0.9rem' }}>Loading session...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

/**
 * RoleRoute — redirects to user's assigned dashboard if role or fine-grained permission doesn't match.
 */
export const RoleRoute = ({ role, permission, requires, children }) => {
  const { user, hasPermission } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 1. Role verification
  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!allowedRoles.includes(user.role) && user.role !== 'Administrator') {
      const correctRoute = ROLE_DEFAULT_ROUTES[user.role] || '/dashboard';
      return <Navigate to={correctRoute} replace />;
    }
  }

  // 2. Permission verification (if fine-grained requirement specified)
  const reqPermissions = permission || requires;
  if (reqPermissions && user.role !== 'Administrator') {
    const perms = Array.isArray(reqPermissions) ? reqPermissions : [reqPermissions];
    const hasAccess = perms.some((p) => hasPermission(p));
    if (!hasAccess) {
      const correctRoute = ROLE_DEFAULT_ROUTES[user.role] || '/dashboard';
      return <Navigate to={correctRoute} replace />;
    }
  }

  return children;
};

/**
 * PermissionRoute — guards child routes with required permissions.
 */
export const PermissionRoute = ({ permission, requires, children }) => {
  const { user, hasPermission } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'Administrator') {
    return children;
  }

  const reqPermissions = permission || requires;
  if (reqPermissions) {
    const perms = Array.isArray(reqPermissions) ? reqPermissions : [reqPermissions];
    const hasAccess = perms.some((p) => hasPermission(p));
    if (!hasAccess) {
      const correctRoute = ROLE_DEFAULT_ROUTES[user.role] || '/dashboard';
      return <Navigate to={correctRoute} replace />;
    }
  }

  return children;
};

/**
 * GuestRoute — redirects authenticated users to their dashboard.
 */
export const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    const route = ROLE_DEFAULT_ROUTES[user.role] || '/dashboard';
    return <Navigate to={route} replace />;
  }

  return children;
};

export default {
  ProtectedRoute,
  RoleRoute,
  PermissionRoute,
  GuestRoute,
};
