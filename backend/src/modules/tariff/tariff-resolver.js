const TariffRule = require('./tariff-rule.model');

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
      score: this._scoreRule(rule, { departmentId, tariffGrade, staffId, visitType, appointmentType }),
    }));

    // Sort by score descending -- highest specificity wins
    scored.sort((a, b) => b.score - a.score);
    const winner = scored[0];

    const explanation = this._buildExplanation(winner.rule, winner.score);

    return {
      amount: winner.rule.amount,
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
    if (s.wardClass) {
      if (!context.wardClass || s.wardClass !== context.wardClass) return -Infinity;
      score += 6;
    }
    if (s.bedFeature) {
      if (!context.bedFeature || s.bedFeature !== context.bedFeature) return -Infinity;
      score += 3;
    }

    return score;
  }

  _buildExplanation(rule, score) {
    const parts = [];
    const s = rule.scope || {};
    if (s.staffId) parts.push(`Doctor override`);
    if (s.departmentId) parts.push(`dept: ${rule.scope.departmentId}`);
    if (s.wardClass) parts.push(`ward: ${s.wardClass}`);
    if (s.bedFeature) parts.push(`feature: ${s.bedFeature}`);
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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const query = { createdAt: { $gte: thirtyDaysAgo }, status: { $ne: 'CANCELLED' } };
    if (newRuleData.scope && newRuleData.scope.departmentId) {
      query.departmentId = newRuleData.scope.departmentId;
    }
    const count = await Visit.countDocuments(query);
    return { affectedVisitsEstimate: count, period: '30 days' };
  }
}

module.exports = new TariffResolver();
