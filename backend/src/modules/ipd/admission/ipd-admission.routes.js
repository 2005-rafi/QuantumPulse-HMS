/**
 * modules/ipd/admission/ipd-admission.routes.js
 * Inpatient admission routes.
 */
const express = require('express');
const router = express.Router();
const controller = require('./ipd-admission.controller');
const authenticate = require('../../../core/middleware/authenticate.middleware');
const { requirePermission } = require('../../../core/middleware/authorize.middleware');
const { validate } = require('../../../core/validation/validate.middleware');
const { admitPatientSchema, updateAdmissionSchema, convertOpdToIpdSchema, recommendAdmissionSchema } = require('./ipd-admission.validation');

router.post('/recommend', authenticate, validate(recommendAdmissionSchema), controller.recommendAdmission);
router.get('/pending-advice', authenticate, controller.getPendingAdmissionAdvice);
router.post('/', authenticate, validate(admitPatientSchema), controller.admitPatient);
router.post('/from-opd', authenticate, requirePermission(['BED_ALLOCATE', 'VISIT_VIEW']), validate(convertOpdToIpdSchema), controller.convertFromOpd);
router.get('/', authenticate, controller.getAdmissions);
router.get('/history', authenticate, controller.getAdmissionHistory);
router.post('/export', authenticate, controller.exportAdmissions);
router.get('/:id/case-file', authenticate, controller.getAdmissionCaseFile);
router.get('/:id', authenticate, controller.getAdmissionById);
router.patch('/:id', authenticate, validate(updateAdmissionSchema), controller.updateAdmission);

module.exports = router;
