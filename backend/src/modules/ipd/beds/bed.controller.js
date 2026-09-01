/**
 * modules/ipd/beds/bed.controller.js
 * Express controllers for floor, room, and bed operations.
 */
const bedService = require('./bed.service');
const { success } = require('../../../core/responses');

class BedController {
  // ── Floor Controllers ───────────────────────────────────────
  async createFloor(req, res, next) {
    try {
      const floor = await bedService.createFloor(req.body);
      return success(res, floor, 'Floor created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getAllFloors(req, res, next) {
    try {
      const floors = await bedService.getAllFloors();
      return success(res, floors, 'Floors retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateFloor(req, res, next) {
    try {
      const floor = await bedService.updateFloor(req.params.id, req.body);
      return success(res, floor, 'Floor updated successfully');
    } catch (err) {
      next(err);
    }
  }

  // ── Room Controllers ────────────────────────────────────────
  async createRoom(req, res, next) {
    try {
      const room = await bedService.createRoom(req.body);
      return success(res, room, 'Room created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getAllRooms(req, res, next) {
    try {
      const filter = {};
      if (req.query.floorId) filter.floorId = req.query.floorId;
      if (req.query.roomType) filter.roomType = req.query.roomType;
      const rooms = await bedService.getAllRooms(filter);
      return success(res, rooms, 'Rooms retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getRoomsByFloor(req, res, next) {
    try {
      const rooms = await bedService.getRoomsByFloor(req.params.floorId);
      return success(res, rooms, 'Rooms retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateRoom(req, res, next) {
    try {
      const room = await bedService.updateRoom(req.params.id, req.body);
      return success(res, room, 'Room updated successfully');
    } catch (err) {
      next(err);
    }
  }

  // ── Bed Controllers ─────────────────────────────────────────
  async createBed(req, res, next) {
    try {
      const bed = await bedService.createBed(req.body);
      return success(res, bed, 'Bed created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getBeds(req, res, next) {
    try {
      const filter = {};
      if (req.query.floorId) filter.floorId = req.query.floorId;
      if (req.query.roomId) filter.roomId = req.query.roomId;
      if (req.query.status) filter.status = req.query.status;
      if (req.query.wardClass) filter.wardClass = req.query.wardClass;

      const beds = await bedService.getBeds(filter);
      return success(res, beds, 'Beds retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getBedById(req, res, next) {
    try {
      const bed = await bedService.getBedById(req.params.id);
      return success(res, bed, 'Bed details retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateBed(req, res, next) {
    try {
      const bed = await bedService.updateBed(req.params.id, req.body);
      return success(res, bed, 'Bed updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateBedStatus(req, res, next) {
    try {
      const { status, notes } = req.body;
      const bed = await bedService.updateBedStatus(req.params.id, status, notes);
      return success(res, bed, 'Bed status updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async getBedMap(req, res, next) {
    try {
      const bedMap = await bedService.getBedMap();
      return success(res, bedMap, 'Live bed map retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async transferBed(req, res, next) {
    try {
      const { targetBedId, transferReason } = req.body;
      const staffId = req.user.staffId || req.user.id;
      const result = await bedService.transferBed(req.params.admissionId, targetBedId, transferReason, staffId);
      return success(res, result, 'Patient bed transferred successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BedController();
