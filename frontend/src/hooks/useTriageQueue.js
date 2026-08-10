/**
 * useTriageQueue.js
 * Encapsulates all state and logic for the Nurse Triage Dashboard.
 *
 * SOLID:
 *   SRP — Only manages triage queue state and operations.
 *   DIP — Depends on visitAPI and api abstractions, not raw fetch.
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { visitAPI } from '../services/visitAPI';
import api from '../services/api';

/**
 * @returns {{
 *   queue: Array,
 *   loadingQueue: boolean,
 *   selectedVisit: Object|null,
 *   department: Object|null,
 *   triagedToday: number,
 *   fetchQueue: Function,
 *   handleSelect: Function,
 *   handleTriageComplete: Function,
 *   handleTriageCancel: Function,
 *   deptName: string
 * }}
 */
export const useTriageQueue = () => {
  const { user } = useAuth();
  const deptId = user?.departmentId;

  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [department, setDepartment] = useState(null);
  const [triagedToday, setTriagedToday] = useState(0);

  const fetchQueue = useCallback(async () => {
    try {
      setLoadingQueue(true);
      const requests = [
        visitAPI.getQueue('WAITING_TRIAGE,CALLED', deptId ? { departmentId: deptId } : {}),
      ];
      if (deptId) {
        requests.push(api.get('/departments'));
      }
      const results = await Promise.all(requests);
      const [queueResult] = results;
      setQueue(queueResult.data?.data || []);

      if (deptId && results[1]) {
        const deptList = results[1].data?.data || [];
        const myDept = deptList.find((d) => d._id === deptId);
        if (myDept) setDepartment(myDept);
      }
    } catch (err) {
      console.error('[useTriageQueue] fetchQueue error:', err);
    } finally {
      setLoadingQueue(false);
    }
  }, [deptId]);

  useEffect(() => {
    fetchQueue();
    const iv = setInterval(fetchQueue, 30000);
    return () => clearInterval(iv);
  }, [fetchQueue]);

  const handleSelect = useCallback((visit) => {
    setSelectedVisit(visit);
  }, []);

  const handleTriageComplete = useCallback(() => {
    setTriagedToday((prev) => prev + 1);
    setSelectedVisit(null);
    fetchQueue();
  }, [fetchQueue]);

  const handleTriageCancel = useCallback(() => {
    setSelectedVisit(null);
  }, []);

  const deptName = department?.name || user?.department || 'OPD';

  return {
    queue,
    loadingQueue,
    selectedVisit,
    department,
    triagedToday,
    fetchQueue,
    handleSelect,
    handleTriageComplete,
    handleTriageCancel,
    deptName,
  };
};
