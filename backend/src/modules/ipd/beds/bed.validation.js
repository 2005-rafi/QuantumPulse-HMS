/**
 * modules/ipd/beds/bed.validation.js
 * Joi input validation schemas for floor, room, and bed operations.
 */
const Joi = require('joi');
const { ROOM_TYPES } = require('./room.model');
const { BED_STATUS, BED_FEATURES } = require('./bed.model');

const createFloorSchema = Joi.object({
  floorNumber: Joi.number().integer().required(),
  floorName: Joi.string().trim().min(1).max(100).required(),
  wing: Joi.string().trim().max(100).default('Main Wing'),
  description: Joi.string().trim().allow('').max(300).default(''),
});

const updateFloorSchema = Joi.object({
  floorName: Joi.string().trim().min(1).max(100),
  wing: Joi.string().trim().max(100),
  description: Joi.string().trim().allow('').max(300),
  isActive: Joi.boolean(),
});

const createRoomSchema = Joi.object({
  floorId: Joi.string().hex().length(24).required(),
  roomNumber: Joi.string().trim().min(1).max(50).required(),
  roomName: Joi.string().trim().min(1).max(100).required(),
  roomType: Joi.string().valid(...ROOM_TYPES).required(),
  genderRestriction: Joi.string().valid('MALE_ONLY', 'FEMALE_ONLY', 'UNRESTRICTED').default('UNRESTRICTED'),
  totalBeds: Joi.number().integer().min(1).max(50).default(1),
});

const updateRoomSchema = Joi.object({
  roomName: Joi.string().trim().min(1).max(100),
  roomType: Joi.string().valid(...ROOM_TYPES),
  genderRestriction: Joi.string().valid('MALE_ONLY', 'FEMALE_ONLY', 'UNRESTRICTED'),
  totalBeds: Joi.number().integer().min(1).max(50),
  isActive: Joi.boolean(),
});

const createBedSchema = Joi.object({
  roomId: Joi.string().hex().length(24).required(),
  bedNumber: Joi.string().trim().min(1).max(50).required(),
  bedLabel: Joi.string().trim().min(1).max(100).required(),
  wardClass: Joi.string().trim().max(50).optional(),
  features: Joi.array().items(Joi.string().valid(...BED_FEATURES)).default([]),
  dailyRateOverride: Joi.number().min(0).allow(null).optional(),
  notes: Joi.string().trim().allow('').max(300).default(''),
});

const updateBedStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(BED_STATUS)).required(),
  notes: Joi.string().trim().allow('').max(300).default(''),
});

const transferBedSchema = Joi.object({
  targetBedId: Joi.string().hex().length(24).required(),
  transferReason: Joi.string().trim().min(3).max(300).required(),
});

module.exports = {
  createFloorSchema,
  updateFloorSchema,
  createRoomSchema,
  updateRoomSchema,
  createBedSchema,
  updateBedStatusSchema,
  transferBedSchema,
};
