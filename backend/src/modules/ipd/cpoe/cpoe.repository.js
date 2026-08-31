/**
 * modules/ipd/cpoe/cpoe.repository.js
 * Inpatient physician orders & SOAP ward rounds data repository.
 */
const CPOEOrder = require('./cpoe-order.model');
const WardRound = require('./ward-round.model');

class CPOERepository {
  // ── 1. CPOE Orders ──────────────────────────────────────────
  async createOrder(data) {
    return CPOEOrder.create(data);
  }

  async getOrdersByAdmission(admissionId, filter = {}) {
    return CPOEOrder.find({ admissionId, ...filter })
      .populate('orderedBy', 'firstName lastName employeeId position')
      .populate('consultDepartmentId', 'name code')
      .populate('consultDoctorId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }

  async updateOrderStatus(id, status) {
    return CPOEOrder.findByIdAndUpdate(id, { status }, { new: true }).lean();
  }

  // ── 2. SOAP Ward Rounds ─────────────────────────────────────
  async createWardRound(data) {
    return WardRound.create(data);
  }

  async getWardRoundsByAdmission(admissionId) {
    return WardRound.find({ admissionId })
      .populate('doctorId', 'firstName lastName employeeId position')
      .sort({ roundDate: -1 })
      .lean();
  }
}

module.exports = new CPOERepository();
