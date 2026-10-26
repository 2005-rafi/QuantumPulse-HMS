/**
 * modules/ipd/ot/ot.service.js
 * Operating theatre session management, conflict detection, and surgical workflow.
 */
const mongoose = require('mongoose');
const otRepository = require('./ot.repository');
const OTSession = require('./ot-session.model');
const OTConsumable = require('./ot-consumable.model');
const IPDAdmission = require('../admission/ipd-admission.model');
const RoomMaster = require('../beds/room.model');
const BedMaster = require('../beds/bed.model');
const Patient = require('../../patient/patient.model');
const Bill = require('../../billing/bill.model');
const bedRepository = require('../beds/bed.repository');
const { withTransaction } = require('../../../core/database/transaction');
const AppError = require('../../../core/errors/app-error');

class OTService {
  /**
   * Doctor requests surgery for a patient (either an admitted inpatient OR an outpatient from OPD consultation).
   */
  async requestSurgery(data, doctorStaffId) {
    let patientId = data.patientId;
    let admission = null;
    let visit = null;

    if (data.admissionId) {
      admission = await IPDAdmission.findById(data.admissionId);
      if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');
      patientId = admission.patientId;
    } else if (data.visitId) {
      const Visit = require('../../visits/visit.model');
      visit = await Visit.findById(data.visitId);
      if (!visit) throw new AppError('Clinical visit not found', 404, 'NOT_FOUND');
      patientId = visit.patientId;
    } else if (data.patientId) {
      patientId = data.patientId;
    } else {
      throw new AppError('Patient identifier (admissionId, visitId, or patientId) is required to request surgery', 400, 'PATIENT_REQUIRED');
    }

    if (!data.procedureName || !data.procedureName.trim()) {
      throw new AppError('Proposed surgery / procedure name is required', 400, 'PROCEDURE_NAME_REQUIRED');
    }

    const leadSurgeon = data.leadSurgeonId || data.suggestedSurgeonId || null;
    
    // Resolve procedureCategory and emergency urgency defaults
    let procedureCategory = data.procedureCategory || data.surgeryType || 'ELECTIVE';
    if (['EMERGENCY_TRAUMA', 'EMERGENCY_MATERNITY_CSECTION', 'EMERGENCY_ACUTE'].includes(data.surgeryType)) {
      procedureCategory = data.surgeryType;
    }
    const isEmergency = procedureCategory !== 'ELECTIVE' || data.surgeryType === 'EMERGENCY';
    const urgency = data.urgency || (isEmergency ? 'EMERGENCY_STAT' : 'ROUTINE');

    const initialMilestones = [
      {
        status: 'REQUESTED',
        timestamp: new Date(),
        updatedBy: doctorStaffId,
        notes: data.requestNotes || (isEmergency ? `Emergency surgery requested: ${procedureCategory}` : 'Surgery requested by doctor'),
      },
    ];

    const sessionData = {
      ...data,
      procedureName: data.procedureName.trim(),
      procedureCategory,
      surgeryType: isEmergency ? (procedureCategory !== 'ELECTIVE' ? procedureCategory : 'EMERGENCY') : 'ELECTIVE',
      urgency,
      patientId,
      admissionId: admission?._id || null,
      visitId: visit?._id || null,
      suggestedSurgeonId: leadSurgeon,
      leadSurgeonId: leadSurgeon,
      requestedBy: doctorStaffId,
      status: 'REQUESTED',
      milestones: initialMilestones,
      bookedBy: doctorStaffId,
    };

    const session = await otRepository.createSession(sessionData);

    // If originated from OPD visit, link to visit and update IPD admission advice for Ward Management
    if (visit) {
      visit.ipdAdmissionAdvice = {
        status: 'RECOMMENDED',
        advisingDoctorId: doctorStaffId,
        advisedAt: new Date(),
        targetWardClass: data.targetWardClass || (isEmergency ? 'ICU' : 'GENERAL_WARD'),
        admissionType: 'SURGICAL',
        provisionalDiagnosis: visit.consultation?.diagnosis || data.procedureName.trim(),
        chiefComplaints: visit.consultation?.chiefComplaint || visit.reasonForVisit || data.requestNotes || '',
        carePlan: visit.consultation?.treatmentPlan || data.requestNotes || '',
        dietTier: data.dietTier || 'NPO',
        urgency,
        suggestedSurgeonId: leadSurgeon,
        otSessionId: session._id,
      };
      if (['IN_PROGRESS', 'WAITING_DOCTOR', 'WAITING_DOCTOR_REVIEW'].includes(visit.status)) {
        visit.status = 'ADMISSION_RECOMMENDED';
      }
      await visit.save();
    }

    return session;
  }

  /**
   * Surgeon reviews, approves, and schedules an OT session with room, time, and team allocation.
   * Enforces room type validation and atomic time-conflict prevention.
   */
  async approveAndScheduleSession(id, data, surgeonStaffId) {
    const session = await OTSession.findById(id);
    if (!session) throw new AppError('OT Session not found', 404, 'NOT_FOUND');

    const roomId = data.roomId || session.roomId;
    if (!roomId) throw new AppError('An Operating Theatre (OT) room must be allocated', 400, 'ROOM_REQUIRED');

    const room = await RoomMaster.findById(roomId);
    if (!room) throw new AppError('Allocated room not found', 404, 'NOT_FOUND');
    if (room.roomType !== 'OT') {
      throw new AppError(`Room ${room.roomNumber} (${room.roomName}) is of type ${room.roomType}, not an Operating Theatre (OT)`, 400, 'INVALID_ROOM_TYPE');
    }

    const scheduledStart = new Date(data.scheduledStart);
    const scheduledEnd = new Date(data.scheduledEnd);
    if (isNaN(scheduledStart.getTime()) || isNaN(scheduledEnd.getTime()) || scheduledEnd <= scheduledStart) {
      throw new AppError('Valid scheduled start and end times are required (end must be after start)', 400, 'INVALID_TIMES');
    }

    // ── Time Conflict Guard (No overlapping active OT sessions in the same room) ──
    const conflict = await OTSession.findOne({
      _id: { $ne: session._id },
      roomId: room._id,
      status: { $in: ['SCHEDULED', 'IN_OT', 'WAITING_FOR_SURGEON', 'ANESTHESIA_ADMINISTERED', 'IN_PROGRESS', 'POST_OP_PACU'] },
      $or: [
        {
          scheduledStart: { $lt: scheduledEnd },
          scheduledEnd: { $gt: scheduledStart },
        },
      ],
    });

    if (conflict) {
      const conflictStart = new Date(conflict.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const conflictEnd = new Date(conflict.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      throw new AppError(
        `OT Room Conflict: ${room.roomName} is already booked for "${conflict.procedureName}" from ${conflictStart} to ${conflictEnd}`,
        409,
        'OT_ROOM_CONFLICT'
      );
    }

    const update = {
      roomId: room._id,
      procedureName: data.procedureName || session.procedureName,
      procedureCategory: data.procedureCategory || session.procedureCategory || 'ELECTIVE',
      surgeryType: data.surgeryType || session.surgeryType || 'ELECTIVE',
      urgency: data.urgency || session.urgency || 'ROUTINE',
      leadSurgeonId: data.leadSurgeonId || surgeonStaffId,
      assistantSurgeons: data.assistantSurgeons || session.assistantSurgeons || [],
      anesthetistId: data.anesthetistId || session.anesthetistId || null,
      anesthesiaType: data.anesthesiaType || session.anesthesiaType || 'GENERAL',
      scrubNurseId: data.scrubNurseId || session.scrubNurseId || null,
      circulatingNurseId: data.circulatingNurseId || session.circulatingNurseId || null,
      scheduledStart,
      scheduledEnd,
      status: 'SCHEDULED',
      bookedBy: surgeonStaffId,
      $push: {
        milestones: {
          status: 'SCHEDULED',
          timestamp: new Date(),
          updatedBy: surgeonStaffId,
          notes: `Allocated to ${room.roomName || 'OT Suite'}, scheduled for ${scheduledStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        },
      },
    };

    const updated = await otRepository.updateSession(session._id, update);
    return updated;
  }

  /**
   * Direct booking (for elective or emergency surgery booked directly by Surgeon).
   */
  async bookSession(data, staffId) {
    const admission = await IPDAdmission.findById(data.admissionId);
    if (!admission) throw new AppError('Inpatient admission not found', 404, 'NOT_FOUND');

    if (data.status === 'REQUESTED' || !data.roomId) {
      return this.requestSurgery(data, staffId);
    }

    const room = await RoomMaster.findById(data.roomId);
    if (!room) throw new AppError('OT Room not found', 404, 'NOT_FOUND');
    if (room.roomType !== 'OT') {
      throw new AppError(`Room ${room.roomNumber} (${room.roomName}) is not an Operating Theatre (OT)`, 400, 'INVALID_ROOM_TYPE');
    }

    const scheduledStart = new Date(data.scheduledStart);
    const scheduledEnd = new Date(data.scheduledEnd);

    // Overlap conflict guard
    const conflict = await OTSession.findOne({
      roomId: room._id,
      status: { $in: ['SCHEDULED', 'IN_PROGRESS'] },
      $or: [
        {
          scheduledStart: { $lt: scheduledEnd },
          scheduledEnd: { $gt: scheduledStart },
        },
      ],
    });

    if (conflict) {
      throw new AppError(
        `OT Room Conflict: ${room.roomName} is already booked during this time slot`,
        409,
        'OT_ROOM_CONFLICT'
      );
    }

    return otRepository.createSession({
      ...data,
      patientId: admission.patientId,
      leadSurgeonId: data.leadSurgeonId || staffId,
      scheduledStart,
      scheduledEnd,
      status: 'SCHEDULED',
      bookedBy: staffId,
    });
  }

  /**
   * Rejects a surgery request with reason.
   */
  async rejectRequest(id, reason, surgeonStaffId) {
    const session = await otRepository.getSessionById(id);
    if (!session) throw new AppError('OT Session not found', 404, 'NOT_FOUND');

    return otRepository.updateSession(id, {
      status: 'REJECTED',
      rejectionReason: reason || 'Declined by surgical team',
    });
  }

  /**
   * Advisory Pre-Operative Checklist update (non-blocking for emergencies).
   */
  async updateChecklist(id, checklistData, staffId) {
    const session = await otRepository.getSessionById(id);
    if (!session) throw new AppError('OT Session not found', 404, 'NOT_FOUND');

    const update = {
      preOpChecklist: {
        consentSigned: Boolean(checklistData.consentSigned),
        npoConfirmed: Boolean(checklistData.npoConfirmed),
        siteMarked: Boolean(checklistData.siteMarked),
        allergiesReviewed: Boolean(checklistData.allergiesReviewed),
        bloodCrossmatched: Boolean(checklistData.bloodCrossmatched),
        anesthesiaClearance: Boolean(checklistData.anesthesiaClearance),
        preOpNotes: checklistData.preOpNotes || '',
        completedBy: staffId,
        completedAt: new Date(),
      },
    };

    return otRepository.updateSession(id, update);
  }

  /**
   * Complete surgery with post-op hand-off, structured surgical history, and consumable billing.
   */
  async completeWithHandoff(id, handoffData, surgeonStaffId) {
    const sessionDoc = await OTSession.findById(id);
    if (!sessionDoc) throw new AppError('OT Session not found', 404, 'NOT_FOUND');

    return withTransaction(async (mongoSession) => {
      const actualEnd = new Date();
      const actualStart = sessionDoc.actualStart || sessionDoc.scheduledStart || actualEnd;
      const actualDurationMinutes = Math.max(1, Math.round((actualEnd - actualStart) / (1000 * 60)));

      // 1. Update OTSession status to COMPLETED
      const updateData = {
        status: 'COMPLETED',
        outcome: handoffData.outcome || 'SUCCESSFUL',
        actualStart,
        actualEnd,
        actualDurationMinutes,
        operativeNotes: handoffData.operativeNotes || sessionDoc.operativeNotes || '',
        postOpNotes: handoffData.postOpNotes || '',
        postOpDestination: handoffData.postOpDestination || 'WARD',
        postOpBedId: handoffData.postOpBedId || null,
      };

      const sessionOpts = mongoSession ? { session: mongoSession } : {};

      // 2. Post-Op Bed Transfer if specified (e.g. ICU / Recovery / HDU)
      if (handoffData.postOpBedId) {
        const targetBed = await BedMaster.findById(handoffData.postOpBedId).populate('roomId floorId').setOptions(sessionOpts);
        if (targetBed && targetBed.status === 'VACANT') {
          // Claim bed
          await BedMaster.findByIdAndUpdate(
            targetBed._id,
            { status: 'OCCUPIED', currentAdmissionId: sessionDoc.admissionId, currentPatientId: sessionDoc.patientId },
            sessionOpts
          );

          // Update admission bed
          if (sessionDoc.admissionId) {
            const admission = await IPDAdmission.findById(sessionDoc.admissionId).setOptions(sessionOpts);
            if (admission) {
              // Vacate previous bed
              if (admission.currentBedId) {
                await BedMaster.findByIdAndUpdate(
                  admission.currentBedId,
                  { status: 'VACANT', currentAdmissionId: null, currentPatientId: null },
                  sessionOpts
                );
              }
              admission.currentBedId = targetBed._id;
              admission.currentRoomId = targetBed.roomId?._id || targetBed.roomId;
              admission.currentFloorId = targetBed.floorId?._id || targetBed.floorId;
              await admission.save(sessionOpts);
            }
          }
        }
      }

      // 3. Structured surgical history push onto Patient record
      await Patient.findByIdAndUpdate(
        sessionDoc.patientId,
        {
          $push: {
            surgicalHistory: {
              otSessionId: sessionDoc._id,
              procedureName: sessionDoc.procedureName,
              surgeryDate: actualStart,
              leadSurgeonId: sessionDoc.leadSurgeonId || surgeonStaffId,
              outcome: handoffData.outcome || 'SUCCESSFUL',
              notes: handoffData.operativeNotes || handoffData.postOpNotes || '',
              addedBy: surgeonStaffId,
            },
          },
        },
        sessionOpts
      );

      // 4. Automated Surgical Fees & OT Consumable Ledger Accrual
      try {
        const billingService = require('../../billing/bill.service');
        const TariffRule = require('../../tariff/tariff-rule.model');
        const isMinor = /minor|biopsy|excision|suture|cyst|dressing|catheter/i.test(sessionDoc.procedureName);
        const isComplex = /laparoscop|complex|replacement|bypass|craniotomy|transplant|onco/i.test(sessionDoc.procedureName);

        const theatreRuleNumber = isComplex ? 'TR-SURG-LAP' : (isMinor ? 'TR-SURG-MINOR' : 'TR-SURG-MAJOR');
        const surgeonRuleNumber = isMinor ? 'TR-FEE-SURG-MIN' : 'TR-FEE-SURG-MAJ';
        const anesRuleNumber = isMinor ? 'TR-FEE-ANES-MIN' : 'TR-FEE-ANES-MAJ';

        const [theatreRule, surgeonRule, anesRule] = await Promise.all([
          TariffRule.findOne({ ruleNumber: theatreRuleNumber, status: 'PUBLISHED' }).lean(),
          TariffRule.findOne({ ruleNumber: surgeonRuleNumber, status: 'PUBLISHED' }).lean(),
          TariffRule.findOne({ ruleNumber: anesRuleNumber, status: 'PUBLISHED' }).lean(),
        ]);

        const theatreFee = theatreRule?.amount || (isComplex ? 20000 : (isMinor ? 3500 : 12000));
        const surgeonFee = surgeonRule?.amount || (isMinor ? 5000 : 15000);
        const anesFee = anesRule?.amount || (isMinor ? 2000 : 6000);

        // Resolve target bill (Inpatient Admission Bill or Outpatient Visit Bill)
        let targetBill = null;
        if (sessionDoc.admissionId) {
          const admission = await IPDAdmission.findById(sessionDoc.admissionId).setOptions(sessionOpts);
          if (admission && admission.billId) {
            targetBill = await Bill.findById(admission.billId).setOptions(sessionOpts);
          }
        } else if (sessionDoc.visitId) {
          targetBill = await billingService.getOrCreateBillForVisit(sessionDoc.visitId, surgeonStaffId);
        }

        if (targetBill && targetBill.status === 'OPEN') {
          const addedLines = [
            {
              eventType: 'SURGERY_PERFORMED',
              category: 'SURGERY',
              description: `Operating Theatre Facility Suite (${theatreRule?.name || sessionDoc.procedureName})`,
              quantity: 1,
              snapshotPrice: theatreFee,
              snapshotRuleId: theatreRule?._id || null,
              snapshotRulePath: theatreRule?.ruleNumber || 'Institutional Surgical Tariff',
              lineTotal: theatreFee,
              addedBy: surgeonStaffId,
              addedAt: new Date(),
            },
            {
              eventType: 'PROCEDURE_PERFORMED',
              category: 'PROCEDURE',
              description: `Surgeon Operative Fee: ${sessionDoc.procedureName}`,
              quantity: 1,
              snapshotPrice: surgeonFee,
              snapshotRuleId: surgeonRule?._id || null,
              snapshotRulePath: surgeonRule?.ruleNumber || 'Institutional Surgeon Tariff',
              lineTotal: surgeonFee,
              addedBy: surgeonStaffId,
              addedAt: new Date(),
            },
            {
              eventType: 'PROCEDURE_PERFORMED',
              category: 'PROCEDURE',
              description: `Anesthesia Administration & Intra-op Monitoring (${sessionDoc.anesthesiaType || 'General'})`,
              quantity: 1,
              snapshotPrice: anesFee,
              snapshotRuleId: anesRule?._id || null,
              snapshotRulePath: anesRule?.ruleNumber || 'Institutional Anesthesia Tariff',
              lineTotal: anesFee,
              addedBy: surgeonStaffId,
              addedAt: new Date(),
            },
          ];

          // Push unbilled consumables
          const unbilledConsumables = await OTConsumable.find({
            otSessionId: sessionDoc._id,
            isBilled: false,
          }).setOptions(sessionOpts);

          for (const item of unbilledConsumables) {
            const lineTotal = item.quantity * item.unitPrice;
            addedLines.push({
              eventType: 'SURGICAL_CONSUMABLE_BILLED',
              category: 'PROCEDURE',
              description: `OT Consumable: ${item.itemName} (${sessionDoc.procedureName})`,
              quantity: item.quantity,
              snapshotPrice: item.unitPrice,
              lineTotal,
              addedBy: surgeonStaffId,
              addedAt: new Date(),
            });
            item.isBilled = true;
            await item.save(sessionOpts);
          }

          const addedTotal = addedLines.reduce((s, l) => s + l.lineTotal, 0);
          targetBill.lineItems.push(...addedLines);
          targetBill.billedAmount = (targetBill.billedAmount || 0) + addedTotal;
          targetBill.outstandingAmount = Math.max(
            0,
            targetBill.billedAmount - (targetBill.discountAmount || 0) - (targetBill.collectedAmount || 0) - (targetBill.advanceCollected || 0) - (targetBill.adjustedAmount || 0)
          );
          await targetBill.save(sessionOpts);
          updateData.isConsumablesBilled = true;
        }

        // If Outpatient Day Surgery, route clinical visit directly to Central Billing Station!
        if (sessionDoc.visitId) {
          const Visit = require('../../visits/visit.model');
          await Visit.findByIdAndUpdate(
            sessionDoc.visitId,
            { status: 'WAITING_BILLING' },
            sessionOpts
          );
        }
      } catch (billErr) {
        console.error('[OTService] Error accruing surgical charges onto patient bill:', billErr.message);
      }

      const completedSession = await OTSession.findByIdAndUpdate(id, updateData, {
        new: true,
        ...sessionOpts,
      });

      return completedSession;
    });
  }

  async getSessions(query = {}, requestingDoctorStaffId = null) {
    const filter = {};
    if (query.roomId) filter.roomId = query.roomId;
    if (query.status) {
      if (query.status.includes(',')) {
        filter.status = { $in: query.status.split(',').map((s) => s.trim()) };
      } else {
        filter.status = query.status;
      }
    }
    if (query.leadSurgeonId) filter.leadSurgeonId = query.leadSurgeonId;
    if (query.admissionId) filter.admissionId = query.admissionId;
    if (query.patientId) filter.patientId = query.patientId;
    if (query.requestedBy) filter.requestedBy = query.requestedBy;
    
    // Doctor filtering: If query.myRequests is set, return sessions requested by or assigned to doctor
    if (query.myRequests === 'true' && requestingDoctorStaffId) {
      filter.$or = [
        { requestedBy: requestingDoctorStaffId },
        { leadSurgeonId: requestingDoctorStaffId },
        { suggestedSurgeonId: requestingDoctorStaffId },
        { assistantSurgeons: requestingDoctorStaffId },
        { anesthetistId: requestingDoctorStaffId },
      ];
    }

    if (query.procedureCategory) {
      filter.procedureCategory = query.procedureCategory;
    }

    if (query.isEmergency === 'true') {
      filter.$or = [
        { procedureCategory: { $in: ['EMERGENCY_TRAUMA', 'EMERGENCY_MATERNITY_CSECTION', 'EMERGENCY_ACUTE'] } },
        { surgeryType: { $in: ['EMERGENCY', 'EMERGENCY_TRAUMA', 'EMERGENCY_MATERNITY_CSECTION', 'EMERGENCY_ACUTE'] } },
        { urgency: 'EMERGENCY_STAT' },
      ];
    }

    if (query.date) {
      const start = new Date(query.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(query.date);
      end.setHours(23, 59, 59, 999);
      filter.scheduledStart = { $gte: start, $lte: end };
    }
    return otRepository.getSessions(filter);
  }

  async getSessionById(id) {
    const session = await otRepository.getSessionById(id);
    if (!session) throw new AppError('OT Session not found', 404, 'NOT_FOUND');
    return session;
  }

  /**
   * Advance surgical milestone lifecycle with auditable trail
   */
  async updateMilestone(id, milestoneStatus, notes = '', staffId = null) {
    const session = await OTSession.findById(id);
    if (!session) throw new AppError('OT Session not found', 404, 'NOT_FOUND');

    const validStatuses = [
      'REQUESTED',
      'SCHEDULED',
      'IN_OT',
      'WAITING_FOR_SURGEON',
      'ANESTHESIA_ADMINISTERED',
      'IN_PROGRESS',
      'POST_OP_PACU',
      'COMPLETED',
      'CANCELLED',
      'REJECTED',
    ];

    if (!validStatuses.includes(milestoneStatus)) {
      throw new AppError(`Invalid surgical milestone status: ${milestoneStatus}`, 400, 'INVALID_STATUS');
    }

    const update = {
      status: milestoneStatus,
      $push: {
        milestones: {
          status: milestoneStatus,
          timestamp: new Date(),
          updatedBy: staffId || null,
          notes: notes.trim() || `Milestone changed to ${milestoneStatus}`,
        },
      },
    };

    if (milestoneStatus === 'IN_PROGRESS' && !session.actualStart) {
      update.actualStart = new Date();
    }
    if (milestoneStatus === 'COMPLETED' && !session.actualEnd) {
      update.actualEnd = new Date();
    }

    const updated = await otRepository.updateSession(id, update);
    return updated;
  }

  async updateSessionStatus(id, status, operativeNotes = '', staffId = null) {
    return this.updateMilestone(id, status, operativeNotes, staffId);
  }

  async logConsumable(otSessionId, data, staffId) {
    const session = await otRepository.getSessionById(otSessionId);
    if (!session) throw new AppError('OT Session not found', 404, 'NOT_FOUND');

    const qty = Math.max(1, Number(data.quantity) || 1);
    const price = Math.max(0, Number(data.unitPrice != null ? data.unitPrice : data.unitCost) || 0);
    const total = Math.max(0, Number(data.totalPrice != null ? data.totalPrice : qty * price));

    return otRepository.logConsumable({
      itemName: (data.itemName || '').trim(),
      itemCode: (data.itemCode || '').trim(),
      quantity: qty,
      unitPrice: price,
      totalPrice: total,
      batchNumber: (data.batchNumber || '').trim(),
      notes: (data.notes || '').trim(),
      otSessionId: session._id,
      admissionId: session.admissionId || null,
      loggedBy: staffId || null,
    });
  }

  async getConsumables(otSessionId) {
    return otRepository.getConsumablesBySession(otSessionId);
  }
}

module.exports = new OTService();
