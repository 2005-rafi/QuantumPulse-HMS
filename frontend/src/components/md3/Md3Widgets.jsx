import React from 'react';
import './Md3Widgets.css';

/* ============================================================
   MD3 WIDGETS LIBRARY
   - Single Responsibility: Each widget does one thing well
   - Open/Closed: Extensible via props, not modification
   - Liskov: All widgets accept className/style for composition
   - Interface Segregation: Minimal, focused prop interfaces
   - Dependency Inversion: Depend on props abstractions, not concretions
   ============================================================ */

/* ─── Icon Set (Dependency-free, Material Symbols style) ─── */
export const Icon = {
  Person: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Phone: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  PhoneCall: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  Location: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Droplet: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  ),
  CreditCard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  ),
  Alert: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  History: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
    </svg>
  ),
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Print: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Mail: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  Shield: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Users: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Activity: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  FileText: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Logout: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  Search: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Clear: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Inbox: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  ),
  ChevronLeftDouble: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="11 17 6 12 11 7"/>
      <polyline points="18 17 13 12 18 7"/>
    </svg>
  ),
  ChevronRightDouble: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="13 17 18 12 13 7"/>
      <polyline points="6 17 11 12 6 7"/>
    </svg>
  ),
  Heart: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  Thermometer: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
    </svg>
  ),
  Ruler: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.3 8.7l-6-6a1 1 0 0 0-1.4 0L2.7 13.9a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0L21.3 10.1a1 1 0 0 0 0-1.4zM7.5 10.5l2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2"/>
    </svg>
  ),
  Scale: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M16.5 6h5L19 12h-2.5zM2.5 6h5L6 12H3.5zM3 3h18v4H3zM20 21H4"/>
    </svg>
  ),
  Clock: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Stethoscope: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>
    </svg>
  ),
  Hospital: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h2v2H9zM13 9h2v2h-2zM9 13h2v2H9zM13 13h2v2h-2zM9 17h2v2H9zM13 17h2v2h-2z"/>
    </svg>
  ),
  Building: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h2v2H9zM13 9h2v2h-2zM9 13h2v2H9zM13 13h2v2h-2zM9 17h2v2H9zM13 17h2v2h-2z"/>
    </svg>
  ),
  Clipboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
  ),
  Copy: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  DELETE: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  PLUS: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  CHECK: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Send: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Refresh: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
  Pill: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>
    </svg>
  ),
  Microscope: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/><path d="M12 13v9"/><circle cx="17" cy="6" r="3"/>
    </svg>
  ),
  Beaker: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 3h15"/><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"/><path d="M6 14s1.5 2 4 2 4-2 4-2"/>
    </svg>
  ),
  LightMode: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
    </svg>
  ),
  WbSunny: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4V2"/><path d="M12 22v-2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.93 19.07 1.41-1.41"/><path d="m17.66 6.34 1.41-1.41"/><circle cx="12" cy="12" r="4"/>
    </svg>
  ),
  DarkMode: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
  Sun: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4V2"/><path d="M12 22v-2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.93 19.07 1.41-1.41"/><path d="m17.66 6.34 1.41-1.41"/><circle cx="12" cy="12" r="4"/>
    </svg>
  ),
  Moon: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
  Remove: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  BloodPressure: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 15a4 4 0 0 1-8 0V6a2 2 0 1 1 4 0"/><path d="M7 15V7"/><circle cx="17" cy="12" r="4"/>
    </svg>
  ),
  Pulse: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  ThermoStat: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>
    </svg>
  ),
  Check: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  ShieldCheck: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
  FileSearch: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="11.5" cy="14.5" r="2.5"/><path d="m13.3 16.3 1.7 1.7"/>
    </svg>
  ),
  Save: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
    </svg>
  ),
  Filter: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  ArrowUpDown: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>
    </svg>
  ),
  Flag: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>
    </svg>
  ),
  Info: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
    </svg>
  ),
  Download: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
    </svg>
  ),
  Volume2: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  ),
  SkipForward: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4"/>
      <line x1="19" y1="5" x2="19" y2="19"/>
    </svg>
  ),
  Upload: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" x2="12" y1="3" y2="15"/>
    </svg>
  ),
  Trash: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <line x1="10" y1="11" x2="10" y2="17"/>
      <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
  ),
  X: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  XCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  UserCheck: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>
    </svg>
  ),
  User: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Eye: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  ExternalLink: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
};

/* ─── Md3Card: Single Responsibility — Container only ─── */
export const Md3Card = ({
  children,
  variant = 'elevated',
  padding = 'default',
  className = '',
  style = {},
  onClick,
  role,
  ariaLabel,
}) => {
  const classes = [
    'md3-card',
    `md3-card--${variant}`,
    `md3-card--p-${padding}`,
    onClick ? 'md3-card--clickable' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      style={style}
      onClick={onClick}
      role={role || (onClick ? 'button' : undefined)}
      aria-label={ariaLabel}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); }
      } : undefined}
    >
      {children}
    </div>
  );
};

/* ─── Md3CardHeader: Composable card header ─── */
export const Md3CardHeader = ({
  icon,
  title,
  subtitle,
  action,
  className = '',
}) => (
  <div className={`md3-card__header ${className}`}>
    {(icon || title || subtitle) && (
      <div className="md3-card__header-main">
        {icon && <div className="md3-card__header-icon">{icon}</div>}
        <div className="md3-card__header-text">
          {title && <h3 className="md3-card__title">{title}</h3>}
          {subtitle && <p className="md3-card__subtitle">{subtitle}</p>}
        </div>
      </div>
    )}
    {action && <div className="md3-card__header-action">{action}</div>}
  </div>
);

/* ─── Md3Chip: Single Responsibility — Status/label badge ─── */
export const Md3Chip = ({
  children,
  variant = 'default',
  size = 'medium',
  icon,
  className = '',
  style = {},
}) => {
  const classes = [
    'md3-chip',
    `md3-chip--${variant}`,
    `md3-chip--${size}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} style={style}>
      {icon && <span className="md3-chip__icon">{icon}</span>}
      <span className="md3-chip__label">{children}</span>
    </span>
  );
};

/* ─── Md3StatCard: Single Responsibility — Display a single metric ─── */
export const Md3StatCard = ({
  icon,
  label,
  value,
  trend,
  variant = 'default',
  className = '',
}) => {
  const classes = [
    'md3-stat-card',
    `md3-stat-card--${variant}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {icon && <div className="md3-stat-card__icon">{icon}</div>}
      <div className="md3-stat-card__content">
        <span className="md3-stat-card__label">{label}</span>
        <span className="md3-stat-card__value">{value}</span>
        {trend && <span className="md3-stat-card__trend">{trend}</span>}
      </div>
    </div>
  );
};

/* ─── Md3Section: Single Responsibility — Form/content section wrapper ─── */
export const Md3Section = ({
  title,
  subtitle,
  icon,
  children,
  variant = 'default',
  className = '',
  headerAction,
}) => {
  const classes = [
    'md3-section',
    `md3-section--${variant}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <section className={classes}>
      {(title || icon || headerAction) && (
        <header className="md3-section__header">
          <div className="md3-section__header-main">
            {icon && <span className="md3-section__icon">{icon}</span>}
            <div className="md3-section__titles">
              {title && <h4 className="md3-section__title">{title}</h4>}
              {subtitle && <p className="md3-section__subtitle">{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div className="md3-section__action">{headerAction}</div>}
        </header>
      )}
      <div className="md3-section__body">{children}</div>
    </section>
  );
};

/* ─── Md3Grid: Single Responsibility — Responsive grid layout ─── */
export const Md3Grid = ({
  columns = 2,
  gap = 'default',
  children,
  className = '',
  style = {},
}) => {
  const classes = [
    'md3-grid',
    `md3-grid--cols-${columns}`,
    `md3-grid--gap-${gap}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
};

/* ─── Md3GridItem: Grid column span override ─── */
export const Md3GridItem = ({
  span = 1,
  children,
  className = '',
  style = {},
}) => {
  const classes = [
    'md3-grid__item',
    span > 1 ? `md3-grid__item--span-${span}` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
};

/* ─── Md3InfoRow: Single Responsibility — Label/value display pair ─── */
export const Md3InfoRow = ({
  label,
  value,
  icon,
  className = '',
}) => (
  <div className={`md3-info-row ${className}`}>
    {icon && <span className="md3-info-row__icon">{icon}</span>}
    <div className="md3-info-row__content">
      <span className="md3-info-row__label">{label}</span>
      <span className="md3-info-row__value">{value || '—'}</span>
    </div>
  </div>
);

/* ─── Md3Avatar: Single Responsibility — User avatar ─── */
export const Md3Avatar = ({
  initials,
  size = 'medium',
  variant = 'primary',
  className = '',
  style = {},
  imageUrl,
}) => {
  const classes = [
    'md3-avatar',
    `md3-avatar--${size}`,
    `md3-avatar--${variant}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style}>
      {imageUrl ? (
        <img src={imageUrl} alt={initials || 'avatar'} className="md3-avatar__img" />
      ) : (
        <span className="md3-avatar__text">{initials}</span>
      )}
    </div>
  );
};

/* ─── Md3IconButton: Single Responsibility — Icon-only button ─── */
export const Md3IconButton = ({
  icon,
  onClick,
  variant = 'standard',
  size = 'medium',
  ariaLabel,
  disabled,
  className = '',
  style = {},
  ...rest
}) => {
  const classes = [
    'md3-icon-btn',
    `md3-icon-btn--${variant}`,
    `md3-icon-btn--${size}`,
    disabled ? 'md3-icon-btn--disabled' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      style={style}
      {...rest}
    >
      {icon}
    </button>
  );
};

/* ─── Md3Fab: Single Responsibility — Floating Action Button ─── */
export const Md3Fab = ({
  icon,
  label,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  loadingText = 'Loading...',
  className = '',
  style = {},
  ariaLabel,
}) => {
  const isExtended = !!label;
  const classes = [
    'md3-fab',
    `md3-fab--${variant}`,
    `md3-fab--${size}`,
    isExtended ? 'md3-fab--extended' : '',
    disabled ? 'md3-fab--disabled' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
      style={style}
    >
      {loading ? (
        <span className="md3-spinner md3-spinner--sm" />
      ) : (
        icon && <span className="md3-fab__icon">{icon}</span>
      )}
      {label && <span className="md3-fab__label">{loading ? loadingText : label}</span>}
    </button>
  );
};

/* ─── Md3Tabs: Single Responsibility — Tab navigation ─── */
export const Md3Tabs = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => (
  <div className={`md3-tabs ${className}`} role="tablist">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={activeTab === tab.id}
        className={`md3-tab ${activeTab === tab.id ? 'md3-tab--active' : ''}`}
        onClick={() => onChange(tab.id)}
      >
        {tab.icon && <span className="md3-tab__icon">{tab.icon}</span>}
        <span className="md3-tab__label">{tab.label}</span>
      </button>
    ))}
    <span
      className="md3-tabs__indicator"
      style={{
        width: `${100 / tabs.length}%`,
        transform: `translateX(${tabs.findIndex((t) => t.id === activeTab) * 100}%)`,
      }}
    />
  </div>
);

/* ─── Md3Badge: Single Responsibility — Count/notification badge ─── */
export const Md3Badge = ({
  count,
  variant = 'primary',
  dot = false,
  className = '',
}) => {
  const classes = [
    'md3-badge',
    `md3-badge--${variant}`,
    dot ? 'md3-badge--dot' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} aria-label={dot ? undefined : `${count} items`}>
      {!dot && (count > 99 ? '99+' : count)}
    </span>
  );
};

/* ─── Md3Divider: MD3 divider ─── */
export const Md3Divider = ({ variant = 'full', className = '' }) => (
  <hr className={`md3-divider md3-divider--${variant} ${className}`} />
);

/* ─── Md3EmptyState: Single Responsibility — Empty placeholder ─── */
export const Md3EmptyState = ({
  icon,
  title,
  subtitle,
  action,
  className = '',
}) => (
  <div className={`md3-empty-state ${className}`}>
    {icon && <div className="md3-empty-state__icon">{icon}</div>}
    {title && <h4 className="md3-empty-state__title">{title}</h4>}
    {subtitle && <p className="md3-empty-state__subtitle">{subtitle}</p>}
    {action && <div className="md3-empty-state__action">{action}</div>}
  </div>
);

/* ─── Md3DataTable: Single Responsibility — MD3 data table wrapper ─── */
export const Md3DataTable = ({
  columns,
  rows,
  emptyState,
  loading,
  className = '',
  onRowClick,
}) => (
  <div className={`md3-data-table-wrap ${className}`}>
    <table className="md3-data-table">
      {columns && (
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={col.key || i}
                scope="col"
                style={col.align ? { textAlign: col.align } : undefined}
              >
                {col.header || col.label}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {loading ? (
          <tr>
            <td colSpan={columns?.length || 1}>
              <div className="md3-data-table__loading">
                <span className="md3-spinner md3-spinner--sm" />
                <span>Loading…</span>
              </div>
            </td>
          </tr>
        ) : rows && rows.length > 0 ? (
          rows.map((row, rowIdx) => (
            <tr 
              key={row._id || row.id || rowIdx}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'md3-data-table-row--clickable' : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={col.key || colIdx}
                  style={col.align ? { textAlign: col.align } : undefined}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={columns?.length || 1}>
              {emptyState || (
                <div className="md3-data-table__empty">No records found</div>
              )}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

/* ─── Md3ActionBar: Single Responsibility — Action row with buttons ─── */
export const Md3ActionBar = ({
  children,
  align = 'end',
  className = '',
}) => (
  <div className={`md3-action-bar md3-action-bar--${align} ${className}`}>
    {children}
  </div>
);

export const Md3TextArea = ({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  error,
  disabled,
  rows = 3,
  required,
  className = '',
  style = {},
}) => {
  const isFilled = value !== '' && value !== null && value !== undefined;
  const isError = !!error;

  return (
    <div
      className={`md3-text-field-container ${isError ? 'md3-error' : ''} ${disabled ? 'md3-disabled' : ''} md3-textarea-container ${className}`}
      style={style}
    >
      <div className="md3-field-wrapper md3-textarea-wrapper">
        <textarea
          id={id}
          name={name}
          className={`md3-field-input md3-textarea ${isFilled ? 'is-filled' : ''}`}
          value={value}
          onChange={onChange}
          placeholder=" "
          disabled={disabled}
          required={required}
          rows={rows}
          aria-invalid={isError}
          aria-describedby={isError ? `${id}-error` : undefined}
        />
        {label && <label htmlFor={id} className="md3-field-label">{label}{required && ' *'}</label>}
      </div>
      {isError && (
        <span id={`${id}-error`} className="md3-field-error-text">{error}</span>
      )}
    </div>
  );
};

export const Md3NumberField = ({
  id,
  name,
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  error,
  disabled,
  className = '',
  style = {},
}) => {
  const isFilled = value !== '' && value !== null && value !== undefined;
  const isError = !!error;

  const increment = () => {
    if (disabled) return;
    const current = Number(value) || 0;
    const next = Math.min(current + step, max);
    onChange({ target: { name, value: next } });
  };

  const decrement = () => {
    if (disabled) return;
    const current = Number(value) || 0;
    const next = Math.max(current - step, min);
    onChange({ target: { name, value: next } });
  };

  return (
    <div
      className={`md3-text-field-container ${isError ? 'md3-error' : ''} ${disabled ? 'md3-disabled' : ''} md3-number-container ${className}`}
      style={style}
    >
      <div className="md3-field-wrapper md3-number-wrapper">
        <button
          type="button"
          className="md3-number-btn md3-number-btn--decrement"
          onClick={decrement}
          disabled={disabled}
          aria-label="Decrease"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <input
          id={id}
          name={name}
          type="number"
          className={`md3-field-input md3-number-input has-trailing has-leading ${isFilled ? 'is-filled' : ''}`}
          value={value}
          onChange={onChange}
          placeholder=" "
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          aria-invalid={isError}
          aria-describedby={isError ? `${id}-error` : undefined}
        />
        {label && <label htmlFor={id} className="md3-field-label md3-number-label">{label}</label>}
        <button
          type="button"
          className="md3-number-btn md3-number-btn--increment"
          onClick={increment}
          disabled={disabled}
          aria-label="Increase"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
      {isError && (
        <span id={`${id}-error`} className="md3-field-error-text">{error}</span>
      )}
    </div>
  );
};

/* ─── Md3WorkspaceIdleState: Reusable Dashboard Idle / Welcome Workspace ─── */
export const Md3WorkspaceIdleState = ({
  role = 'Physician',
  userName = '',
  department = '',
  stats = [],
  tips = [],
  action,
  className = '',
}) => {
  return (
    <div className={`md3-workspace-idle ${className}`}>
      <div className="md3-workspace-idle__hero">
        <div className="md3-workspace-idle__icon-halo">
          <Icon.Stethoscope />
        </div>
        <h2 className="md3-workspace-idle__title">
          {userName ? `Welcome, Dr. ${userName.replace(/^Dr\.\s*/i, '')}` : 'Clinical Workspace Ready'}
        </h2>
        <p className="md3-workspace-idle__subtitle">
          {department ? `${department} Department • ` : ''}Select a patient from the queue to start consultation
        </p>
      </div>

      {stats.length > 0 && (
        <div className="md3-workspace-idle__stats">
          {stats.map((st, i) => (
            <div key={i} className="md3-workspace-idle__stat-card">
              {st.icon && <div className="md3-workspace-idle__stat-icon">{st.icon}</div>}
              <div className="md3-workspace-idle__stat-text">
                <span className="md3-workspace-idle__stat-label">{st.label}</span>
                <span className="md3-workspace-idle__stat-value">{st.value}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tips.length > 0 && (
        <div className="md3-workspace-idle__tips">
          <h4 className="md3-workspace-idle__tips-title">
            <Icon.Alert />
            <span>Workflow Guidelines</span>
          </h4>
          <ul className="md3-workspace-idle__tips-list">
            {tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {action && <div className="md3-workspace-idle__action">{action}</div>}
    </div>
  );
};
