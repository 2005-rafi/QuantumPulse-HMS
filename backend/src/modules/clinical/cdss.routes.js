const express = require('express');
const router = express.Router();
const cdssController = require('./cdss.controller');
const authenticate = require('../../core/middleware/authenticate.middleware');

router.use(authenticate);

router.get('/check-allergy', cdssController.checkAllergy);

module.exports = router;
