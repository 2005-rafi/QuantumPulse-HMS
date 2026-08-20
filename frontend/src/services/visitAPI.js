import api from './api';

export const visitAPI = {
  create:              (data)              => api.post('/visits', data),
  getPatientVisits:    (patientId)         => api.get(`/visits/patient/${patientId}`),
  getQueue:            (status, params)    => api.get(`/visits/queue/${status}`, { params }),
  getStats:            ()                  => api.get('/visits/stats'),
  recordVitals:        (id, vitalsData)    => api.patch(`/visits/${id}/vitals`, vitalsData),
  startConsultation:   (id)               => api.patch(`/visits/${id}/start`),
  saveDraft:           (id, data)         => api.patch(`/visits/${id}/consultation/draft`, data),
  orderLabsAndRoute:   (id, data)         => api.patch(`/visits/${id}/consultation/order-labs`, data),
  finalizeConsultation:(id, data)         => api.patch(`/visits/${id}/consultation/finalize`, data),
  // Queue state transitions (token-based FIFO)
  callPatient:         (id)               => api.patch(`/visits/${id}/call`),
  skipVisit:           (id)               => api.patch(`/visits/${id}/skip`),
  requeueVisit:        (id)               => api.patch(`/visits/${id}/requeue`),
  cancelVisit:         (id, data)         => {
    const payload = typeof data === 'string' 
      ? { cancellationReason: data } 
      : (data?.cancellationReason ? data : { cancellationReason: data?.reason || '' });
    return api.patch(`/visits/${id}/cancel`, payload);
  },
  // Lab & Pharmacy
  processLab:          (id, labData)      => api.patch(`/laboratory/visits/${id}/process`, labData),
  dispenseMedicine:    (id, pharmacyData) => api.patch(`/pharmacy/visits/${id}/dispense`, pharmacyData),
};
