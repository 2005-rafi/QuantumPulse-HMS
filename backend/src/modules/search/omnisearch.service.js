/**
 * backend/src/modules/search/omnisearch.service.js
 * High-performance global omnisearch service across Patients, Admissions, Invoices, and Lab Orders.
 * Optimized for high-throughput indexed projection queries with scoped entity filtering.
 */
const Patient = require('../patient/patient.model');
const IPDAdmission = require('../ipd/admission/ipd-admission.model');
const Bill = require('../billing/bill.model');
const Visit = require('../visits/visit.model');
const mongoose = require('mongoose');

class OmnisearchService {
  /**
   * Escape special regex characters to prevent ReDoS or syntax errors.
   */
  _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Execute multi-entity federated search with category scoping.
   * @param {string} query Search keyword (MRN, phone, patient name, admission ID, invoice ID)
   * @param {number|object} options Limit or options object { limit, category, doctorId, departmentId, dateFrom, dateTo }
   */
  async search(query, options = {}) {
    const defaultResponse = { query: '', category: 'ALL', totalCount: 0, patients: [], admissions: [], bills: [], labOrders: [] };
    if (!query || typeof query !== 'string') {
      return defaultResponse;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return defaultResponse;
    }

    const opts = typeof options === 'number' ? { limit: options } : (options || {});
    const limit = parseInt(opts.limit, 10) || 5;
    const category = (opts.category || 'ALL').toUpperCase();
    const { doctorId, departmentId, dateFrom, dateTo } = opts;

    const safeRegex = new RegExp(this._escapeRegex(trimmed), 'i');
    const isDigitsOnly = /^\d+$/.test(trimmed);

    // Date range filter helper
    const buildDateFilter = (field) => {
      if (!dateFrom && !dateTo) return null;
      const f = {};
      if (dateFrom) f.$gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        f.$lte = d;
      }
      return { [field]: f };
    };

    const runPatients = category === 'ALL' || category === 'PATIENTS';
    const runAdmissions = category === 'ALL' || category === 'ADMISSIONS' || category === 'IPD';
    const runBills = category === 'ALL' || category === 'BILLS';
    const runLab = category === 'ALL' || category === 'LAB' || category === 'LABORATORY';

    // 1. Search Patients Query
    const patientPromise = runPatients
      ? (() => {
          const pQuery = {
            isDeleted: false,
            $or: isDigitsOnly
              ? [{ phone: safeRegex }, { mrn: safeRegex }]
              : [
                  { mrn: safeRegex },
                  { firstName: safeRegex },
                  { lastName: safeRegex },
                  { phone: safeRegex },
                ],
          };
          const dateF = buildDateFilter('createdAt');
          if (dateF) Object.assign(pQuery, dateF);

          return Patient.find(pQuery)
            .select('firstName lastName mrn phone gender age bloodGroup createdAt')
            .sort({ createdAt: -1 })
            .limit(category === 'PATIENTS' ? limit * 2 : limit)
            .lean();
        })()
      : Promise.resolve([]);

    // 2. Search Inpatient Admissions Query
    const admissionPromise = runAdmissions
      ? (() => {
          const admQuery = {
            $or: [
              { admissionNumber: safeRegex },
            ],
          };
          if (doctorId && mongoose.Types.ObjectId.isValid(doctorId)) {
            admQuery.primaryDoctorId = doctorId;
          }
          const dateF = buildDateFilter('admissionDate');
          if (dateF) Object.assign(admQuery, dateF);

          return IPDAdmission.find(admQuery)
            .select('admissionNumber status admissionDate patientId currentBedId primaryDoctorId')
            .populate('patientId', 'firstName lastName mrn phone')
            .populate('currentBedId', 'bedNumber bedLabel wardType')
            .populate('primaryDoctorId', 'firstName lastName fullName')
            .sort({ admissionDate: -1 })
            .limit(category === 'ADMISSIONS' || category === 'IPD' ? limit * 2 : limit)
            .lean();
        })()
      : Promise.resolve([]);

    // 3. Search Hospital Bills & Invoices Query
    const billPromise = runBills
      ? (() => {
          const bQuery = {
            billNumber: safeRegex,
          };
          const dateF = buildDateFilter('createdAt');
          if (dateF) Object.assign(bQuery, dateF);

          return Bill.find(bQuery)
            .select('billNumber patientId grandTotal paymentStatus billType createdAt')
            .populate('patientId', 'firstName lastName mrn')
            .sort({ createdAt: -1 })
            .limit(category === 'BILLS' ? limit * 2 : limit)
            .lean();
        })()
      : Promise.resolve([]);

    // 4. Search Laboratory Orders Query
    const labPromise = runLab
      ? (() => {
          const labQuery = {
            'labOrders.0': { $exists: true },
            status: { $nin: ['CANCELLED'] },
            $or: [
              { 'labOrders.testName': safeRegex },
              { 'labOrders.testCode': safeRegex },
              { tokenString: safeRegex },
              { visitNumber: safeRegex },
            ],
          };
          if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
            labQuery.departmentId = departmentId;
          }
          const dateF = buildDateFilter('createdAt');
          if (dateF) Object.assign(labQuery, dateF);

          return Visit.find(labQuery)
            .select('visitNumber tokenString status departmentId patientId labOrders createdAt')
            .populate('patientId', 'firstName lastName mrn phone isDeleted')
            .sort({ createdAt: -1 })
            .limit(category === 'LAB' || category === 'LABORATORY' ? limit * 2 : limit)
            .lean();
        })()
      : Promise.resolve([]);

    // Parallel execution across indexed models
    const [patientsResult, admissionsResult, billsResult, labResult] = await Promise.all([
      patientPromise,
      admissionPromise,
      billPromise,
      labPromise,
    ]);

    // Format Patients
    const patients = (patientsResult || []).map((p) => ({
      id: p._id,
      patientId: p._id,
      type: 'PATIENT',
      title: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Patient Record',
      subtitle: `MRN: ${p.mrn || 'N/A'} • Phone: ${p.phone || 'N/A'} • ${p.gender || ''} ${p.age ? `(${p.age}y)` : ''}`,
      badge: p.bloodGroup || 'Patient',
      badgeColor: 'primary',
      link: `/dashboard/reception/patients/${p._id}`,
      rawMetadata: {
        patientId: p._id,
        mrn: p.mrn,
        phone: p.phone,
        bloodGroup: p.bloodGroup,
        gender: p.gender,
        age: p.age,
      },
    }));

    // Format Admissions
    const admissions = (admissionsResult || []).map((adm) => {
      const patient = adm.patientId || {};
      const bed = adm.currentBedId || {};
      const pId = patient._id || patient.id;
      return {
        id: adm._id,
        admissionId: adm._id,
        patientId: pId,
        type: 'ADMISSION',
        title: `Inpatient: ${patient.firstName || ''} ${patient.lastName || ''}`.trim() || adm.admissionNumber,
        subtitle: `${adm.admissionNumber} • Bed: ${bed.bedLabel || bed.bedNumber || 'Assigned'} (${bed.wardType || 'Ward'})`,
        badge: adm.status || 'ADMITTED',
        badgeColor: adm.status === 'ADMITTED' ? 'success' : 'info',
        link: `/dashboard/doctor/ipd/${adm._id}`,
        rawMetadata: {
          admissionId: adm._id,
          patientId: pId,
          admissionNumber: adm.admissionNumber,
          bedLabel: bed.bedLabel || bed.bedNumber,
          wardType: bed.wardType,
          status: adm.status,
        },
      };
    });

    // Format Invoices
    const bills = (billsResult || []).map((b) => {
      const patient = b.patientId || {};
      const pId = patient._id || patient.id;
      return {
        id: b._id,
        billId: b._id,
        patientId: pId,
        admissionId: b.admissionId,
        type: 'BILL',
        title: `Invoice ${b.billNumber}`,
        subtitle: `Patient: ${patient.firstName || ''} ${patient.lastName || ''} (${patient.mrn || 'N/A'}) • ₹${(b.grandTotal || 0).toLocaleString('en-IN')}`,
        badge: b.paymentStatus || 'PENDING',
        badgeColor: b.paymentStatus === 'PAID' ? 'success' : 'warning',
        link: `/dashboard/billing?billId=${b._id}`,
        rawMetadata: {
          billId: b._id,
          patientId: pId,
          admissionId: b.admissionId,
          billNumber: b.billNumber,
          grandTotal: b.grandTotal,
          paymentStatus: b.paymentStatus,
        },
      };
    });

    // Format Lab Orders
    const labOrders = (labResult || [])
      .filter((v) => v.patientId && !v.patientId.isDeleted)
      .map((v) => {
        const patient = v.patientId || {};
        const pId = patient._id || patient.id;
        const matchingOrder = (v.labOrders || []).find((o) =>
          (o.testName && safeRegex.test(o.testName)) ||
          (o.testCode && safeRegex.test(o.testCode))
        ) || v.labOrders?.[0] || {};

        return {
          id: v._id,
          visitId: v._id,
          patientId: pId,
          type: 'LAB',
          title: `${matchingOrder.testName || 'Diagnostic Investigation'} (${matchingOrder.testCode || 'LAB'})`,
          subtitle: `Patient: ${patient.firstName || ''} ${patient.lastName || ''} (${patient.mrn || 'N/A'}) • Token: ${v.tokenString || v.visitNumber}`,
          badge: matchingOrder.status || 'ORDERED',
          badgeColor:
            matchingOrder.status === 'VERIFIED' || matchingOrder.status === 'COMPLETED'
              ? 'success'
              : matchingOrder.status === 'AWAITING_VERIFICATION'
              ? 'primary'
              : 'warning',
          link: `/dashboard/laboratory/verification?visitId=${v._id}`,
          rawMetadata: {
            visitId: v._id,
            patientId: pId,
            testName: matchingOrder.testName,
            testCode: matchingOrder.testCode,
            status: matchingOrder.status,
          },
        };
      });

    return {
      query: trimmed,
      category,
      totalCount: patients.length + admissions.length + bills.length + labOrders.length,
      patients,
      admissions,
      bills,
      labOrders,
    };
  }
}

module.exports = new OmnisearchService();
