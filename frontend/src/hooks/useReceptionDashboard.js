/**
 * useReceptionDashboard.js
 * Encapsulates all state and logic for the Reception Dashboard.
 *
 * SOLID:
 *   SRP — Manages patient selection, registration sheet state, visit and appointment counters.
 *   DIP — Depends on patientAPI & appointmentAPI abstractions, not raw fetch.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { patientAPI } from '../services/patientAPI';
import { appointmentAPI } from '../services/appointmentAPI';

/**
 * @returns {{
 *   selectedPatient: Object|null,
 *   isRegSheetOpen: boolean,
 *   setIsRegSheetOpen: Function,
 *   printData: Object|null,
 *   totalPatients: number,
 *   todaysVisits: number,
 *   todaysAppointments: number,
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
  const [todaysAppointments, setTodaysAppointments] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // Fetch total patients count
    patientAPI.search('', 1, 1)
      .then((res) => {
        if (!cancelled) {
          const total = res.data?.total || res.total || 0;
          setTotalPatients(total);
        }
      })
      .catch(() => {});

    // Fetch today's appointments summary
    const todayStr = new Date().toISOString().split('T')[0];
    appointmentAPI.getAll({ date: todayStr, limit: 1 })
      .then((res) => {
        if (!cancelled) {
          const data = res.data?.data || res.data || {};
          const apptTotal = data.summary?.total !== undefined ? data.summary.total : (data.total || 0);
          setTodaysAppointments(apptTotal);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const handlePatientSelect = useCallback((patient) => {
    setSelectedPatient(patient);
  }, []);

  const handleVisitCreated = useCallback(({ patient, visit, isIpd, admission }) => {
    setIsRegSheetOpen(false);
    if (!isIpd && visit) {
      setPrintData({ patient, visit });
    }
    setTotalPatients((prev) => prev + 1);
    setTodaysVisits((prev) => prev + 1);
  }, []);

  const handlePrintDone = useCallback(() => {
    setPrintData(null);
    setSelectedPatient(null);
  }, []);

  const [activeTab, setActiveTab] = useState('patients'); // 'patients' | 'appointments'

  const viewKey = useMemo(() => {
    if (printData) return 'print';
    if (selectedPatient) return 'profile';
    return 'list';
  }, [printData, selectedPatient]);

  return {
    activeTab,
    setActiveTab,
    selectedPatient,
    isRegSheetOpen,
    setIsRegSheetOpen,
    printData,
    totalPatients,
    todaysVisits,
    todaysAppointments,
    handlePatientSelect,
    handleVisitCreated,
    handlePrintDone,
    viewKey,
  };
};
