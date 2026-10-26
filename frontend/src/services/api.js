/**
 * services/api.js
 * Centralized API client with JWT in-memory lifecycle management, preemptive token refresh,
 * structured error sanitization, and rate-limit handling.
 */
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/endpoints';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isTokenExpired,
} from '../core/useSessionStore';
import { sanitizeQueryParams, sanitizePayload } from '../core/security/query-sanitizer';

/**
 * Dynamic API Base URL resolution:
 * On remote devices, mobile phones, or public tunnels (*.trycloudflare.com, LAN IP 10.x.x.x),
 * always use the same-origin relative path '/api/v1'.
 * This prevents hardcoded localhost URLs from leaking to remote clients,
 * completely resolving Content Security Policy (CSP) and Mixed Content blocking.
 */
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return '/api/v1';
    }
  }
  return import.meta.env.VITE_API_URL || '/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

/**
 * TokenRefreshCoordinator
 * Concurrency coordinator enforcing a Single-Flight Mutex lock and FIFO queue drainage
 * for JWT token refresh operations (prevents thundering herd, starvation, and race conditions).
 */
class TokenRefreshCoordinator {
  constructor() {
    this.refreshPromise = null;
    this.subscribers = [];
    this.timeoutId = null;
  }

  /**
   * Subscribe a pending request to be resolved when the active refresh completes.
   */
  subscribe(callback) {
    this.subscribers.push(callback);
  }

  /**
   * Notify all queued subscribers with the newly acquired access token.
   */
  notifySubscribers(token) {
    const queue = [...this.subscribers];
    this.subscribers = [];
    queue.forEach((cb) => {
      try {
        cb(null, token);
      } catch (err) {
        console.error('Subscriber notification error:', err);
      }
    });
  }

  /**
   * Reject all queued subscribers if refresh permanently failed.
   */
  rejectSubscribers(error) {
    const queue = [...this.subscribers];
    this.subscribers = [];
    queue.forEach((cb) => {
      try {
        cb(error, null);
      } catch (err) {
        console.error('Subscriber rejection error:', err);
      }
    });
  }

  /**
   * Execute atomic refresh mutex
   */
  async acquireFreshToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token present in session store');
    }

    if (this.refreshPromise) {
      // Return existing in-flight promise (Single-Flight deduplication)
      return this.refreshPromise;
    }

    // Set starvation guard (10s max timeout)
    this.refreshPromise = new Promise(async (resolve, reject) => {
      this.timeoutId = setTimeout(() => {
        const timeoutErr = new Error('Token refresh timeout');
        this.rejectSubscribers(timeoutErr);
        this.refreshPromise = null;
        reject(timeoutErr);
      }, 10000);

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
        );

        if (this.timeoutId) clearTimeout(this.timeoutId);

        const { accessToken, refreshToken: newRefreshToken } = data.data;
        setTokens(accessToken, newRefreshToken || refreshToken);
        this.notifySubscribers(accessToken);
        resolve(accessToken);
      } catch (err) {
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.rejectSubscribers(err);
        reject(err);
      } finally {
        this.refreshPromise = null;
      }
    });

    return this.refreshPromise;
  }
}

const refreshCoordinator = new TokenRefreshCoordinator();

export const refreshAccessToken = () => refreshCoordinator.acquireFreshToken();

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

  // 1. Handle 422/400 validation details explicitly
  if (status === 422 || status === 400) {
    const details = apiError?.details || apiError?.invalidParams || (Array.isArray(apiError?.data) ? apiError.data : null);
    if (Array.isArray(details) && details.length > 0) {
      const fieldList = details
        .map(d => d.message ? d.message.replace(/"/g, '') : (d.field ? `${d.field}: invalid value` : 'Invalid field value'))
        .filter(Boolean);
      if (fieldList.length > 0) {
        return `Validation Notice: ${fieldList.join(' • ')}`;
      }
    }
  }

  // 2. If backend provided a specific human-readable message (like GENDER_MISMATCH or custom AppError)
  if (apiError?.message && apiError.message !== 'Validation failed' && apiError.message !== 'Internal Server Error') {
    const raw = apiError.message;
    if (
      !/Route (GET|POST|PUT|PATCH|DELETE)|Cannot read properties|ObjectId|Cast to|buffering timed out|E11000|syntax|stack trace/i.test(raw)
    ) {
      return raw;
    }
  }

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
    /Route (GET|POST|PUT|PATCH|DELETE)|Cannot read properties|ObjectId|Cast to|buffering timed out|E11000|syntax|stack trace/i.test(raw)
  ) {
    return 'Clinical data synchronization in progress. Please refresh the terminal or try again.';
  }

  return raw || 'An error occurred while processing your request.';
};

let rateLimitCooldownUntil = 0;

// 1. Request Interceptor — Attach in-memory access token & preemptive refresh
api.interceptors.request.use(
  async (config) => {
    // Client-side circuit breaker: prevent background telemetry storms while rate-limited
    if (Date.now() < rateLimitCooldownUntil) {
      const url = config.url || '';
      const isRoutinePoll = url.includes('/visits/stats') || url.includes('/queue') || url.includes('/bed-map');
      if (isRoutinePoll) {
        return Promise.reject(new axios.Cancel('Temporarily paused due to server rate-limit backpressure.'));
      }
    }

    // 0. Neutralize outbound query injection and prototype pollution
    if (config.params && typeof config.params === 'object') {
      config.params = sanitizeQueryParams(config.params);
    }
    if (
      config.data &&
      typeof config.data === 'object' &&
      typeof FormData !== 'undefined' &&
      !(config.data instanceof FormData) &&
      typeof Blob !== 'undefined' &&
      !(config.data instanceof Blob)
    ) {
      config.data = sanitizePayload(config.data);
    }

    // Skip token logic on auth endpoints
    if (
      config.url?.includes('/auth/refresh') ||
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/unlock')
    ) {
      return config;
    }

    let token = getAccessToken();
    const refreshToken = getRefreshToken();

    // If token is missing or expiring within safety window (60s), proactively refresh via Mutex
    if ((!token || isTokenExpired(token, 60)) && refreshToken) {
      try {
        token = await refreshCoordinator.acquireFreshToken();
      } catch (err) {
        console.warn('Preemptive token refresh deferred to retry interceptor:', err?.message);
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
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

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
        const retryAfterSec = parseInt(error.response.headers?.['retry-after'], 10) || 5;
        rateLimitCooldownUntil = Date.now() + Math.min(Math.max(retryAfterSec, 3), 30) * 1000;
      } else if (error.response.status === 400 && apiError.errorCode === 'VALIDATION_001') {
        error.isValidationError = true;
      }
    } else if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      error.userMessage = 'Cannot reach HMS Server. Please verify network connection.';
    } else {
      error.userMessage = 'An unexpected clinical service error occurred. Please try again.';
    }

    // Trigger registered UI Toast notification callback (unless caller opted out via skipGlobalToast)
    if (errorCallback && !original?.skipGlobalToast) {
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

    // 401 Unauthorized handling — attempt synchronized mutex refresh & retry
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login') &&
      !original.url?.includes('/auth/unlock')
    ) {
      original._retry = true;
      try {
        const newAccessToken = await refreshCoordinator.acquireFreshToken();
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(original);
      } catch (refreshErr) {
        const isAuthRejection =
          refreshErr.response?.status === 401 ||
          refreshErr.response?.data?.errorCode === 'AUTH_003' ||
          refreshErr.response?.data?.errorCode === 'AUTH_004';

        if (isAuthRejection) {
          clearTokens(true);
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials) => api.post(API_ENDPOINTS.AUTH.LOGIN, credentials),
  unlock: (payload) => api.post(API_ENDPOINTS.AUTH.UNLOCK, payload),
  logout: () => api.post(API_ENDPOINTS.AUTH.LOGOUT),
  refresh: () => refreshCoordinator.acquireFreshToken(),
  me: () => api.get(API_ENDPOINTS.AUTH.ME),
  bootstrap: () => api.get(API_ENDPOINTS.AUTH.BOOTSTRAP),
  uploadFile: (visitId, orderId, formData) =>
    api.post(API_ENDPOINTS.LABORATORY.SCAN_UPLOAD(visitId, orderId), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const authAPI = authApi;

export default api;
