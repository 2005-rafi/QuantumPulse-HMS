import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'careone_patient_layout_preference';
const PREFERENCE_EVENT = 'careone_patient_layout_change';

/**
 * Custom Hook for managing the Patient Directory layout preference ('cards' | 'list').
 * Follows Single Responsibility Principle (SRP) by isolating layout state & persistence.
 */
export const usePatientLayoutPreference = () => {
  const [layout, setLayoutState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'list' ? 'list' : 'cards';
    } catch {
      return 'cards';
    }
  });

  const setLayout = useCallback((newLayout) => {
    const valid = newLayout === 'list' ? 'list' : 'cards';
    setLayoutState(valid);
    try {
      localStorage.setItem(STORAGE_KEY, valid);
      window.dispatchEvent(new CustomEvent(PREFERENCE_EVENT, { detail: valid }));
    } catch (err) {
      console.warn('[usePatientLayoutPreference] Could not persist preference', err);
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setLayoutState(e.newValue === 'list' ? 'list' : 'cards');
      }
    };

    const handleCustomChange = (e) => {
      if (e.detail) {
        setLayoutState(e.detail === 'list' ? 'list' : 'cards');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(PREFERENCE_EVENT, handleCustomChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(PREFERENCE_EVENT, handleCustomChange);
    };
  }, []);

  return {
    layout,
    isListView: layout === 'list',
    isCardView: layout === 'cards',
    setLayout,
  };
};

export default usePatientLayoutPreference;
