/**
 * modules/billing/billing-queue.service.js
 * High-performance encounter queue service aggregating OPD visits & IPD admissions for Cashier Desk.
 * Designed for 10 Lakh+ patient scale with indexed queries, lean projections, and financial summaries.
 */
const mongoose = require('mongoose');
const Visit = require('../visits/visit.model');
const IPDAdmission = require('../ipd/admission/ipd-admission.model');
const Bill = require('./bill.model');
const ipdBillingService = require('../ipd/billing/ipd-billing.service');

class BillingQueueService {
  /**
   * Retrieves unified encounter queue for Cashier Billing Terminal.
   *
   * @param {object} params
   * @param {string} [params.category='ALL'] - 'ALL' | 'OPD' | 'PHARMACY' | 'LAB' | 'OT' | 'IPD'
   * @param {string} [params.search=''] - Keyword search (Name, MRN, Token, Phone, Bed)
   * @param {number} [params.page=1]
   * @param {number} [params.limit=100]
   */
  async getEncountersQueue({ category = 'ALL', search = '', page = 1, limit = 100 } = {}) {
    const activeCategory = (category || 'ALL').toUpperCase();
    const searchTerm = (search || '').trim().toLowerCase();

    // 1. Fetch OPD Visits awaiting billing
    let opdItems = [];
    if (activeCategory === 'ALL' || activeCategory === 'OPD' || activeCategory === 'PHARMACY' || activeCategory === 'LAB' || activeCategory === 'OT') {
      const opdQuery = {
        status: { $in: ['WAITING_BILLING'] },
      };

      const rawVisits = await Visit.find(opdQuery)
        .select('tokenString tokenNumber status stage reasonForVisit visitType metadata labOrders pharmacyWork surgicalDetails ipdAdmissionAdvice disposition patientId departmentId doctorId createdAt updatedAt phlebotomyDispatchedAt')
        .populate('patientId', 'firstName lastName mrn phoneNumber phone gender age dateOfBirth')
        .populate('departmentId', 'name code')
        .populate('doctorId', 'firstName lastName employeeId position')
        .sort({ phlebotomyDispatchedAt: -1, updatedAt: -1, createdAt: -1 })
        .limit(200)
        .lean();

      // Find any existing bills for these visits to attach cached financial amounts
      const visitIds = rawVisits.map((v) => v._id);
      const bills = await Bill.find({ visitId: { $in: visitIds } })
        .select('visitId billedAmount collectedAmount advanceCollected adjustedAmount outstandingAmount status billNumber')
        .lean();

      const billMap = new Map();
      bills.forEach((b) => billMap.set(String(b.visitId), b));

      opdItems = rawVisits.map((v) => {
        const b = billMap.get(String(v._id));
        const tag = this._resolveOpdTag(v);

        return {
          _id: v._id,
          visitId: v._id,
          encounterId: v._id,
          tokenString: v.tokenString || (v.tokenNumber ? String(v.tokenNumber) : 'OPD'),
          modality: 'OPD',
          visitType: v.visitType || 'OPD',
          status: v.status,
          stage: v.stage || 'Waiting Billing',
          isDischargePending: false,
          registeredAt: v.createdAt,
          updatedAt: v.updatedAt || v.phlebotomyDispatchedAt || v.createdAt,
          patientId: v.patientId,
          departmentId: v.departmentId,
          doctorId: v.doctorId,
          tag,
          financialSummary: {
            totalGrossBilled: b?.billedAmount || 0,
            totalAdvanceDeposited: b?.advanceCollected || 0,
            outstandingDue: b?.outstandingAmount !== undefined ? b.outstandingAmount : 0,
            status: b?.status || 'OPEN',
            isSettled: b?.status === 'FINALIZED' && (b?.outstandingAmount || 0) <= 0,
            billNumber: b?.billNumber || null,
          },
          billId: b?._id || null,
          searchIndex: `${v.tokenString || ''} ${v.patientId?.mrn || ''} ${v.patientId?.firstName || ''} ${v.patientId?.lastName || ''} ${v.patientId?.phone || v.patientId?.phoneNumber || ''} ${v.departmentId?.name || ''}`.toLowerCase(),
        };
      });
    }

    // 2. Fetch IPD Inpatient Admissions
    let ipdItems = [];
    if (activeCategory === 'ALL' || activeCategory === 'IPD' || activeCategory === 'OT' || activeCategory === 'PHARMACY' || activeCategory === 'LAB') {
      const ipdQuery = {
        status: { $in: ['ADMITTED', 'ACTIVE_ROUNDS', 'DISCHARGE_INITIATED'] },
      };

      const rawAdmissions = await IPDAdmission.find(ipdQuery)
        .select('admissionNumber admissionDate status carePlan dischargeInitiatedAt billId patientId primaryDoctorId admittingDepartmentId currentBedId currentRoomId currentFloorId createdAt updatedAt')
        .populate('patientId', 'firstName lastName mrn phoneNumber phone gender age dateOfBirth')
        .populate('primaryDoctorId', 'firstName lastName employeeId position')
        .populate('admittingDepartmentId', 'name code')
        .populate('currentBedId', 'bedNumber bedLabel wardClass comfortTier sharingType')
        .populate('currentRoomId', 'roomNumber roomName roomType')
        .populate('currentFloorId', 'floorNumber floorName')
        .sort({ dischargeInitiatedAt: -1, createdAt: -1 })
        .limit(200)
        .lean();

      // Resolve live financial ledger summaries in parallel (with safe catch)
      const ledgerPromises = rawAdmissions.map(async (adm) => {
        try {
          const ledger = await ipdBillingService.getLedgerSummary(adm._id);
          return { admissionId: String(adm._id), ledger };
        } catch (_) {
          return { admissionId: String(adm._id), ledger: null };
        }
      });
      const resolvedLedgers = await Promise.all(ledgerPromises);
      const ledgerMap = new Map();
      resolvedLedgers.forEach((item) => {
        if (item.ledger) ledgerMap.set(item.admissionId, item.ledger);
      });

      ipdItems = rawAdmissions.map((adm) => {
        const ledger = ledgerMap.get(String(adm._id));
        const fSummary = ledger?.financialSummary || {};
        const isDischargePending = Boolean(adm.dischargeInitiatedAt);
        const bedLabel = adm.currentBedId?.bedLabel || adm.currentBedId?.bedNumber || 'Bed';
        const wardClass = adm.currentBedId?.wardClass || 'GENERAL_WARD';

        const tag = isDischargePending
          ? { id: 'IPD', label: 'Discharge Clearance', icon: 'verified_user', urgent: true }
          : { id: 'IPD', label: 'IPD Stay', icon: 'hotel', urgent: false };

        return {
          _id: adm._id,
          admissionId: adm._id,
          encounterId: adm._id,
          billId: adm.billId || ledger?.bill?._id || null,
          tokenString: adm.admissionNumber || 'IPD',
          modality: 'IPD',
          visitType: 'IPD',
          status: adm.status,
          stage: isDischargePending ? 'Discharge Clearance Required' : 'Active Inpatient Stay',
          isDischargePending,
          registeredAt: adm.admissionDate || adm.createdAt,
          updatedAt: adm.updatedAt || adm.createdAt,
          patientId: adm.patientId,
          departmentId: adm.admittingDepartmentId,
          doctorId: adm.primaryDoctorId,
          bed: {
            bedLabel,
            wardClass,
            roomNumber: adm.currentRoomId?.roomNumber || '',
            floorNumber: adm.currentFloorId?.floorNumber || '',
          },
          tag,
          financialSummary: {
            totalGrossBilled: fSummary.totalGrossBilled || 0,
            totalAdvanceDeposited: fSummary.totalAdvanceDeposited || 0,
            outstandingDue: fSummary.outstandingDue || 0,
            netPayable: fSummary.netPayable || 0,
            status: fSummary.status || 'OPEN',
            isSettled: Boolean(fSummary.isSettled),
            billNumber: ledger?.bill?.billNumber || null,
          },
          searchIndex: `${adm.admissionNumber || ''} ${adm.patientId?.mrn || ''} ${adm.patientId?.firstName || ''} ${adm.patientId?.lastName || ''} ${adm.patientId?.phone || adm.patientId?.phoneNumber || ''} ${bedLabel} ${wardClass}`.toLowerCase(),
        };
      });
    }

    // 3. Compute Category Counts across ALL waiting encounters
    const allEncounters = [...opdItems, ...ipdItems];
    const categoryCounts = {
      ALL: allEncounters.length,
      OPD: allEncounters.filter((e) => e.tag?.id === 'OPD').length,
      PHARMACY: allEncounters.filter((e) => e.tag?.id === 'PHARMACY').length,
      LAB: allEncounters.filter((e) => e.tag?.id === 'LAB').length,
      OT: allEncounters.filter((e) => e.tag?.id === 'OT').length,
      IPD: allEncounters.filter((e) => e.modality === 'IPD').length,
    };

    // 4. Apply Category Filtering
    let filtered = allEncounters;
    if (activeCategory !== 'ALL') {
      if (activeCategory === 'IPD') {
        filtered = filtered.filter((e) => e.modality === 'IPD');
      } else {
        filtered = filtered.filter((e) => e.tag?.id === activeCategory);
      }
    }

    // 5. Apply Search Term Filtering
    if (searchTerm) {
      filtered = filtered.filter((e) => e.searchIndex.includes(searchTerm));
    }

    // 6. Hospital-Grade Priority Ordering:
    //    1st: Inpatient Discharge Clearances (block doctor exit passes if unpaid)
    //    2nd: Encounters with outstanding balance > 0
    //    3rd: Oldest waiting time
    filtered.sort((a, b) => {
      if (a.isDischargePending && !b.isDischargePending) return -1;
      if (!a.isDischargePending && b.isDischargePending) return 1;

      const aDue = a.financialSummary?.outstandingDue || 0;
      const bDue = b.financialSummary?.outstandingDue || 0;
      if (aDue > 0 && bDue <= 0) return -1;
      if (aDue <= 0 && bDue > 0) return 1;

      const dateA = new Date(a.updatedAt || a.registeredAt).getTime();
      const dateB = new Date(b.updatedAt || b.registeredAt).getTime();
      return dateA - dateB;
    });

    const total = filtered.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 100);
    const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return {
      items: paginated,
      total,
      page: pageNum,
      limit: limitNum,
      categoryCounts,
    };
  }

  _resolveOpdTag(visit) {
    if (visit.admissionId || visit.visitType === 'IPD' || visit.visitType === 'IPD_MEDICAL') {
      return { id: 'IPD', label: 'IPD Stay', icon: 'hotel' };
    }
    if (visit.metadata?.source === 'OT' || visit.visitType === 'IPD_SURGICAL' || visit.surgicalDetails) {
      return { id: 'OT', label: 'Day Surgery', icon: 'medical_services' };
    }
    if (visit.pharmacyWork?.status === 'DISPENSED' || visit.metadata?.source === 'PHARMACY') {
      return { id: 'PHARMACY', label: 'Pharmacy', icon: 'medication' };
    }
    if (visit.labOrders && visit.labOrders.length > 0 && visit.disposition?.status === 'ROUTED_TO_BILLING') {
      return { id: 'LAB', label: 'Lab Tests', icon: 'biotech' };
    }
    if (visit.visitType === 'EMERGENCY') {
      return { id: 'EMERGENCY', label: 'Emergency', icon: 'emergency' };
    }
    return { id: 'OPD', label: 'OPD Consult', icon: 'stethoscope' };
  }
}

module.exports = new BillingQueueService();
