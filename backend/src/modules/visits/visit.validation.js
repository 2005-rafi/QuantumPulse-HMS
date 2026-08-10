const Joi = require('joi');

const createVisitSchema = Joi.object({
  patientId: Joi.string().required(),
  isDirectPharmacy: Joi.boolean().optional(),
  departmentId: Joi.string().optional(),
  doctorId: Joi.string().optional(),
  visitType: Joi.string().valid('OPD', 'IPD').optional(),
  reasonForVisit: Joi.string().allow('').optional(),
  receptionPayment: Joi.object({
    registrationFee: Joi.number().min(0).optional(),
    consultationFee: Joi.number().min(0).optional(),
    paymentMethod: Joi.string().valid('Cash', 'Card', 'UPI', 'Insurance').optional()
  }).optional()
});

const recordVitalsSchema = Joi.object({
  height: Joi.number().positive().min(30).max(250).precision(1).optional(),
  weight: Joi.number().positive().min(1).max(500).precision(1).optional(),
  bloodPressure: Joi.string().trim().pattern(/^\d{2,3}\/\d{2,3}$/).optional().messages({
    'string.pattern.base': 'Blood Pressure must be in systolic/diastolic format (e.g. 120/80)'
  }),
  temperature: Joi.number().min(80).max(115).precision(1).optional(),
  pulse: Joi.number().integer().min(20).max(300).optional(),
  oxygenSaturation: Joi.number().integer().min(0).max(100).optional(),
  chiefComplaint: Joi.string().trim().min(3).max(2000).required(),
  doctorId: Joi.string().length(24).optional(),
  allergies: Joi.string().allow('').optional(),
  operations: Joi.string().allow('').optional(),
  dynamicVitals: Joi.object().unknown(true).optional()
});

const medicationItemSchema = Joi.alternatives().try(
  Joi.string(),
  Joi.object({
    name: Joi.string().required(),
    dosageSchedule: Joi.object({
      morning: Joi.object({ count: Joi.number().min(0).optional(), timing: Joi.string().allow('').optional() }).optional(),
      afternoon: Joi.object({ count: Joi.number().min(0).optional(), timing: Joi.string().allow('').optional() }).optional(),
      night: Joi.object({ count: Joi.number().min(0).optional(), timing: Joi.string().allow('').optional() }).optional()
    }).optional()
  })
);

const saveDraftSchema = Joi.object({
  chiefComplaint: Joi.string().allow('').optional(),
  historyOfPresentIllness: Joi.string().allow('').optional(),
  physicalExamination: Joi.string().allow('').optional(),
  differentials: Joi.string().allow('').optional(),
  prognosis: Joi.string().allow('').optional(),
  diagnosis: Joi.string().allow('').optional(),
  treatmentPlan: Joi.string().allow('').optional(),
  notes: Joi.string().allow('').optional(),
  prescribedMedications: Joi.array().items(medicationItemSchema).optional(),
  labOrders: Joi.array().items(
    Joi.object({
      laboratoryId: Joi.string().required(),
      testName: Joi.string().required(),
      sampleType: Joi.string().allow('').optional()
    }).unknown(true)
  ).optional()
});

const finalizeConsultationSchema = Joi.object({
  chiefComplaint: Joi.string().required(),
  historyOfPresentIllness: Joi.string().allow('').optional(),
  physicalExamination: Joi.string().allow('').optional(),
  differentials: Joi.string().allow('').optional(),
  prognosis: Joi.string().allow('').optional(),
  diagnosis: Joi.string().required(),
  treatmentPlan: Joi.string().required(),
  notes: Joi.string().allow('').optional(),
  prescribedMedications: Joi.array().items(medicationItemSchema).optional(),
  labOrders: Joi.array().items(
    Joi.object({
      laboratoryId: Joi.string().required(),
      testName: Joi.string().required(),
      sampleType: Joi.string().allow('').optional()
    }).unknown(true)
  ).optional()
});

module.exports = {
  createVisitSchema,
  recordVitalsSchema,
  saveDraftSchema,
  finalizeConsultationSchema
};
