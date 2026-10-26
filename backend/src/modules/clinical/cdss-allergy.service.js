/**
 * backend/src/modules/clinical/cdss-allergy.service.js
 * Clinical Decision Support System (CDSS) - Drug-Allergy Safety Interceptor.
 * Prevents prescription and administration of contraindicated medications.
 */
const Patient = require('../patient/patient.model');
const AppError = require('../../core/errors/app-error');

// Evidence-based pharmacological allergy cross-reactivity matrix
const ALLERGY_DRUG_FAMILIES = {
  penicillin: [
    'penicillin', 'amoxicillin', 'ampicillin', 'augmentin', 'piperacillin',
    'tazobactam', 'cloxacillin', 'methicillin', 'amox', 'clav'
  ],
  cephalosporin: [
    'cephalexin', 'cefazolin', 'ceftriaxone', 'cefixime', 'cefuroxime',
    'cefotaxime', 'cefepime', 'cefpodoxime', 'cefdinir'
  ],
  sulfa: [
    'sulfa', 'sulfamethoxazole', 'bactrim', 'septra', 'sulfadiazine',
    'sulfasalazine', 'dapsone', 'cotrimoxazole'
  ],
  nsaid: [
    'aspirin', 'ibuprofen', 'naproxen', 'diclofenac', 'ketorolac',
    'indomethacin', 'meloxicam', 'celecoxib', 'etoricoxib', 'piroxicam'
  ],
  macrolide: [
    'azithromycin', 'clarithromycin', 'erythromycin', 'roxithromycin'
  ],
  fluoroquinolone: [
    'ciprofloxacin', 'levofloxacin', 'moxifloxacin', 'ofloxacin', 'norfloxacin'
  ],
  opioid: [
    'morphine', 'codeine', 'tramadol', 'fentanyl', 'oxycodone', 'pethidine'
  ],
};

class CDSSAllergyService {
  /**
   * Evaluates medication against a patient's documented allergy profile.
   * @param {string|ObjectId} patientId
   * @param {string} medicationName
   * @returns {Promise<{ hasContraindication: boolean, severity?: string, allergen?: string, message?: string }>}
   */
  async checkMedicationAllergy(patientId, medicationName) {
    if (!medicationName || !medicationName.trim()) {
      return { hasContraindication: false };
    }

    const patient = await Patient.findById(patientId).select('allergies firstName lastName mrn').lean();
    if (!patient || !patient.allergies || !patient.allergies.trim()) {
      return { hasContraindication: false };
    }

    const patientAllergies = patient.allergies.toLowerCase();
    const medNameLower = medicationName.toLowerCase().trim();

    // 1. Cross-Reactivity Drug Family Match
    for (const [familyKey, drugList] of Object.entries(ALLERGY_DRUG_FAMILIES)) {
      const patientHasFamilyAllergy = patientAllergies.includes(familyKey) ||
        drugList.some((d) => patientAllergies.includes(d));

      if (patientHasFamilyAllergy) {
        const drugMatchesFamily = drugList.some((d) => medNameLower.includes(d));
        if (drugMatchesFamily) {
          return {
            hasContraindication: true,
            severity: 'CRITICAL',
            allergen: familyKey.toUpperCase(),
            drugClass: familyKey,
            patientAllergyText: patient.allergies,
            message: `⚠️ CRITICAL DRUG-ALLERGY ALERT: Patient ${patient.firstName} ${patient.lastName} (${patient.mrn}) has documented allergy to "${patient.allergies}". Prescribed medication "${medicationName}" belongs to the contraindicated ${familyKey.toUpperCase()} family!`,
          };
        }
      }
    }

    // 2. Direct Substring Name Match
    const allergyTokens = patientAllergies.split(/[,;\n/]+/).map((t) => t.trim()).filter(Boolean);
    for (const token of allergyTokens) {
      if (token.length >= 3 && (medNameLower.includes(token) || token.includes(medNameLower))) {
        return {
          hasContraindication: true,
          severity: 'CRITICAL',
          allergen: token.toUpperCase(),
          drugClass: 'DIRECT_MATCH',
          patientAllergyText: patient.allergies,
          message: `⚠️ CRITICAL DRUG-ALLERGY ALERT: Patient has documented allergy to "${token}". Prescribed medication "${medicationName}" matches this allergen!`,
        };
      }
    }

    return { hasContraindication: false };
  }
}

module.exports = new CDSSAllergyService();
