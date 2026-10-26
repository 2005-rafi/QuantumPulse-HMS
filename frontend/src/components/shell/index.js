/**
 * src/components/shell/index.js
 * Unified Barrel Export for Application Shell, Header, and Security Guards.
 */

export { default as AppShell } from './AppShell';
export * from './AppShell';

export { default as CommonHeader } from './CommonHeader';
export * from './CommonHeader';

export { default as PermissionGate } from './PermissionGate';
export * from './PermissionGate';

export { default as SessionGuard } from './SessionGuard';
export * from './SessionGuard';

export { default as SessionLockOverlay } from './SessionLockOverlay';
export * from './SessionLockOverlay';

export { default as useAutoRefresh } from './useAutoRefresh';
export * from './useAutoRefresh';
