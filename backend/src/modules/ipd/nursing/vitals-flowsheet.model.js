/**
 * modules/ipd/nursing/vitals-flowsheet.model.js
 * Time-series vital recordings with automated NEWS2 scoring engine.
 */
const mongoose = require('mongoose');

const computeNews2 = (vitals) => {
  let score = 0;
  const { respirationRate, spO2, oxygenTherapy, systolicBp, heartRate, avpu, temperature } = vitals;

  // 1. Respiration Rate (breaths/min)
  if (respirationRate !== undefined && respirationRate !== null) {
    if (respirationRate <= 8) score += 3;
    else if (respirationRate >= 9 && respirationRate <= 11) score += 1;
    else if (respirationRate >= 12 && respirationRate <= 20) score += 0;
    else if (respirationRate >= 21 && respirationRate <= 24) score += 2;
    else if (respirationRate >= 25) score += 3;
  }

  // 2. SpO2 Scale 1 (%)
  if (spO2 !== undefined && spO2 !== null) {
    if (spO2 <= 91) score += 3;
    else if (spO2 >= 92 && spO2 <= 93) score += 2;
    else if (spO2 >= 94 && spO2 <= 95) score += 1;
    else if (spO2 >= 96) score += 0;
  }

  // 3. Supplemental Oxygen
  if (oxygenTherapy) {
    score += 2;
  }

  // 4. Systolic Blood Pressure (mmHg)
  if (systolicBp !== undefined && systolicBp !== null) {
    if (systolicBp <= 90) score += 3;
    else if (systolicBp >= 91 && systolicBp <= 100) score += 2;
    else if (systolicBp >= 101 && systolicBp <= 110) score += 1;
    else if (systolicBp >= 111 && systolicBp <= 219) score += 0;
    else if (systolicBp >= 220) score += 3;
  }

  // 5. Heart Rate (bpm)
  if (heartRate !== undefined && heartRate !== null) {
    if (heartRate <= 40) score += 3;
    else if (heartRate >= 41 && heartRate <= 50) score += 1;
    else if (heartRate >= 51 && heartRate <= 90) score += 0;
    else if (heartRate >= 91 && heartRate <= 110) score += 1;
    else if (heartRate >= 111 && heartRate <= 130) score += 2;
    else if (heartRate >= 131) score += 3;
  }

  // 6. Consciousness (AVPU)
  if (avpu && avpu !== 'ALERT') {
    score += 3;
  }

  // 7. Temperature (°C)
  if (temperature !== undefined && temperature !== null) {
    if (temperature <= 35.0) score += 3;
    else if (temperature >= 35.1 && temperature <= 36.0) score += 1;
    else if (temperature >= 36.1 && temperature <= 38.0) score += 0;
    else if (temperature >= 38.1 && temperature <= 39.0) score += 1;
    else if (temperature >= 39.1) score += 2;
  }

  let riskLevel = 'LOW';
  if (score >= 7) {
    riskLevel = 'HIGH';
  } else if (score >= 5) {
    riskLevel = 'MEDIUM';
  }

  return { score, riskLevel };
};

const vitalsFlowsheetSchema = new mongoose.Schema(
  {
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
    recordedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    temperature: { type: Number, required: true }, // in Celsius (e.g. 37.2)
    systolicBp: { type: Number, required: true },   // mmHg
    diastolicBp: { type: Number, required: true },  // mmHg
    heartRate: { type: Number, required: true },    // bpm
    respirationRate: { type: Number, required: true }, // breaths/min
    spO2: { type: Number, required: true },          // %
    oxygenTherapy: { type: Boolean, default: false },
    oxygenFlowRateLpm: { type: Number, default: 0 },
    avpu: {
      type: String,
      enum: ['ALERT', 'VOICE', 'PAIN', 'UNRESPONSIVE'],
      default: 'ALERT',
    },
    painScore: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
    },
    bloodSugarRandom: {
      type: Number,
      default: null, // mg/dL
    },
    news2Score: {
      type: Number,
      default: 0,
    },
    news2RiskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'LOW',
    },
    clinicalNotes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate NEWS2 automatically
vitalsFlowsheetSchema.pre('save', function () {
  const result = computeNews2(this);
  this.news2Score = result.score;
  this.news2RiskLevel = result.riskLevel;
});

vitalsFlowsheetSchema.index({ admissionId: 1, recordedAt: -1 });

module.exports = mongoose.model('VitalsFlowsheet', vitalsFlowsheetSchema);
module.exports.computeNews2 = computeNews2;
