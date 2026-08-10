import React from 'react';
import {
  Md3Section, Icon, Md3Chip, Md3EmptyState,
} from '../../components/md3/Md3Widgets';

const MedicalHistoryPanel = ({ patient = {} }) => {
  const parseCommaString = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const allergies = parseCommaString(patient.allergies);
  const surgeries = parseCommaString(patient.operations);
  const conditions = Array.isArray(patient.chronicConditions)
    ? patient.chronicConditions
    : (typeof patient.chronicConditions === 'string'
        ? parseCommaString(patient.chronicConditions)
        : (Array.isArray(patient.medicalHistory)
            ? patient.medicalHistory.map(item => item.condition || item.name || '').filter(Boolean)
            : []));

  const hasAnyData = allergies.length > 0 || conditions.length > 0 || surgeries.length > 0;

  return (
    <Md3Section
      title="Medical History & Allergies"
      subtitle="Critical patient safety warnings and chronic conditions"
      icon={<Icon.ShieldCheck />}
      className="medical-history-panel"
    >
      {!hasAnyData ? (
        <div className="medical-history-panel__nkda">
          <Md3Chip variant="success" icon={<Icon.Check />}>
            NKDA — No Known Drug Allergies
          </Md3Chip>
          <p className="medical-history-panel__nkda-text">
            No chronic medical conditions or critical drug allergies recorded in patient profile.
          </p>
        </div>
      ) : (
        <div className="medical-history-panel__content">
          {/* Allergies Section */}
          <div className="medical-history-panel__group">
            <span className="medical-history-panel__group-title">
              <Icon.Alert />
              <span>Allergies & Sensitivities</span>
            </span>
            <div className="medical-history-panel__chips">
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
                <Md3Chip variant="success" size="small" icon={<Icon.Check />}>
                  NKDA (No Known Allergies)
                </Md3Chip>
              )}
            </div>
          </div>

          {/* Chronic Conditions */}
          {conditions.length > 0 && (
            <div className="medical-history-panel__group">
              <span className="medical-history-panel__group-title">
                <Icon.Activity />
                <span>Chronic Conditions</span>
              </span>
              <div className="medical-history-panel__chips">
                {conditions.map((cond, i) => (
                  <Md3Chip key={i} variant="secondary" size="small" icon={<Icon.FileText />}>
                    {typeof cond === 'string' ? cond : cond.name || 'Condition'}
                  </Md3Chip>
                ))}
              </div>
            </div>
          )}

          {/* Past Surgeries */}
          {surgeries.length > 0 && (
            <div className="medical-history-panel__group">
              <span className="medical-history-panel__group-title">
                <Icon.Clock />
                <span>Past Surgeries / Procedures</span>
              </span>
              <div className="medical-history-panel__chips">
                {surgeries.map((surg, i) => (
                  <Md3Chip key={i} variant="default" size="small">
                    {typeof surg === 'string' ? surg : surg.name || 'Surgery'}
                  </Md3Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Md3Section>
  );
};

export default MedicalHistoryPanel;
