const ServiceMaster = require('./service-master.model');
const TariffRule = require('./tariff-rule.model');

class TariffRepository {
  // -- ServiceMaster --------------------------------------------------------
  async createServiceMaster(data) {
    return await ServiceMaster.create(data);
  }

  async listServiceMasters(filters = {}) {
    const query = {};
    if (filters.category) query.category = filters.category;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    return await ServiceMaster.find(query).sort({ category: 1, name: 1 }).lean();
  }

  async getServiceMasterById(id) {
    return await ServiceMaster.findById(id).lean();
  }

  async updateServiceMaster(id, data) {
    return await ServiceMaster.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  // -- TariffRule -----------------------------------------------------------
  async createTariffRule(data) {
    return await TariffRule.create(data);
  }

  async getTariffRuleById(id) {
    return await TariffRule.findById(id)
      .populate('serviceMasterId', 'code name category')
      .populate('scope.departmentId', 'name code')
      .populate('scope.staffId', 'fullName position')
      .populate('createdBy', 'fullName')
      .lean();
  }

  async listTariffRules(filters = {}, options = {}) {
    const query = {};
    if (filters.category) query.category = filters.category;
    if (filters.status) query.status = filters.status;
    if (filters.departmentId) query['scope.departmentId'] = filters.departmentId;
    if (filters.tariffGrade) query['scope.tariffGrade'] = filters.tariffGrade;
    if (filters.testCode) query.testCode = filters.testCode;

    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      TariffRule.find(query)
        .populate('serviceMasterId', 'code name category')
        .populate('scope.departmentId', 'name code')
        .sort({ category: 1, status: 1, effectiveFrom: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TariffRule.countDocuments(query),
    ]);

    return { items, total, page, limit };
  }

  async updateTariffRule(id, data, options = {}) {
    return await TariffRule.findByIdAndUpdate(id, data, { new: true, ...options }).lean();
  }

  /**
   * Find PUBLISHED tariff rules matching a given scope.
   * Returns all matches -- resolver picks the most specific one.
   */
  async findPublishedRulesForCategory(category, nowDate = new Date()) {
    return await TariffRule.find({
      category,
      status: 'PUBLISHED',
      effectiveFrom: { $lte: nowDate },
      $or: [
        { effectiveTo: null },
        { effectiveTo: { $gte: nowDate } },
      ],
    }).lean();
  }

  /**
   * Find conflicting PUBLISHED rules for the same scope + category + effective period.
   * Used in conflict guard before PUBLISH transition.
   */
  async findConflictingRules(category, scope, effectiveFrom, effectiveTo, excludeId = null) {
    const query = {
      category,
      status: 'PUBLISHED',
      'scope.departmentId': scope.departmentId || null,
      'scope.tariffGrade': scope.tariffGrade || null,
      'scope.staffId': scope.staffId || null,
      'scope.visitType': scope.visitType || null,
      // Date overlap check: existingFrom <= newTo (or newTo is null) AND existingTo >= newFrom (or existingTo is null)
      $and: [
        { $or: [{ effectiveTo: null }, { effectiveTo: { $gte: effectiveFrom } }] },
        { $or: [{ effectiveTo: null }, !effectiveTo ? {} : { effectiveFrom: { $lte: effectiveTo } }] },
      ],
    };
    if (excludeId) query._id = { $ne: excludeId };
    return await TariffRule.find(query).lean();
  }

  async findRulesByServiceMaster(serviceMasterId) {
    return await TariffRule.find({ serviceMasterId }).sort({ status: 1, effectiveFrom: -1 }).lean();
  }
}

module.exports = new TariffRepository();
