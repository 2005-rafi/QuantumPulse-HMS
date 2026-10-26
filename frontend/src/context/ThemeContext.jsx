import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

/**
 * ThemeMode Constants (Enum)
 * Default: LIGHT mode
 */
export const THEME_MODES = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark',
});

const THEME_STORAGE_KEY = 'hms_theme_mode';

const ThemeContext = createContext({
  themeMode: THEME_MODES.LIGHT,
  effectiveTheme: THEME_MODES.LIGHT,
  setThemeMode: () => {},
  toggleTheme: () => {},
  isDark: false,
});

/**
 * Helper: Get initial theme mode from localStorage or fallback strictly to LIGHT
 */
const getSavedThemeMode = () => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === THEME_MODES.DARK || saved === THEME_MODES.LIGHT) {
      return saved;
    }
  } catch (err) {
    console.warn('[ThemeContext] Failed to read from localStorage:', err);
  }
  // Default system theme is LIGHT mode
  return THEME_MODES.LIGHT;
};

/**
 * ThemeProvider — Centralized Material 3 Theme State Provider.
 * Defaults strictly to Light Mode. Users can toggle between Light & Dark in settings/profile.
 */
export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = useState(getSavedThemeMode);

  // Effective theme is strictly LIGHT or DARK
  const effectiveTheme = useMemo(() => {
    return themeMode === THEME_MODES.DARK ? THEME_MODES.DARK : THEME_MODES.LIGHT;
  }, [themeMode]);

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

  // Update theme mode with persistence
  const setThemeMode = useCallback((mode) => {
    setThemeModeState((prevMode) => {
      const nextMode = typeof mode === 'function' ? mode(prevMode) : mode;
      const validMode = nextMode === THEME_MODES.DARK ? THEME_MODES.DARK : THEME_MODES.LIGHT;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, validMode);
      } catch (err) {
        console.warn('[ThemeContext] Failed to persist theme:', err);
      }
      return validMode;
    });
  }, []);

  // Quick toggle between light & dark
  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => (prev === THEME_MODES.DARK ? THEME_MODES.LIGHT : THEME_MODES.DARK));
  }, [setThemeMode]);

  const contextValue = useMemo(
    () => ({
      themeMode: effectiveTheme,
      effectiveTheme,
      setThemeMode,
      toggleTheme,
      isDark: effectiveTheme === THEME_MODES.DARK,
    }),
    [effectiveTheme, setThemeMode, toggleTheme]
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

