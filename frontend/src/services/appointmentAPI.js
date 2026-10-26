/**
 * src/services/appointmentAPI.js
 * Comprehensive client for Appointment bookings, doctor schedules, availability, and state transitions.
 */
import api from './api';
import { API_ENDPOINTS } from '../constants/endpoints';

export const appointmentApi = {
  // Appointments List & Details
  getAll: (params) => api.get(API_ENDPOINTS.APPOINTMENTS.BASE, { params }),
  list: (params) => api.get(API_ENDPOINTS.APPOINTMENTS.BASE, { params }),
  getById: (id) => api.get(API_ENDPOINTS.APPOINTMENTS.BY_ID(id)),
  create: (data) => api.post(API_ENDPOINTS.APPOINTMENTS.BASE, data),

  // Availability
  getAvailability: (params) => api.get(API_ENDPOINTS.APPOINTMENTS.AVAILABILITY, { params }),

  // Lifecycle Mutations
  checkIn: (id) => api.patch(API_ENDPOINTS.APPOINTMENTS.CHECK_IN(id)),
  cancel: (id, data) => {
    const payload = typeof data === 'string'
      ? { cancellationReason: data }
      : (data?.cancellationReason ? data : { cancellationReason: data?.reason || '' });
    return api.patch(API_ENDPOINTS.APPOINTMENTS.CANCEL(id), payload);
  },
  reschedule: (id, data) => api.patch(API_ENDPOINTS.APPOINTMENTS.RESCHEDULE(id), data),
  markMissed: (id, data = {}) => api.patch(API_ENDPOINTS.APPOINTMENTS.MISSED(id), typeof data === 'string' ? { reason: data } : data),

  // Doctors Directory for booking
  getDoctors: (params) => api.get(API_ENDPOINTS.APPOINTMENTS.DOCTORS, { params }),

  // Doctor Schedule Specific
  getDoctorAppointments: (doctorId, params) => api.get(API_ENDPOINTS.APPOINTMENTS.DOCTOR_APPOINTMENTS(doctorId), { params }),
  getSchedules: (doctorId) => api.get(API_ENDPOINTS.APPOINTMENTS.SCHEDULES_BY_DOCTOR(doctorId)),
  listAllSchedules: (params) => api.get(API_ENDPOINTS.APPOINTMENTS.SCHEDULES, { params }),
  createSchedule: (data) => api.post(API_ENDPOINTS.APPOINTMENTS.SCHEDULES, data),
  updateSchedule: (id, data) => api.put(API_ENDPOINTS.APPOINTMENTS.SCHEDULE_BY_ID(id), data),
};

export const appointmentAPI = appointmentApi;
export default appointmentApi;
