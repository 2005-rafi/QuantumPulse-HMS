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
import { formatDoctorName } from '../utils/patientFormatters';

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
  const [historyVisits, setHistoryVisits] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
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
  const [stationFilter, setStationFilter] = useState('ALL');
  const [searchValue, setSearchValue] = useState('');
  const [activeOriginFilter, setActiveOriginFilter] = useState('ALL');
  const [activeTokenIndex, setActiveTokenIndex] = useState(0);

  const activeToken = useMemo(() => {
    if (!queue || queue.length === 0) return 'LAB-001';
    const visit = queue[activeTokenIndex % queue.length];
    return visit?.tokenString || `LAB-${String(activeTokenIndex + 1).padStart(3, '0')}`;
  }, [queue, activeTokenIndex]);

  const callNextToken = useCallback(() => {
    if (!queue || queue.length === 0) return;
    const nextIdx = (activeTokenIndex + 1) % queue.length;
    setActiveTokenIndex(nextIdx);
    const nextVisit = queue[nextIdx];
    if (nextVisit) {
      setSelectedVisit(nextVisit);
      showSuccess('Next Patient Token Called', `Calling ${nextVisit.tokenString || 'Token'} - ${nextVisit.patientId?.fullName}`);
    }
  }, [queue, activeTokenIndex, showSuccess]);

  const fetchHistory = useCallback(async (filters = {}) => {
    try {
      setIsHistoryLoading(true);
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
      if (filters.date) params.append('date', filters.date);
      if (filters.search) params.append('search', filters.search);
      const res = await api.get(`/laboratory/history?${params.toString()}`);
      const list = res.data?.data || [];
      setHistoryVisits(list);
      return list;
    } catch (err) {
      console.error('[useLabQueue] fetchHistory error:', err);
      return [];
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [pendingRes, reportedRes, historyRes] = await Promise.allSettled([
        api.get('/laboratory/pending'),
        api.get('/laboratory/reported'),
        api.get('/laboratory/history'),
      ]);

      const nextQueue = pendingRes.status === 'fulfilled' ? (pendingRes.value.data?.data || []) : [];
      const nextReported = reportedRes.status === 'fulfilled' ? (reportedRes.value.data?.data || []) : [];
      const nextHistory = historyRes.status === 'fulfilled' ? (historyRes.value.data?.data || []) : [];

      setQueueError('');
      setQueue(nextQueue);
      setReportedVisits(nextReported);
      setHistoryVisits(nextHistory);

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


  const handleRecordLabVitals = useCallback(async (visitId, orderId, vitalsData) => {
    try {
      setBusyAction(`vitals:${orderId}`);
      await api.post(`/laboratory/orders/${visitId}/${orderId}/vitals`, vitalsData);
      showSuccess('Lab Pre-Vitals Recorded', 'Patient lab intake parameters logged successfully.');
      await fetchQueue();
    } catch (err) {
      console.error('[useLabQueue] handleRecordLabVitals error:', err);
      showError('Failed to record vitals', err.response?.data?.message || err.message);
      throw err;
    } finally {
      setBusyAction('');
    }
  }, [fetchQueue, showSuccess, showError]);

  const handleVerifyResults = useCallback(async (visitId, orderId, optionsOrNotes = '', deltaFlag = false, panicValueFlag = false) => {
    try {
      setBusyAction(`verify:${orderId}`);
      let payload = {};
      if (typeof optionsOrNotes === 'object' && optionsOrNotes !== null) {
        payload = optionsOrNotes;
      } else {
        payload = { doctorNotes: optionsOrNotes, deltaFlag, panicValueFlag };
      }

      await api.patch(`/laboratory/orders/${visitId}/${orderId}/verify`, payload);

      const isRejection = payload.disposition === 'RECOLLECT_SAMPLE';
      setSelectedVisit((current) => {
        if (!current) return current;
        return {
          ...current,
          labOrders: (current.labOrders || []).map((o) =>
            (o._id === orderId || o.id === orderId)
              ? isRejection
                ? { ...o, status: 'PENDING_SAMPLE', recollectionRequested: true, rejectionReason: payload.rejectionReason }
                : {
                    ...o,
                    status: 'VERIFIED',
                    pathologistVerification: {
                      doctorNotes: payload.doctorNotes || '',
                      clinicalImpression: payload.clinicalImpression || '',
                      deltaFlag: Boolean(payload.deltaFlag),
                      panicValueFlag: Boolean(payload.panicValueFlag),
                    },
                  }
              : o
          ),
        };
      });

      if (isRejection) {
        showWarning('Specimen Rejected', 'Test order returned to Lab Nurse for sample recollection.');
      } else if (payload.disposition === 'RETURN_TO_DOCTOR') {
        showSuccess('Report Authorized & Returned', 'Report medically authorized and returned to Attending Doctor review queue.');
      } else if (payload.disposition === 'ROUTE_TO_BILLING') {
        showSuccess('Report Authorized & Billed', 'Report medically authorized and dispatched to Direct Billing counter.');
      } else {
        showSuccess('Report Medically Verified', 'Diagnostic report authorized and status updated.');
      }

      await fetchQueue();
    } catch (err) {
      console.error('[useLabQueue] handleVerifyResults error:', err);
      showError('Verification Failed', err.response?.data?.message || err.message);
      throw err;
    } finally {
      setBusyAction('');
    }
  }, [fetchQueue, showSuccess, showError, showWarning]);

  const handleRecordPhlebotomyRisks = useCallback(async (visitId, orderId, risks) => {
    const targetOrderIdStr = (orderId || '').toString();
    try {
      setBusyAction(`risks:${orderId}`);
      // Immediate optimistic update so UI toggles instantaneously without latency
      setSelectedVisit((current) => {
        if (!current) return current;
        return {
          ...current,
          labOrders: (current.labOrders || []).map((o) => {
            const oIdStr = (o._id || o.id || '').toString();
            if (oIdStr === targetOrderIdStr) {
              return {
                ...o,
                phlebotomyRisks: { ...(o.phlebotomyRisks || {}), ...risks },
              };
            }
            return o;
          }),
        };
      });

      const res = await api.post(`/laboratory/orders/${visitId}/${orderId}/phlebotomy-risks`, { risks });
      if (res?.data?.data) {
        setSelectedVisit(res.data.data);
      }
      showSuccess('Safety Screening Updated', 'Phlebotomy safety alerts saved.');
      await fetchQueue();
    } catch (err) {
      console.error('[useLabQueue] handleRecordPhlebotomyRisks error:', err);
      showError('Failed to save safety screening', err.response?.data?.message || err.message);
      await fetchQueue();
      throw err;
    } finally {
      setBusyAction('');
    }
  }, [fetchQueue, showSuccess, showError]);

  const handleBroadcastPanicAlert = useCallback(async (visitId, orderId, panicDetails) => {
    try {
      setBusyAction(`panic:${orderId}`);
      const res = await api.post(`/laboratory/orders/${visitId}/${orderId}/panic-alert`, panicDetails);
      showSuccess('EMERGENCY CRITICAL ALERT SENT', 'Attending physician notified of panic value.');
      await fetchQueue();
      return res.data;
    } catch (err) {
      console.error('[useLabQueue] handleBroadcastPanicAlert error:', err);
      showError('Failed to broadcast panic alert', err.response?.data?.message || err.message);
      throw err;
    } finally {
      setBusyAction('');
    }
  }, [fetchQueue, showSuccess, showError]);

  const fetchPatientLabHistory = useCallback(async (patientId, testCode) => {
    try {
      const resolvedPatientId = typeof patientId === 'object' && patientId !== null
        ? (patientId._id || patientId.id)
        : patientId;
      if (
        !resolvedPatientId ||
        typeof resolvedPatientId !== 'string' ||
        resolvedPatientId.trim() === '' ||
        resolvedPatientId === '[object Object]' ||
        resolvedPatientId === 'null' ||
        resolvedPatientId === 'undefined'
      ) {
        return [];
      }
      const params = new URLSearchParams();
      if (testCode) params.append('testCode', testCode);
      const res = await api.get(`/laboratory/patients/${encodeURIComponent(resolvedPatientId)}/history?${params.toString()}`);
      return res.data?.data || [];
    } catch (err) {
      console.error('[useLabQueue] fetchPatientLabHistory error:', err);
      return [];
    }
  }, []);

  const handleDispatchVisit = useCallback(async (visitId, disposition = 'ROUTE_TO_PATHOLOGIST', notes = '') => {
    try {
      setBusyAction(`dispatch:${visitId}`);
      await api.post(`/laboratory/visits/${visitId}/dispatch`, { disposition, notes });
      if (disposition === 'ROUTE_TO_PATHOLOGIST') {
        showSuccess('Specimen Handed to Lab Doctor', 'Specimen and intake data transferred to Diagnostic Lab Doctor for Analysis & Verification.');
      } else if (disposition === 'RETURN_TO_DOCTOR') {
        showSuccess('Patient Sent to Doctor', 'Encounter dispatched to Attending Doctor for Diagnosis & Review.');
      } else {
        showSuccess('Patient Routed to Billing', 'Encounter dispatched to Cashier & Billing desk.');
      }
      setSelectedVisit((current) => (current?._id === visitId ? null : current));
      await Promise.all([fetchQueue(), fetchHistory()]);
    } catch (err) {
      console.error('[useLabQueue] handleDispatchVisit error:', err);
      showError('Dispatch Failed', err.response?.data?.message || err.message);
      throw err;
    } finally {
      setBusyAction('');
    }
  }, [fetchQueue, fetchHistory, showSuccess, showError]);


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

  const handleCollectSample = useCallback(async (arg1, arg2) => {
    let orderId = null;
    let visitId = selectedVisit?._id;

    if (typeof arg1 === 'string' && typeof arg2 === 'string') {
      visitId = arg1;
      orderId = arg2;
    } else if (typeof arg1 === 'object' && arg1) {
      orderId = arg1._id || arg1.id;
      visitId = arg1._visitId || arg1.visitId || selectedVisit?._id;
    } else if (typeof arg1 === 'string') {
      orderId = arg1;
    }

    if (!visitId || !orderId) {
      console.warn('[useLabQueue] Missing visitId or orderId for sample collection:', { visitId, orderId });
      return;
    }

    try {
      setBusyAction(`collect:${orderId}`);
      await api.patch(`/laboratory/orders/${visitId}/${orderId}/collect`);
      if (selectedVisit?._id === visitId) {
        setSelectedVisit((current) => {
          if (!current) return current;
          return {
            ...current,
            labOrders: (current.labOrders || []).map((o) =>
              (String(o._id) === String(orderId) || String(o.id) === String(orderId))
                ? { ...o, status: 'PROCESSING', sampleCollectedAt: new Date() }
                : o
            ),
          };
        });
      }
      showSuccess('Specimen Collected', 'Specimen marked as collected and in analysis.');
      await fetchQueue();
    } catch (err) {
      console.error('[useLabQueue] handleCollectSample error:', err);
      showError('Collection Failed', err.response?.data?.message || err.message);
    } finally {
      setBusyAction('');
    }
  }, [selectedVisit, fetchQueue, showSuccess, showError]);

  const handleSubmitResult = useCallback(async (arg1, arg2, arg3, arg4) => {
    let visitId = selectedVisit?._id;
    let orderId = null;
    let explicitResults = null;
    let explicitNotes = null;

    if (typeof arg1 === 'string' && typeof arg2 === 'string') {
      // Signature: (visitId, orderId, results, notes)
      visitId = arg1;
      orderId = arg2;
      explicitResults = arg3;
      explicitNotes = arg4;
    } else if (typeof arg1 === 'object' && arg1 !== null) {
      // Signature: (orderObj, results, notes)
      orderId = arg1._id || arg1.id;
      visitId = arg1._visitId || arg1.visitId || selectedVisit?._id;
      explicitResults = arg2;
      explicitNotes = arg3;
    } else if (typeof arg1 === 'string') {
      // Signature: (orderId, results, notes)
      orderId = arg1;
      explicitResults = arg2;
      explicitNotes = arg3;
    }

    if (!visitId || !orderId) {
      console.warn('[useLabQueue] Missing visitId or orderId for result submission:', { visitId, orderId });
      return;
    }

    try {
      setBusyAction(`submit:${orderId}`);
      const results = explicitResults !== undefined && explicitResults !== null
        ? explicitResults
        : { ...(resultsForm[orderId] || {}) };
      const notes = explicitNotes !== undefined && explicitNotes !== null
        ? explicitNotes
        : (notesForm[orderId] !== undefined ? notesForm[orderId] : (typeof arg1 === 'object' ? arg1?.notes || '' : ''));

      await api.patch(`/laboratory/orders/${visitId}/${orderId}/results`, { results, notes });

      setSelectedVisit((current) => {
        if (!current) return current;
        return {
          ...current,
          labOrders: (current.labOrders || []).map((o) =>
            (String(o._id) === String(orderId) || String(o.id) === String(orderId))
              ? { ...o, status: 'AWAITING_VERIFICATION', results, notes }
              : o
          ),
        };
      });
      showSuccess('Results Recorded', 'Parameters recorded. Order submitted to Pathologist for verification.');
      await fetchQueue();
    } catch (err) {
      console.error('[useLabQueue] handleSubmitResult error:', err);
      showError('Result Submission Failed', err.response?.data?.message || err.message);
      throw err;
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
    // Base active queue: all visits having at least one diagnostic investigation pending
    let baseList = (queue || []).filter((visit) => {
      const orders = visit.labOrders || [];
      return orders.some((o) => (o.status || '').toUpperCase() !== 'COMPLETED');
    });

    // Optional Station / Diagnostic Bench Filter (e.g. 'ALL', 'HAEM', 'BIOCHEM')
    if (stationFilter && stationFilter !== 'ALL') {
      const sf = String(stationFilter).toLowerCase();
      baseList = baseList.filter((visit) =>
        (visit.labOrders || []).some((o) => {
          if ((o.status || '').toUpperCase() === 'COMPLETED') return false;
          const labId = String(o.laboratoryId?._id || o.laboratoryId || '').toLowerCase();
          const labDept = String(o.labDepartmentId?._id || o.labDepartmentId || '').toLowerCase();
          const labName = String(o.labName || '').toLowerCase();
          return labId === sf || labDept === sf || labName.includes(sf);
        })
      );
    }

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
  }, [queue, priorityFilter, stationFilter]);

  const flatAllOrders = useMemo(() => {
    const labNameMap = {};
    (laboratories || []).forEach((l) => {
      labNameMap[l._id] = l.name;
    });

    const out = [];
    queue.forEach((visit) => {
      const patient = visit.patientId || {};
      const doctor = visit.consultation?.doctorId || visit.doctor || visit.assignedDoctor || visit.referredBy;
      const doctorName = formatDoctorName(doctor);
      const doctorSpecialty = (typeof doctor === 'object' && doctor !== null) ? (doctor.specialization || doctor.specialty || '') : '';

      const deptName = visit.departmentId?.name || visit.departmentName || '';
      const chiefComplaint = visit.consultation?.chiefComplaint || visit.vitals?.chiefComplaint || visit.reasonForVisit || '';
      const diagnosis = visit.consultation?.diagnosis || '';

      (visit.labOrders || []).forEach((order) => {
        const labName = labNameMap[order.laboratoryId] || order.labName || 'Laboratory';
        out.push({
          ...order,
          _visitId: visit._id,
          _patientName: [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Unknown patient',
          _mrn: patient.mrn || '—',
          _gender: patient.gender || '—',
          _age: patient.age || '',
          _bloodGroup: patient.bloodGroup || '',
          _tokenString: visit.tokenString || '',
          _departmentName: deptName,
          _visitCreatedAt: visit.createdAt,
          _orderedBy: doctorName,
          _doctorSpecialty: doctorSpecialty,
          _chiefComplaint: chiefComplaint,
          _diagnosis: diagnosis,
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
      const doctor = visit.consultation?.doctorId || visit.doctor || visit.assignedDoctor || visit.referredBy;
      const doctorName = formatDoctorName(doctor);
      const doctorSpecialty = (typeof doctor === 'object' && doctor !== null) ? (doctor.specialization || doctor.specialty || '') : '';

      const deptName = visit.departmentId?.name || visit.departmentName || '';
      const chiefComplaint = visit.consultation?.chiefComplaint || visit.vitals?.chiefComplaint || visit.reasonForVisit || '';
      const diagnosis = visit.consultation?.diagnosis || '';

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
          _age: patient.age || '',
          _bloodGroup: patient.bloodGroup || '',
          _tokenString: visit.tokenString || '',
          _departmentName: deptName,
          _visitCreatedAt: visit.createdAt,
          _orderedBy: doctorName,
          _doctorSpecialty: doctorSpecialty,
          _chiefComplaint: chiefComplaint,
          _diagnosis: diagnosis,
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

  const allVerificationOrders = useMemo(
    () => flatAllOrders.filter((o) => (o.status || '').toUpperCase() === 'AWAITING_VERIFICATION'),
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
    stationFilter,
    setStationFilter,
    searchValue,
    setSearchValue,
    activeOriginFilter,
    setActiveOriginFilter,
    activeToken,
    callNextToken,
    handleRecordLabVitals,
    handleRecordPhlebotomyRisks,
    handleBroadcastPanicAlert,
    fetchPatientLabHistory,
    handleVerifyResults,
    handleDispatchVisit,
    fetchQueue,
    historyVisits,
    reportedVisits,
    isHistoryLoading,
    fetchHistory,
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
    allVerificationOrders,
    statusCounts,
    priorityCounts,
    dirtyCount,
    departmentName,
  };
};
