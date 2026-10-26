import React from 'react';
import './Md3TariffInstructionBadge.css';

/**
 * Md3TariffInstructionBadge
 * Material Design 3 Clinical Tariff & Fee Instruction Widget.
 * Replaces raw developer notes with meaningful, human-centric clinical instructions and policy chips.
 *
 * @param {Object} props
 * @param {Object} props.tariff - Resolved tariff object ({ explanation, instructionNote, policyBadge, isFree, amount, category })
 * @param {string} [props.label] - Contextual label (e.g., "Registration Fee", "Consultation Fee")
 * @param {boolean} [props.compact] - Compact inline mode (default: false)
 * @param {string} [props.className] - Extra CSS classes
 */
export const Md3TariffInstructionBadge = ({
  tariff,
  label,
  compact = false,
  className = '',
}) => {
  if (!tariff) return null;

  const isFree = tariff.isFree || Number(tariff.amount) === 0;
  const policyBadge = tariff.policyBadge || (isFree ? 'Complimentary (₹0)' : 'Master Tariff');
  const explanation = tariff.explanation || (isFree ? 'Complimentary Clinical Service' : 'Authoritative Institutional Rate');
  const instructionNote = tariff.instructionNote || (isFree ? 'Covered under institutional clinical care protocol.' : 'Authoritative rate resolved from active hospital master tariff schedule.');

  // Pick semantic icon based on tariff context
  const getContextIcon = () => {
    if (isFree) return 'volunteer_activism';
    if (tariff.category === 'BED_CHARGES') return 'hotel';
    if (tariff.category === 'CONSULTATION') return 'stethoscope';
    if (tariff.category === 'DIAGNOSTICS') return 'biotech';
    if (tariff.category === 'PROCEDURE') return 'medical_services';
    return 'verified';
  };

  const getBadgeModifier = () => {
    if (isFree) return 'md3-tariff-badge--free';
    if (tariff.policyType === 'DOCTOR_OVERRIDE') return 'md3-tariff-badge--specialist';
    if (tariff.policyType === 'DEPARTMENT_RULE') return 'md3-tariff-badge--dept';
    return 'md3-tariff-badge--standard';
  };

  if (compact) {
    return (
      <div className={`md3-tariff-badge md3-tariff-badge--compact ${getBadgeModifier()} ${className}`}>
        <span className="material-symbols-rounded md3-tariff-badge__icon">
          {getContextIcon()}
        </span>
        <span className="md3-tariff-badge__explanation">{explanation}</span>
        <span className="md3-tariff-badge__chip">{policyBadge}</span>
      </div>
    );
  }

  return (
    <div className={`md3-tariff-badge ${getBadgeModifier()} ${className}`} role="status" aria-live="polite">
      <div className="md3-tariff-badge__header">
        <div className="md3-tariff-badge__lead">
          <span className="material-symbols-rounded md3-tariff-badge__icon">
            {getContextIcon()}
          </span>
          <span className="md3-tariff-badge__title">{explanation}</span>
        </div>
        <span className="md3-tariff-badge__chip">{policyBadge}</span>
      </div>

      {instructionNote && (
        <p className="md3-tariff-badge__instruction">
          {instructionNote}
        </p>
      )}
    </div>
  );
};

export default Md3TariffInstructionBadge;
