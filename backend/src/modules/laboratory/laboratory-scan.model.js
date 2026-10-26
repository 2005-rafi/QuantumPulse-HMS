const mongoose = require('mongoose');

/**
 * ScanReport — Metadata record for uploaded lab files (scans, X-rays, diagnostic reports).
 *
 * Stored securely in Cloudinary with 'authenticated' private visibility.
 * All reads must go through authenticated presigned URLs with HIPAA audit tracking.
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
  storedFilename:   { type: String, required: true, trim: true },
  mimeType:         { type: String, required: true, trim: true },     // image/jpeg, image/png, application/pdf
  sizeBytes:        { type: Number, required: true },

  // Cloudinary metadata
  cloudinaryPublicId: { type: String, trim: true, default: null },
  secureUrl:          { type: String, trim: true, default: null },
  resourceType:       { type: String, enum: ['image', 'raw', 'auto'], default: 'image' },
  storageType:        { type: String, enum: ['cloudinary', 'local'], default: 'cloudinary' },

  // Legacy local relative path fallback
  storagePath:        { type: String, trim: true, default: '' },
}, { timestamps: true });

// Indexes for high-speed queries
scanReportSchema.index({ visitId: 1, orderId: 1 });
scanReportSchema.index({ patientId: 1 });
scanReportSchema.index({ labDepartmentId: 1 });
scanReportSchema.index({ cloudinaryPublicId: 1 });

module.exports = mongoose.model('ScanReport', scanReportSchema);
