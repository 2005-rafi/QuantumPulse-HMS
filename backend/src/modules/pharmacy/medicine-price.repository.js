const MedicinePrice = require('./medicine-price.model');

class MedicinePriceRepository {
  async create(data) {
    return MedicinePrice.create(data);
  }

  async findActiveByName(medicineName) {
    const now = new Date();
    return MedicinePrice.findOne({
      medicineName: { $regex: new RegExp(`^${medicineName}$`, 'i') },
      status: 'ACTIVE',
      effectiveFrom: { $lte: now },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: now } }],
    }).lean();
  }

  async list(filters = {}, options = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$text = { $search: filters.search };
    }
    const page = options.page || 1;
    const limit = options.limit || 50;
    const [items, total] = await Promise.all([
      MedicinePrice.find(query).sort({ medicineName: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      MedicinePrice.countDocuments(query),
    ]);
    return { items, total, page, limit };
  }

  async update(id, data) {
    return MedicinePrice.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async deactivate(id, staffId) {
    return MedicinePrice.findByIdAndUpdate(
      id,
      { status: 'INACTIVE', effectiveTo: new Date() },
      { new: true }
    ).lean();
  }
}

module.exports = new MedicinePriceRepository();
