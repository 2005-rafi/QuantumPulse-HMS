import { useState, useEffect, useCallback } from 'react';
import { appointmentAPI } from '../services/appointmentAPI';

/**
 * useAppointmentAvailability — loads available slots for a given doctor & date.
 */
export const useAppointmentAvailability = (doctorId, departmentId, date) => {
  const [slots, setSlots] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [hasConfiguredSchedule, setHasConfiguredSchedule] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAvailability = useCallback(async () => {
    if (!doctorId || !date) {
      setSlots([]);
      setSchedule(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = { doctorId, date };
      if (departmentId) params.departmentId = departmentId;

      const res = await appointmentAPI.getAvailability(params);
      const data = res.data?.data || res.data || {};

      setSlots(data.slots || []);
      setSchedule(data.schedule || null);
      setHasConfiguredSchedule(data.hasConfiguredSchedule !== false);
    } catch (err) {
      console.error('Failed to load doctor slot availability:', err);
      setError(err.response?.data?.message || 'Unable to check slot availability');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId, departmentId, date]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  return {
    slots,
    schedule,
    hasConfiguredSchedule,
    loading,
    error,
    refreshSlots: fetchAvailability,
  };
};

export default useAppointmentAvailability;
