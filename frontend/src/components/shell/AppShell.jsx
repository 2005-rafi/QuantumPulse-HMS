import React from 'react';
import './AppShell.css';

/**
 * AppShell
 * Global layout wrapper for all role dashboards.
 * Provides the full-height page shell with sticky header support.
 *
 * SOLID:
 *   SRP  — Provides only the page-level shell layout (flex column).
 *           Header rendering is delegated to each dashboard's CommonHeader.
 *   OCP  — Extend via CSS classes or additional slot props, never by modifying.
 *   DIP  — Accepts children, does not depend on any specific dashboard.
 *
 * Architecture note:
 *   CommonHeader is rendered INSIDE each dashboard (not here) so that each
 *   role can inject its own brandTitle, tabs (centerSlot), and user context
 *   without prop-drilling through AppShell.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Dashboard content to render
 * @param {string} [props.className] - Optional additional class
 */
const AppShell = ({ children, className = '' }) => {
  return (
    <div className={`app-shell ${className}`.trim()}>
      {children}
    </div>
  );
};

export default AppShell;
