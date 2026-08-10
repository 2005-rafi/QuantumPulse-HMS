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
      if (error.isRateLimit) {
        showError('Rate Limit Exceeded', error.apiMessage);
      } else if (error.response?.status === 403) {
        showError('Access Denied', 'You do not have permission to perform this action.');
      } else if (error.response?.status === 400 && error.isValidationError) {
        showError('Validation Error', error.apiMessage);
      } else if (error.response?.status >= 500) {
        showError('Server Error', 'A system error occurred. Please contact IT support.');
      }
    });

    return () => registerErrorCallback(null);
  }, [showError]);

  return children;
};

/**
 * App.jsx — Application entry point.
 */
const App = () => {
  return (
    <ToastProvider>
      <GlobalApiInterceptor>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </GlobalApiInterceptor>
    </ToastProvider>
  );
};

export default App;
