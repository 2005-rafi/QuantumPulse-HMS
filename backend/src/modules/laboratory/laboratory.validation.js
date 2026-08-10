const Joi = require('joi');

// ── Result field schema ─────────────────────────────────────────────────────────
const resultFieldSchema = Joi.object({
  key:       Joi.string().trim().required().messages({ 'string.empty': 'Result field key is required' }),
  label:     Joi.string().trim().required().messages({ 'string.empty': 'Result field label is required' }),
  type:      Joi.string().valid('Text', 'Number', 'Boolean', 'Yes/No', 'File', 'text', 'number', 'boolean', 'yes/no', 'file').required()
    .custom((value) => {
      const mapping = {
        'text': 'Text', 'number': 'Number', 'boolean': 'Boolean', 'yes/no': 'Yes/No', 'file': 'File',
        'Text': 'Text', 'Number': 'Number', 'Boolean': 'Boolean', 'Yes/No': 'Yes/No', 'File': 'File'
      };
      return mapping[value] || value;
    }),
  unit:      Joi.string().trim().allow('').optional(),
  required:  Joi.boolean().default(false),
  reference: Joi.string().trim().allow('').optional(),
});

// ── Test schema ─────────────────────────────────────────────────────────────────
const testSchema = Joi.object({
  name:         Joi.string().trim().required(),
  testCode:     Joi.string().trim().allow('').optional(),
  sampleType:   Joi.string().trim().optional(), // Made optional for partial updates
  resultFields: Joi.array().items(resultFieldSchema).default([]),
});

// ── Laboratory CRUD schemas ──────────────────────────────────────────────────────
const createLaboratorySchema = Joi.object({
  name:         Joi.string().trim().required(),
  description:  Joi.string().trim().allow('').optional(),
  departmentId: Joi.string().length(24).hex().required()
    .messages({ 'string.length': 'departmentId must be a valid ObjectId (24 hex chars)' }),
  testCatalog:  Joi.array().items(testSchema).default([]),
});

const updateLaboratorySchema = Joi.object({
  name:        Joi.string().trim().optional(),
  description: Joi.string().trim().allow('').optional(),
  isActive:    Joi.boolean().optional(),
  testCatalog: Joi.array().items(testSchema).optional(),
}).min(1);

// ── Test CRUD schemas ────────────────────────────────────────────────────────────
const addTestSchema = testSchema; // same structure

const updateTestSchema = Joi.object({
  name:         Joi.string().trim().optional(),
  testCode:     Joi.string().trim().allow('').optional(),
  sampleType:   Joi.string().trim().optional(),
  resultFields: Joi.array().items(resultFieldSchema).optional(),
}).min(1);

// ── Workflow schemas ─────────────────────────────────────────────────────────────
const uploadResultsSchema = Joi.object({
  // Key-value pairs for Text/Number/Boolean/Yes-No fields.
  // File fields are handled by multer — they must NOT appear in the JSON body.
  results: Joi.object().pattern(
    Joi.string(),
    Joi.alternatives().try(Joi.string().allow(''), Joi.number(), Joi.boolean())
  ).required(),
  notes: Joi.string().trim().allow('').optional(),
});

module.exports = {
  createLaboratorySchema,
  updateLaboratorySchema,
  addTestSchema,
  updateTestSchema,
  uploadResultsSchema,
};

