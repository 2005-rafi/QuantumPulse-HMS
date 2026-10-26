const Joi = require('joi');

// ── Result field schema ─────────────────────────────────────────────────────────
const resultFieldSchema = Joi.object({
  key:              Joi.string().trim().required().messages({ 'string.empty': 'Result field key is required' }),
  label:            Joi.string().trim().required().messages({ 'string.empty': 'Result field label is required' }),
  type:             Joi.string().valid('Text', 'Number', 'Boolean', 'Yes/No', 'File', 'text', 'number', 'boolean', 'yes/no', 'file').required()
    .custom((value) => {
      const mapping = {
        'text': 'Text', 'number': 'Number', 'boolean': 'Boolean', 'yes/no': 'Yes/No', 'file': 'File',
        'Text': 'Text', 'Number': 'Number', 'Boolean': 'Boolean', 'Yes/No': 'Yes/No', 'File': 'File'
      };
      return mapping[value] || value;
    }),
  unit:             Joi.string().trim().allow('').optional(),
  isGenderSpecific: Joi.boolean().optional(),
  min:              Joi.number().allow(null).optional(),
  max:              Joi.number().allow(null).optional(),
  maleMin:          Joi.number().allow(null).optional(),
  maleMax:          Joi.number().allow(null).optional(),
  femaleMin:        Joi.number().allow(null).optional(),
  femaleMax:        Joi.number().allow(null).optional(),
  required:         Joi.boolean().default(false),
  reference:        Joi.string().trim().allow('').optional(),
});

// ── Test schema ─────────────────────────────────────────────────────────────────
const testSchema = Joi.object({
  name:                 Joi.string().trim().required(),
  testCode:             Joi.string().trim().uppercase().allow('').optional(),
  sampleType:           Joi.string().trim().optional(), // Made optional for partial updates
  reportType:           Joi.string().valid('STRUCTURED_DATA', 'DOCUMENT_UPLOAD', 'HYBRID').default('STRUCTURED_DATA').optional(),
  isDocumentUploadOnly: Joi.boolean().default(false).optional(),
  templateLayout:       Joi.string().valid('STANDARD_NUMERICAL', 'DESCRIPTIVE_NARRATIVE', 'IMAGING_STUDY', 'CULTURE_ANTIBIOGRAM').default('STANDARD_NUMERICAL').optional(),
  resultFields:         Joi.array().items(resultFieldSchema).default([]),
});

// ── Laboratory CRUD schemas ──────────────────────────────────────────────────────
const createLaboratorySchema = Joi.object({
  name:                    Joi.string().trim().required(),
  code:                    Joi.string().trim().uppercase().allow('').optional(),
  description:             Joi.string().trim().allow('').optional(),
  departmentId:            Joi.string().length(24).hex().required()
    .messages({ 'string.length': 'departmentId must be a valid ObjectId (24 hex chars)' }),
  requireVitalsCollection: Joi.boolean().default(false).optional(),
  testCatalog:             Joi.array().items(testSchema).default([]),
});

const updateLaboratorySchema = Joi.object({
  name:                    Joi.string().trim().optional(),
  code:                    Joi.string().trim().uppercase().allow('').optional(),
  description:             Joi.string().trim().allow('').optional(),
  isActive:                Joi.boolean().optional(),
  requireVitalsCollection: Joi.boolean().optional(),
  testCatalog:             Joi.array().items(testSchema).optional(),
}).min(1);

// ── Test CRUD schemas ────────────────────────────────────────────────────────────
const addTestSchema = testSchema; // same structure

const updateTestSchema = Joi.object({
  name:                 Joi.string().trim().optional(),
  testCode:             Joi.string().trim().allow('').optional(),
  sampleType:           Joi.string().trim().optional(),
  reportType:           Joi.string().valid('STRUCTURED_DATA', 'DOCUMENT_UPLOAD', 'HYBRID').optional(),
  isDocumentUploadOnly: Joi.boolean().optional(),
  templateLayout:       Joi.string().valid('STANDARD_NUMERICAL', 'DESCRIPTIVE_NARRATIVE', 'IMAGING_STUDY', 'CULTURE_ANTIBIOGRAM').optional(),
  resultFields:         Joi.array().items(resultFieldSchema).optional(),
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

const verifyResultsSchema = Joi.object({
  doctorNotes: Joi.string().trim().allow('').optional(),
  clinicalImpression: Joi.string().trim().allow('').optional(),
  deltaFlag: Joi.boolean().default(false),
  panicValueFlag: Joi.boolean().default(false),
  disposition: Joi.string().valid('ROUTE_TO_PATHOLOGIST', 'RETURN_TO_DOCTOR', 'ROUTE_TO_BILLING', 'RECOLLECT_SAMPLE').optional(),
  rejectionReason: Joi.string().trim().allow('').optional(),
});

const dispatchVisitSchema = Joi.object({
  disposition: Joi.string().valid('ROUTE_TO_PATHOLOGIST', 'RETURN_TO_DOCTOR', 'ROUTE_TO_BILLING').required(),
  notes: Joi.string().trim().allow('').optional(),
});

module.exports = {
  createLaboratorySchema,
  updateLaboratorySchema,
  addTestSchema,
  updateTestSchema,
  uploadResultsSchema,
  verifyResultsSchema,
  dispatchVisitSchema,
};

