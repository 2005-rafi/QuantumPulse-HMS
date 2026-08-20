import api from './api';

export const appointmentAPI = {
  // Appointments List & Details
  getAll: (params) => api.get('/appointments', { params }),
  list: (params) => api.get('/appointments', { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  
  // Availability
  getAvailability: (params) => api.get('/appointments/availability', { params }),
  
  // Lifecycle Mutations
  checkIn: (id) => api.patch(`/appointments/${id}/check-in`),
  cancel: (id, data) => {
    const payload = typeof data === 'string' 
      ? { cancellationReason: data } 
      : (data?.cancellationReason ? data : { cancellationReason: data?.reason || '' });
    return api.patch(`/appointments/${id}/cancel`, payload);
  },
  reschedule: (id, data) => api.patch(`/appointments/${id}/reschedule`, data),
  markMissed: (id, data = {}) => api.patch(`/appointments/${id}/missed`, typeof data === 'string' ? { reason: data } : data),
  
  // Doctors Directory for booking
  getDoctors: (params) => api.get('/appointments/doctors', { params }),
  
  // Doctor Schedule Specific
  getDoctorAppointments: (doctorId, params) => api.get(`/appointments/doctor/${doctorId}`, { params }),
  getSchedules: (doctorId) => api.get(`/appointments/schedules/doctor/${doctorId}`),
  listAllSchedules: (params) => api.get('/appointments/schedules', { params }),
  createSchedule: (data) => api.post('/appointments/schedules', data),
  updateSchedule: (id, data) => api.put(`/appointments/schedules/${id}`, data),
};

export default appointmentAPI;
