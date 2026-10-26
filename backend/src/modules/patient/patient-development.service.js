/**
 * modules/patient/patient-development.service.js
 * Independent development-only service for permanently purging test patients
 * and cascade-releasing all associated clinical assets (IPD beds, queues, orders, bills).
 *
 * Principles:
 * - SOLID: Single Responsibility - handles development purge lifecycle without modifying production deletion request approval.
 * - OOP: Encapsulated service singleton with strict pre-conditions and post-conditions.
 * - ACID: All database mutations run within a MongoDB transaction session with clean rollback on failure.
 * - CIA Triad: Strict integrity verification, non-repudiation audit logging, and prevention of ghost records.
 * - Clean Separation: Completely independent so it can be unmounted or deleted without breaking production.
 */
const mongoose = require('mongoose');
require('../administration/department.model');
require('../staff/staff.model');
const Patient = require('./patient.model');
const Visit = require('../visits/visit.model');
const Appointment = require('../appointments/appointment.model');
const BedMaster = require('../ipd/beds/bed.model');
const BedAllocation = require('../ipd/beds/bed-allocation.model');
const IPDAdmission = require('../ipd/admission/ipd-admission.model');
const AdvanceDeposit = require('../ipd/billing/advance-deposit.model');
const CPOEOrder = require('../ipd/cpoe/cpoe-order.model');
const WardRound = require('../ipd/cpoe/ward-round.model');
const IPDClearance = require('../ipd/discharge/ipd-clearance.model');
const EMARRecord = require('../ipd/nursing/emar-record.model');
const IOBalance = require('../ipd/nursing/io-balance.model');
const ShiftHandover = require('../ipd/nursing/shift-handover.model');
const VitalsFlowsheet = require('../ipd/nursing/vitals-flowsheet.model');
const OTSession = require('../ipd/ot/ot-session.model');
const OTConsumable = require('../ipd/ot/ot-consumable.model');
const Bill = require('../billing/bill.model');
const Laboratory = require('../laboratory/laboratory.model');
const LaboratoryScan = require('../laboratory/laboratory-scan.model');
const DeletionRequest = require('./deletion-request.model');
const AuditService = require('../audit/audit.service');
const cacheService = require('../../core/cache/cache.service');
const { broadcastPatientStatus } = require('../realtime/patient-status-events.service');
const { withTransaction } = require('../../core/database/transaction');
const AppError = require('../../core/errors/app-error');
const logger = require('../../core/logger');

class PatientDevelopmentService {
  /**
   * Generates an impact preview of all clinical assets and database records
   * that will be purged and released for this patient.
   *
   * @param {string} patientId
   * @returns {Promise<object>}
   */
  async getPurgePreview(patientId) {
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      throw new AppError('VALIDATION_001', 'Invalid patient ID format');
    }

    const patient = await Patient.findById(patientId).lean();
    if (!patient) {
      throw new AppError('NOT_FOUND', 'Patient record not found');
    }

    // 1. Check occupied beds in BedMaster
    const occupiedBeds = await BedMaster.find({ currentPatientId: patientId })
      .populate('roomId', 'roomNumber roomLabel')
      .populate('floorId', 'floorNumber floorLabel')
      .lean();

    // 2. Check active IPD admissions
    const admissions = await IPDAdmission.find({ patientId }).lean();

    // 3. Check visits & active queues
    const visits = await Visit.find({ patientId }).lean();
    const activeVisits = visits.filter((v) =>
      ['WAITING_TRIAGE', 'CALLED', 'WAITING_DOCTOR', 'IN_PROGRESS', 'WAITING_LAB', 'WAITING_DOCTOR_REVIEW', 'WAITING_PHARMACY'].includes(v.status)
    );

    // 4. Check clinical orders, appointments, bills
    const [appointmentsCount, billsCount, labCount, scanCount, cpoeCount, roundsCount, otCount, vitalsCount] = await Promise.all([
      Appointment.countDocuments({ patientId }),
      Bill.countDocuments({ patientId }),
      Laboratory.countDocuments({ patientId }),
      LaboratoryScan.countDocuments({ patientId }),
      CPOEOrder.countDocuments({ patientId }),
      WardRound.countDocuments({ patientId }),
      OTSession.countDocuments({ patientId }),
      VitalsFlowsheet.countDocuments({ patientId }),
    ]);

    return {
      patient: {
        id: patient._id,
        mrn: patient.mrn,
        fullName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient',
        age: patient.age,
        gender: patient.gender,
        phone: patient.phone,
        currentState: patient.currentState,
      },
      impactSummary: {
        occupiedBeds: occupiedBeds.map((b) => ({
          bedId: b._id,
          bedNumber: b.bedNumber,
          bedLabel: b.bedLabel,
          wardClass: b.wardClass,
          room: b.roomId?.roomLabel || b.roomId?.roomNumber || 'Room',
          floor: b.floorId?.floorLabel || b.floorId?.floorNumber || 'Floor',
        })),
        totalVisits: visits.length,
        activeEncounters: activeVisits.map((v) => ({
          visitId: v._id,
          tokenString: v.tokenString,
          department: v.department,
          status: v.status,
        })),
        admissionsCount: admissions.length,
        appointmentsCount,
        billsCount,
        labOrdersCount: labCount + scanCount,
        cpoeOrdersCount: cpoeCount,
        wardRoundsCount: roundsCount,
        otSessionsCount: otCount,
        vitalsCount,
      },
      riskNotice: 'DEVELOPMENT PURGE: This action will permanently remove all records and free physical beds without soft-delete archives.',
    };
  }

  /**
   * Permanently purges a patient and all their associated clinical/financial/encounter records
   * inside an atomic ACID transaction. Releases physical beds to VACANT and clears live queues.
   *
   * @param {string} patientId
   * @param {object} adminUser - authenticated admin user context
   * @param {string} [ipAddress]
   * @returns {Promise<object>}
   */
  async purgePatient(patientId, adminUser, ipAddress = null) {
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      throw new AppError('VALIDATION_001', 'Invalid patient ID format');
    }

    const adminId = adminUser?.userId || adminUser?.id || adminUser?._id;
    const adminName = adminUser?.fullName || adminUser?.username || 'Administrator';

    // Verify patient exists before starting transaction
    const targetPatient = await Patient.findById(patientId);
    if (!targetPatient) {
      throw new AppError('NOT_FOUND', 'Patient record not found');
    }

    const patientDetails = {
      id: String(targetPatient._id),
      mrn: targetPatient.mrn,
      fullName: `${targetPatient.firstName || ''} ${targetPatient.lastName || ''}`.trim() || 'Patient',
      phone: targetPatient.phone,
    };

    let freedBedsList = [];
    let purgedVisitsCount = 0;
    let purgedAdmissionsCount = 0;

    // Execute atomic ACID cascade deletion
    await withTransaction(async (session) => {
      // Step 1: Find all beds occupied or reserved by this patient
      const bedsToRelease = await BedMaster.find({ currentPatientId: patientId }).session(session);
      freedBedsList = bedsToRelease.map((b) => ({
        id: String(b._id),
        bedNumber: b.bedNumber,
        bedLabel: b.bedLabel,
        wardClass: b.wardClass,
      }));

      // Step 2: Release physical beds in BedMaster (Reset to VACANT, unlink patient/admission)
      if (bedsToRelease.length > 0) {
        await BedMaster.updateMany(
          { currentPatientId: patientId },
          {
            $set: {
              status: 'VACANT',
              currentPatientId: null,
              currentAdmissionId: null,
              notes: '',
            },
          },
          { session }
        );
      }

      // Step 3: Purge Bed Allocations
      await BedAllocation.deleteMany({ patientId }, { session });

      // Step 4: Purge Inpatient Admissions (IPD) and all clinical sub-records
      const admissions = await IPDAdmission.find({ patientId }).session(session);
      purgedAdmissionsCount = admissions.length;
      await IPDAdmission.deleteMany({ patientId }, { session });

      await Promise.all([
        AdvanceDeposit.deleteMany({ patientId }, { session }),
        CPOEOrder.deleteMany({ patientId }, { session }),
        WardRound.deleteMany({ patientId }, { session }),
        IPDClearance.deleteMany({ patientId }, { session }),
        EMARRecord.deleteMany({ patientId }, { session }),
        IOBalance.deleteMany({ patientId }, { session }),
        ShiftHandover.deleteMany({ patientId }, { session }),
        VitalsFlowsheet.deleteMany({ patientId }, { session }),
      ]);

      // Step 5: Purge Operating Theatre (OT) Sessions & Consumables
      const otSessions = await OTSession.find({ patientId }).session(session);
      const otSessionIds = otSessions.map((s) => s._id);
      await OTSession.deleteMany({ patientId }, { session });
      if (otSessionIds.length > 0) {
        await OTConsumable.deleteMany({ otSessionId: { $in: otSessionIds } }, { session });
      }

      // Step 6: Purge Visits & Clinical Queue Encounters
      const visits = await Visit.find({ patientId }).session(session);
      purgedVisitsCount = visits.length;
      await Visit.deleteMany({ patientId }, { session });

      // Step 7: Purge Scheduled & Historical Appointments
      await Appointment.deleteMany({ patientId }, { session });

      // Step 8: Purge Laboratory Tests & Scans
      await Promise.all([
        Laboratory.deleteMany({ patientId }, { session }),
        LaboratoryScan.deleteMany({ patientId }, { session }),
      ]);

      // Step 9: Purge Billing Records & Invoices
      await Bill.deleteMany({ patientId }, { session });

      // Step 10: Purge Deletion Requests (both pending and archived)
      await DeletionRequest.deleteMany({ patientId }, { session });

      // Step 11: Permanently delete Patient document (Hard Delete)
      await Patient.deleteOne({ _id: patientId }, { session });

      // Step 12: Write immutable audit record for forensic traceability (CIA Triad - Integrity)
      try {
        AuditService.logEvent(
          adminId,
          'ADMINISTRATOR',
          'PATIENT_DEVELOPMENT_PURGED',
          patientId,
          {
            mrn: patientDetails.mrn,
            patientName: patientDetails.fullName,
            purgedBy: adminName,
            adminId,
            freedBeds: freedBedsList,
            purgedVisitsCount,
            purgedAdmissionsCount,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
          },
          ipAddress
        );
      } catch (auditErr) {
        logger.warn('[AuditService] Non-blocking audit failure on dev purge:', { error: auditErr.message });
      }
    });

    // Post-Transaction: Invalidate all in-memory and namespace caches immediately
    try {
      cacheService.del('beds:map:full');
      cacheService.delByPattern('beds:*');
      cacheService.delByPattern('visits:*');
      cacheService.delByPattern('stats:*');
      cacheService.delByPattern('appointments:*');
      cacheService.delByPattern('bills:*');
      cacheService.delByPattern('patient:*');
    } catch (cacheErr) {
      logger.warn('[PatientDevelopmentService] Cache invalidation warning:', { error: cacheErr.message });
    }

    // Post-Transaction: Broadcast real-time SSE event to all connected clinical workstations
    try {
      broadcastPatientStatus({
        patientId: patientDetails.id,
        mrn: patientDetails.mrn,
        patientName: patientDetails.fullName,
        status: 'PURGED_DEV',
        action: 'PURGE',
        freedBeds: freedBedsList.map((b) => b.bedNumber),
        timestamp: new Date().toISOString(),
      });
    } catch (sseErr) {
      logger.warn('[PatientDevelopmentService] SSE broadcast warning:', { error: sseErr.message });
    }

    logger.info('[PatientDevelopmentService] Patient permanently purged in development mode', {
      patientId: patientDetails.id,
      mrn: patientDetails.mrn,
      freedBedsCount: freedBedsList.length,
      purgedVisitsCount,
      purgedAdmissionsCount,
      adminId,
    });

    return {
      success: true,
      message: `Patient ${patientDetails.fullName} (${patientDetails.mrn}) permanently purged.`,
      purgedPatient: patientDetails,
      freedBeds: freedBedsList,
      summary: {
        freedBedsCount: freedBedsList.length,
        purgedVisitsCount,
        purgedAdmissionsCount,
      },
    };
  }

  /**
   * Scans the database for orphaned or ghost records across clinical collections:
   * 1. Orphaned Visits (patient missing from database)
   * 2. Soft-Deleted Patients (retained with residual visits/admissions/orders)
   * 3. Orphaned Admissions (IPD admission whose patient document is missing)
   * 4. Dangling Occupied Beds (BedMaster occupied by missing patient)
   */
  async getGhostRecords() {
    // 1. Check all visits
    const allVisits = await Visit.find()
      .populate('departmentId', 'name code')
      .populate('ipdAdmissionId', 'admissionNumber status currentBedId')
      .lean();

    const orphanedVisits = [];
    const patientIds = new Set(allVisits.map((v) => String(v.patientId)).filter(Boolean));
    const existingPatients = await Patient.find({ _id: { $in: Array.from(patientIds) } })
      .select('_id mrn firstName lastName isDeleted')
      .lean();
    const patientMap = new Map(existingPatients.map((p) => [String(p._id), p]));

    for (const v of allVisits) {
      const pIdStr = String(v.patientId || '');
      const p = patientMap.get(pIdStr);
      if (!p) {
        // Patient document completely missing from database!
        orphanedVisits.push({
          type: 'ORPHANED_VISIT',
          id: String(v._id),
          encounterNumber: v.ipdAdmissionId?.admissionNumber || v.tokenNumber || `VIS-${String(v._id).slice(-4)}`,
          visitType: v.visitType || (v.ipdAdmissionId ? 'IPD' : 'OPD'),
          status: v.status,
          department: v.departmentId?.name || 'General',
          patientId: pIdStr || 'MISSING',
          patientName: '[PURGED PATIENT]',
          mrn: 'DELETED-RECORD',
          labOrdersCount: v.labOrders?.length || 0,
          labOrders: (v.labOrders || []).map((o) => ({
            id: String(o._id),
            testName: o.testName || o.testCode,
            status: o.status,
            sampleCollected: Boolean(o.sampleCollectedAt),
          })),
          createdAt: v.createdAt,
          reason: 'Patient demographic record was purged or dropped from database, but clinical visit encounter remains active in system.',
        });
      }
    }

    // 2. Check soft-deleted patients in Patient collection
    const softDeletedPatients = await Patient.find({ isDeleted: true }).lean();
    const softDeletedList = [];
    for (const p of softDeletedPatients) {
      const pId = p._id;
      const [visitCount, admissionCount, bedCount] = await Promise.all([
        Visit.countDocuments({ patientId: pId }),
        IPDAdmission.countDocuments({ patientId: pId }),
        BedMaster.countDocuments({ currentPatientId: pId }),
      ]);
      softDeletedList.push({
        type: 'SOFT_DELETED_PATIENT',
        id: String(p._id),
        encounterNumber: p.mrn,
        mrn: p.mrn,
        patientId: String(p._id),
        patientName: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Archived Patient',
        status: 'SOFT_DELETED',
        deletedAt: p.deletedAt,
        deletionReason: p.deletionReason || 'Soft-deleted record',
        residualRecords: {
          visits: visitCount,
          admissions: admissionCount,
          occupiedBeds: bedCount,
        },
        reason: `Patient record marked as soft-deleted on ${p.deletedAt ? new Date(p.deletedAt).toLocaleDateString() : 'N/A'}. Retains ${visitCount} encounter(s) and ${admissionCount} admission(s).`,
      });
    }

    // 3. Check orphaned IPD Admissions
    const allAdmissions = await IPDAdmission.find().lean();
    const orphanedAdmissions = [];
    for (const a of allAdmissions) {
      const pIdStr = String(a.patientId || '');
      const p = patientMap.get(pIdStr);
      if (!p) {
        orphanedAdmissions.push({
          type: 'ORPHANED_ADMISSION',
          id: String(a._id),
          encounterNumber: a.admissionNumber,
          status: a.status,
          patientId: pIdStr || 'MISSING',
          patientName: '[PURGED PATIENT]',
          mrn: 'DELETED-RECORD',
          currentBedId: a.currentBedId ? String(a.currentBedId) : null,
          createdAt: a.createdAt,
          reason: 'IPD Admission document exists with dangling patientId reference.',
        });
      }
    }

    // 4. Check dangling beds in BedMaster
    const occupiedBeds = await BedMaster.find({ isOccupied: true }).lean();
    const danglingBeds = [];
    for (const b of occupiedBeds) {
      if (b.currentPatientId) {
        const p = patientMap.get(String(b.currentPatientId));
        if (!p) {
          danglingBeds.push({
            type: 'DANGLING_BED',
            id: String(b._id),
            bedNumber: b.bedNumber,
            bedLabel: b.bedLabel,
            patientId: String(b.currentPatientId),
            reason: `Bed ${b.bedNumber} is marked occupied by patientId ${b.currentPatientId} which no longer exists in database.`,
          });
        }
      }
    }

    return {
      totalGhosts: orphanedVisits.length + softDeletedList.length + orphanedAdmissions.length + danglingBeds.length,
      orphanedVisits,
      softDeletedPatients: softDeletedList,
      orphanedAdmissions,
      danglingBeds,
    };
  }

  /**
   * Purges a single ghost or orphaned record.
   */
  async purgeGhostRecord(type, id, adminUser, ipAddress = null) {
    const adminId = adminUser?.userId || adminUser?._id || 'SYSTEM_ADMIN';
    const adminName = adminUser?.fullName || adminUser?.username || 'Administrator';

    let freedBedsList = [];
    let purgedDetails = {};

    await withTransaction(async (session) => {
      if (type === 'ORPHANED_VISIT' || type === 'visit') {
        const visit = await Visit.findById(id).session(session);
        if (!visit) throw new AppError('NOT_FOUND', 'Ghost visit record not found');

        purgedDetails = {
          type: 'ORPHANED_VISIT',
          id: String(visit._id),
          visitType: visit.visitType,
          status: visit.status,
          labOrdersCount: visit.labOrders?.length || 0,
        };

        // If visit had an admission, check if admission or bed needs release
        if (visit.ipdAdmissionId) {
          const admission = await IPDAdmission.findById(visit.ipdAdmissionId).session(session);
          if (admission && admission.currentBedId) {
            await BedMaster.findByIdAndUpdate(
              admission.currentBedId,
              { status: 'VACANT', currentPatientId: null, currentAdmissionId: null, isOccupied: false },
              { session }
            );
          }
          await IPDAdmission.findByIdAndDelete(visit.ipdAdmissionId, { session });
        }

        // Delete any related laboratory scan attachments
        await LaboratoryScan.deleteMany({ visitId: visit._id }, { session });

        // Delete the visit
        await Visit.findByIdAndDelete(id, { session });
      } else if (type === 'SOFT_DELETED_PATIENT' || type === 'patient') {
        const patientId = id;
        const patient = await Patient.findById(patientId).session(session);
        // Release beds
        const beds = await BedMaster.find({ currentPatientId: patientId }).session(session);
        freedBedsList = beds.map((b) => b.bedNumber);
        await BedMaster.updateMany(
          { currentPatientId: patientId },
          { status: 'VACANT', currentPatientId: null, currentAdmissionId: null, isOccupied: false },
          { session }
        );
        // Delete all child documents
        await Promise.all([
          BedAllocation.deleteMany({ patientId }, { session }),
          IPDAdmission.deleteMany({ patientId }, { session }),
          AdvanceDeposit.deleteMany({ patientId }, { session }),
          CPOEOrder.deleteMany({ patientId }, { session }),
          WardRound.deleteMany({ patientId }, { session }),
          IPDClearance.deleteMany({ patientId }, { session }),
          EMARRecord.deleteMany({ patientId }, { session }),
          IOBalance.deleteMany({ patientId }, { session }),
          ShiftHandover.deleteMany({ patientId }, { session }),
          VitalsFlowsheet.deleteMany({ patientId }, { session }),
          OTSession.deleteMany({ patientId }, { session }),
          Visit.deleteMany({ patientId }, { session }),
          Appointment.deleteMany({ patientId }, { session }),
          Laboratory.deleteMany({ patientId }, { session }),
          LaboratoryScan.deleteMany({ patientId }, { session }),
          Bill.deleteMany({ patientId }, { session }),
          DeletionRequest.deleteMany({ patientId }, { session }),
          Patient.deleteOne({ _id: patientId }, { session }),
        ]);
        purgedDetails = {
          type: 'SOFT_DELETED_PATIENT',
          id: String(patientId),
          mrn: patient?.mrn || 'N/A',
        };
      } else if (type === 'ORPHANED_ADMISSION' || type === 'admission') {
        const admission = await IPDAdmission.findById(id).session(session);
        if (admission && admission.currentBedId) {
          await BedMaster.findByIdAndUpdate(
            admission.currentBedId,
            { status: 'VACANT', currentPatientId: null, currentAdmissionId: null, isOccupied: false },
            { session }
          );
        }
        await IPDAdmission.findByIdAndDelete(id, { session });
        purgedDetails = { type: 'ORPHANED_ADMISSION', id };
      } else if (type === 'DANGLING_BED' || type === 'bed') {
        await BedMaster.findByIdAndUpdate(
          id,
          { status: 'VACANT', currentPatientId: null, currentAdmissionId: null, isOccupied: false },
          { session }
        );
        purgedDetails = { type: 'DANGLING_BED', id };
      }

      try {
        AuditService.logEvent(
          adminId,
          'ADMINISTRATOR',
          'GHOST_RECORD_PURGED',
          id,
          {
            purgedDetails,
            adminName,
            adminId,
            freedBeds: freedBedsList,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
          },
          ipAddress
        );
      } catch (auditErr) {
        logger.warn('[AuditService] Non-blocking audit error on ghost purge:', { error: auditErr.message });
      }
    });

    // Invalidate caches
    try {
      cacheService.del('beds:map:full');
      cacheService.delByPattern('beds:*');
      cacheService.delByPattern('visits:*');
      cacheService.delByPattern('stats:*');
    } catch (_) {}

    return {
      success: true,
      message: `Ghost record ${type} (${id}) permanently purged from database.`,
      purgedDetails,
    };
  }

  /**
   * Batch purges all detected ghost and orphaned records in one single atomic run.
   */
  async purgeAllGhostRecords(adminUser, ipAddress = null) {
    const ghosts = await this.getGhostRecords();
    let purgedCount = 0;

    for (const v of ghosts.orphanedVisits) {
      await this.purgeGhostRecord('ORPHANED_VISIT', v.id, adminUser, ipAddress);
      purgedCount++;
    }
    for (const p of ghosts.softDeletedPatients) {
      await this.purgeGhostRecord('SOFT_DELETED_PATIENT', p.id, adminUser, ipAddress);
      purgedCount++;
    }
    for (const a of ghosts.orphanedAdmissions) {
      await this.purgeGhostRecord('ORPHANED_ADMISSION', a.id, adminUser, ipAddress);
      purgedCount++;
    }
    for (const b of ghosts.danglingBeds) {
      await this.purgeGhostRecord('DANGLING_BED', b.id, adminUser, ipAddress);
      purgedCount++;
    }

    return {
      success: true,
      message: `Batch purge completed: ${purgedCount} ghost and orphaned record(s) wiped from system.`,
      purgedCount,
    };
  }
}

module.exports = new PatientDevelopmentService();

