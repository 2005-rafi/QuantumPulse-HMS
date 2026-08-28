const mongoose = require('mongoose');

const medicinePriceSchema = new mongoose.Schema({
  medicineName: { type: String, required: true, trim: true },
  genericName: { type: String, trim: true, default: '' },
  manufacturer: { type: String, trim: true, default: '' },
  unitPrice: { type: Number, required: true, min: 0 },
  unit: { type: String, trim: true, default: 'tablet' }, // tablet, vial, ml, strip, bottle
  dispensingFee: { type: Number, default: 0 },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date, default: null },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE',
  },
  setBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
}, { timestamps: true });

medicinePriceSchema.index({ medicineName: 'text', genericName: 'text' });
medicinePriceSchema.index({ status: 1, effectiveFrom: 1 });
medicinePriceSchema.index({ medicineName: 1, status: 1 });

module.exports = mongoose.model('MedicinePrice', medicinePriceSchema);
