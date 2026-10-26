const mongoose = require('mongoose');

const medicalHistorySchema = new mongoose.Schema({
  condition: { type: String, required: true },
  diagnosedDate: { type: Date },
  notes: { type: String },
  status: { type: String, enum: ['Active', 'Resolved'], default: 'Active' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true }
}, { timestamps: true });

const surgicalHistorySchema = new mongoose.Schema({
  otSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'OTSession', default: null },
  procedureName: { type: String, required: true, trim: true },
  surgeryDate: { type: Date, default: Date.now },
  leadSurgeonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  outcome: { type: String, enum: ['SUCCESSFUL', 'COMPLICATED', 'ABANDONED', 'PENDING'], default: 'SUCCESSFUL' },
  notes: { type: String, trim: true, default: '' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null }
}, { timestamps: true });

const patientSchema = new mongoose.Schema(
  {
    mrn: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    previousMrns: [{ type: String, trim: true, uppercase: true }],
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dob: { type: Date, required: true },
    age: { type: Number },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'], default: 'Unknown' },
    aadhaar: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    parentsName: { type: String, trim: true },
    allergies: { type: String, trim: true, default: '' },
    operations: { type: String, trim: true, default: '' },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      stateCode: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: 'India' },
      countryCode: { type: String, trim: true, default: 'IN' },
      pinCode: { type: String, trim: true }
    },
    emergencyContact: {
      name: { type: String, trim: true },
      relation: { type: String, trim: true },
      phone: { type: String, trim: true }
    },
    medicalHistory: [medicalHistorySchema],
    surgicalHistory: [surgicalHistorySchema],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
    deletionReason: { type: String, trim: true, default: '' }
  },
  { 
    timestamps: true, 
    optimisticConcurrency: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

patientSchema.virtual('fullName').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

patientSchema.index({ mrn: 1, isDeleted: 1 });
patientSchema.index({ previousMrns: 1 });
patientSchema.index({ firstName: 1, lastName: 1, phone: 1 });
patientSchema.index({ firstName: 1, lastName: 1, createdAt: -1 });
patientSchema.index({ phone: 1 });
patientSchema.index({ createdAt: -1, _id: -1 });
patientSchema.index({ 'address.state': 1, createdAt: -1 });
patientSchema.index({ 'address.city': 1, createdAt: -1 });
patientSchema.index({ 'address.country': 1 });
patientSchema.index(
  { aadhaar: 1 },
  {
    unique: true,
    partialFilterExpression: { aadhaar: { $type: 'string', $gt: '' } },
  }
);


patientSchema.pre('save', function () {
  if (this.dob) {
    const today = new Date();
    const dob = new Date(this.dob);
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    this.age = age;
  }
});

patientSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  if (update && update.dob) {
    const today = new Date();
    const dob = new Date(update.dob);
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (update.$set) {
      update.$set.age = age;
    } else {
      update.age = age;
    }
  }
});

module.exports = mongoose.model('Patient', patientSchema);

