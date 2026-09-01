/**
 * modules/ipd/beds/bed.service.js
 * Business logic for physical hospital facility, bed FSM state transitions, and atomic transfers.
 */
const mongoose = require('mongoose');
const bedRepository = require('./bed.repository');
const IPDAdmission = require('../admission/ipd-admission.model');
const AppError = require('../../../core/errors/AppError');

class BedService {
  // ── Floor Operations ────────────────────────────────────────
  async createFloor(data) {
    return bedRepository.createFloor(data);
  }

  async getAllFloors() {
    return bedRepository.getAllFloors();
  }

  async updateFloor(id, data) {
    const floor = await bedRepository.updateFloor(id, data);
    if (!floor) throw new AppError('Floor not found', 404, 'NOT_FOUND');
    return floor;
  }

  // ── Room Operations ─────────────────────────────────────────
  async createRoom(data) {
    const floor = await bedRepository.getFloorById(data.floorId);
    if (!floor) throw new AppError('Associated floor not found', 404, 'NOT_FOUND');
    return bedRepository.createRoom(data);
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
    return room;
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
    return bedRepository.createBed(bedData);
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
    return bed;
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
    return bed;
  }

  async getBedMap() {
    return bedRepository.getFullBedMapHierarchy();
  }

  // ── Atomic Bed Transfer (ACID Transaction) ──────────────────
  async transferBed(admissionId, targetBedId, transferReason, staffId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const admission = await IPDAdmission.findById(admissionId).session(session);
      if (!admission) throw new AppError('Admission not found', 404, 'NOT_FOUND');
      if (admission.status !== 'ADMITTED') {
        throw new AppError(`Cannot transfer patient with status: ${admission.status}`, 400, 'INVALID_STATUS');
      }

      const currentBedId = admission.currentBedId;
      if (String(currentBedId) === String(targetBedId)) {
        throw new AppError('Target bed is identical to current bed', 400, 'SAME_BED');
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
          transferredBy: staffId,
          transferReason: transferReason || 'Clinical ward transfer',
        },
        session
      );

      // 4. Update IPDAdmission current pointers
      admission.currentBedId = targetBed._id;
      admission.currentRoomId = targetBed.roomId._id || targetBed.roomId;
      admission.currentFloorId = targetBed.floorId._id || targetBed.floorId;
      await admission.save({ session });

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        message: 'Patient bed transfer completed successfully',
        admissionId: admission._id,
        newBedNumber: targetBed.bedNumber,
        newWardClass: targetBed.wardClass,
      };
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      throw err;
    }
  }
}

module.exports = new BedService();
