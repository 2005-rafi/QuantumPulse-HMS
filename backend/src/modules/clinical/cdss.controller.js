const cdssAllergyService = require('./cdss-allergy.service');
const { success } = require('../../core/responses');
const catchAsync = require('../../core/utils/catch-async');

class CDSSController {
  checkAllergy = catchAsync(async (req, res) => {
    const { patientId, medication } = req.query;
    const result = await cdssAllergyService.checkMedicationAllergy(patientId, medication);
    return success(res, result, 'CDSS allergy assessment completed', 200);
  });
}

module.exports = new CDSSController();
