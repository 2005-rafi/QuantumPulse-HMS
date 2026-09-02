const TariffRule = require('./tariff-rule.model');
const config = require('../../core/config');

/**
 * TariffResolver -- Single authority for price resolution.
 * Implements 8-level hierarchical resolution (most specific wins).
 *
 * Resolution Priority:
 *   P1: staffId + departmentId + tariffGrade + visitType + appointmentType
 *   P2: staffId + departmentId + tariffGrade
 *   P3: staffId + departmentId
 *   P4: staffId (doctor exception)
 *   P5: departmentId + tariffGrade
 *   P6: departmentId
 *   P7: tariffGrade (global for this grade)
 *   P8: category only (global fallback)
 */
class TariffResolver {
  /**
   * Resolve the tariff price for a given context.
   * @param {object} context
   * @param {string} context.category - Service category (REGISTRATION, CONSULTATION, DIAGNOSTICS, etc.)
   * @param {string} [context.testCode] - For DIAGNOSTICS: stable lab test code (e.g. 'CBC')
   * @param {string} [context.serviceMasterId] - For other categories: ServiceMaster _id
   * @param {string} [context.departmentId] - Department ObjectId
   * @param {string} [context.tariffGrade] - GRADE_1..GRADE_5
   * @param {string} [context.staffId] - Doctor/Staff ObjectId (for exception overrides)
   * @param {string} [context.visitType] - OPD, EMERGENCY
   * @param {string} [context.appointmentType] - WALK_IN, FOLLOW_UP, SCHEDULED
   * @returns {Promise<{amount: number, ruleId: string, explanation: string, resolvedScope: object}>}
   */
  async resolve(context) {
    const {
      category,
      testCode,
      serviceMasterId,
      departmentId,
      tariffGrade,
      staffId,
      visitType,
      appointmentType,
      wardClass,
      floorId,
      comfortTier,
      sharingType,
      bedFeature,
    } = context;

    const now = new Date();

    // Fetch all PUBLISHED rules for this category (and testCode if DIAGNOSTICS)
    const baseQuery = {
      category,
      status: 'PUBLISHED',
      effectiveFrom: { $lte: now },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: now } }],
    };
    if (testCode) baseQuery.testCode = testCode;
    if (serviceMasterId && category !== 'DIAGNOSTICS') {
      baseQuery.$or = [
        ...(baseQuery.$or || []),
        { serviceMasterId: serviceMasterId },
      ];
    }

    const rules = await TariffRule.find(baseQuery).lean();

    if (!rules || rules.length === 0) {
      throw new Error(`No published tariff rule found for category: ${category}${testCode ? ` / testCode: ${testCode}` : ''}`);
    }

    // Score each rule by specificity -- higher score = more specific = wins
    const scored = rules.map(rule => ({
      rule,
      score: this._scoreRule(rule, {
        departmentId,
        tariffGrade,
        staffId,
        visitType,
        appointmentType,
        wardClass,
        floorId,
        comfortTier,
        sharingType,
        bedFeature,
      }),
    }));

    // Sort by score descending -- highest specificity wins
    scored.sort((a, b) => b.score - a.score);
    const winner = scored[0];

    const explanation = this._buildExplanation(winner.rule, winner.score);
    const scope = winner.rule.scope || {};

    const dailyRate = winner.rule.amount;
    const hourlyRate = scope.hourlyRate != null && scope.hourlyRate > 0
      ? scope.hourlyRate
      : Math.round(dailyRate / 24);

    return {
      amount: dailyRate,
      dailyRate,
      hourlyRate,
      minAdvanceDeposit: scope.minAdvanceDeposit || 0,
      gracePeriodMinutes: scope.gracePeriodMinutes || 60,
      unit: winner.rule.unit || 'PER_VISIT',
      ruleId: winner.rule._id,
      explanation,
      resolvedScope: winner.rule.scope,
      category: winner.rule.category,
    };
  }

  /**
   * Score a rule against a given context.
   * Each matched specific field adds weight.
   * No-match on a constrained field (rule has constraint, context has different value) returns -Infinity.
   */
  _scoreRule(rule, context) {
    const s = rule.scope || {};
    let score = 0;

    // Check each scope field: if rule has a constraint and it doesn't match -- disqualify
    if (s.floorId) {
      if (!context.floorId || String(s.floorId) !== String(context.floorId)) return -Infinity;
      score += 10;
    }
    if (s.comfortTier) {
      if (!context.comfortTier || s.comfortTier !== context.comfortTier) return -Infinity;
      score += 8;
    }
    if (s.sharingType) {
      if (!context.sharingType || s.sharingType !== context.sharingType) return -Infinity;
      score += 6;
    }
    if (s.wardClass) {
      if (!context.wardClass || s.wardClass !== context.wardClass) return -Infinity;
      score += 6;
    }
    if (s.bedFeature) {
      if (!context.bedFeature || s.bedFeature !== context.bedFeature) return -Infinity;
      score += 4;
    }
    if (s.departmentId) {
      if (!context.departmentId || String(s.departmentId) !== String(context.departmentId)) return -Infinity;
      score += 8;
    }
    if (s.tariffGrade) {
      if (!context.tariffGrade || s.tariffGrade !== context.tariffGrade) return -Infinity;
      score += 4;
    }
    if (s.staffId) {
      if (!context.staffId || String(s.staffId) !== String(context.staffId)) return -Infinity;
      score += 16; // Staff-specific override is highest priority
    }
    if (s.visitType) {
      if (!context.visitType || s.visitType !== context.visitType) return -Infinity;
      score += 2;
    }
    if (s.appointmentType) {
      if (!context.appointmentType || s.appointmentType !== context.appointmentType) return -Infinity;
      score += 1;
    }

    return score;
  }

  _buildExplanation(rule, score) {
    const parts = [];
    const s = rule.scope || {};
    if (s.floorId) parts.push(`Floor specific`);
    if (s.comfortTier) parts.push(`tier: ${s.comfortTier}`);
    if (s.sharingType) parts.push(`sharing: ${s.sharingType}`);
    if (s.wardClass) parts.push(`ward: ${s.wardClass}`);
    if (s.bedFeature) parts.push(`feature: ${s.bedFeature}`);
    if (s.staffId) parts.push(`Doctor override`);
    if (s.departmentId) parts.push(`dept: ${rule.scope.departmentId}`);
    if (s.tariffGrade) parts.push(`grade: ${s.tariffGrade}`);
    if (s.visitType) parts.push(`visit: ${s.visitType}`);
    if (s.appointmentType) parts.push(`appt: ${s.appointmentType}`);
    if (parts.length === 0) parts.push('Global default');
    return `Rs.${rule.amount} -- ${parts.join(' + ')} (${rule.category})`;
  }

  /**
   * Preview impact: estimate how many visits in the past 30 days
   * would be affected by a new rule (same scope).
   */
  async previewImpact(newRuleData) {
    const Visit = require('../visits/visit.model');
    const lookbackDays = config.tariff?.lookbackWindowDays || 30;
    const lookbackAgo = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const query = { createdAt: { $gte: lookbackAgo }, status: { $ne: 'CANCELLED' } };
    if (newRuleData.scope && newRuleData.scope.departmentId) {
      query.departmentId = newRuleData.scope.departmentId;
    }
    const count = await Visit.countDocuments(query);
    return { affectedVisitsEstimate: count, period: `${lookbackDays} days` };
  }
}

module.exports = new TariffResolver();
