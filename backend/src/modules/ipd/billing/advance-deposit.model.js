/**
 * modules/ipd/billing/advance-deposit.model.js
 * Inpatient Advance Deposit payments collection model.
 */
const mongoose = require('mongoose');

const advanceDepositSchema = new mongoose.Schema(
  {
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IPDAdmission',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'UPI', 'NET_BANKING', 'CHEQUE', 'INSURANCE_TPA'],
      default: 'UPI',
      required: true,
    },
    transactionReference: {
      type: String,
      trim: true,
      default: '',
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    isRefunded: {
      type: Boolean,
      default: false,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

advanceDepositSchema.index({ admissionId: 1, createdAt: -1 });

module.exports = mongoose.model('AdvanceDeposit', advanceDepositSchema);
