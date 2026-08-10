/**
 * dateFormatting.js
 * Centralized date and time utility functions.
 * Single source of truth for all relative time and date formatting in the app.
 * 
 * SOLID: Single Responsibility — only date/time formatting logic lives here.
 */

/**
 * Returns a human-readable relative time string from a date string.
 * e.g. "2h 5m", "15m", "0m"
 * @param {string} dateString - ISO date string
 * @returns {string}
 */
export const timeSince = (dateString) => {
  if (!dateString) return '—';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 1000));
  const h = Math.floor(seconds / 3600);
  if (h >= 1) {
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const m = Math.floor(seconds / 60);
  return `${Math.max(m, 1)}m`;
};

/**
 * Returns urgency variant for wait time display.
 * @param {string} createdAt - ISO date string
 * @returns {'error'|'secondary'|'default'}
 */
export const waitUrgencyVariant = (createdAt) => {
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
