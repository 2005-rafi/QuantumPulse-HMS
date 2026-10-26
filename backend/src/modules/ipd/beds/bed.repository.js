/**
 * modules/ipd/beds/bed.repository.js
 * High-performance data layer for floors, rooms, beds, and allocation logs.
 */
const FloorMaster = require('./floor.model');
const RoomMaster = require('./room.model');
const BedMaster = require('./bed.model');
const BedAllocation = require('./bed-allocation.model');
require('../../patient/patient.model');
require('../admission/ipd-admission.model');
require('../../staff/staff.model');

class BedRepository {
  // ── 1. Floor Operations ───────────────────────────────────
  async createFloor(data) {
    const existing = await FloorMaster.findOne({ floorNumber: data.floorNumber });
    if (existing) {
      if (!existing.isActive) {
        return FloorMaster.findByIdAndUpdate(
          existing._id,
          { ...data, isActive: true },
          { new: true }
        ).lean();
      }
    }
    return FloorMaster.create(data);
  }

  async getAllFloors() {
    return FloorMaster.find({ isActive: true }).sort({ floorNumber: 1 }).lean();
  }

  async getFloorById(id) {
    return FloorMaster.findById(id).lean();
  }

  async updateFloor(id, update) {
    return FloorMaster.findByIdAndUpdate(id, update, { new: true }).lean();
  }

  // ── 2. Room Operations ────────────────────────────────────
  async createRoom(data) {
    const existing = await RoomMaster.findOne({ floorId: data.floorId, roomNumber: data.roomNumber });
    if (existing) {
      if (!existing.isActive) {
        return RoomMaster.findByIdAndUpdate(
          existing._id,
          { ...data, isActive: true },
          { new: true }
        ).lean();
      }
    }
    return RoomMaster.create(data);
  }

  async getRooms(filter = {}) {
    return RoomMaster.find({ isActive: true, ...filter })
      .populate('floorId', 'floorNumber floorName wing')
      .sort({ roomNumber: 1 })
      .lean();
  }

  async getRoomsByFloor(floorId) {
    return RoomMaster.find({ floorId, isActive: true }).sort({ roomNumber: 1 }).lean();
  }

  async getRoomById(id) {
    return RoomMaster.findById(id).lean();
  }

  async updateRoom(id, update) {
    return RoomMaster.findByIdAndUpdate(id, update, { new: true }).lean();
  }

  // ── 3. Bed Operations ─────────────────────────────────────
  async createBed(data) {
    const existing = await BedMaster.findOne({ bedNumber: data.bedNumber });
    if (existing) {
      if (!existing.isActive) {
        return BedMaster.findByIdAndUpdate(
          existing._id,
          { ...data, isActive: true, status: 'AVAILABLE' },
          { new: true }
        ).lean();
      }
    }
    return BedMaster.create(data);
  }

  async getBeds(filter = {}) {
    return BedMaster.find({ isActive: true, ...filter })
      .populate('currentPatientId', 'firstName lastName mrn age gender phone')
      .populate('currentAdmissionId', 'admissionNumber admissionDate provisionalDiagnosis primaryDoctorId')
      .sort({ bedNumber: 1 })
      .lean();
  }

  async getBedById(id) {
    return BedMaster.findById(id)
      .populate('roomId', 'roomNumber roomName roomType')
      .populate('floorId', 'floorNumber floorName wing')
      .populate('currentPatientId', 'firstName lastName mrn age gender phone')
      .populate({
        path: 'currentAdmissionId',
        populate: { path: 'primaryDoctorId', select: 'firstName lastName employeeId' },
      })
      .lean();
  }

  async updateBed(id, update, session = null) {
    const opts = { returnDocument: 'after' };
    if (session) opts.session = session;
    return BedMaster.findByIdAndUpdate(id, update, opts).lean();
  }

  // Atomic Compare-And-Swap (CAS) Claim Guard to eliminate double-booking
  async claimBedAtomically(id, updateData, session = null) {
    const opts = { returnDocument: 'after' };
    if (session) opts.session = session;
    return BedMaster.findOneAndUpdate(
      { _id: id, status: 'VACANT', isActive: true },
      { $set: updateData },
      opts
    ).lean();
  }

  // ── 4. Full Spatial Bed Map Aggregation (BookMyShow Engine) ──
  async getFullBedMapHierarchy() {
    const floors = await FloorMaster.find({ isActive: true }).sort({ floorNumber: 1 }).lean();
    const rooms = await RoomMaster.find({ isActive: true }).sort({ roomNumber: 1 }).lean();
    const beds = await BedMaster.find({ isActive: true })
      .populate('currentPatientId', 'firstName lastName mrn age gender')
      .populate({
        path: 'currentAdmissionId',
        select: 'admissionNumber admissionDate provisionalDiagnosis primaryDoctorId',
        populate: { path: 'primaryDoctorId', select: 'firstName lastName' },
      })
      .sort({ bedNumber: 1 })
      .lean();

    // Group beds by roomId
    const bedsByRoom = {};
    beds.forEach((bed) => {
      const rId = String(bed.roomId);
      if (!bedsByRoom[rId]) bedsByRoom[rId] = [];
      bedsByRoom[rId].push(bed);
    });

    // Group rooms by floorId
    const roomsByFloor = {};
    rooms.forEach((room) => {
      const fId = String(room.floorId);
      if (!roomsByFloor[fId]) roomsByFloor[fId] = [];
      roomsByFloor[fId].push({
        ...room,
        beds: bedsByRoom[String(room._id)] || [],
      });
    });

    // Compute floor statistics
    return floors.map((floor) => {
      const floorRooms = roomsByFloor[String(floor._id)] || [];
      let totalBeds = 0;
      let vacantBeds = 0;
      let occupiedBeds = 0;
      let reservedBeds = 0;
      let maintenanceBeds = 0;

      floorRooms.forEach((r) => {
        r.beds.forEach((b) => {
          totalBeds++;
          if (b.status === 'VACANT') vacantBeds++;
          else if (b.status === 'OCCUPIED') occupiedBeds++;
          else if (b.status === 'RESERVED') reservedBeds++;
          else maintenanceBeds++;
        });
      });

      return {
        ...floor,
        stats: {
          totalBeds,
          vacantBeds,
          occupiedBeds,
          reservedBeds,
          maintenanceBeds,
          occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        },
        rooms: floorRooms,
      };
    });
  }

  // ── 5. Deletion & Safety Counters ────────────────────────
  async countOccupiedBedsByFloor(floorId) {
    return BedMaster.countDocuments({ floorId, status: 'OCCUPIED', isActive: true });
  }

  async countOccupiedBedsByRoom(roomId) {
    return BedMaster.countDocuments({ roomId, status: 'OCCUPIED', isActive: true });
  }

  async deleteFloor(id) {
    // Cascade soft-delete or remove floor and its non-occupied rooms and beds
    await BedMaster.updateMany({ floorId: id, status: { $ne: 'OCCUPIED' } }, { $set: { isActive: false } });
    await RoomMaster.updateMany({ floorId: id }, { $set: { isActive: false } });
    return FloorMaster.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true }).lean();
  }

  async deleteRoom(id) {
    await BedMaster.updateMany({ roomId: id, status: { $ne: 'OCCUPIED' } }, { $set: { isActive: false } });
    return RoomMaster.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true }).lean();
  }

  async deleteBed(id) {
    return BedMaster.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true }).lean();
  }

  // ── 6. Allocation History ───────────────────────────────────
  async createAllocation(data, session = null) {
    if (session) {
      const docs = await BedAllocation.create([data], { session });
      return docs[0];
    }
    return BedAllocation.create(data);
  }

  async closeActiveAllocation(bedId, admissionId, session = null) {
    const sessionOpts = session ? { session } : {};
    const active = await BedAllocation.findOne({ bedId, admissionId, allocatedTo: null }).setOptions(sessionOpts);
    if (!active) return null;

    const allocatedTo = new Date();
    const durationMs = Math.max(0, allocatedTo.getTime() - new Date(active.allocatedFrom).getTime());
    const rawHours = durationMs / (1000 * 60 * 60);
    const fullDays = Math.floor(rawHours / 24);
    const remainingHours = Math.ceil(rawHours % 24);

    const dailyRate = active.dailyRateApplied || 0;
    const hourlyRate = active.hourlyRateApplied || (dailyRate > 0 ? Math.round(dailyRate / 24) : 0);
    const totalBilledAmount = (fullDays * dailyRate) + (remainingHours * hourlyRate);

    return BedAllocation.findByIdAndUpdate(
      active._id,
      {
        $set: {
          allocatedTo,
          totalHoursBilled: parseFloat(rawHours.toFixed(2)),
          totalBilledAmount,
        },
      },
      { new: true, ...sessionOpts }
    );
  }

  async getAllocationsByAdmission(admissionId) {
    return BedAllocation.find({ admissionId })
      .populate('bedId', 'bedNumber bedLabel wardClass comfortTier sharingType dailyRateOverride hourlyRateOverride')
      .populate('roomId', 'roomNumber roomName roomType genderRestriction')
      .populate('floorId', 'floorNumber floorName wing')
      .populate('transferredBy', 'firstName lastName employeeId')
      .sort({ allocatedFrom: 1 })
      .lean();
  }

  async getRecentTransfers(limit = 50) {
    return BedAllocation.find({ transferReason: { $ne: 'Initial Admission' } })
      .populate('patientId', 'firstName lastName mrn age gender')
      .populate({
        path: 'admissionId',
        select: 'admissionNumber admissionDate provisionalDiagnosis primaryDoctorId',
        populate: { path: 'primaryDoctorId', select: 'firstName lastName employeeId' },
      })
      .populate('bedId', 'bedNumber bedLabel wardClass comfortTier')
      .populate('roomId', 'roomNumber roomName')
      .populate('floorId', 'floorNumber floorName')
      .populate('transferredBy', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

module.exports = new BedRepository();
