import { useState, useEffect, useCallback } from 'react';
import { appointmentAPI } from '../services/appointmentAPI';

/**
 * useAppointments hook — manages appointment query state, filters, pagination, and refresh.
 * SOLID: SRP — Manages appointment retrieval lifecycle only.
 */
export const useAppointments = (initialFilters = {}) => {
  const [appointments, setAppointments] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    SCHEDULED: 0,
    CHECKED_IN: 0,
    COMPLETED: 0,
    CANCELLED: 0,
    MISSED: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [filters, setFilters] = useState(() => ({
    date: '',
    departmentId: '',
    doctorId: '',
    status: '',
    appointmentType: '',
    ...initialFilters,
  }));

  const fetchAppointments = useCallback(async (customFilters = null, customPage = null) => {
    try {
      setLoading(true);
      setError(null);

      const activeFilters = customFilters || filters;
      const activePage = customPage !== null ? customPage : page;

      const cleanParams = {
        page: activePage,
        limit,
      };

      if (activeFilters.date) cleanParams.date = activeFilters.date;
      if (activeFilters.departmentId) cleanParams.departmentId = activeFilters.departmentId;
      if (activeFilters.doctorId) cleanParams.doctorId = activeFilters.doctorId;
      if (activeFilters.status) cleanParams.status = activeFilters.status;
      if (activeFilters.appointmentType) cleanParams.appointmentType = activeFilters.appointmentType;
      if (activeFilters.patientId) cleanParams.patientId = activeFilters.patientId;

      const res = await appointmentAPI.getAll(cleanParams);
      const data = res.data?.data || res.data || {};

      setAppointments(data.items || []);
      setSummary(data.summary || {
        total: 0,
        SCHEDULED: 0,
        CHECKED_IN: 0,
        COMPLETED: 0,
        CANCELLED: 0,
        MISSED: 0,
      });
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      setError(err.response?.data?.message || err.message || 'Unable to load appointments');
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      // If department changed, reset doctor selection
      if (key === 'departmentId' && value !== prev.departmentId) {
        next.doctorId = '';
      }
      return next;
    });
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      date: new Date().toISOString().split('T')[0],
      departmentId: '',
      doctorId: '',
      status: '',
      appointmentType: '',
    });
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    return fetchAppointments();
  }, [fetchAppointments]);

  return {
    appointments,
    summary,
    total,
    page,
    setPage,
    limit,
    setLimit,
    totalPages,
    loading,
    error,
    filters,
    updateFilter,
    resetFilters,
    refresh,
  };
};

export default useAppointments;
