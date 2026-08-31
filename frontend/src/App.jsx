import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { router } from './routes/index';
import { registerErrorCallback } from './services/api';

/**
 * GlobalApiInterceptor — Connects the API client to the UI Toast notification context.
 * This bridges stateless Axios interceptors with React stateful context components.
 */
const GlobalApiInterceptor = ({ children }) => {
  const { showError } = useToast();

  useEffect(() => {
    registerErrorCallback((error) => {
      const responseData = error.response?.data;
      const detailedMessage =
        responseData?.message ||
        responseData?.detail ||
        error.apiMessage ||
        error.userMessage ||
        'An unexpected error occurred.';

      if (error.isRateLimit) {
        showError('Rate Limit Exceeded', detailedMessage);
      } else if (error.response?.status === 403) {
        showError('Access Denied', detailedMessage);
      } else if (error.response?.status === 400 || error.response?.status === 422) {
        showError('Validation & Requirements Notice', detailedMessage);
      } else if (error.response?.status === 409) {
        showError('Duplicate Conflict', detailedMessage);
      } else if (error.response?.status >= 500) {
        showError('Server Error', detailedMessage);
      }
    });

    return () => registerErrorCallback(null);
  }, [showError]);

  return children;
};

/**
 * CrossTabAuthSync — Synchronizes authentication logout state across browser tabs.
 */
const CrossTabAuthSync = ({ children }) => {
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'hms_secure_ref_token' && !e.newValue) {
        // Token was cleared in another tab
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return children;
};

/**
 * App.jsx — Application entry point.
 */
const App = () => {
  return (
    <ToastProvider>
      <GlobalApiInterceptor>
        <CrossTabAuthSync>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </CrossTabAuthSync>
      </GlobalApiInterceptor>
    </ToastProvider>
  );
};

export default App;
