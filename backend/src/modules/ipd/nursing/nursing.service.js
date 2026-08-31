/**
 * modules/ipd/nursing/nursing.service.js
 * Inpatient nursing clinical operations service.
 */
const nursingRepository = require('./nursing.repository');
const IPDAdmission = require('../admission/ipd-admission.model');
const AppError = require('../../../core/errors/AppError');

class NursingService {
  // ── Vitals & NEWS2 ──────────────────────────────────────────
  async recordVitals(admissionId, vitalsData, staffId) {
    const admission = await IPDAdmission.findById(admissionId);
    if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');

    const record = await nursingRepository.recordVitals({
      ...vitalsData,
      admissionId: admission._id,
      patientId: admission.patientId,
      recordedBy: staffId,
    });

    return record;
  }

  async getVitalsHistory(admissionId) {
    return nursingRepository.getVitalsByAdmission(admissionId);
  }

  async getLatestVitals(admissionId) {
    return nursingRepository.getLatestVitals(admissionId);
  }

  // ── e-MAR Medication Charting ───────────────────────────────
  async scheduleMedication(admissionId, medData) {
    const admission = await IPDAdmission.findById(admissionId);
    if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');

    return nursingRepository.createEmarRecord({
      ...medData,
      admissionId: admission._id,
      patientId: admission.patientId,
    });
  }

  async getEmarGrid(admissionId, startDate, endDate) {
    return nursingRepository.getEmarGridByAdmission(admissionId, startDate, endDate);
  }

  async updateEmarStatus(emarId, status, { administeredBy, batchNumber, omissionReason, nurseNotes } = {}) {
    const update = { status };
    if (status === 'GIVEN') {
      update.administeredTime = new Date();
      update.administeredBy = administeredBy;
      if (batchNumber) update.batchNumber = batchNumber;
    } else if (status === 'OMITTED' || status === 'REFUSED') {
      update.omissionReason = omissionReason || 'Omitted by nursing staff';
    }
    if (nurseNotes) update.nurseNotes = nurseNotes;

    const record = await nursingRepository.updateEmarStatus(emarId, update);
    if (!record) throw new AppError('e-MAR record not found', 404, 'NOT_FOUND');
    return record;
  }

  // ── I/O Fluid Balance ───────────────────────────────────────
  async logIOBalance(admissionId, ioData, staffId) {
    const admission = await IPDAdmission.findById(admissionId);
    if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');

    return nursingRepository.logIOBalance({
      ...ioData,
      admissionId: admission._id,
      patientId: admission.patientId,
      recordedBy: staffId,
    });
  }

  async getIOHistory(admissionId) {
    return nursingRepository.getIOHistoryByAdmission(admissionId);
  }

  // ── SBAR Shift Handover ─────────────────────────────────────
  async createHandover(admissionId, handoverData, staffId) {
    const admission = await IPDAdmission.findById(admissionId);
    if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');

    return nursingRepository.createHandover({
      ...handoverData,
      admissionId: admission._id,
      patientId: admission.patientId,
      nurseOut: staffId,
    });
  }

  async getHandovers(admissionId) {
    return nursingRepository.getHandoversByAdmission(admissionId);
  }

  async acknowledgeHandover(handoverId, staffId) {
    const handover = await nursingRepository.acknowledgeHandover(handoverId, staffId);
    if (!handover) throw new AppError('Handover note not found', 404, 'NOT_FOUND');
    return handover;
  }
}

module.exports = new NursingService();
