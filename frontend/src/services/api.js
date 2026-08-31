/**
 * services/api.js
 * Centralized API client with JWT in-memory lifecycle management, preemptive token refresh,
 * structured error sanitization, and rate-limit handling.
 */
import axios from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isTokenExpired,
} from '../core/useSessionStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7722/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise = null;

const refreshAccessToken = async (refreshToken) => {
  const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
  const { accessToken, refreshToken: newRefreshToken } = data.data;
  setTokens(accessToken, newRefreshToken);
  return accessToken;
};

let errorCallback = null;
export const registerErrorCallback = (cb) => {
  errorCallback = cb;
};

// Friendly user error message dictionary mapping backend codes to clinical UI alerts
const ERROR_CODE_MAP = {
  AUTH_001: 'Invalid username or password.',
  AUTH_002: 'Invalid or expired access token.',
  AUTH_003: 'Token authentication failed. Please re-login.',
  AUTH_004: 'Account locked due to consecutive failed attempts. Contact IT Administrator.',
  AUTH_005: 'Account has been deactivated.',
  AUTH_006: 'Account activation pending.',
  AUTH_007: 'Authentication required to access this resource.',
  AUTHZ_001: 'Access Denied: You lack required permissions for this action.',
  VALIDATION_001: 'Input validation failed. Please check form fields.',
  SYS_001: 'An unexpected system error occurred.',
  SYS_002: 'Database operation error.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please slow down and try again shortly.',
};

// 1. Request Interceptor — Attach in-memory access token & preemptive refresh
api.interceptors.request.use(
  async (config) => {
    // Skip token logic on auth endpoints
    if (config.url?.includes('/auth/refresh') || config.url?.includes('/auth/login')) {
      return config;
    }

    let token = getAccessToken();
    const refreshToken = getRefreshToken();

    // If token is missing or expiring within 5s, try preemptive refresh
    if ((!token || isTokenExpired(token)) && refreshToken) {
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken(refreshToken).finally(() => {
            refreshPromise = null;
          });
        }
        token = await refreshPromise;
      } catch (err) {
        console.warn('Preemptive token refresh unsuccessful:', err?.message);
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor — Handle 401 retry, structured error sanitization
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Attach sanitized error details
    if (error.response?.data) {
      const apiError = error.response.data;
      error.errorCode = apiError.errorCode;
      error.apiMessage = apiError.message;

      // Produce sanitized clinical user message (stripping DB traces/stack dumps)
      error.userMessage =
        ERROR_CODE_MAP[apiError.errorCode] ||
        apiError.message ||
        'An error occurred while processing your request.';

      if (error.response.status === 429) {
        error.isRateLimit = true;
        error.userMessage = apiError.message || ERROR_CODE_MAP.RATE_LIMIT_EXCEEDED;
      } else if (error.response.status === 400 && apiError.errorCode === 'VALIDATION_001') {
        error.isValidationError = true;
      }
    } else if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      error.userMessage = 'Cannot reach HMS Server. Please verify network connection.';
    } else {
      error.userMessage = error.message || 'An unexpected error occurred.';
    }

    // Trigger registered UI Toast notification callback
    if (errorCallback) {
      try {
        errorCallback(error);
      } catch (cbErr) {
        console.error('Error callback dispatch error:', cbErr);
      }
    }

    // Let 403 Forbidden propagate to caller
    if (error.response?.status === 403) {
      return Promise.reject(error);
    }

    // 401 Unauthorized handling — attempt one-time refresh & retry
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login') &&
      !original.url?.includes('/auth/unlock')
    ) {
      original._retry = true;
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token available');

        if (!refreshPromise) {
          refreshPromise = refreshAccessToken(refreshToken).finally(() => {
            refreshPromise = null;
          });
        }
        const newAccessToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(original);
      } catch (refreshErr) {
        clearTokens(true);
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  unlock: (payload) => api.post('/auth/unlock', payload),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
  uploadFile: (visitId, orderId, formData) =>
    api.post(`/laboratory/orders/${visitId}/${orderId}/scan`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default api;
