/**
 * modules/ipd/ipd.routes.js
 * Master Router for Quantum CareOne Inpatient Department (IPD) Module.
 */
const express = require('express');
const router = express.Router();

const bedRoutes = require('./beds/bed.routes');
const admissionRoutes = require('./admission/ipd-admission.routes');
const nursingRoutes = require('./nursing/nursing.routes');
const cpoeRoutes = require('./cpoe/cpoe.routes');
const otRoutes = require('./ot/ot.routes');
const billingRoutes = require('./billing/ipd-billing.routes');
const dischargeRoutes = require('./discharge/discharge.routes');

// Submodule router attachments
router.use('/beds', bedRoutes);
router.use('/admissions', admissionRoutes);
router.use('/nursing', nursingRoutes);
router.use('/cpoe', cpoeRoutes);
router.use('/ot', otRoutes);
router.use('/billing', billingRoutes);
router.use('/discharge', dischargeRoutes);

module.exports = router;
