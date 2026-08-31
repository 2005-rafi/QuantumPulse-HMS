/**
 * core/useSessionStore.js
 * Centralized in-memory token and session lifecycle manager for Quantum CareOne HMS.
 * 
 * Security Architecture (OWASP ASVS V3.4 / HIPAA § 164.312(a)(2)(iv)):
 * - Access tokens are stored strictly in JavaScript module memory (_accessToken)
 *   preventing direct extraction via XSS attacks targeting localStorage.
 * - Refresh tokens are maintained for session continuity across page reloads.
 * - Cross-tab synchronization is maintained via BroadcastChannel.
 * - Single Responsibility Principle (SRP) — isolates token persistence logic.
 */

const REFRESH_TOKEN_KEY = 'hms_secure_ref_token';
const AUTH_CHANNEL_NAME = 'hms_auth_channel';

// Module-level in-memory storage for short-lived access token
let _accessToken = null;
const _listeners = new Set();

// Cross-tab broadcast channel instance
let _authChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    _authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel initialization failed, falling back to window storage events', e);
  }
}

/**
 * Notify all registered in-app listeners of an auth state change
 */
const notifyListeners = (event) => {
  _listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      console.error('SessionStore listener error:', err);
    }
  });
};

/**
 * Check whether a JWT token is expired or close to expiring (within offsetSeconds)
 * @param {string} token - The JWT token string
 * @param {number} offsetSeconds - Buffer before actual expiry (default 5s)
 * @returns {boolean}
 */
export const isTokenExpired = (token, offsetSeconds = 5) => {
  if (!token || typeof token !== 'string') return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payloadB64 = parts[1];
    const decoded = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (!decoded || !decoded.exp) return true;
    // Check expiration with buffer
    return decoded.exp * 1000 - offsetSeconds * 1000 < Date.now();
  } catch (e) {
    return true;
  }
};

/**
 * Get current in-memory access token
 * @returns {string|null}
 */
export const getAccessToken = () => _accessToken;

/**
 * Set in-memory access token
 * @param {string|null} token
 */
export const setAccessToken = (token) => {
  _accessToken = token || null;
  notifyListeners({ type: 'ACCESS_TOKEN_UPDATED', token: _accessToken });
};

/**
 * Get stored refresh token
 * @returns {string|null}
 */
export const getRefreshToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY) || localStorage.getItem('refreshToken') || null;
};

/**
 * Set stored refresh token
 * @param {string|null} token
 */
export const setRefreshToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
    // Remove legacy key if present
    localStorage.removeItem('refreshToken');
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem('refreshToken');
  }
};

/**
 * Atomically update access and refresh tokens
 * @param {string} accessToken
 * @param {string} refreshToken
 */
export const setTokens = (accessToken, refreshToken) => {
  _accessToken = accessToken || null;
  setRefreshToken(refreshToken);
  notifyListeners({ type: 'TOKENS_UPDATED', accessToken: _accessToken, refreshToken });
};

/**
 * Clear all session tokens and broadcast logout event across browser tabs
 * @param {boolean} broadcast - Whether to broadcast to other tabs (default true)
 */
export const clearTokens = (broadcast = true) => {
  _accessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('accessToken'); // clean legacy key if any
  }

  notifyListeners({ type: 'LOGOUT' });

  if (broadcast && _authChannel) {
    try {
      _authChannel.postMessage({ type: 'LOGOUT', timestamp: Date.now() });
    } catch (err) {
      console.warn('BroadcastChannel postMessage failed:', err);
    }
  }
};

/**
 * Register a listener callback for session changes
 * @param {Function} callback
 * @returns {Function} unsubscribe function
 */
export const subscribeAuthChange = (callback) => {
  _listeners.add(callback);
  return () => _listeners.delete(callback);
};

/**
 * Get the broadcast channel for cross-tab messaging
 * @returns {BroadcastChannel|null}
 */
export const getAuthBroadcastChannel = () => _authChannel;

export default {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  setTokens,
  clearTokens,
  isTokenExpired,
  subscribeAuthChange,
  getAuthBroadcastChannel,
};
