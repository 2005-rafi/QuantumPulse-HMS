/**
 * modules/ipd/cpoe/cpoe.service.js
 * Inpatient physician order entry & daily SOAP rounds service.
 */
const cpoeRepository = require('./cpoe.repository');
const IPDAdmission = require('../admission/ipd-admission.model');
const EmarRecord = require('../nursing/emar-record.model');
const AppError = require('../../../core/errors/AppError');

class CPOEService {
  async createOrder(admissionId, orderData, doctorStaffId) {
    const admission = await IPDAdmission.findById(admissionId);
    if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');

    const order = await cpoeRepository.createOrder({
      ...orderData,
      admissionId: admission._id,
      patientId: admission.patientId,
      orderedBy: doctorStaffId,
    });

    // If MEDICATION order, generate initial e-MAR scheduled dose records for the day
    if (orderData.orderType === 'MEDICATION' && orderData.medication) {
      const med = orderData.medication;
      const today = new Date();
      const schedules = [];

      // Default slot scheduling based on frequency
      const freq = (med.frequency || 'TDS').toUpperCase();
      if (freq === 'TDS') {
        schedules.push(new Date(new Date(today).setHours(8, 0, 0, 0)));
        schedules.push(new Date(new Date(today).setHours(14, 0, 0, 0)));
        schedules.push(new Date(new Date(today).setHours(20, 0, 0, 0)));
      } else if (freq === 'BD') {
        schedules.push(new Date(new Date(today).setHours(8, 0, 0, 0)));
        schedules.push(new Date(new Date(today).setHours(20, 0, 0, 0)));
      } else if (freq === 'OD') {
        schedules.push(new Date(new Date(today).setHours(8, 0, 0, 0)));
      } else if (freq === 'QID') {
        schedules.push(new Date(new Date(today).setHours(6, 0, 0, 0)));
        schedules.push(new Date(new Date(today).setHours(12, 0, 0, 0)));
        schedules.push(new Date(new Date(today).setHours(18, 0, 0, 0)));
        schedules.push(new Date(new Date(today).setHours(24, 0, 0, 0)));
      } else {
        schedules.push(new Date(new Date(today).setHours(8, 0, 0, 0)));
      }

      const emarDocs = schedules.map((scheduledTime) => ({
        admissionId: admission._id,
        patientId: admission.patientId,
        cpoeOrderId: order._id,
        medicationName: med.name,
        dosage: med.dosage,
        route: med.route || 'ORAL',
        frequency: freq,
        scheduledTime,
        status: 'DUE',
      }));

      await EmarRecord.insertMany(emarDocs).catch((err) =>
        console.warn('e-MAR automatic dose schedule notice:', err?.message)
      );
    }

    return order;
  }

  async getOrders(admissionId, filter) {
    return cpoeRepository.getOrdersByAdmission(admissionId, filter);
  }

  async updateOrderStatus(orderId, status) {
    const order = await cpoeRepository.updateOrderStatus(orderId, status);
    if (!order) throw new AppError('CPOE order not found', 404, 'NOT_FOUND');
    return order;
  }

  // ── SOAP Ward Rounds ────────────────────────────────────────
  async recordWardRound(admissionId, roundData, doctorStaffId) {
    const admission = await IPDAdmission.findById(admissionId);
    if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');

    return cpoeRepository.createWardRound({
      ...roundData,
      admissionId: admission._id,
      patientId: admission.patientId,
      doctorId: doctorStaffId,
    });
  }

  async getWardRounds(admissionId) {
    return cpoeRepository.getWardRoundsByAdmission(admissionId);
  }
}

module.exports = new CPOEService();
