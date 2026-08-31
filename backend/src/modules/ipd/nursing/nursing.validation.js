/**
 * modules/ipd/nursing/nursing.validation.js
 * Joi schemas for nursing station actions.
 */
const Joi = require('joi');
const { EMAR_STATUS } = require('./emar-record.model');

const recordVitalsSchema = Joi.object({
  temperature: Joi.number().min(30).max(45).required(),
  systolicBp: Joi.number().min(50).max(300).required(),
  diastolicBp: Joi.number().min(30).max(200).required(),
  heartRate: Joi.number().min(20).max(250).required(),
  respirationRate: Joi.number().min(4).max(60).required(),
  spO2: Joi.number().min(50).max(100).required(),
  oxygenTherapy: Joi.boolean().default(false),
  oxygenFlowRateLpm: Joi.number().min(0).max(15).default(0),
  avpu: Joi.string().valid('ALERT', 'VOICE', 'PAIN', 'UNRESPONSIVE').default('ALERT'),
  painScore: Joi.number().min(0).max(10).default(0),
  bloodSugarRandom: Joi.number().min(20).max(800).allow(null).optional(),
  clinicalNotes: Joi.string().trim().allow('').max(500).default(''),
});

const updateEmarSchema = Joi.object({
  status: Joi.string().valid(...Object.values(EMAR_STATUS)).required(),
  batchNumber: Joi.string().trim().allow('').max(100).default(''),
  omissionReason: Joi.string().trim().allow('').max(200).default(''),
  nurseNotes: Joi.string().trim().allow('').max(300).default(''),
});

const logIOSchema = Joi.object({
  shift: Joi.string().valid('MORNING', 'EVENING', 'NIGHT').required(),
  intake: Joi.object({
    oral: Joi.number().min(0).default(0),
    ivFluids: Joi.number().min(0).default(0),
    rylesTube: Joi.number().min(0).default(0),
    bloodProducts: Joi.number().min(0).default(0),
    other: Joi.number().min(0).default(0),
  }).required(),
  output: Joi.object({
    urine: Joi.number().min(0).default(0),
    drainage: Joi.number().min(0).default(0),
    vomitus: Joi.number().min(0).default(0),
    stool: Joi.number().min(0).default(0),
    other: Joi.number().min(0).default(0),
  }).required(),
  notes: Joi.string().trim().allow('').max(300).default(''),
});

const createHandoverSchema = Joi.object({
  shift: Joi.string().valid('MORNING_TO_EVENING', 'EVENING_TO_NIGHT', 'NIGHT_TO_MORNING').required(),
  situation: Joi.string().trim().min(3).max(500).required(),
  background: Joi.string().trim().min(3).max(500).required(),
  assessment: Joi.string().trim().min(3).max(500).required(),
  recommendation: Joi.string().trim().min(3).max(500).required(),
});

module.exports = {
  recordVitalsSchema,
  updateEmarSchema,
  logIOSchema,
  createHandoverSchema,
};
