/**
 * modules/ipd/beds/bed.repository.js
 * High-performance data layer for floors, rooms, beds, and allocation logs.
 */
const FloorMaster = require('./floor.model');
const RoomMaster = require('./room.model');
const BedMaster = require('./bed.model');
const BedAllocation = require('./bed-allocation.model');

class BedRepository {
  // ── 1. Floor Operations ───────────────────────────────────
  async createFloor(data) {
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
    return RoomMaster.findByIdAndUpdate(id, update, { returnDocument: 'after' }).lean();
  }

  // ── 3. Bed Operations ─────────────────────────────────────
  async createBed(data) {
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

  // ── 5. Allocation History ───────────────────────────────────
  async createAllocation(data, session = null) {
    if (session) {
      const docs = await BedAllocation.create([data], { session });
      return docs[0];
    }
    return BedAllocation.create(data);
  }

  async closeActiveAllocation(bedId, admissionId, session = null) {
    const opts = { session };
    return BedAllocation.findOneAndUpdate(
      { bedId, admissionId, allocatedTo: null },
      { $set: { allocatedTo: new Date() } },
      opts
    );
  }

  async getAllocationsByAdmission(admissionId) {
    return BedAllocation.find({ admissionId })
      .populate('bedId', 'bedNumber bedLabel wardClass')
      .populate('roomId', 'roomNumber roomName')
      .populate('transferredBy', 'firstName lastName')
      .sort({ allocatedFrom: 1 })
      .lean();
  }
}

module.exports = new BedRepository();
