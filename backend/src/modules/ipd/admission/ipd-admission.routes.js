/**
 * modules/ipd/admission/ipd-admission.routes.js
 * Inpatient admission routes.
 */
const express = require('express');
const router = express.Router();
const controller = require('./ipd-admission.controller');
const authenticate = require('../../../core/middleware/authenticate');
const { requirePermission } = require('../../../core/middleware/authorize');
const { validate } = require('../../../core/validation/validate');
const { admitPatientSchema, updateAdmissionSchema } = require('./ipd-admission.validation');

router.post('/', authenticate, validate(admitPatientSchema), controller.admitPatient);
router.get('/', authenticate, controller.getAdmissions);
router.get('/:id', authenticate, controller.getAdmissionById);
router.patch('/:id', authenticate, validate(updateAdmissionSchema), controller.updateAdmission);

module.exports = router;
