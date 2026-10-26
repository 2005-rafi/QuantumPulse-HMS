const mongoose = require('mongoose');

const pharmacyBatchSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PharmacyItem',
      required: true,
      index: true,
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    purchaseCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    mrp: {
      type: Number,
      required: true,
      min: 0,
    },
    salePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    manufactureDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    initialQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    supplierName: {
      type: String,
      trim: true,
      default: '',
    },
    invoiceNumber: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'QUARANTINED', 'EXPIRED', 'DEPLETED'],
      default: 'ACTIVE',
      index: true,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
  },
  { timestamps: true }
);

// High-speed FEFO allocation index (First-Expired-First-Out)
pharmacyBatchSchema.index(
  { itemId: 1, status: 1, expiryDate: 1, availableQuantity: 1 },
  { name: 'idx_pharmacy_fefo_dispense' }
);
pharmacyBatchSchema.index({ itemId: 1, batchNumber: 1 }, { unique: true });

module.exports = mongoose.model('PharmacyBatch', pharmacyBatchSchema);
