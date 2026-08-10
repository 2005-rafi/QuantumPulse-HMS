const express = require('express');
const router = express.Router();
const pharmacyController = require('./pharmacy.controller');
const authenticate = require('../../core/middleware/authenticate');
const { requirePermission: authorize } = require('../../core/middleware/authorize');
const { PERMISSIONS } = require('../../core/constants');

// Apply authentication to all pharmacy routes
router.use(authenticate);

// Pharmacist dispenses medications for a specific visit
router.patch('/visits/:id/dispense', 
  authorize(PERMISSIONS.MEDICINE_DISPENSE),
  pharmacyController.dispenseMedications
);

module.exports = router;
