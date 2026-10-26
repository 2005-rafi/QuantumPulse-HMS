const mongoose = require('mongoose');

const stockLedgerSchema = new mongoose.Schema(
  {
    transactionType: {
      type: String,
      enum: [
        'RECEIPT_GRN',
        'DISPENSE_OPD',
        'DISPENSE_IPD',
        'RETURN_WARD',
        'WRITE_OFF_EXPIRED',
        'STOCK_ADJUSTMENT',
      ],
      required: true,
      index: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PharmacyItem',
      required: true,
      index: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PharmacyBatch',
      required: true,
      index: true,
    },
    quantityDelta: {
      type: Number,
      required: true, // +ve for incoming, -ve for outgoing
    },
    resultingBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    referenceId: {
      type: String,
      trim: true,
      default: '',
    },
    referenceType: {
      type: String,
      enum: ['VISIT', 'ADMISSION', 'PURCHASE_ORDER', 'MANUAL_AUDIT'],
      default: 'MANUAL_AUDIT',
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
  },
  { timestamps: true }
);

stockLedgerSchema.index({ itemId: 1, createdAt: -1 });
stockLedgerSchema.index({ batchId: 1, createdAt: -1 });

module.exports = mongoose.model('StockLedger', stockLedgerSchema);
