/**
 * modules/ipd/nursing/nursing.service.js
 * Inpatient nursing clinical operations service.
 */
const nursingRepository = require('./nursing.repository');
const IPDAdmission = require('../admission/ipd-admission.model');
const vitalsSchedulerService = require('./vitals-scheduler.service');
const telemetryAnalyticsService = require('./telemetry-analytics.service');
const AppError = require('../../../core/errors/app-error');

class NursingService {
  // ── Vitals & NEWS2 & Longitudinal Telemetry ─────────────────
  async recordVitals(admissionId, vitalsData, staffId) {
    const admission = await IPDAdmission.findById(admissionId);
    if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');

    const activeFrequency = admission.vitalsMonitoringPlan?.frequency || 'Q4H';
    const recordedAt = vitalsData.recordedAt ? new Date(vitalsData.recordedAt) : new Date();

    const record = await nursingRepository.recordVitals({
      ...vitalsData,
      admissionId: admission._id,
      patientId: admission.patientId,
      recordedBy: staffId,
      frequencyOrderAtTime: activeFrequency,
    });

    // Compute next scheduled vitals check
    const nextDueAt = vitalsSchedulerService.calculateNextDue(activeFrequency, recordedAt);

    // Atomically persist last recorded time and next due schedule onto admission encounter
    await IPDAdmission.findByIdAndUpdate(admissionId, {
      lastVitalsRecordedAt: recordedAt,
      nextVitalsDueAt: nextDueAt,
    });

    return record;
  }

  async getVitalsHistory(admissionId) {
    return nursingRepository.getVitalsByAdmission(admissionId);
  }

  async getLatestVitals(admissionId) {
    return nursingRepository.getLatestVitals(admissionId);
  }

  /**
   * Retrieves longitudinal vitals progression trends, statistics, and schedule status.
   * @param {string} admissionId
   * @param {string} window E.g. '8H', '24H', '72H', 'ALL'
   */
  async getVitalsTrends(admissionId, window = '24H') {
    const admission = await IPDAdmission.findById(admissionId)
      .populate('vitalsMonitoringPlan.orderedBy', 'firstName lastName')
      .lean();
    if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');

    // Retrieve full flowsheet trajectory for this encounter
    const rawHistory = await nursingRepository.getVitalsByAdmission(admissionId, 100);

    // Calculate longitudinal vectors, target bands, statistical aggregates & shock index
    const telemetry = telemetryAnalyticsService.generateTelemetryPayload(rawHistory, window);

    // Evaluate current timing and schedule status
    const scheduleStatus = vitalsSchedulerService.evaluateDueStatus(admission.nextVitalsDueAt);

    // Evaluate escalation advice if deterioration detected
    const latestScore = telemetry.latestReading?.news2Score || 0;
    const latestShockIndex = telemetry.latestReading?.shockIndex || null;
    const activeFreq = admission.vitalsMonitoringPlan?.frequency || 'Q4H';
    const escalationAdvice = vitalsSchedulerService.evaluateClinicalEscalation(
      latestScore,
      latestShockIndex,
      activeFreq
    );

    return {
      admissionId: admission._id,
      patientId: admission.patientId,
      vitalsMonitoringPlan: admission.vitalsMonitoringPlan || { frequency: 'Q4H' },
      lastVitalsRecordedAt: admission.lastVitalsRecordedAt,
      nextVitalsDueAt: admission.nextVitalsDueAt,
      scheduleStatus,
      escalationAdvice,
      telemetry,
    };
  }

  /**
   * Updates physician/charge nurse vitals monitoring frequency directive.
   * @param {string} admissionId
   * @param {object} planData { frequency, specialInstructions, targetRanges }
   * @param {string} staffId
   */
  async updateVitalsFrequency(admissionId, planData, staffId) {
    const admission = await IPDAdmission.findById(admissionId);
    if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');

    const frequency = planData.frequency || admission.vitalsMonitoringPlan?.frequency || 'Q4H';
    const baseTime = admission.lastVitalsRecordedAt || new Date();
    const nextDueAt = vitalsSchedulerService.calculateNextDue(frequency, baseTime);

    const updated = await IPDAdmission.findByIdAndUpdate(
      admissionId,
      {
        'vitalsMonitoringPlan.frequency': frequency,
        'vitalsMonitoringPlan.orderedBy': staffId,
        'vitalsMonitoringPlan.orderedAt': new Date(),
        'vitalsMonitoringPlan.specialInstructions': planData.specialInstructions ?? admission.vitalsMonitoringPlan?.specialInstructions ?? '',
        'vitalsMonitoringPlan.targetRanges': planData.targetRanges || admission.vitalsMonitoringPlan?.targetRanges,
        nextVitalsDueAt: nextDueAt,
      },
      { new: true }
    )
      .populate('vitalsMonitoringPlan.orderedBy', 'firstName lastName')
      .lean();

    const scheduleStatus = vitalsSchedulerService.evaluateDueStatus(updated.nextVitalsDueAt);

    return {
      vitalsMonitoringPlan: updated.vitalsMonitoringPlan,
      lastVitalsRecordedAt: updated.lastVitalsRecordedAt,
      nextVitalsDueAt: updated.nextVitalsDueAt,
      scheduleStatus,
    };
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
