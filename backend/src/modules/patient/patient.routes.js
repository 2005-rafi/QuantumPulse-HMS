const express = require('express');
const controller = require('./patient.controller');
const deletionController = require('./deletionRequest.controller');
const { validate } = require('../../core/validation/validate');
const { createPatientSchema, updatePatientSchema, addHistorySchema, createPatientWithVisitSchema } = require('./patient.validation');
const authenticate = require('../../core/middleware/authenticate');
const { requirePermission } = require('../../core/middleware/authorize');
const { PERMISSIONS } = require('../../core/constants');

const router = express.Router();

router.use(authenticate);

router.post('/check-duplicates', requirePermission(PERMISSIONS.PATIENT_REGISTER), controller.checkDuplicates);
router.post('/register-with-visit', requirePermission(PERMISSIONS.PATIENT_REGISTER), validate(createPatientWithVisitSchema), controller.registerWithVisit);
router.post('/', requirePermission(PERMISSIONS.PATIENT_REGISTER), validate(createPatientSchema), controller.create);
router.get('/', requirePermission(PERMISSIONS.PATIENT_VIEW), controller.search);
router.get('/deletion-requests/pending', requirePermission(PERMISSIONS.APPROVE_DELETION), deletionController.getPendingRequests);
router.get('/mrn/:mrn', requirePermission(PERMISSIONS.PATIENT_VIEW), controller.getByMrn);
router.get('/:id', requirePermission(PERMISSIONS.PATIENT_VIEW), controller.getById);
router.put('/:id', requirePermission(PERMISSIONS.PATIENT_UPDATE), validate(updatePatientSchema), controller.update);
router.post('/:id/history', requirePermission(PERMISSIONS.NOTE_UPDATE), validate(addHistorySchema), controller.addHistory);

// Deletion Requests
router.post('/:id/deletion-requests', requirePermission(PERMISSIONS.PATIENT_DELETE), deletionController.requestDeletion);
router.patch('/deletion-requests/:id/approve', requirePermission(PERMISSIONS.APPROVE_DELETION), deletionController.approveDeletion);
router.patch('/deletion-requests/:id/reject', requirePermission(PERMISSIONS.APPROVE_DELETION), deletionController.rejectDeletion);

module.exports = router;
