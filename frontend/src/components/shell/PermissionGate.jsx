/**
 * components/shell/PermissionGate.jsx
 * Composable RBAC gate component enforcing fine-grained client-side permissions
 * (HIPAA § 164.312(a)(1) / OWASP ASVS V4.1).
 * 
 * Follows Open/Closed Principle (OCP) — features wrap actions without altering
 * their internal component implementations.
 * 
 * Usage:
 * <PermissionGate requires="MANAGE_USERS">
 *   <button onClick={deleteUser}>Delete Staff</button>
 * </PermissionGate>
 * 
 * <PermissionGate requires={['NOTE_FINALIZE', 'NOTE_AMEND']} mode="all" fallback={<span>Locked</span>}>
 *   <SignNoteButton />
 * </PermissionGate>
 */
import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const PermissionGate = ({
  requires,
  permission,
  role,
  mode = 'any', // 'any' | 'all'
  fallback = null,
  children,
}) => {
  const { user, hasPermission } = useAuth();

  if (!user) return fallback;

  // 1. Role verification (if role constraint provided)
  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!allowedRoles.includes(user.role) && user.role !== 'Administrator') {
      return fallback;
    }
  }

  // 2. Permission verification (if permission constraint provided)
  const reqPermissions = requires || permission;
  if (reqPermissions) {
    // Administrator has universal override
    if (user.role === 'Administrator') {
      return <>{children}</>;
    }

    const permList = Array.isArray(reqPermissions) ? reqPermissions : [reqPermissions];

    if (mode === 'all') {
      const hasAll = permList.every((p) => hasPermission(p));
      if (!hasAll) return fallback;
    } else {
      const hasAny = permList.some((p) => hasPermission(p));
      if (!hasAny) return fallback;
    }
  }

  return <>{children}</>;
};

export default PermissionGate;
