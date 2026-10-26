const TariffRule = require('./tariff-rule.model');
const config = require('../../core/config');
require('../administration/department.model');
require('../staff/staff.model');

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

    let rules = await TariffRule.find(baseQuery)
      .populate('scope.departmentId', 'name code')
      .populate('scope.staffId', 'fullName title position')
      .lean();

    // Fallback 1: If testCode-specific query yielded no rule, look for category general rule
    if ((!rules || rules.length === 0) && testCode) {
      const generalQuery = { ...baseQuery };
      delete generalQuery.testCode;
      rules = await TariffRule.find(generalQuery)
        .populate('scope.departmentId', 'name code')
        .populate('scope.staffId', 'fullName title position')
        .lean();
    }

    // Fallback 2: Safe institutional fallback rate if no tariff rule is configured yet
    if (!rules || rules.length === 0) {
      let fallbackAmount = 250;
      if (category === 'REGISTRATION') {
        fallbackAmount = visitType === 'IPD' ? 500 : (visitType === 'EMERGENCY' ? 250 : 100);
      } else if (category === 'CONSULTATION') {
        fallbackAmount = visitType === 'IPD' ? 600 : (visitType === 'EMERGENCY' ? 500 : 300);
      } else if (category === 'BED_CHARGES') {
        const isCritical = /ICU|CCU|NICU|PICU|HDU/i.test(wardClass || '');
        const isDeluxe = /DELUXE|SUITE|PRIVATE/i.test(wardClass || '') || comfortTier === 'DELUXE';
        fallbackAmount = isCritical ? 6500 : (isDeluxe ? 3500 : 1500);
      } else if (category === 'DIAGNOSTICS') {
        fallbackAmount = 250;
      } else if (category === 'PROCEDURE') {
        fallbackAmount = 500;
      } else if (category === 'PACKAGE') {
        fallbackAmount = 5000;
      }

      const hourlyRate = Math.round(fallbackAmount / 24);
      const minAdvanceDeposit = category === 'BED_CHARGES'
        ? (/ICU|CCU|HDU/i.test(wardClass || '') ? 25000 : 10000)
        : 0;

      const humanCategory = category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      const visitLabel = visitType === 'IPD' ? 'Inpatient (IPD)' : (visitType === 'EMERGENCY' ? 'Emergency' : 'Outpatient (OPD)');

      return {
        amount: fallbackAmount,
        ruleId: null,
        explanation: `Standard ${visitLabel} ${humanCategory} Rate`,
        instructionNote: `Default institutional tariff applied according to hospital service catalog.`,
        policyBadge: 'Master Tariff',
        policyType: 'GLOBAL_CATALOG',
        auditTrace: `Fallback [${category} | ${visitType || 'GENERAL'}]`,
        resolvedScope: { visitType, wardClass, comfortTier, departmentId, tariffGrade },
        dailyRate: fallbackAmount,
        hourlyRate,
        minAdvanceDeposit,
        gracePeriodMinutes: 60,
        unit: category === 'BED_CHARGES' ? 'PER_DAY' : (category === 'DIAGNOSTICS' ? 'PER_TEST' : 'PER_VISIT'),
        category,
        isFree: fallbackAmount === 0,
      };
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
    const scope = winner.rule.scope || {};
    const dailyRate = winner.rule.amount;
    const hourlyRate = scope.hourlyRate != null && scope.hourlyRate > 0
      ? scope.hourlyRate
      : Math.round(dailyRate / 24);

    const isFree = Number(dailyRate) === 0;
    const explanation = this._buildExplanation(winner.rule, isFree);
    const instructionNote = this._buildInstructionNote(winner.rule, isFree);
    const policyBadge = this._buildPolicyBadge(winner.rule, isFree);
    const auditTrace = this._buildAuditTrace(winner.rule, winner.score);

    return {
      amount: dailyRate,
      dailyRate,
      hourlyRate,
      minAdvanceDeposit: scope.minAdvanceDeposit || 0,
      gracePeriodMinutes: scope.gracePeriodMinutes || 60,
      unit: winner.rule.unit || 'PER_VISIT',
      ruleId: winner.rule._id,
      ruleNumber: winner.rule.ruleNumber || null,
      ruleName: winner.rule.name || null,
      inclusions: winner.rule.inclusions || null,
      explanation,
      instructionNote,
      policyBadge,
      policyType: winner.rule.scope?.staffId ? 'DOCTOR_OVERRIDE' : (winner.rule.scope?.departmentId ? 'DEPARTMENT_RULE' : 'GLOBAL_CATALOG'),
      auditTrace,
      isFree,
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
      const ruleFloor = s.floorId?._id || s.floorId;
      if (!context.floorId || String(ruleFloor) !== String(context.floorId)) return -Infinity;
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
      const ruleDept = s.departmentId?._id || s.departmentId;
      if (!context.departmentId || String(ruleDept) !== String(context.departmentId)) return -Infinity;
      score += 8;
    }
    if (s.tariffGrade) {
      if (!context.tariffGrade || s.tariffGrade !== context.tariffGrade) return -Infinity;
      score += 4;
    }
    if (s.staffId) {
      const ruleStaff = s.staffId?._id || s.staffId;
      if (!context.staffId || String(ruleStaff) !== String(context.staffId)) return -Infinity;
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

  _buildExplanation(rule, isFree) {
    const s = rule.scope || {};
    const cat = rule.category;
    const deptName = s.departmentId?.name || (typeof s.departmentId === 'string' ? '' : '');
    const doctorName = s.staffId?.fullName ? String(s.staffId.fullName).replace(/^((dr|doctor)\.?\s*)+/i, '').trim() : '';
    const visitTypeStr = s.visitType === 'IPD' ? 'Inpatient (IPD)' : (s.visitType === 'EMERGENCY' ? 'Emergency' : (s.visitType === 'OPD' ? 'Outpatient (OPD)' : ''));

    if (isFree) {
      if (cat === 'CONSULTATION') return doctorName ? `Complimentary Assessment · Dr. ${doctorName}` : (deptName ? `${deptName} · Complimentary Consultation` : 'Complimentary Clinical Consultation');
      if (cat === 'REGISTRATION') return `${visitTypeStr ? `${visitTypeStr} · ` : ''}Zero-Rated Check-in`;
      return 'Complimentary / Waived Service Rate';
    }

    if (cat === 'REGISTRATION') {
      if (deptName) return `${deptName} · ${visitTypeStr || 'Standard'} Registration`;
      if (visitTypeStr) return `${visitTypeStr} Standard Registration`;
      return 'Standard Institutional Registration Fee';
    }

    if (cat === 'CONSULTATION') {
      if (doctorName) return `Specialist Consultation · Dr. ${doctorName}`;
      if (deptName) return `${deptName} · Clinical Consultation`;
      if (s.tariffGrade) return `Consultant Tariff (${s.tariffGrade.replace(/_/g, ' ')})`;
      return 'Standard Outpatient Consultation Fee';
    }

    if (cat === 'BED_CHARGES') {
      const wardName = s.wardClass ? s.wardClass.replace(/_/g, ' ') : 'General Ward';
      const tierName = s.comfortTier ? ` · ${s.comfortTier.replace(/_/g, ' ')}` : '';
      return `${wardName}${tierName} Inpatient Bed Tariff`;
    }

    return rule.name || `Standard ${cat.replace(/_/g, ' ')} Tariff`;
  }

  _buildInstructionNote(rule, isFree) {
    const s = rule.scope || {};
    if (isFree) {
      return 'Complimentary assessment covered under current hospital clinical care policy.';
    }
    if (s.staffId) {
      return 'Specialist tariff applied based on attending doctor consultation schedule.';
    }
    if (s.departmentId) {
      return 'Departmental rate applied based on clinical specialty and visit type.';
    }
    if (s.wardClass || s.comfortTier) {
      return 'Inpatient bed tariff billed per 24-hr cycle with 60-minute discharge grace period.';
    }
    return 'Authoritative rate resolved from active hospital master tariff schedule.';
  }

  _buildPolicyBadge(rule, isFree) {
    const s = rule.scope || {};
    if (isFree) return 'Complimentary (₹0)';
    if (s.staffId) return 'Specialist Override';
    if (s.departmentId) return 'Department Policy';
    if (s.wardClass || s.comfortTier) return 'Ward Standard';
    return 'Master Tariff';
  }

  _buildAuditTrace(rule, score) {
    const parts = [];
    const s = rule.scope || {};
    if (s.floorId) parts.push('Floor');
    if (s.comfortTier) parts.push(`tier:${s.comfortTier}`);
    if (s.sharingType) parts.push(`share:${s.sharingType}`);
    if (s.wardClass) parts.push(`ward:${s.wardClass}`);
    if (s.staffId) parts.push(`staff:${s.staffId?._id || s.staffId}`);
    if (s.departmentId) parts.push(`dept:${s.departmentId?._id || s.departmentId}`);
    if (s.tariffGrade) parts.push(`grade:${s.tariffGrade}`);
    if (s.visitType) parts.push(`visit:${s.visitType}`);
    if (s.appointmentType) parts.push(`appt:${s.appointmentType}`);
    if (parts.length === 0) parts.push('Global');
    return `Rule #${rule.ruleNumber || rule._id} [₹${rule.amount} | ${parts.join('+')}]`;
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
