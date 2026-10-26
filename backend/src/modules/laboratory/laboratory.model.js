const mongoose = require('mongoose');

const resultFieldSchema = new mongoose.Schema({
  key:              { type: String, required: true, trim: true },       // machine-readable key e.g. 'haemoglobin'
  label:            { type: String, required: true, trim: true },       // display label e.g. 'Haemoglobin'
  type:             { type: String, enum: ['Text', 'Number', 'Boolean', 'Yes/No', 'File'], required: true },
  unit:             { type: String, trim: true, default: '' },
  isGenderSpecific: { type: Boolean, default: false },
  min:              { type: Number, default: null },                   // universal numerical normal range lower bound
  max:              { type: Number, default: null },                   // universal numerical normal range upper bound
  maleMin:          { type: Number, default: null },                   // male specific normal lower bound
  maleMax:          { type: Number, default: null },                   // male specific normal upper bound
  femaleMin:        { type: Number, default: null },                   // female specific normal lower bound
  femaleMax:        { type: Number, default: null },                   // female specific normal upper bound
  required:         { type: Boolean, default: false },
  reference:        { type: String, trim: true, default: '' },          // e.g. '13.0 – 17.0 (M), 12.0 – 15.5 (F)'
}, { _id: true });

const testSchema = new mongoose.Schema({
  name:                 { type: String, required: true, trim: true },
  testCode:             { type: String, trim: true, uppercase: true, default: '' },      // e.g. 'CBC-001', 'LFT-002'
  sampleType:           { type: String, required: true, trim: true },                    // e.g. 'Blood', 'Urine', 'None'
  reportType:           { type: String, enum: ['STRUCTURED_DATA', 'DOCUMENT_UPLOAD', 'HYBRID'], default: 'STRUCTURED_DATA' },
  isDocumentUploadOnly: { type: Boolean, default: false },
  templateLayout:       { type: String, enum: ['STANDARD_NUMERICAL', 'DESCRIPTIVE_NARRATIVE', 'IMAGING_STUDY', 'CULTURE_ANTIBIOGRAM'], default: 'STANDARD_NUMERICAL' },
  resultFields:         [resultFieldSchema],
}, { _id: true });

const laboratorySchema = new mongoose.Schema({
  name:         { type: String, required: true, unique: true, trim: true },
  code:         { type: String, trim: true, uppercase: true },
  description:  { type: String, trim: true, default: '' },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  isActive:     { type: Boolean, default: true },
  status:       { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  requireVitalsCollection: { type: Boolean, default: false },
  testCatalog:  [testSchema],
}, { timestamps: true });

laboratorySchema.index({ departmentId: 1 });
laboratorySchema.index({ status: 1 });
laboratorySchema.index({ isActive: 1 });

module.exports = mongoose.model('Laboratory', laboratorySchema);

