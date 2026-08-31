/**
 * modules/ipd/nursing/nursing.repository.js
 * Inpatient nursing data repository for vitals, e-MAR, I/O, and handovers.
 */
const VitalsFlowsheet = require('./vitals-flowsheet.model');
const EmarRecord = require('./emar-record.model');
const IOBalance = require('./io-balance.model');
const ShiftHandover = require('./shift-handover.model');

class NursingRepository {
  // ── 1. Vitals Flowsheet ─────────────────────────────────────
  async recordVitals(data) {
    return VitalsFlowsheet.create(data);
  }

  async getVitalsByAdmission(admissionId, limit = 50) {
    return VitalsFlowsheet.find({ admissionId })
      .populate('recordedBy', 'firstName lastName')
      .sort({ recordedAt: -1 })
      .limit(limit)
      .lean();
  }

  async getLatestVitals(admissionId) {
    return VitalsFlowsheet.findOne({ admissionId })
      .populate('recordedBy', 'firstName lastName')
      .sort({ recordedAt: -1 })
      .lean();
  }

  // ── 2. e-MAR Medication Records ─────────────────────────────
  async createEmarRecord(data) {
    return EmarRecord.create(data);
  }

  async getEmarGridByAdmission(admissionId, startDate, endDate) {
    const filter = { admissionId };
    if (startDate && endDate) {
      filter.scheduledTime = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    return EmarRecord.find(filter)
      .populate('administeredBy', 'firstName lastName')
      .sort({ scheduledTime: 1 })
      .lean();
  }

  async updateEmarStatus(id, update) {
    return EmarRecord.findByIdAndUpdate(id, update, { new: true }).lean();
  }

  // ── 3. Fluid I/O Balance ────────────────────────────────────
  async logIOBalance(data) {
    return IOBalance.create(data);
  }

  async getIOHistoryByAdmission(admissionId, limit = 20) {
    return IOBalance.find({ admissionId })
      .populate('recordedBy', 'firstName lastName')
      .sort({ recordedAt: -1 })
      .limit(limit)
      .lean();
  }

  // ── 4. SBAR Shift Handover ──────────────────────────────────
  async createHandover(data) {
    return ShiftHandover.create(data);
  }

  async getHandoversByAdmission(admissionId) {
    return ShiftHandover.find({ admissionId })
      .populate('nurseOut', 'firstName lastName')
      .populate('nurseIn', 'firstName lastName')
      .sort({ handoverTime: -1 })
      .lean();
  }

  async acknowledgeHandover(id, nurseInStaffId) {
    return ShiftHandover.findByIdAndUpdate(
      id,
      { isAcknowledged: true, acknowledgedAt: new Date(), nurseIn: nurseInStaffId },
      { new: true }
    ).lean();
  }
}

module.exports = new NursingRepository();
