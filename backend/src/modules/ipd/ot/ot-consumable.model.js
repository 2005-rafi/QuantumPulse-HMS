/**
 * modules/ipd/ot/ot-consumable.model.js
 * Surgical consumables and materials used during an OT procedure.
 */
const mongoose = require('mongoose');

const otConsumableSchema = new mongoose.Schema(
  {
    otSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OTSession',
      required: true,
      index: true,
    },
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IPDAdmission',
      required: true,
      index: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    itemCode: {
      type: String,
      trim: true,
      default: '',
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    isBilled: {
      type: Boolean,
      default: false,
    },
    loggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

otConsumableSchema.pre('save', function () {
  this.totalPrice = this.quantity * this.unitPrice;
});

module.exports = mongoose.model('OTConsumable', otConsumableSchema);
