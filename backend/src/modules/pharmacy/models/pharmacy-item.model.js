const mongoose = require('mongoose');

const pharmacyItemSchema = new mongoose.Schema(
  {
    itemCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    brandName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    genericName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'IV_FLUID', 'OINTMENT', 'DROPS', 'INHALER', 'OTHER'],
      default: 'TABLET',
      index: true,
    },
    strength: {
      type: String,
      trim: true,
      default: '',
    },
    dosageForm: {
      type: String,
      trim: true,
      default: 'Oral',
    },
    manufacturer: {
      type: String,
      trim: true,
      default: '',
    },
    hsnCode: {
      type: String,
      trim: true,
      default: '3004',
    },
    gstRate: {
      type: Number,
      enum: [0, 5, 12, 18, 28],
      default: 12,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    reorderThreshold: {
      type: Number,
      default: 50,
      min: 0,
    },
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'DISCONTINUED'],
      default: 'ACTIVE',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
  },
  { timestamps: true }
);

pharmacyItemSchema.index({ brandName: 'text', genericName: 'text' });
pharmacyItemSchema.index({ status: 1, currentStock: 1 });

module.exports = mongoose.model('PharmacyItem', pharmacyItemSchema);
