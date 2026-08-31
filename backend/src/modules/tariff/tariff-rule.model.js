const mongoose = require('mongoose');
const { TARIFF_GRADES } = require('../../core/constants');

const RULE_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  SUPERSEDED: 'SUPERSEDED',
  CANCELLED: 'CANCELLED',
};

const publishHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['DRAFTED', 'PUBLISHED', 'SUPERSEDED', 'CANCELLED'],
    required: true,
  },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  performedAt: { type: Date, default: Date.now },
  reason: { type: String, trim: true, default: '' },
  prevAmount: { type: Number, default: null },
}, { _id: true });

const scopeSchema = new mongoose.Schema({
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  tariffGrade: {
    type: String,
    enum: [...Object.values(TARIFF_GRADES), null],
    default: null,
  },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  visitType: {
    type: String,
    enum: ['OPD', 'EMERGENCY', 'IPD', null],
    default: null,
  },
  appointmentType: {
    type: String,
    enum: ['WALK_IN', 'FOLLOW_UP', 'SCHEDULED', null],
    default: null,
  },
  wardClass: {
    type: String,
    enum: [
      'GENERAL_WARD',
      'SEMI_PRIVATE',
      'PRIVATE',
      'DELUXE_PRIVATE',
      'ICU',
      'CCU',
      'NICU',
      'PICU',
      'HDU',
      'ISOLATION',
      'POST_OP_RECOVERY',
      'OT',
      'EMERGENCY',
      null,
    ],
    default: null,
  },
  bedFeature: {
    type: String,
    enum: ['VENTILATOR_READY', 'MONITOR_ATTACHED', 'OXYGEN_PIPED', 'SUCTION_READY', null],
    default: null,
  },
}, { _id: false });

const tariffRuleSchema = new mongoose.Schema({
  // What service does this rule price? (exactly one of:)
  serviceMasterId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceMaster', default: null },
  testCode: { type: String, trim: true, default: null }, // for DIAGNOSTICS -- stable lab testCode

  category: {
    type: String,
    enum: ['REGISTRATION', 'CONSULTATION', 'DIAGNOSTICS', 'PROCEDURE', 'PACKAGE'],
    required: true,
  },

  scope: { type: scopeSchema, default: () => ({}) },

  // Pricing
  amount: { type: Number, required: true, min: 0 },
  unit: {
    type: String,
    enum: ['PER_VISIT', 'PER_TEST', 'PER_ITEM', 'PER_PROCEDURE', 'PER_DAY'],
    default: 'PER_VISIT',
  },

  // Lifecycle
  status: {
    type: String,
    enum: Object.values(RULE_STATUS),
    default: RULE_STATUS.DRAFT,
  },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date, default: null }, // null = open-ended

  // Conflict guard note: enforced in service layer before PUBLISH

  // Publish audit trail
  publishHistory: [publishHistorySchema],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
}, { timestamps: true });

// Indexes for fast TariffResolver queries
tariffRuleSchema.index({ category: 1, status: 1, effectiveFrom: 1 });
tariffRuleSchema.index({ 'scope.departmentId': 1, category: 1, status: 1 });
tariffRuleSchema.index({ 'scope.tariffGrade': 1, category: 1, status: 1 });
tariffRuleSchema.index({ 'scope.staffId': 1, category: 1, status: 1 });
tariffRuleSchema.index({ testCode: 1, status: 1 });
tariffRuleSchema.index({ serviceMasterId: 1, status: 1 });

module.exports = mongoose.model('TariffRule', tariffRuleSchema);
module.exports.RULE_STATUS = RULE_STATUS;
