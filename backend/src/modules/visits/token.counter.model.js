const mongoose = require('mongoose');

/**
 * TokenCounter — Atomic daily serial counter per department.
 *
 * Keyed by (departmentId, date) where date is start-of-day local time.
 * findOneAndUpdate with $inc: { count: 1 } and upsert: true guarantees
 * atomicity under concurrent registrations (no race conditions).
 *
 * SRP: This model does exactly one thing — track daily token serials.
 * OCP: New departments are handled automatically without modifying this model.
 */
const tokenCounterSchema = new mongoose.Schema(
  {
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    date: {
      type: Date,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: false, versionKey: false }
);

// Compound unique index ensures one counter doc per (department, day)
tokenCounterSchema.index({ departmentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('TokenCounter', tokenCounterSchema);
