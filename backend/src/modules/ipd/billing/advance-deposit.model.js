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
    depositType: {
      type: String,
      enum: ['ADMISSION_ADVANCE', 'INTERIM_TOP_UP', 'SURGERY_ADVANCE', 'EMERGENCY_DEPOSIT'],
      default: 'ADMISSION_ADVANCE',
      required: true,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    isAllocatedToFinalBill: {
      type: Boolean,
      default: true,
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
advanceDepositSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('AdvanceDeposit', advanceDepositSchema);
