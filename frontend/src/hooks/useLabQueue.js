/**
 * useLabQueue.js
 * Encapsulates all state and logic for the Laboratory Dashboard.
 *
 * SOLID:
 *   SRP — Manages lab queue, specimen collection, result submission, and file uploads only.
 *   OCP — Priority/filter logic is data-driven via derived state; extend without modifying.
 *   DIP — Depends on api abstraction and authAPI.uploadFile, not raw fetch.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api, { authAPI } from '../services/api';
import {
  countOrdersByStatus,
  countPendingOrders,
  getPatientInitials,
} from '../features/laboratory/labDashboard.utils';

const REFRESH_MS = 30000;

/**
 * @returns {{
 *   queue, selectedVisit, laboratories, isRefreshing, hasLoadedQueue, queueError,
 *   busyAction, resultsForm, notesForm, activeTab, setActiveTab, priorityFilter,
 *   setPriorityFilter, searchValue, setSearchValue, fetchQueue, handleSelectVisit,
 *   handleCollectSample, handleSubmitResult, handleFileUpload, handleResultFieldChange,
 *   handleNotesChange, filteredQueue, flatAllOrders, allCompletedOrders, allPendingOrders,
 *   statusCounts, priorityCounts, dirtyCount, departmentName
 * }}
 */
export const useLabQueue = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [queue, setQueue] = useState([]);
  const [reportedVisits, setReportedVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [laboratories, setLaboratories] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedQueue, setHasLoadedQueue] = useState(false);
  const [queueError, setQueueError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [resultsForm, setResultsForm] = useState({});
  const [notesForm, setNotesForm] = useState({});
  const [activeTab, setActiveTab] = useState('processing');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchValue, setSearchValue] = useState('');

  const fetchQueue = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [pendingRes, reportedRes] = await Promise.allSettled([
        api.get('/laboratory/pending'),
        api.get('/laboratory/reported'),
      ]);

      const nextQueue = pendingRes.status === 'fulfilled' ? (pendingRes.value.data?.data || []) : [];
      const nextReported = reportedRes.status === 'fulfilled' ? (reportedRes.value.data?.data || []) : [];

      setQueueError('');
      setQueue(nextQueue);
      setReportedVisits(nextReported);

      setSelectedVisit((current) => {
        if (!current?._id) return current;
        return nextQueue.find((v) => v._id === current._id)
          || nextReported.find((v) => v._id === current._id)
          || null;
      });
    } catch (err) {
      console.error('[useLabQueue] fetchQueue error:', err);
      setQueueError('The laboratory queue could not be loaded. Please try again.');
    } finally {
      setIsRefreshing(false);
      setHasLoadedQueue(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchLaboratories = async () => {
      try {
        const response = await api.get('/laboratory/config');
        if (!cancelled) setLaboratories(response.data?.data || []);
      } catch (err) {
        console.error('[useLabQueue] fetchLaboratories error:', err);
      }
    };
    fetchLaboratories();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    fetchQueue();
    let timer = null;
    const schedule = () => {
      timer = window.setTimeout(async () => {
        await fetchQueue();
        schedule();
      }, REFRESH_MS);
    };
    schedule();
    return () => { if (timer) window.clearTimeout(timer); };
  }, [fetchQueue]);

  const handleSelectVisit = useCallback((visit) => {
    setSelectedVisit(visit);
    setResultsForm({});
    setNotesForm({});
  }, []);

  const handleCollectSample = useCallback(async (arg) => {
    const order = typeof arg === 'object' && arg ? arg : null;
    const orderId = order ? (order._id || order.id) : arg;
    const visitId = selectedVisit?._id || order?._visitId || order?.visitId || order?.visit;
    if (!visitId || !orderId) return;
    try {
      setBusyAction(`collect:${orderId}`);
      await api.patch(`/laboratory/orders/${visitId}/${orderId}/collect`);
      if (selectedVisit?._id === visitId) {
        setSelectedVisit((current) => {
          if (!current) return current;
          return {
            ...current,
            labOrders: (current.labOrders || []).map((o) =>
              o._id === orderId ? { ...o, status: 'PROCESSING' } : o
            ),
          };
        });
      }
      showSuccess('Specimen Registered', 'The sample has been successfully registered and marked as processing.');
      await fetchQueue();
    } catch (err) {
      console.error('[useLabQueue] handleCollectSample error:', err);
      showError('Sample Collection Failed', err.response?.data?.message || err.message);
    } finally {
      setBusyAction('');
    }
  }, [selectedVisit, fetchQueue, showSuccess, showError]);

  const handleSubmitResult = useCallback(async (arg) => {
    const order = typeof arg === 'object' && arg ? arg : null;
    const orderId = order ? (order._id || order.id) : arg;
    if (!selectedVisit?._id || !orderId) return;
    try {
      setBusyAction(`submit:${orderId}`);
      const results = { ...(resultsForm[orderId] || {}) };
      const notes = notesForm[orderId] !== undefined ? notesForm[orderId] : (order?.notes || '');
      await api.patch(`/laboratory/orders/${selectedVisit._id}/${orderId}/results`, { results, notes });
      setSelectedVisit((current) => {
        if (!current) return current;
        return {
          ...current,
          labOrders: (current.labOrders || []).map((o) =>
            o._id === orderId ? { ...o, status: 'COMPLETED', results, notes } : o
          ),
        };
      });
      showSuccess('Results Reported', 'Laboratory results have been finalized and routed to the physician.');
      await fetchQueue();
    } catch (err) {
      console.error('[useLabQueue] handleSubmitResult error:', err);
      showError('Result Submission Failed', err.response?.data?.message || err.message);
    } finally {
      setBusyAction('');
    }
  }, [selectedVisit, resultsForm, notesForm, fetchQueue, showSuccess, showError]);

  const handleFileUpload = useCallback(async (visitId, orderId, file) => {
    if (!file) return;
    const MIN_SIZE = 5 * 1024; // 5 KB
    const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
    if (file.size < MIN_SIZE) {
      showWarning('File Too Small', 'Scan file must be at least 5 KB in size.');
      return;
    }
    if (file.size > MAX_SIZE) {
      showWarning('File Too Large', 'Scan file size exceeds safety limit of 20 MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file); // Align field key with backend!

    try {
      setBusyAction(`upload:${orderId}`);
      
      const uploadWithRetry = async (vId, oId, data, retries = 3, delay = 1000) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            return await authAPI.uploadFile(vId, oId, data);
          } catch (err) {
            if (attempt === retries) throw err;
            await new Promise((res) => setTimeout(res, delay * attempt));
          }
        }
      };

      await uploadWithRetry(visitId, orderId, formData);
      showSuccess('Scan Uploaded', 'Laboratory scan successfully uploaded and registered.');
      await fetchQueue();
    } catch (err) {
      console.error('[useLabQueue] handleFileUpload error:', err);
      showError('Scan Upload Failed', err.response?.data?.message || err.message);
      throw err;
    } finally {
      setBusyAction('');
    }
  }, [fetchQueue, showSuccess, showError, showWarning]);

  const handleResultFieldChange = useCallback((order, field, value) => {
    const orderId = order?._id || order?.id || (typeof order === 'string' ? order : null);
    if (!orderId) return;
    const key = field?.key || field?.name || field?.label || String(field);
    setResultsForm((current) => ({
      ...current,
      [orderId]: { ...current[orderId], [key]: value },
    }));
  }, []);

  const handleNotesChange = useCallback((order, value) => {
    const orderId = order?._id || order?.id || (typeof order === 'string' ? order : null);
    if (!orderId) return;
    setNotesForm((current) => ({ ...current, [orderId]: value }));
  }, []);

  // ── Derived / computed state ──────────────────────────────────
  const pendingOrdersTotal = useMemo(
    () => queue.reduce((total, v) => total + countPendingOrders(v), 0),
    [queue]
  );
  const awaitingSampleCount = useMemo(() => countOrdersByStatus(queue, 'PENDING_SAMPLE'), [queue]);
  const processingCount = useMemo(() => countOrdersByStatus(queue, 'PROCESSING'), [queue]);
  const completedCount = useMemo(() => countOrdersByStatus(queue, 'COMPLETED'), [queue]);

  const statusCounts = useMemo(() => ({
    visits: queue.length,
    tests: pendingOrdersTotal,
    samples: awaitingSampleCount,
    processing: processingCount,
  }), [queue.length, pendingOrdersTotal, awaitingSampleCount, processingCount]);

  const priorityCounts = useMemo(() => {
    const totals = { STAT: 0, URGENT: 0, ROUTINE: 0 };
    queue.forEach((visit) => {
      (visit.labOrders || []).forEach((order) => {
        if ((order.status || '').toUpperCase() === 'COMPLETED') return;
        const p = (order.priority || 'ROUTINE').toUpperCase();
        if (totals[p] != null) totals[p]++;
        else totals.ROUTINE++;
      });
    });
    return totals;
  }, [queue]);

  const filteredQueue = useMemo(() => {
    const userDeptId = typeof user?.departmentId === 'object' ? user?.departmentId?._id : user?.departmentId;

    const activeVisits = queue.filter((visit) => {
      const orders = visit.labOrders || [];
      if (orders.length === 0) return false;
      return orders.some((o) => {
        const isCompleted = (o.status || '').toUpperCase() === 'COMPLETED';
        if (isCompleted) return false;
        if (!userDeptId) return true;
        const orderDeptId = typeof o.labDepartmentId === 'object' ? o.labDepartmentId?._id : o.labDepartmentId;
        if (!orderDeptId) return true;
        return String(orderDeptId) === String(userDeptId);
      });
    });

    // Fallback: If department ID filter produced empty list but queue has non-completed lab orders, retain queue visits
    const baseList = activeVisits.length > 0
      ? activeVisits
      : queue.filter((visit) => (visit.labOrders || []).some((o) => (o.status || '').toUpperCase() !== 'COMPLETED'));

    if (!priorityFilter || priorityFilter === 'all' || priorityFilter === 'visits') return baseList;

    const filterKey = String(priorityFilter).toUpperCase();

    // Priority filter (STAT, URGENT, ROUTINE)
    if (['STAT', 'URGENT', 'ROUTINE'].includes(filterKey)) {
      return baseList.filter((visit) =>
        (visit.labOrders || []).some(
          (o) =>
            (o.priority || 'ROUTINE').toUpperCase() === filterKey &&
            (o.status || '').toUpperCase() !== 'COMPLETED'
        )
      );
    }

    // Status metric filter (PENDING_SAMPLE, PROCESSING, PENDING_TESTS)
    if (filterKey === 'PENDING_SAMPLE' || filterKey === 'SAMPLES') {
      return baseList.filter((visit) =>
        (visit.labOrders || []).some((o) => (o.status || '').toUpperCase() === 'PENDING_SAMPLE')
      );
    }

    if (filterKey === 'PROCESSING') {
      return baseList.filter((visit) =>
        (visit.labOrders || []).some((o) => (o.status || '').toUpperCase() === 'PROCESSING')
      );
    }

    if (filterKey === 'TESTS' || filterKey === 'PENDING') {
      return baseList.filter((visit) =>
        (visit.labOrders || []).some((o) => (o.status || '').toUpperCase() !== 'COMPLETED')
      );
    }

    return baseList;
  }, [queue, priorityFilter, user?.departmentId]);

  const flatAllOrders = useMemo(() => {
    const labNameMap = {};
    (laboratories || []).forEach((l) => {
      labNameMap[l._id] = l.name;
    });

    const out = [];
    queue.forEach((visit) => {
      const patient = visit.patientId || {};
      const doctor = visit.consultation?.doctorId;
      const doctorName = doctor
        ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || doctor.name || 'Attending Physician'
        : 'Attending Physician';

      (visit.labOrders || []).forEach((order) => {
        const labName = labNameMap[order.laboratoryId] || order.labName || 'Laboratory';
        out.push({
          ...order,
          _visitId: visit._id,
          _patientName: [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Unknown patient',
          _mrn: patient.mrn || '—',
          _gender: patient.gender || '—',
          _bloodGroup: patient.bloodGroup || '',
          _tokenString: visit.tokenString || '',
          _departmentName: visit.departmentId?.name || '',
          _visitCreatedAt: visit.createdAt,
          _orderedBy: doctorName,
          _laboratoryName: labName,
        });
      });
    });
    return out;
  }, [queue, laboratories]);

  const allCompletedOrders = useMemo(() => {
    const labNameMap = {};
    (laboratories || []).forEach((l) => {
      labNameMap[l._id] = l.name;
    });

    const seenOrderIds = new Set();
    const out = [];

    const processVisit = (visit) => {
      const patient = visit.patientId || {};
      const doctor = visit.consultation?.doctorId;
      const doctorName = doctor
        ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || doctor.name || 'Attending Physician'
        : 'Attending Physician';

      (visit.labOrders || []).forEach((order) => {
        const orderId = String(order._id || order.id || '');
        if (!orderId || seenOrderIds.has(orderId)) return;
        if ((order.status || '').toUpperCase() !== 'COMPLETED') return;

        seenOrderIds.add(orderId);
        const labName = labNameMap[order.laboratoryId] || order.labName || 'Laboratory';

        out.push({
          ...order,
          _visitId: visit._id,
          _patientName: [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Unknown patient',
          _mrn: patient.mrn || '—',
          _gender: patient.gender || '—',
          _bloodGroup: patient.bloodGroup || '',
          _tokenString: visit.tokenString || '',
          _departmentName: visit.departmentId?.name || '',
          _visitCreatedAt: visit.createdAt,
          _orderedBy: doctorName,
          _laboratoryName: labName,
        });
      });
    };

    (reportedVisits || []).forEach(processVisit);
    (queue || []).forEach(processVisit);

    return out;
  }, [reportedVisits, queue, laboratories]);

  const allPendingOrders = useMemo(
    () => flatAllOrders.filter((o) => (o.status || '').toUpperCase() !== 'COMPLETED'),
    [flatAllOrders]
  );

  const dirtyCount = useMemo(() => {
    let total = 0;
    Object.values(resultsForm || {}).forEach((r) => { if (r && Object.keys(r).length) total++; });
    Object.values(notesForm || {}).forEach((n) => { if (n && String(n).trim()) total++; });
    return total;
  }, [resultsForm, notesForm]);

  const departmentName = user?.department || 'Laboratory';

  return {
    queue,
    selectedVisit,
    laboratories,
    isRefreshing,
    hasLoadedQueue,
    queueError,
    busyAction,
    resultsForm,
    notesForm,
    activeTab,
    setActiveTab,
    priorityFilter,
    setPriorityFilter,
    searchValue,
    setSearchValue,
    fetchQueue,
    handleSelectVisit,
    handleCollectSample,
    handleSubmitResult,
    handleFileUpload,
    handleResultFieldChange,
    handleNotesChange,
    filteredQueue,
    flatAllOrders,
    allCompletedOrders,
    allPendingOrders,
    statusCounts,
    priorityCounts,
    dirtyCount,
    departmentName,
  };
};
