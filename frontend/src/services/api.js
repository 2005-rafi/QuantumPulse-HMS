import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Helper to check if JWT token is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const [, payloadB64] = token.split('.');
    const decoded = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    // Check if token expires within the next 5 seconds
    return decoded.exp * 1000 - 5000 < Date.now();
  } catch (e) {
    return true;
  }
};

let refreshPromise = null;

const refreshAccessToken = async (refreshToken) => {
  const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
  const { accessToken, refreshToken: newRefreshToken } = data.data;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', newRefreshToken);
  return accessToken;
};

let errorCallback = null;
export const registerErrorCallback = (cb) => {
  errorCallback = cb;
};

// Attach access token to every request
api.interceptors.request.use(
  async (config) => {
    // Skip checking for auth requests to avoid infinite recursion
    if (config.url?.includes('/auth/refresh') || config.url?.includes('/auth/login')) {
      return config;
    }

    let token = localStorage.getItem('accessToken');
    if (token && isTokenExpired(token)) {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          if (!refreshPromise) {
            refreshPromise = refreshAccessToken(refreshToken).finally(() => {
              refreshPromise = null;
            });
          }
          token = await refreshPromise;
        }
      } catch (err) {
        console.error('Preemptive token refresh failed', err);
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 – attempt token refresh, then retry once
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Parse structured errors from the backend API
    if (error.response?.data) {
      const apiError = error.response.data;
      error.errorCode = apiError.errorCode;
      error.apiMessage = apiError.message;
      
      if (error.response.status === 429) {
        error.isRateLimit = true;
        error.apiMessage = apiError.message || 'Too many requests. Please try again later.';
      } else if (error.response.status === 400 && apiError.errorCode === 'VALIDATION_001') {
        error.isValidationError = true;
      }
    }

    // Trigger the registered UI error callback (if registered)
    if (errorCallback) {
      try {
        errorCallback(error);
      } catch (cbErr) {
        console.error('Error callback dispatch failed:', cbErr);
      }
    }

    // Let 403 propagate
    if (error.response?.status === 403) {
      console.warn('403 Forbidden - Role permission denied:', error.config.url);
      return Promise.reject(error);
    }
    // Refresh token logic
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login')
    ) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshErr) {
        console.error('Session expired, logging out', refreshErr);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
  // Upload scan file for a specific visit and order
  uploadFile: (visitId, orderId, formData) =>
    api.post(`/laboratory/orders/${visitId}/${orderId}/scan`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default api;
