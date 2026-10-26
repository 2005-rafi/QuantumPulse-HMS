/**
 * backend/src/modules/search/omnisearch.controller.js
 */
const omnisearchService = require('./omnisearch.service');
const { success } = require('../../core/responses');
const catchAsync = require('../../core/utils/catch-async');

class OmnisearchController {
  search = catchAsync(async (req, res) => {
    const { q, limit, category, doctorId, departmentId, dateFrom, dateTo } = req.query;
    const parsedLimit = parseInt(limit, 10) || 5;

    const results = await omnisearchService.search(q, {
      limit: parsedLimit,
      category,
      doctorId,
      departmentId,
      dateFrom,
      dateTo,
    });

    return success(res, results, 'Omnisearch results retrieved successfully', 200);
  });
}

module.exports = new OmnisearchController();
