const mongoose = require('mongoose');
const PharmacyItem = require('./models/pharmacy-item.model');
const PharmacyBatch = require('./models/pharmacy-batch.model');
const StockLedger = require('./models/stock-ledger.model');
const AppError = require('../../core/errors/app-error');
const { withTransaction } = require('../../core/database/transaction');

class PharmacyInventoryService {
  /**
   * Generates sequential item code: MED-00001, MED-00002...
   */
  async generateItemCode() {
    const count = await PharmacyItem.countDocuments();
    return `MED-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * Create a new medicine in the hospital formulary catalogue
   */
  async createItem(data, staffId) {
    const itemCode = data.itemCode || (await this.generateItemCode());

    const existing = await PharmacyItem.findOne({
      $or: [{ itemCode }, { brandName: data.brandName.trim() }],
    }).lean();

    if (existing) {
      if (existing.itemCode === itemCode) {
        throw new AppError('CONFLICT', `Medicine code ${itemCode} already exists`);
      }
      throw new AppError('CONFLICT', `Medicine "${data.brandName}" is already catalogued`);
    }

    const item = await PharmacyItem.create({
      itemCode,
      brandName: data.brandName.trim(),
      genericName: data.genericName.trim(),
      category: data.category || 'TABLET',
      strength: data.strength || '',
      dosageForm: data.dosageForm || 'Oral',
      manufacturer: data.manufacturer || '',
      hsnCode: data.hsnCode || '3004',
      gstRate: data.gstRate !== undefined ? Number(data.gstRate) : 12,
      unitPrice: Number(data.unitPrice) || 0,
      reorderThreshold: data.reorderThreshold !== undefined ? Number(data.reorderThreshold) : 50,
      currentStock: 0,
      status: 'ACTIVE',
      createdBy: staffId,
    });

    return item;
  }

  /**
   * List catalogue items with optional query, category, and low stock filters
   */
  async listItems(filters = {}, pagination = {}) {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    } else {
      query.status = 'ACTIVE';
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.lowStock === true || filters.lowStock === 'true') {
      query.$expr = { $lte: ['$currentStock', '$reorderThreshold'] };
    }

    if (filters.search) {
      const q = filters.search.trim();
      query.$or = [
        { brandName: { $regex: q, $options: 'i' } },
        { genericName: { $regex: q, $options: 'i' } },
        { itemCode: { $regex: q, $options: 'i' } },
      ];
    }

    const page = Math.max(1, parseInt(pagination.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const [items, totalCount] = await Promise.all([
      PharmacyItem.find(query)
        .sort({ brandName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PharmacyItem.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }

  /**
   * Receive vendor stock batch (Goods Receipt Note - GRN)
   */
  async receiveStock(data, staffId) {
    return withTransaction(async (session) => {
      const item = await PharmacyItem.findById(data.itemId).session(session);
      if (!item) {
        throw new AppError('NOT_FOUND', 'Pharmacy item not found');
      }

      const batchNumber = data.batchNumber.trim().toUpperCase();
      const existingBatch = await PharmacyBatch.findOne({
        itemId: item._id,
        batchNumber,
      }).session(session);

      if (existingBatch) {
        throw new AppError('CONFLICT', `Batch "${batchNumber}" already exists for this medicine`);
      }

      const expiryDate = new Date(data.expiryDate);
      if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        throw new AppError('VALIDATION_003', 'Batch expiry date must be a valid future date');
      }

      const receivedQty = Number(data.quantity);
      if (!receivedQty || receivedQty <= 0) {
        throw new AppError('VALIDATION_003', 'Received quantity must be greater than zero');
      }

      const unitSalePrice = Number(data.salePrice) || item.unitPrice;
      const mrp = Number(data.mrp) || unitSalePrice;
      const purchaseCost = Number(data.purchaseCost) || 0;

      // 1. Create Batch
      const batch = await PharmacyBatch.create(
        [
          {
            itemId: item._id,
            batchNumber,
            purchaseCost,
            mrp,
            salePrice: unitSalePrice,
            manufactureDate: data.manufactureDate ? new Date(data.manufactureDate) : null,
            expiryDate,
            initialQuantity: receivedQty,
            availableQuantity: receivedQty,
            supplierName: data.supplierName || '',
            invoiceNumber: data.invoiceNumber || '',
            status: 'ACTIVE',
            receivedBy: staffId,
          },
        ],
        { session }
      );

      const createdBatch = batch[0];

      // 2. Increment Item Stock
      item.currentStock += receivedQty;
      await item.save({ session });

      // 3. Write Immutable Movement Ledger
      await StockLedger.create(
        [
          {
            transactionType: 'RECEIPT_GRN',
            itemId: item._id,
            batchId: createdBatch._id,
            quantityDelta: receivedQty,
            resultingBalance: createdBatch.availableQuantity,
            referenceId: data.invoiceNumber || `GRN-${Date.now()}`,
            referenceType: 'PURCHASE_ORDER',
            reason: `Stock receipt from ${data.supplierName || 'Vendor'}`,
            recordedBy: staffId,
          },
        ],
        { session }
      );

      return {
        batch: createdBatch,
        itemCurrentStock: item.currentStock,
      };
    });
  }

  /**
   * Allocate stock using First-Expired-First-Out (FEFO) discipline.
   * Executed within an ACID transaction session during medication dispensation.
   */
  async allocateFefoStock(itemId, requestedQty, context = {}, session = null) {
    const item = await PharmacyItem.findById(itemId).session(session);
    if (!item) {
      throw new AppError('NOT_FOUND', 'Pharmacy item not found');
    }

    if (item.currentStock < requestedQty) {
      throw new AppError(
        'BUSINESS_001',
        `Insufficient inventory for "${item.brandName}". Available: ${item.currentStock}, Requested: ${requestedQty}`
      );
    }

    // Query active, non-expired batches sorted by earliest expiration date (FEFO)
    const batches = await PharmacyBatch.find({
      itemId: item._id,
      status: 'ACTIVE',
      availableQuantity: { $gt: 0 },
      expiryDate: { $gt: new Date() },
    })
      .sort({ expiryDate: 1 })
      .session(session);

    let remainingToAllocate = requestedQty;
    const allocations = [];

    for (const batch of batches) {
      if (remainingToAllocate <= 0) break;

      const takeQty = Math.min(batch.availableQuantity, remainingToAllocate);
      batch.availableQuantity -= takeQty;

      if (batch.availableQuantity === 0) {
        batch.status = 'DEPLETED';
      }

      await batch.save({ session });

      // Record in immutable stock ledger
      await StockLedger.create(
        [
          {
            transactionType: context.transactionType || 'DISPENSE_OPD',
            itemId: item._id,
            batchId: batch._id,
            quantityDelta: -takeQty,
            resultingBalance: batch.availableQuantity,
            referenceId: context.referenceId || '',
            referenceType: context.referenceType || 'VISIT',
            reason: context.reason || 'Patient Medication Dispense',
            recordedBy: context.staffId,
          },
        ],
        { session }
      );

      allocations.push({
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        allocatedQuantity: takeQty,
        unitPrice: batch.salePrice,
        lineTotal: takeQty * batch.salePrice,
      });

      remainingToAllocate -= takeQty;
    }

    if (remainingToAllocate > 0) {
      throw new AppError(
        'BUSINESS_001',
        `Insufficient non-expired batches for "${item.brandName}". Short by ${remainingToAllocate} units.`
      );
    }

    // Deduct aggregated stock from item
    item.currentStock -= requestedQty;
    await item.save({ session });

    return {
      item,
      allocations,
      remainingItemStock: item.currentStock,
    };
  }

  /**
   * Get Active Batches for a specific medicine (for inspection/dispense selection)
   */
  async getItemBatches(itemId) {
    return PharmacyBatch.find({
      itemId,
      availableQuantity: { $gt: 0 },
      status: 'ACTIVE',
    })
      .sort({ expiryDate: 1 })
      .lean();
  }

  /**
   * Overview dashboard telemetry (SKU count, stock value, reorder alerts, expiries)
   */
  async getInventorySummary() {
    const [totalItems, lowStockCount, expiringBatches, allBatches] = await Promise.all([
      PharmacyItem.countDocuments({ status: 'ACTIVE' }),
      PharmacyItem.countDocuments({
        status: 'ACTIVE',
        $expr: { $lte: ['$currentStock', '$reorderThreshold'] },
      }),
      PharmacyBatch.countDocuments({
        status: 'ACTIVE',
        availableQuantity: { $gt: 0 },
        expiryDate: {
          $gt: new Date(),
          $lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Next 60 days
        },
      }),
      PharmacyBatch.find({ status: 'ACTIVE', availableQuantity: { $gt: 0 } }).select('availableQuantity salePrice').lean(),
    ]);

    const totalStockUnits = allBatches.reduce((acc, b) => acc + (b.availableQuantity || 0), 0);
    const totalInventoryValue = allBatches.reduce(
      (acc, b) => acc + (b.availableQuantity || 0) * (b.salePrice || 0),
      0
    );

    return {
      totalItems,
      totalStockUnits,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      lowStockAlerts: lowStockCount,
      expiringIn60Days: expiringBatches,
    };
  }

  /**
   * Audit trail of all stock ledger movements
   */
  async getStockLedger(filters = {}, pagination = {}) {
    const query = {};
    if (filters.itemId) query.itemId = filters.itemId;
    if (filters.transactionType) query.transactionType = filters.transactionType;

    const page = Math.max(1, parseInt(pagination.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const [entries, totalCount] = await Promise.all([
      StockLedger.find(query)
        .populate('itemId', 'brandName genericName itemCode')
        .populate('batchId', 'batchNumber expiryDate')
        .populate('recordedBy', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StockLedger.countDocuments(query),
    ]);

    return {
      entries,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }
}

module.exports = new PharmacyInventoryService();
