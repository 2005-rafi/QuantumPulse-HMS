/**
 * modules/ipd/ot/ot-session.model.js
 * Operating Theatre (OT) session booking and surgery tracking model.
 */
const mongoose = require('mongoose');

const OT_STATUS = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

const otSessionSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoomMaster',
      required: true,
      index: true,
    },
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
    },
    procedureName: {
      type: String,
      required: true,
      trim: true,
    },
    surgeryType: {
      type: String,
      enum: ['ELECTIVE', 'EMERGENCY'],
      default: 'ELECTIVE',
    },
    leadSurgeonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
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
    scheduledStart: {
      type: Date,
      required: true,
      index: true,
    },
    scheduledEnd: {
      type: Date,
      required: true,
    },
    actualStart: {
      type: Date,
      default: null,
    },
    actualEnd: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(OT_STATUS),
      default: OT_STATUS.SCHEDULED,
      required: true,
      index: true,
    },
    operativeNotes: {
      type: String,
      trim: true,
      default: '',
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

otSessionSchema.index({ roomId: 1, scheduledStart: 1, scheduledEnd: 1 });

module.exports = mongoose.model('OTSession', otSessionSchema);
module.exports.OT_STATUS = OT_STATUS;
