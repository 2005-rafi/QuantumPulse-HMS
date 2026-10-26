/**
 * backend/src/modules/search/omnisearch.routes.js
 */
const express = require('express');
const router = express.Router();
const omnisearchController = require('./omnisearch.controller');
const authenticate = require('../../core/middleware/authenticate.middleware');

router.use(authenticate);

router.get('/', omnisearchController.search);

module.exports = router;
