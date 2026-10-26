/**
 * modules/ipd/beds/bed.service.js
 * Business logic for physical hospital facility, bed FSM state transitions, and atomic transfers.
 */
const mongoose = require('mongoose');
const bedRepository = require('./bed.repository');
const IPDAdmission = require('../admission/ipd-admission.model');
const { withTransaction } = require('../../../core/database/transaction');
const AppError = require('../../../core/errors/app-error');
const cacheService = require('../../../core/cache/cache.service');

class BedService {
  // ── Floor Operations ────────────────────────────────────────
  async createFloor(data) {
    const res = await bedRepository.createFloor(data);
    cacheService.del('beds:map:full');
    return res;
  }

  async getAllFloors() {
    return bedRepository.getAllFloors();
  }

  async updateFloor(id, data) {
    const floor = await bedRepository.updateFloor(id, data);
    if (!floor) throw new AppError('Floor not found', 404, 'NOT_FOUND');
    cacheService.del('beds:map:full');
    return floor;
  }

  async deleteFloor(id) {
    const floor = await bedRepository.getFloorById(id);
    if (!floor) throw new AppError('Floor not found', 404, 'NOT_FOUND');

    const occupiedCount = await bedRepository.countOccupiedBedsByFloor(id);
    if (occupiedCount > 0) {
      throw new AppError(
        `Cannot delete floor: ${occupiedCount} bed(s) on this floor are currently OCCUPIED. Please discharge or transfer patients before deleting.`,
        400,
        'FLOOR_OCCUPIED'
      );
    }

    const res = await bedRepository.deleteFloor(id);
    cacheService.del('beds:map:full');
    return res;
  }

  // ── Room Operations ─────────────────────────────────────────
  async createRoom(data) {
    const floor = await bedRepository.getFloorById(data.floorId);
    if (!floor) throw new AppError('Associated floor not found', 404, 'NOT_FOUND');
    const res = await bedRepository.createRoom(data);
    cacheService.del('beds:map:full');
    return res;
  }

  async getAllRooms(filter = {}) {
    return bedRepository.getRooms(filter);
  }

  async getRoomsByFloor(floorId) {
    return bedRepository.getRoomsByFloor(floorId);
  }

  async updateRoom(id, data) {
    const room = await bedRepository.updateRoom(id, data);
    if (!room) throw new AppError('Room not found', 404, 'NOT_FOUND');
    cacheService.del('beds:map:full');
    return room;
  }

  async deleteRoom(id) {
    const room = await bedRepository.getRoomById(id);
    if (!room) throw new AppError('Room not found', 404, 'NOT_FOUND');

    const occupiedCount = await bedRepository.countOccupiedBedsByRoom(id);
    if (occupiedCount > 0) {
      throw new AppError(
        `Cannot delete room: ${occupiedCount} bed(s) in this room are currently OCCUPIED. Please discharge or transfer patients before deleting.`,
        400,
        'ROOM_OCCUPIED'
      );
    }

    const res = await bedRepository.deleteRoom(id);
    cacheService.del('beds:map:full');
    return res;
  }

  // ── Bed Operations ──────────────────────────────────────────
  async createBed(data) {
    const room = await bedRepository.getRoomById(data.roomId);
    if (!room) throw new AppError('Associated room not found', 404, 'NOT_FOUND');

    const bedData = {
      ...data,
      floorId: room.floorId,
      wardClass: data.wardClass || room.roomType,
    };
    const res = await bedRepository.createBed(bedData);
    cacheService.del('beds:map:full');
    return res;
  }

  async getBeds(query) {
    return bedRepository.getBeds(query);
  }

  async getBedById(id) {
    const bed = await bedRepository.getBedById(id);
    if (!bed) throw new AppError('Bed not found', 404, 'NOT_FOUND');
    return bed;
  }

  async updateBed(id, data) {
    const bed = await bedRepository.updateBed(id, data);
    if (!bed) throw new AppError('Bed not found', 404, 'NOT_FOUND');
    cacheService.del('beds:map:full');
    return bed;
  }

  async deleteBed(id) {
    const bed = await bedRepository.getBedById(id);
    if (!bed) throw new AppError('Bed not found', 404, 'NOT_FOUND');

    if (bed.status === 'OCCUPIED') {
      throw new AppError(
        'Cannot delete bed while status is OCCUPIED. Please discharge or transfer the admitted patient first.',
        400,
        'BED_OCCUPIED'
      );
    }

    const res = await bedRepository.deleteBed(id);
    cacheService.del('beds:map:full');
    return res;
  }

  async updateBedStatus(id, status, notes = '') {
    const update = { status };
    if (notes) update.notes = notes;
    if (status === 'VACANT') {
      update.currentAdmissionId = null;
      update.currentPatientId = null;
    }
    const bed = await bedRepository.updateBed(id, update);
    if (!bed) throw new AppError('Bed not found', 404, 'NOT_FOUND');
    cacheService.del('beds:map:full');
    return bed;
  }

  async getBedMap() {
    return cacheService.wrap('beds:map:full', 60, () => bedRepository.getFullBedMapHierarchy());
  }

  // ── Atomic Bed Transfer (ACID Transaction) ──────────────────
  async transferBed(admissionId, targetBedId, transferReason, staffId) {
    return withTransaction(async (session) => {
      const sessionOpts = session ? { session } : {};
      const admission = await IPDAdmission.findById(admissionId).setOptions(sessionOpts);
      if (!admission) throw new AppError('Admission not found', 404, 'NOT_FOUND');
      if (admission.status !== 'ADMITTED') {
        throw new AppError(`Cannot transfer patient with status: ${admission.status}`, 400, 'INVALID_STATUS');
      }

      const currentBedId = admission.currentBedId;
      if (String(currentBedId) === String(targetBedId)) {
        throw new AppError('Target bed is identical to current bed', 400, 'SAME_BED');
      }

      // 0. Gender Privacy Validation for Target Bed & Room
      const Patient = require('../../patient/patient.model');
      const RoomMaster = require('./room.model');
      const BedMaster = require('./bed.model');

      const patient = await Patient.findById(admission.patientId).setOptions(sessionOpts);
      const targetBedDoc = await BedMaster.findById(targetBedId).setOptions(sessionOpts);
      if (!targetBedDoc || !targetBedDoc.isActive) {
        throw new AppError('Target bed not found or is inactive', 404, 'NOT_FOUND');
      }
      const targetRoomDoc = await RoomMaster.findById(targetBedDoc.roomId).setOptions(sessionOpts);

      if (patient && targetRoomDoc) {
        const pGender = (patient.gender || '').trim().toUpperCase();
        const rawRestriction = (targetRoomDoc.genderRestriction || 'UNRESTRICTED').toUpperCase();

        if (pGender === 'MALE' && (rawRestriction === 'FEMALE_ONLY' || rawRestriction === 'FEMALE')) {
          throw new AppError(
            `Clinical Privacy Violation: Cannot transfer Male patient (${patient.firstName} ${patient.lastName}) to Female-only Room ${targetRoomDoc.roomNumber}. Please select a Male or Unisex ward.`,
            422,
            'GENDER_MISMATCH'
          );
        }
        if (pGender === 'FEMALE' && (rawRestriction === 'MALE_ONLY' || rawRestriction === 'MALE')) {
          throw new AppError(
            `Clinical Privacy Violation: Cannot transfer Female patient (${patient.firstName} ${patient.lastName}) to Male-only Room ${targetRoomDoc.roomNumber}. Please select a Female or Unisex ward.`,
            422,
            'GENDER_MISMATCH'
          );
        }
      }

      // 1. Claim target bed atomically via Compare-And-Swap (CAS) inside transaction
      const targetBed = await bedRepository.claimBedAtomically(
        targetBedId,
        {
          status: 'OCCUPIED',
          currentAdmissionId: admission._id,
          currentPatientId: admission.patientId,
        },
        session
      );

      if (!targetBed) {
        throw new AppError(
          'Target bed was just claimed by another clinician or is no longer vacant. Please select another bed.',
          409,
          'BED_NOT_AVAILABLE'
        );
      }

      // 2. Release old bed (mark for cleaning / turnaround)
      await bedRepository.updateBed(
        currentBedId,
        {
          status: 'CLEANING_IN_PROGRESS',
          currentAdmissionId: null,
          currentPatientId: null,
        },
        session
      );

      // 3. Close old allocation log & create new allocation log
      await bedRepository.closeActiveAllocation(currentBedId, admission._id, session);
      await bedRepository.createAllocation(
        {
          admissionId: admission._id,
          patientId: admission.patientId,
          bedId: targetBed._id,
          roomId: targetBed.roomId._id || targetBed.roomId,
          floorId: targetBed.floorId._id || targetBed.floorId,
          wardClass: targetBed.wardClass,
          comfortTier: targetBed.comfortTier || 'STANDARD',
          sharingType: targetBed.sharingType || 'GENERAL_WARD',
          dailyRateApplied: targetBed.dailyRateOverride || 0,
          hourlyRateApplied: targetBed.hourlyRateOverride || 0,
          transferredBy: staffId,
          transferReason: transferReason || 'Clinical ward transfer',
        },
        session
      );

      // 4. Update IPDAdmission current pointers
      admission.currentBedId = targetBed._id;
      admission.currentRoomId = targetBed.roomId._id || targetBed.roomId;
      admission.currentFloorId = targetBed.floorId._id || targetBed.floorId;
      await admission.save(sessionOpts);

      cacheService.del('beds:map:full');

      return {
        success: true,
        message: 'Patient bed transfer completed successfully',
        admissionId: admission._id,
        newBedNumber: targetBed.bedNumber,
        newWardClass: targetBed.wardClass,
      };
    });
  }

  // ── Allocation History & Ward Transfers ─────────────────────
  async getAllocationsByAdmission(admissionId) {
    return bedRepository.getAllocationsByAdmission(admissionId);
  }

  async getRecentTransfers(limit = 50) {
    return bedRepository.getRecentTransfers(Number(limit) || 50);
  }
}

module.exports = new BedService();
