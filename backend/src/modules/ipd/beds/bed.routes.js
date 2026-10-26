/**
 * modules/ipd/beds/bed.routes.js
 * Express router for floor, room, and bed operations.
 */
const express = require('express');
const router = express.Router();
const controller = require('./bed.controller');
const authenticate = require('../../../core/middleware/authenticate.middleware');
const { requirePermission } = require('../../../core/middleware/authorize.middleware');
const { validate } = require('../../../core/validation/validate.middleware');
const {
  createFloorSchema,
  updateFloorSchema,
  createRoomSchema,
  updateRoomSchema,
  createBedSchema,
  updateBedSchema,
  updateBedStatusSchema,
  transferBedSchema,
} = require('./bed.validation');

// ── Bed Map (Spatial BookMyShow Grid — Accessible by all authenticated staff) ──
router.get('/map', authenticate, controller.getBedMap);

// ── Floor Routes ──────────────────────────────────────────────
router.post('/floors', authenticate, requirePermission(['FACILITY_MANAGE', 'MANAGE_USERS']), validate(createFloorSchema), controller.createFloor);
router.get('/floors', authenticate, controller.getAllFloors);
router.patch('/floors/:id', authenticate, requirePermission(['FACILITY_MANAGE', 'MANAGE_USERS']), validate(updateFloorSchema), controller.updateFloor);
router.delete('/floors/:id', authenticate, requirePermission(['FACILITY_MANAGE', 'MANAGE_USERS']), controller.deleteFloor);

// ── Room Routes ───────────────────────────────────────────────
router.post('/rooms', authenticate, requirePermission(['FACILITY_MANAGE', 'MANAGE_USERS']), validate(createRoomSchema), controller.createRoom);
router.get('/rooms', authenticate, controller.getAllRooms);
router.get('/rooms/:floorId', authenticate, controller.getRoomsByFloor);
router.patch('/rooms/:id', authenticate, requirePermission(['FACILITY_MANAGE', 'MANAGE_USERS']), validate(updateRoomSchema), controller.updateRoom);
router.delete('/rooms/:id', authenticate, requirePermission(['FACILITY_MANAGE', 'MANAGE_USERS']), controller.deleteRoom);

// ── Bed Routes ────────────────────────────────────────────────
router.post('/beds', authenticate, requirePermission(['FACILITY_MANAGE', 'MANAGE_USERS']), validate(createBedSchema), controller.createBed);
router.get('/beds', authenticate, controller.getBeds);
router.get('/beds/:id', authenticate, controller.getBedById);
router.patch('/beds/:id', authenticate, requirePermission(['FACILITY_MANAGE', 'MANAGE_USERS']), validate(updateBedSchema), controller.updateBed);
router.delete('/beds/:id', authenticate, requirePermission(['FACILITY_MANAGE', 'MANAGE_USERS']), controller.deleteBed);
router.patch('/beds/:id/status', authenticate, validate(updateBedStatusSchema), controller.updateBedStatus);

// ── Bed Transfer & Allocation History ─────────────────────────
router.post('/admissions/:admissionId/transfer', authenticate, validate(transferBedSchema), controller.transferBed);
router.get('/admissions/:admissionId/allocations', authenticate, controller.getAllocationsByAdmission);
router.get('/transfers', authenticate, controller.getRecentTransfers);

module.exports = router;
