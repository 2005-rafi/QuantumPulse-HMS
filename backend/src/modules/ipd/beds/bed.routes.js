/**
 * modules/ipd/beds/bed.routes.js
 * Express router for floor, room, and bed operations.
 */
const express = require('express');
const router = express.Router();
const controller = require('./bed.controller');
const authenticate = require('../../../core/middleware/authenticate');
const { requirePermission } = require('../../../core/middleware/authorize');
const { validate } = require('../../../core/validation/validate');
const {
  createFloorSchema,
  updateFloorSchema,
  createRoomSchema,
  updateRoomSchema,
  createBedSchema,
  updateBedStatusSchema,
  transferBedSchema,
} = require('./bed.validation');

// ── Bed Map (Spatial BookMyShow Grid — Accessible by all authenticated staff) ──
router.get('/map', authenticate, controller.getBedMap);

// ── Floor Routes ──────────────────────────────────────────────
router.post('/floors', authenticate, requirePermission(['FACILITY_MANAGE', 'MANAGE_USERS']), validate(createFloorSchema), controller.createFloor);
router.get('/floors', authenticate, controller.getAllFloors);
router.patch('/floors/:id', authenticate, requirePermission(['FACILITY_MANAGE', 'MANAGE_USERS']), validate(updateFloorSchema), controller.updateFloor);

// ── Room Routes ───────────────────────────────────────────────
router.post('/rooms', authenticate, requirePermission(['FACILITY_MANAGE', 'MANAGE_USERS']), validate(createRoomSchema), controller.createRoom);
router.get('/rooms', authenticate, controller.getAllRooms);
router.get('/rooms/:floorId', authenticate, controller.getRoomsByFloor);
router.patch('/rooms/:id', authenticate, requirePermission(['FACILITY_MANAGE', 'MANAGE_USERS']), validate(updateRoomSchema), controller.updateRoom);

// ── Bed Routes ────────────────────────────────────────────────
router.post('/beds', authenticate, requirePermission(['FACILITY_MANAGE', 'MANAGE_USERS']), validate(createBedSchema), controller.createBed);
router.get('/beds', authenticate, controller.getBeds);
router.get('/beds/:id', authenticate, controller.getBedById);
router.patch('/beds/:id', authenticate, requirePermission(['FACILITY_MANAGE', 'MANAGE_USERS']), controller.updateBed);
router.patch('/beds/:id/status', authenticate, validate(updateBedStatusSchema), controller.updateBedStatus);

// ── Bed Transfer (Atomic Transaction) ─────────────────────────
router.post('/admissions/:admissionId/transfer', authenticate, validate(transferBedSchema), controller.transferBed);

module.exports = router;
