/**
 * dateFormatting.js
 * Centralized date and time utility functions.
 * Single source of truth for all relative time and date formatting in the app.
 * 
 * SOLID: Single Responsibility — only date/time formatting logic lives here.
 */

/**
 * Returns a human-readable, clinically logical relative wait time or arrival timestamp.
 * - For visits today: "15m wait", "45m wait", "1h 20m wait"
 * - For visits from yesterday: "Yesterday · 4:15 PM"
 * - For visits from older days: "10 Aug · 2:30 PM" (or date of prescription)
 * Prevents absurd counters like "193h 35m".
 *
 * @param {string|Date} dateString - ISO date string or Date object
 * @returns {string}
 */
export const formatQueueWaitTime = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();

  if (isNaN(date.getTime())) return '—';

  const isToday = date.toDateString() === now.toDateString();
  const diffMs = now.getTime() - date.getTime();

  if (isToday) {
    const totalMinutes = Math.max(1, Math.floor(diffMs / 60000));
    if (totalMinutes < 60) {
      return `${totalMinutes}m wait`;
    }
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m > 0 ? `${h}h ${m}m wait` : `${h}h wait`;
  }

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Yesterday · ${timeStr}`;
  }

  // Prior session / date
  const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} · ${timeStr}`;
};

/**
 * Returns a concise wait time string (backward compatible for short badge views).
 * Caps hours at today or displays formatted date for previous days.
 * @param {string} dateString - ISO date string
 * @returns {string}
 */
export const timeSince = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  if (isNaN(date.getTime())) return '—';

  const isToday = date.toDateString() === now.toDateString();
  const diffMs = now.getTime() - date.getTime();

  if (isToday) {
    const totalMinutes = Math.max(1, Math.floor(diffMs / 60000));
    if (totalMinutes < 60) {
      return `${totalMinutes}m`;
    }
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/**
 * Returns urgency variant for wait time display.
 * @param {string} createdAt - ISO date string
 * @returns {'error'|'secondary'|'default'}
 */
export const waitUrgencyVariant = (createdAt) => {
  if (!createdAt) return 'default';
  const mins = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (mins >= 60) return 'error';
  if (mins >= 30) return 'secondary';
  return 'default';
};

/**
 * Formats a date string to a locale-aware short date.
 * e.g. "5 Aug 2026"
 * @param {string} dateString - ISO date string
 * @returns {string}
 */
export const formatShortDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Formats today's date to a full, readable label.
 * e.g. "Wed, 5 Aug 2026"
 * @returns {string}
 */
export const formatTodayLabel = () =>
  new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/**
 * Computes age in years from a date of birth string.
 * @param {string} dobStr - ISO date string
 * @returns {number|null}
 */
export const computeAge = (dobStr) => {
  try {
    const dob = new Date(dobStr);
    const diff = Date.now() - dob.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  } catch {
    return null;
  }
};

/**
 * Masks a phone number for display, revealing only last 4 digits.
 * e.g. "+91 ••••••1234"
 * @param {string} phone
 * @returns {string}
 */
export const maskPhone = (phone = '') => {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return `+91 ${'•'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};
