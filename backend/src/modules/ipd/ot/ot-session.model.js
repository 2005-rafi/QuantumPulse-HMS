/**
 * modules/ipd/ot/ot-session.model.js
 * Operating Theatre (OT) session booking and surgery tracking model.
 */
const mongoose = require('mongoose');

const OT_STATUS = {
  REQUESTED: 'REQUESTED',
  SCHEDULED: 'SCHEDULED',
  IN_OT: 'IN_OT',
  WAITING_FOR_SURGEON: 'WAITING_FOR_SURGEON',
  ANESTHESIA_ADMINISTERED: 'ANESTHESIA_ADMINISTERED',
  IN_PROGRESS: 'IN_PROGRESS',
  POST_OP_PACU: 'POST_OP_PACU',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
};

const PROCEDURE_CATEGORIES = {
  ELECTIVE: 'ELECTIVE',
  EMERGENCY_TRAUMA: 'EMERGENCY_TRAUMA',
  EMERGENCY_MATERNITY_CSECTION: 'EMERGENCY_MATERNITY_CSECTION',
  EMERGENCY_ACUTE: 'EMERGENCY_ACUTE',
};

const otSessionSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoomMaster',
      default: null,
      index: true,
    },
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IPDAdmission',
      required: false,
      default: null,
      index: true,
    },
    visitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit',
      default: null,
      index: true,
    },
    suggestedSurgeonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    procedureName: {
      type: String,
      required: true,
      trim: true,
    },
    procedureCategory: {
      type: String,
      enum: Object.values(PROCEDURE_CATEGORIES),
      default: PROCEDURE_CATEGORIES.ELECTIVE,
      index: true,
    },
    surgeryType: {
      type: String,
      enum: ['ELECTIVE', 'EMERGENCY', 'EMERGENCY_TRAUMA', 'EMERGENCY_MATERNITY_CSECTION', 'EMERGENCY_ACUTE'],
      default: 'ELECTIVE',
    },
    urgency: {
      type: String,
      enum: ['ROUTINE', 'URGENT', 'EMERGENCY_STAT'],
      default: 'ROUTINE',
    },
    targetDate: {
      type: Date,
      default: null,
    },
    // Doctor polling / request
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
      index: true,
    },
    requestNotes: {
      type: String,
      trim: true,
      default: '',
    },
    // Surgical Team
    leadSurgeonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
      index: true,
    },
    assistantSurgeons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
      },
    ],
    anesthetistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    anesthesiaType: {
      type: String,
      enum: ['GENERAL', 'SPINAL', 'EPIDURAL', 'LOCAL', 'SEDATION', 'NONE'],
      default: 'GENERAL',
    },
    scrubNurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    circulatingNurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    // Timing & Schedule
    scheduledStart: {
      type: Date,
      default: null,
      index: true,
    },
    scheduledEnd: {
      type: Date,
      default: null,
    },
    actualStart: {
      type: Date,
      default: null,
    },
    actualEnd: {
      type: Date,
      default: null,
    },
    actualDurationMinutes: {
      type: Number,
      default: null,
    },
    // Status & Milestones Lifecycle
    status: {
      type: String,
      enum: Object.values(OT_STATUS),
      default: OT_STATUS.SCHEDULED,
      required: true,
      index: true,
    },
    milestones: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
        notes: { type: String, trim: true, default: '' },
      },
    ],
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    // Advisory Pre-Operative Safety Checklist
    preOpChecklist: {
      consentSigned: { type: Boolean, default: false },
      npoConfirmed: { type: Boolean, default: false }, // fasting verified
      siteMarked: { type: Boolean, default: false },
      allergiesReviewed: { type: Boolean, default: false },
      bloodCrossmatched: { type: Boolean, default: false },
      anesthesiaClearance: { type: Boolean, default: false },
      preOpNotes: { type: String, trim: true, default: '' },
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
      completedAt: { type: Date, default: null },
    },
    // Operative and Post-Op Documentation
    operativeNotes: {
      type: String,
      trim: true,
      default: '',
    },
    outcome: {
      type: String,
      enum: ['SUCCESSFUL', 'GUARDED', 'COMPLICATIONS', 'FAILED', 'ABORTED'],
      default: 'SUCCESSFUL',
      index: true,
    },
    postOpNotes: {
      type: String,
      trim: true,
      default: '',
    },
    postOpDestination: {
      type: String,
      enum: ['WARD', 'ICU', 'CCU', 'HDU', 'POST_OP_RECOVERY', 'HOME'],
      default: 'WARD',
    },
    postOpBedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BedMaster',
      default: null,
    },
    isConsumablesBilled: {
      type: Boolean,
      default: false,
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

otSessionSchema.index({ roomId: 1, scheduledStart: 1, scheduledEnd: 1 });
otSessionSchema.index({ admissionId: 1, status: 1 });
otSessionSchema.index({ leadSurgeonId: 1, scheduledStart: 1 });
otSessionSchema.index({ requestedBy: 1, createdAt: -1 });

module.exports = mongoose.model('OTSession', otSessionSchema);
module.exports.OT_STATUS = OT_STATUS;
module.exports.PROCEDURE_CATEGORIES = PROCEDURE_CATEGORIES;
