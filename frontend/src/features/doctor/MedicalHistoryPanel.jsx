import React from 'react';
import {
  Icon, Md3Chip,
} from '../../components/md3/Md3Widgets';

const MedicalHistoryPanel = ({ patient = {} }) => {
  const isNoneOrNkda = (text) => {
    if (!text) return true;
    if (typeof text === 'string') {
      const clean = text.trim().toUpperCase();
      return (
        clean === '' ||
        clean === 'NONE' ||
        clean === 'NIL' ||
        clean === 'NO' ||
        clean === 'NKDA' ||
        clean === 'NO KNOWN ALLERGIES' ||
        clean === 'NO KNOWN DRUG ALLERGIES' ||
        clean === 'N/A' ||
        clean === 'NULL' ||
        clean === 'UNDEFINED'
      );
    }
    return false;
  };

  const parseCommaString = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(s => !isNoneOrNkda(s));
    if (typeof val === 'string') {
      return val.split(',').map(s => s.trim()).filter(s => !isNoneOrNkda(s));
    }
    return [];
  };

  const allergies = parseCommaString(patient.allergies);
  const surgeries = parseCommaString(patient.operations);
  const conditions = Array.isArray(patient.chronicConditions)
    ? patient.chronicConditions.filter(s => !isNoneOrNkda(s))
    : (typeof patient.chronicConditions === 'string'
        ? parseCommaString(patient.chronicConditions)
        : (Array.isArray(patient.medicalHistory)
            ? patient.medicalHistory.map(item => item.condition || item.name || '').filter(s => !isNoneOrNkda(s))
            : []));

  const hasAnyData = allergies.length > 0 || conditions.length > 0 || surgeries.length > 0;

  return (
    <div className="summary-card">
      <div className="summary-card__header">
        <div className="summary-card__title-wrap">
          <span className="summary-card__icon secondary">
            <Icon.ShieldCheck size={18} />
          </span>
          <div>
            <h4 className="summary-card__title">Medical History & Allergies</h4>
            <p className="summary-card__subtitle">Critical safety warnings, allergies and past surgeries</p>
          </div>
        </div>
        {allergies.length > 0 ? (
          <Md3Chip variant="error" size="small" icon={<Icon.Alert />}>
            {allergies.length} Critical Allerg{allergies.length !== 1 ? 'ies' : 'y'}
          </Md3Chip>
        ) : (
          <Md3Chip variant="success" size="small" icon={<Icon.Check />}>
            NKDA
          </Md3Chip>
        )}
      </div>

      <div className="summary-card__body">
        {/* ── Allergies & Sensitivities ── */}
        <div className="summary-history-section">
          <div className="summary-history-label-row">
            <span className="summary-history-icon error">
              <Icon.Alert size={14} />
            </span>
            <span className="summary-history-label">Allergies & Sensitivities</span>
          </div>
          <div className="summary-chips-wrap">
            {allergies.length > 0 ? (
              allergies.map((allergy, i) => {
                const isSevere = typeof allergy === 'string' && allergy.toLowerCase().includes('severe');
                return (
                  <Md3Chip
                    key={i}
                    variant={isSevere ? 'error' : 'warning'}
                    size="small"
                    icon={<Icon.Alert />}
                  >
                    {typeof allergy === 'string' ? allergy : allergy.name || 'Allergy'}
                  </Md3Chip>
                );
              })
            ) : (
              <span className="summary-nkda-badge">
                <Icon.Check size={13} /> NKDA — No Known Drug Allergies
              </span>
            )}
          </div>
        </div>

        {/* ── Chronic Conditions ── */}
        <div className="summary-history-section">
          <div className="summary-history-label-row">
            <span className="summary-history-icon tertiary">
              <Icon.Activity size={14} />
            </span>
            <span className="summary-history-label">Chronic Medical Conditions</span>
          </div>
          <div className="summary-chips-wrap">
            {conditions.length > 0 ? (
              conditions.map((cond, i) => (
                <Md3Chip key={i} variant="secondary" size="small" icon={<Icon.FileText />}>
                  {typeof cond === 'string' ? cond : cond.name || 'Condition'}
                </Md3Chip>
              ))
            ) : (
              <span className="summary-nil-text">No chronic conditions recorded</span>
            )}
          </div>
        </div>

        {/* ── Past Surgeries / Hospitalizations ── */}
        <div className="summary-history-section">
          <div className="summary-history-label-row">
            <span className="summary-history-icon default">
              <Icon.Clock size={14} />
            </span>
            <span className="summary-history-label">Past Surgeries / Procedures</span>
          </div>
          <div className="summary-chips-wrap">
            {surgeries.length > 0 ? (
              surgeries.map((surg, i) => (
                <Md3Chip key={i} variant="default" size="small">
                  {typeof surg === 'string' ? surg : surg.name || 'Surgery'}
                </Md3Chip>
              ))
            ) : (
              <span className="summary-nil-text">None documented</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalHistoryPanel;
