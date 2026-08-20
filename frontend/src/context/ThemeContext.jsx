import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

/**
 * ThemeMode Constants (Enum)
 */
export const THEME_MODES = Object.freeze({
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
});

const THEME_STORAGE_KEY = 'hms_theme_mode';

const ThemeContext = createContext({
  themeMode: THEME_MODES.SYSTEM,
  effectiveTheme: THEME_MODES.LIGHT,
  setThemeMode: () => {},
  toggleTheme: () => {},
});

/**
 * Helper: Detect system dark mode preference
 */
const getSystemTheme = () => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return THEME_MODES.LIGHT;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? THEME_MODES.DARK
    : THEME_MODES.LIGHT;
};

/**
 * Helper: Get initial theme mode from localStorage or fallback to system
 */
const getSavedThemeMode = () => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && Object.values(THEME_MODES).includes(saved)) {
      return saved;
    }
  } catch (err) {
    console.warn('[ThemeContext] Failed to read from localStorage:', err);
  }
  return THEME_MODES.SYSTEM;
};

/**
 * ThemeProvider — Centralized, SOLID Material 3 Theme State Provider.
 * Supports:
 * 1. Three Modes: 'system', 'light', 'dark'
 * 2. Persistent storage across sessions and visits
 * 3. Dynamic system-preference listener for live OS theme adaptation
 * 4. Smooth CSS color-scheme transition without flickering
 */
export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = useState(getSavedThemeMode);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  // Compute effective theme ('light' or 'dark') based on active mode
  const effectiveTheme = useMemo(() => {
    if (themeMode === THEME_MODES.SYSTEM) {
      return systemTheme;
    }
    return themeMode === THEME_MODES.DARK ? THEME_MODES.DARK : THEME_MODES.LIGHT;
  }, [themeMode, systemTheme]);

  // Apply theme class to document element
  const applyThemeToDOM = useCallback((theme) => {
    const root = document.documentElement;
    
    // Add transition class to ensure smooth color shift
    root.classList.add('theme-transitioning');
    
    // Update theme classes (theme.css uses .light and .dark selectors)
    root.classList.remove(THEME_MODES.LIGHT, THEME_MODES.DARK);
    root.classList.add(theme);
    
    // Set HTML attribute and color-scheme for native elements (inputs, scrollbars)
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;

    const timeout = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 300);

    return () => clearTimeout(timeout);
  }, []);

  // Sync DOM with effective theme
  useEffect(() => {
    const cleanup = applyThemeToDOM(effectiveTheme);
    return cleanup;
  }, [effectiveTheme, applyThemeToDOM]);

  // Listen to OS system color scheme changes in real time
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e) => {
      setSystemTheme(e.matches ? THEME_MODES.DARK : THEME_MODES.LIGHT);
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // Update theme mode with persistence
  const setThemeMode = useCallback((mode) => {
    if (!Object.values(THEME_MODES).includes(mode)) return;
    setThemeModeState(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (err) {
      console.warn('[ThemeContext] Failed to persist theme:', err);
    }
  }, []);

  // Quick toggle between light & dark
  const toggleTheme = useCallback(() => {
    setThemeMode((currentMode) => {
      if (currentMode === THEME_MODES.LIGHT) return THEME_MODES.DARK;
      if (currentMode === THEME_MODES.DARK) return THEME_MODES.LIGHT;
      // If currently system, flip away from current effective theme
      return effectiveTheme === THEME_MODES.DARK ? THEME_MODES.LIGHT : THEME_MODES.DARK;
    });
  }, [effectiveTheme, setThemeMode]);

  const contextValue = useMemo(
    () => ({
      themeMode,
      effectiveTheme,
      setThemeMode,
      toggleTheme,
      isDark: effectiveTheme === THEME_MODES.DARK,
    }),
    [themeMode, effectiveTheme, setThemeMode, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * useTheme Hook
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
