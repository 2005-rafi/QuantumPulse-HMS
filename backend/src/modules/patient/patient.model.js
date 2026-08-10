const mongoose = require('mongoose');

const medicalHistorySchema = new mongoose.Schema({
  condition: { type: String, required: true },
  diagnosedDate: { type: Date },
  notes: { type: String },
  status: { type: String, enum: ['Active', 'Resolved'], default: 'Active' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true }
}, { timestamps: true });

const patientSchema = new mongoose.Schema(
  {
    mrn: { type: String, required: true, unique: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dob: { type: Date, required: true },
    age: { type: Number },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'], default: 'Unknown' },
    aadhaar: { type: String, trim: true, unique: true, sparse: true },
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
      pinCode: { type: String, trim: true }
    },
    emergencyContact: {
      name: { type: String, trim: true },
      relation: { type: String, trim: true },
      phone: { type: String, trim: true }
    },
    medicalHistory: [medicalHistorySchema]
  },
  { timestamps: true, optimisticConcurrency: true }
);

patientSchema.index({ firstName: 1, lastName: 1, phone: 1 });
patientSchema.index({ phone: 1 });
patientSchema.index({ createdAt: -1 });


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
