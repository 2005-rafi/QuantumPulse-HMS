/**
 * modules/ipd/cpoe/cpoe.service.js
 * Inpatient physician order entry & daily SOAP rounds service.
 */
const cpoeRepository = require('./cpoe.repository');
const IPDAdmission = require('../admission/ipd-admission.model');
const EmarRecord = require('../nursing/emar-record.model');
const AppError = require('../../../core/errors/app-error');

class CPOEService {
  async createOrder(admissionId, orderData, doctorStaffId) {
    const admission = await IPDAdmission.findById(admissionId);
    if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');

    const normalizedOrderType = (orderData.orderType === 'DIAGNOSTIC' || orderData.orderType === 'LAB')
      ? 'LAB'
      : orderData.orderType;

    // CDSS Clinical Safety Interceptor: Drug-Allergy Cross-Check
    if (normalizedOrderType === 'MEDICATION' && orderData.medication?.name) {
      const cdssAllergyService = require('../../clinical/cdss-allergy.service');
      const allergyCheck = await cdssAllergyService.checkMedicationAllergy(
        admission.patientId,
        orderData.medication.name
      );

      if (allergyCheck.hasContraindication) {
        if (!orderData.clinicalOverrideReason || !orderData.clinicalOverrideReason.trim()) {
          throw new AppError('CDSS_001', allergyCheck.message, allergyCheck);
        }
        orderData.allergyWarning = allergyCheck.message;
        orderData.clinicalOverrideReason = orderData.clinicalOverrideReason.trim();
        orderData.overriddenBy = doctorStaffId;
        orderData.overriddenAt = new Date();
      }
    }

    const order = await cpoeRepository.createOrder({
      ...orderData,
      orderType: normalizedOrderType,
      admissionId: admission._id,
      patientId: admission.patientId,
      orderedBy: doctorStaffId,
    });

    // 1. If MEDICATION order, generate initial e-MAR scheduled dose records for the day
    if (normalizedOrderType === 'MEDICATION' && orderData.medication) {
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

    // 2. If LAB / DIAGNOSTIC order, bridge to the Laboratory Workstation and attach to Inpatient Bill
    if (normalizedOrderType === 'LAB') {
      try {
        const Visit = require('../../visits/visit.model');
        const Laboratory = require('../../laboratory/laboratory.model');

        let ipdVisit = await Visit.findOne({
          ipdAdmissionId: admission._id,
          status: { $in: ['IN_PROGRESS', 'WAITING_LAB', 'WAITING_DOCTOR_REVIEW'] },
        });

        if (!ipdVisit) {
          ipdVisit = await Visit.create({
            visitNumber: `VIS-IPD-${admission.admissionNumber}`,
            tokenString: `IPD-${admission.admissionNumber.slice(-4)}`,
            tokenSerial: 1,
            patientId: admission.patientId,
            registeredBy: doctorStaffId,
            departmentId: admission.admittingDepartmentId,
            ipdAdmissionId: admission._id,
            visitType: 'IPD',
            status: 'WAITING_LAB',
            reasonForVisit: `Inpatient Admission: ${admission.provisionalDiagnosis || 'IPD Care'}`,
            consultation: {
              doctorId: doctorStaffId,
              status: 'DRAFT',
              recordedAt: new Date(),
            },
            labOrders: [],
          });
        }

        const allLabs = await Laboratory.find({ isActive: true }).lean();
        const testName = orderData.testName || orderData.name || 'Diagnostic Investigation';
        const matchedLab = allLabs.find((l) =>
          l.testCatalog?.some((t) => t.name?.toLowerCase() === testName.toLowerCase())
        ) || allLabs[0];
        const matchedTest = matchedLab?.testCatalog?.find(
          (t) => t.name?.toLowerCase() === testName.toLowerCase()
        );
        const testCode =
          orderData.testCode ||
          matchedTest?.testCode ||
          testName.toUpperCase().replace(/\s+/g, '_').slice(0, 10);

        const labOrderItem = {
          laboratoryId: matchedLab?._id,
          labDepartmentId: matchedLab?.departmentId || admission.admittingDepartmentId,
          testCode,
          testName,
          labName: matchedLab?.name || 'Clinical Laboratory',
          sampleType: orderData.sampleType || matchedTest?.sampleType || 'Specimen',
          priority: orderData.priority || 'ROUTINE',
          status: 'PENDING_SAMPLE',
          notes: orderData.instructions || orderData.notes || '',
        };

        ipdVisit.labOrders.push(labOrderItem);
        ipdVisit.status = 'WAITING_LAB';
        await ipdVisit.save();

        const createdLabOrder = ipdVisit.labOrders[ipdVisit.labOrders.length - 1];
        order.labOrderId = createdLabOrder._id;
        order.testCode = testCode;
        order.testName = testName;
        await order.save();

        // 3. Post Tariff & Diagnostics Line Item to Inpatient Bill Ledger
        if (admission.billId) {
          const ipdBillingService = require('../billing/ipd-billing.service');
          const tariffResolver = require('../../tariff/tariff-resolver.service');
          const tariff = await tariffResolver.resolve({
            category: 'DIAGNOSTICS',
            testCode,
            departmentId: admission.admittingDepartmentId,
            visitType: 'IPD',
          });

          await ipdBillingService.addBillLineItem(admission.billId, {
            eventType: 'LAB_ORDER_ACCEPTED',
            category: 'DIAGNOSTICS',
            description: `Inpatient Lab Order — ${testName} (${testCode})`,
            quantity: 1,
            snapshotPrice: tariff.amount,
            snapshotRuleId: tariff.ruleId,
            snapshotRulePath: tariff.explanation,
            lineTotal: tariff.amount,
            addedBy: doctorStaffId,
            addedAt: new Date(),
          });
        }
      } catch (err) {
        console.error('[CPOEService] Failed to bridge IPD lab order to laboratory workstation:', err);
      }
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
