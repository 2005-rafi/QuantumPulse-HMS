const Joi = require('joi');
const { ROLES } = require('../../core/constants');

// ── Role & Permission Schemas ────────────────────────────────────────────────────

const createRoleSchema = Joi.object({
  name:        Joi.string().valid(...Object.values(ROLES)).required(),
  description: Joi.string().max(500).optional(),
});

const assignPermissionsSchema = Joi.object({
  permissionIds: Joi.array().items(Joi.string().length(24)).min(1).required(),
});

// ── Department Schemas ───────────────────────────────────────────────────────────

const DEPT_TYPES = ['CLINICAL', 'DIAGNOSTIC', 'CLINICAL/DIAGNOSTIC', 'SUPPORT', 'ADMINISTRATIVE'];

const vitalFieldSchema = Joi.object({
  name:     Joi.string().trim().required(),
  label:    Joi.string().trim().required(),
  type:     Joi.string().valid('text', 'number', 'boolean').optional(),
  unit:     Joi.string().trim().allow('').optional(),
  required: Joi.boolean().optional(),
});

const createDepartmentSchema = Joi.object({
  name:              Joi.string().trim().required(),
  code:              Joi.string().trim().uppercase().max(10).required(),
  description:       Joi.string().trim().allow('').optional(),
  type:              Joi.string().valid(...DEPT_TYPES).required(),
  status:            Joi.string().valid('Active', 'Inactive').default('Active').optional(),
  vitalFields:       Joi.array().items(vitalFieldSchema).optional(),
});

const updateDepartmentSchema = Joi.object({
  name:              Joi.string().trim().optional(),
  code:              Joi.string().trim().uppercase().max(10).optional(),
  description:       Joi.string().trim().allow('').optional(),
  type:              Joi.string().valid(...DEPT_TYPES).optional(),
  status:            Joi.string().valid('Active', 'Inactive').optional(),
  headOfDepartment:  Joi.string().length(24).allow(null).optional(),
  vitalFields:       Joi.array().items(vitalFieldSchema).optional(),
}).min(1);

/**
 * Validates HOD assignment payload.
 * staffId must be a valid 24-char MongoDB ObjectId string.
 */
const assignHodSchema = Joi.object({
  staffId: Joi.string().length(24).required(),
});

module.exports = {
  createRoleSchema,
  assignPermissionsSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  assignHodSchema,
};

