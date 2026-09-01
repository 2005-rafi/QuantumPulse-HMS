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

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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
  AUTH_002: 'Your clinical session has expired. Please sign in again.',
  AUTH_003: 'Authentication verification failed. Please sign in again.',
  AUTH_004: 'Account temporarily secured due to consecutive failed attempts. Contact Hospital Administrator.',
  AUTH_005: 'This staff account has been deactivated. Please contact Administration.',
  AUTH_006: 'Account activation is pending administrative review.',
  AUTH_007: 'Authentication required. Please log in to access this clinical module.',
  AUTHZ_001: 'Access Restricted: Your current clinical role lacks permission for this action.',
  VALIDATION_001: 'Please verify the highlighted clinical form fields and try again.',
  SYS_001: 'The hospital clinical data service encountered a temporary delay. Please try again.',
  SYS_002: 'Clinical database operation in progress. Please retry in a few moments.',
  NOT_FOUND: 'The requested patient, bed, or clinical record could not be found.',
  RATE_LIMIT_EXCEEDED: 'Request volume limit reached. Please wait a moment before trying again.',
};

export const sanitizeClinicalErrorMessage = (apiError, status, rawError = '') => {
  if (!apiError && !rawError) return 'An unexpected error occurred. Please try again.';

  if (apiError?.errorCode && ERROR_CODE_MAP[apiError.errorCode]) {
    return ERROR_CODE_MAP[apiError.errorCode];
  }

  if (status === 404) {
    return 'The requested hospital service or record is currently unavailable. Please check with Ward Operations or IT.';
  }

  if (status === 403) {
    return 'Access Restricted: Your clinical position does not have permission for this operation.';
  }

  if (status === 401) {
    return 'Your clinical session has expired. Please sign in again.';
  }

  if (status === 429) {
    return 'High network traffic. Please wait a few seconds and try again.';
  }

  if (status >= 500) {
    return 'The clinical server encountered a temporary delay. Please retry shortly.';
  }

  const raw = apiError?.message || apiError?.detail || rawError || '';

  // Proactively filter out raw developer notes, route traces, and database strings
  if (
    /Route (GET|POST|PUT|PATCH|DELETE)|Cannot read properties|ObjectId|Cast to|buffering timed out|E11000|validation failed|syntax|stack trace/i.test(raw)
  ) {
    return 'Clinical data synchronization in progress. Please refresh the terminal or try again.';
  }

  return raw || 'An error occurred while processing your request.';
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

    // Attach sanitized clinical error details
    if (error.response?.data) {
      const apiError = error.response.data;
      error.errorCode = apiError.errorCode;
      error.apiMessage = apiError.message;

      // Produce UX-focused clinical message (stripping DB traces/stack dumps/developer notes)
      error.userMessage = sanitizeClinicalErrorMessage(apiError, error.response.status, error.message);

      if (error.response.status === 429) {
        error.isRateLimit = true;
        error.userMessage = error.userMessage || ERROR_CODE_MAP.RATE_LIMIT_EXCEEDED;
      } else if (error.response.status === 400 && apiError.errorCode === 'VALIDATION_001') {
        error.isValidationError = true;
      }
    } else if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      error.userMessage = 'Cannot reach HMS Server. Please verify network connection.';
    } else {
      error.userMessage = 'An unexpected clinical service error occurred. Please try again.';
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
