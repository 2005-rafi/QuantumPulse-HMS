/**
 * src/context/ConfigContext.jsx
 * Centralized Application Branding & Hospital Configuration Context.
 * Resolves window.__APP_CONFIG__ or fallback config.json.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const DEFAULT_CONFIG = {
  HOSPITAL_NAME: 'CareOne-QPT Hospital Management System',
  SHORT_NAME: 'CareOne-QPT',
  DESCRIPTION: 'CareOne-QPT HMS · Secure Login',
  LOGO_URL: '/logo.svg',
};

// Check for window.__APP_CONFIG__ populated by /config.js
const initialConfig = typeof window !== 'undefined' && window.__APP_CONFIG__
  ? { ...DEFAULT_CONFIG, ...window.__APP_CONFIG__ }
  : DEFAULT_CONFIG;

export const ConfigContext = createContext(initialConfig);

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(initialConfig);

  useEffect(() => {
    // If window.__APP_CONFIG__ is set, use it immediately
    if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
      setConfig((prev) => ({ ...prev, ...window.__APP_CONFIG__ }));
      if (window.__APP_CONFIG__.HOSPITAL_NAME) {
        document.title = window.__APP_CONFIG__.HOSPITAL_NAME;
      }
    }

    // Also fetch /config.json as a fallback/update mechanism
    fetch('/config.json')
      .then((res) => {
        if (!res.ok) throw new Error('config.json not found');
        return res.json();
      })
      .then((data) => {
        setConfig((prev) => {
          const merged = { ...prev, ...data };
          if (merged.HOSPITAL_NAME && typeof document !== 'undefined') {
            document.title = merged.HOSPITAL_NAME;
          }
          return merged;
        });
      })
      .catch((err) => {
        console.warn('Config JSON fetch fallback note:', err.message);
      });
  }, []);

  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);

export default ConfigContext;
