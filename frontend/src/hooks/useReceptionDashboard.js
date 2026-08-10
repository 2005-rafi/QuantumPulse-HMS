/**
 * useReceptionDashboard.js
 * Encapsulates all state and logic for the Reception Dashboard.
 *
 * SOLID:
 *   SRP — Manages patient selection, registration sheet state, and visit counters only.
 *   DIP — Depends on patientAPI abstraction, not raw fetch.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { patientAPI } from '../services/patientAPI';

/**
 * @returns {{
 *   selectedPatient: Object|null,
 *   isRegSheetOpen: boolean,
 *   setIsRegSheetOpen: Function,
 *   printData: Object|null,
 *   totalPatients: number,
 *   todaysVisits: number,
 *   handlePatientSelect: Function,
 *   handleVisitCreated: Function,
 *   handlePrintDone: Function,
 *   viewKey: 'print'|'profile'|'list'
 * }}
 */
export const useReceptionDashboard = () => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isRegSheetOpen, setIsRegSheetOpen] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [totalPatients, setTotalPatients] = useState(0);
  const [todaysVisits, setTodaysVisits] = useState(0);

  useEffect(() => {
    let cancelled = false;
    patientAPI.search('', 1, 1)
      .then((res) => {
        if (!cancelled) {
          const total = res.data?.total || res.total || 0;
          setTotalPatients(total);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handlePatientSelect = useCallback((patient) => {
    setSelectedPatient(patient);
  }, []);

  const handleVisitCreated = useCallback(({ patient, visit }) => {
    setIsRegSheetOpen(false);
    setPrintData({ patient, visit });
    setTotalPatients((prev) => prev + 1);
    setTodaysVisits((prev) => prev + 1);
  }, []);

  const handlePrintDone = useCallback(() => {
    setPrintData(null);
    setSelectedPatient(null);
  }, []);

  const viewKey = useMemo(() => {
    if (printData) return 'print';
    if (selectedPatient) return 'profile';
    return 'list';
  }, [printData, selectedPatient]);

  return {
    selectedPatient,
    isRegSheetOpen,
    setIsRegSheetOpen,
    printData,
    totalPatients,
    todaysVisits,
    handlePatientSelect,
    handleVisitCreated,
    handlePrintDone,
    viewKey,
  };
};
