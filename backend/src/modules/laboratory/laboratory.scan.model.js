const mongoose = require('mongoose');

/**
 * ScanReport — metadata record for uploaded lab files (scans, X-rays, reports).
 *
 * The binary file lives in the /storage directory on disk.
 * This document stores only the metadata needed to locate, serve, and authorize access to it.
 * All reads must go through the authenticated download endpoint — never direct file URL access.
 */
const scanReportSchema = new mongoose.Schema({
  patientId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Patient',     required: true },
  visitId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Visit',       required: true },
  orderId:          { type: String, required: true },                 // labOrders subdoc _id (string)
  labId:            { type: mongoose.Schema.Types.ObjectId, ref: 'Laboratory',  required: true },
  labDepartmentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Department',  required: true },
  uploadedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'Staff',       required: true },

  // File identity
  originalFilename: { type: String, required: true, trim: true },
  storedFilename:   { type: String, required: true, trim: true },     // UUID-based, e.g. uuid.pdf
  mimeType:         { type: String, required: true, trim: true },     // image/jpeg, image/png, application/pdf
  sizeBytes:        { type: Number, required: true },

  // Relative path from storage root, e.g. 'scans/RAD/uuid.pdf'
  storagePath:      { type: String, required: true, trim: true },
}, { timestamps: true });

// Indexes for common query patterns
scanReportSchema.index({ visitId: 1, orderId: 1 });
scanReportSchema.index({ patientId: 1 });
scanReportSchema.index({ labDepartmentId: 1 });

module.exports = mongoose.model('ScanReport', scanReportSchema);
