const mongoose = require('mongoose');

const resultFieldSchema = new mongoose.Schema({
  key:      { type: String, required: true, trim: true },       // machine-readable key e.g. 'haemoglobin'
  label:    { type: String, required: true, trim: true },       // display label e.g. 'Haemoglobin'
  type:     { type: String, enum: ['Text', 'Number', 'Boolean', 'Yes/No', 'File'], required: true },
  unit:     { type: String, trim: true, default: '' },
  required: { type: Boolean, default: false },
  reference:{ type: String, trim: true, default: '' },          // e.g. '4.5–5.5 million/µL'
}, { _id: true });

const testSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  testCode:     { type: String, trim: true, default: '' },      // e.g. 'CBC', 'LFT'
  sampleType:   { type: String, required: true, trim: true },   // e.g. 'Blood', 'Urine', 'None'
  resultFields: [resultFieldSchema],
}, { _id: true });

const laboratorySchema = new mongoose.Schema({
  name:         { type: String, required: true, unique: true, trim: true },
  description:  { type: String, trim: true, default: '' },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  isActive:     { type: Boolean, default: true },
  testCatalog:  [testSchema],
}, { timestamps: true });

laboratorySchema.index({ departmentId: 1 });

module.exports = mongoose.model('Laboratory', laboratorySchema);

