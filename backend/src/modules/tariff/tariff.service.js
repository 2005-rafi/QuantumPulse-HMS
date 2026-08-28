const tariffRepository = require('./tariff.repository');
const tariffResolver = require('./tariff-resolver');
const AppError = require('../../core/errors/AppError');
const { RULE_STATUS } = require('./tariff-rule.model');

/**
 * TariffService -- CRUD + lifecycle management for ServiceMaster and TariffRule.
 *
 * SOLID:
 *   SRP -- Each method owns one tariff operation.
 *   OCP -- Adding new pricing strategies doesn't modify existing methods.
 *   DIP -- Depends on tariffRepository and tariffResolver abstractions.
 */
class TariffService {
  // -- ServiceMaster --------------------------------------------------------

  async createServiceMaster(data, adminId) {
    const exists = await tariffRepository.listServiceMasters({ category: data.category });
    const duplicate = exists.find(s => s.code === data.code.toUpperCase());
    if (duplicate) throw new AppError('BUSINESS_001', `Service code '${data.code}' already exists`);
    return tariffRepository.createServiceMaster({ ...data, code: data.code.toUpperCase(), createdBy: adminId });
  }

  async listServiceMasters(filters) {
    return tariffRepository.listServiceMasters(filters);
  }

  async updateServiceMaster(id, data) {
    const existing = await tariffRepository.getServiceMasterById(id);
    if (!existing) throw new AppError('NOT_FOUND', 'Service not found');
    return tariffRepository.updateServiceMaster(id, data);
  }

  // -- TariffRule -----------------------------------------------------------

  async createTariffRule(data, adminId) {
    // Ensure effectiveFrom is a date
    const effectiveFrom = new Date(data.effectiveFrom);
    if (isNaN(effectiveFrom)) throw new AppError('VALIDATION_001', 'effectiveFrom must be a valid date');

    const ruleData = {
      ...data,
      effectiveFrom,
      status: RULE_STATUS.DRAFT,
      createdBy: adminId,
      publishHistory: [{ action: 'DRAFTED', performedBy: adminId, performedAt: new Date() }],
    };
    return tariffRepository.createTariffRule(ruleData);
  }

  async getTariffRule(id) {
    const rule = await tariffRepository.getTariffRuleById(id);
    if (!rule) throw new AppError('NOT_FOUND', 'Tariff rule not found');
    return rule;
  }

  async listTariffRules(filters, options) {
    return tariffRepository.listTariffRules(filters, options);
  }

  async updateTariffRule(id, data, adminId) {
    const existing = await tariffRepository.getTariffRuleById(id);
    if (!existing) throw new AppError('NOT_FOUND', 'Tariff rule not found');
    if (existing.status !== RULE_STATUS.DRAFT) {
      throw new AppError('BUSINESS_002', 'Only DRAFT rules can be updated. Published rules must be superseded.');
    }
    return tariffRepository.updateTariffRule(id, data);
  }

  /**
   * Publish a DRAFT rule:
   *   1. Conflict guard -- check for overlapping PUBLISHED rules with same scope
   *   2. Supersede the previous active rule for this scope (if any)
   *   3. Transition status DRAFT -> PUBLISHED
   */
  async publishTariffRule(id, adminId, reason = '') {
    const rule = await tariffRepository.getTariffRuleById(id);
    if (!rule) throw new AppError('NOT_FOUND', 'Tariff rule not found');
    if (rule.status !== RULE_STATUS.DRAFT) {
      throw new AppError('BUSINESS_002', `Cannot publish rule in status: ${rule.status}`);
    }

    // Conflict check
    const conflicts = await tariffRepository.findConflictingRules(
      rule.category,
      rule.scope || {},
      rule.effectiveFrom,
      rule.effectiveTo,
      rule._id.toString()
    );

    if (conflicts.length > 0) {
      // Supersede existing rules -- set effectiveTo = effectiveFrom - 1 day
      const supersedeBefore = new Date(rule.effectiveFrom);
      supersedeBefore.setDate(supersedeBefore.getDate() - 1);

      for (const conflict of conflicts) {
        await tariffRepository.updateTariffRule(conflict._id, {
          status: RULE_STATUS.SUPERSEDED,
          effectiveTo: supersedeBefore,
          $push: {
            publishHistory: {
              action: 'SUPERSEDED',
              performedBy: adminId,
              performedAt: new Date(),
              reason: `Superseded by new rule ${id}`,
              prevAmount: conflict.amount,
            },
          },
        });
      }
    }

    // Publish the new rule
    return tariffRepository.updateTariffRule(id, {
      status: RULE_STATUS.PUBLISHED,
      $push: {
        publishHistory: {
          action: 'PUBLISHED',
          performedBy: adminId,
          performedAt: new Date(),
          reason: reason || 'Published by admin',
        },
      },
    });
  }

  async cancelTariffRule(id, adminId, reason = '') {
    const rule = await tariffRepository.getTariffRuleById(id);
    if (!rule) throw new AppError('NOT_FOUND', 'Tariff rule not found');
    if (rule.status === RULE_STATUS.CANCELLED) {
      throw new AppError('BUSINESS_002', 'Rule is already cancelled');
    }
    return tariffRepository.updateTariffRule(id, {
      status: RULE_STATUS.CANCELLED,
      effectiveTo: new Date(),
      $push: {
        publishHistory: {
          action: 'CANCELLED',
          performedBy: adminId,
          performedAt: new Date(),
          reason: reason || 'Cancelled by admin',
        },
      },
    });
  }

  async previewImpact(id) {
    const rule = await tariffRepository.getTariffRuleById(id);
    if (!rule) throw new AppError('NOT_FOUND', 'Tariff rule not found');
    return tariffResolver.previewImpact(rule);
  }

  async resolvePrice(context) {
    return tariffResolver.resolve(context);
  }

  /**
   * Bulk update all PUBLISHED rules for a department by applying a delta amount.
   * Creates new DRAFT rules superseding the existing ones.
   */
  async bulkUpdateByDepartment(departmentId, deltaAmount, reason, adminId) {
    const { items } = await tariffRepository.listTariffRules({
      'scope.departmentId': departmentId,
      status: RULE_STATUS.PUBLISHED,
    });

    const results = [];
    for (const rule of items) {
      const newAmount = Math.max(0, rule.amount + deltaAmount);
      const newRule = await this.createTariffRule({
        serviceMasterId: rule.serviceMasterId,
        testCode: rule.testCode,
        category: rule.category,
        scope: rule.scope,
        amount: newAmount,
        unit: rule.unit,
        effectiveFrom: new Date(),
      }, adminId);
      const published = await this.publishTariffRule(newRule._id.toString(), adminId, reason);
      results.push(published);
    }
    return results;
  }
}

module.exports = new TariffService();
