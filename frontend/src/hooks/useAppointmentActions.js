import { useState, useCallback } from 'react';
import { appointmentAPI } from '../services/appointmentAPI';

/**
 * useAppointmentActions — manages lifecycle actions (check-in, reschedule, cancel, mark missed).
 */
export const useAppointmentActions = (onSuccessCallback) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkIn = useCallback(async (appointmentId) => {
    try {
      setLoading(true);
      setError(null);
      const res = await appointmentAPI.checkIn(appointmentId);
      const data = res.data?.data || res.data;
      if (onSuccessCallback) onSuccessCallback('CHECK_IN', data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Check-in failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [onSuccessCallback]);

  const reschedule = useCallback(async (appointmentId, rescheduleData) => {
    try {
      setLoading(true);
      setError(null);
      const res = await appointmentAPI.reschedule(appointmentId, rescheduleData);
      const data = res.data?.data || res.data;
      if (onSuccessCallback) onSuccessCallback('RESCHEDULE', data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Rescheduling failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [onSuccessCallback]);

  const cancel = useCallback(async (appointmentId, cancellationReason) => {
    try {
      setLoading(true);
      setError(null);
      const res = await appointmentAPI.cancel(appointmentId, { cancellationReason });
      const data = res.data?.data || res.data;
      if (onSuccessCallback) onSuccessCallback('CANCEL', data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Cancellation failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [onSuccessCallback]);

  const markMissed = useCallback(async (appointmentId, reason = '') => {
    try {
      setLoading(true);
      setError(null);
      const res = await appointmentAPI.markMissed(appointmentId, { reason });
      const data = res.data?.data || res.data;
      if (onSuccessCallback) onSuccessCallback('MISSED', data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to mark as missed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [onSuccessCallback]);

  return {
    checkIn,
    reschedule,
    cancel,
    markMissed,
    loading,
    error,
    clearError: () => setError(null),
  };
};

export default useAppointmentActions;
