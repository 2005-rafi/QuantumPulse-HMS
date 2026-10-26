/**
 * ClinicalStationIdleDeck.jsx
 * Pure Material Design 3 Minimalist Clinical Station Idle & Empty State Component.
 * 
 * SOLID Architecture:
 * - SRP: Isolates clinical station idle presentation with minimalist elegance.
 * - OCP: Role presets with clean, non-cluttered copy and optional actions.
 * - LSP: Drop-in replacement for any empty or unselected station views.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Md3Button } from './Md3FormComponents';
import './ClinicalStationIdleDeck.css';

/**
 * Minimalist Role Presets for Clinical Station Idle States
 */
export const CLINICAL_STATION_PRESETS = {
  IPD_NURSE: {
    icon: 'hotel',
    title: 'Inpatient Ward Clear',
    description: 'No active inpatient admissions currently assigned to this station.',
    primaryAction: {
      label: 'Open Bed Map',
      icon: 'grid_view',
      route: '/dashboard/reception/bed-map',
    },
  },

  DOCTOR_IPD: {
    icon: 'stethoscope',
    title: 'No Active Inpatients',
    description: 'No admitted patients currently require attending clinical rounds.',
    primaryAction: {
      label: 'Open OPD Consultations',
      icon: 'stethoscope',
      route: '/dashboard/doctor/consultation',
    },
  },

  SURGEON_OT: {
    icon: 'medical_services',
    title: 'Operating Theatres Standby',
    description: 'No surgical procedures are currently scheduled or in progress.',
    primaryAction: {
      label: 'Review Surgery Requests',
      icon: 'pending_actions',
      actionKey: 'REQUESTS_TAB',
    },
  },

  LABORATORY: {
    icon: 'biotech',
    title: 'Diagnostic Queue Clear',
    description: 'All pending specimens and laboratory test orders have been processed.',
  },

  PATHOLOGY_DOCTOR: {
    icon: 'biotech',
    title: 'Verification Worklist Clear',
    description: 'No diagnostic test reports currently awaiting medical verification.',
  },

  PHARMACY: {
    icon: 'local_pharmacy',
    title: 'Prescription Queue Clear',
    description: 'No patients are currently waiting for medication dispensation.',
    primaryAction: {
      label: 'Direct Dispense',
      icon: 'add_shopping_cart',
      actionKey: 'DIRECT_DISPENSE',
    },
  },

  WARD_OPERATIONS: {
    icon: 'apartment',
    title: 'Ward Ledger Clear',
    description: 'All bed movements and transfer ledgers are up to date.',
    primaryAction: {
      label: 'Open Bed Map',
      icon: 'map',
      route: '/dashboard/ward-operations/bed-map',
    },
  },

  BILLING: {
    icon: 'payments',
    title: 'Cashier Queue Clear',
    description: 'No pending encounter billing settlements at this station.',
  },

  RECEPTION: {
    icon: 'badge',
    title: 'Front Desk Ready',
    description: 'Standing by for patient check-ins, appointments, and token dispatch.',
    primaryAction: {
      label: 'Register Patient',
      icon: 'person_add',
      actionKey: 'REGISTER_PATIENT',
    },
  },

  OPD_NURSE: {
    icon: 'vital_signs',
    title: 'Triage Queue All Clear',
    description: 'No patients are currently waiting for vitals or initial triage.',
    primaryAction: {
      label: 'Register Walk-In Patient',
      icon: 'person_add',
      route: '/dashboard/reception/patients',
    },
  },
};

/**
 * ClinicalStationIdleDeck Component
 * 
 * @param {Object} props
 * @param {'IPD_NURSE'|'DOCTOR_IPD'|'SURGEON_OT'|'LABORATORY'|'PHARMACY'|'WARD_OPERATIONS'|'BILLING'|'RECEPTION'|'OPD_NURSE'} [props.preset]
 * @param {string} [props.icon]
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {{ label: string, icon?: string, onClick?: () => void, route?: string, variant?: string }} [props.primaryAction]
 * @param {Array<{ label: string, icon?: string, onClick?: () => void, route?: string, variant?: string }>} [props.secondaryActions]
 * @param {Function} [props.onAction] - Generic callback for action keys
 * @param {string} [props.className]
 * @param {Object} [props.style]
 */
export const ClinicalStationIdleDeck = ({
  preset,
  icon,
  title,
  description,
  primaryAction,
  secondaryActions,
  onAction,
  className = '',
  style = {},
}) => {
  const navigate = useNavigate();

  // Resolve config from preset + prop overrides
  const resolvedPreset = preset ? CLINICAL_STATION_PRESETS[preset] || {} : {};

  const effectiveIcon = icon || resolvedPreset.icon || 'check_circle';
  const effectiveTitle = title || resolvedPreset.title || 'All Clear';
  const effectiveDesc = description || resolvedPreset.description || 'No pending items in queue.';
  const effectivePrimary = primaryAction || resolvedPreset.primaryAction;
  const effectiveSecondaries = secondaryActions || resolvedPreset.secondaryActions || [];

  const handleActionClick = (actionObj) => {
    if (!actionObj) return;
    if (actionObj.onClick) {
      actionObj.onClick();
    } else if (actionObj.route) {
      navigate(actionObj.route);
    } else if (actionObj.actionKey && onAction) {
      onAction(actionObj.actionKey);
    }
  };

  return (
    <div className={`clinical-idle-deck ${className}`} style={style} role="status">
      <div className="clinical-idle-deck__container">
        
        {/* ── 1. Minimalist Station Icon ── */}
        <div className="clinical-idle-deck__avatar" aria-hidden="true">
          <span className="material-symbols-rounded">{effectiveIcon}</span>
        </div>

        {/* ── 2. Crisp Title & Subdued Single-Line Description ── */}
        <h2 className="clinical-idle-deck__title">{effectiveTitle}</h2>
        <p className="clinical-idle-deck__description">{effectiveDesc}</p>

        {/* ── 3. Focused Primary / Secondary Action ── */}
        {(effectivePrimary || effectiveSecondaries.length > 0) && (
          <div className="clinical-idle-deck__actions-row">
            {effectivePrimary && (
              <Md3Button
                variant={effectivePrimary.variant || 'filled'}
                onClick={() => handleActionClick(effectivePrimary)}
              >
                {effectivePrimary.icon && (
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                    {effectivePrimary.icon}
                  </span>
                )}
                <span>{effectivePrimary.label}</span>
              </Md3Button>
            )}

            {effectiveSecondaries.map((sec, sIdx) => (
              <Md3Button
                key={sIdx}
                variant={sec.variant || 'tonal'}
                onClick={() => handleActionClick(sec)}
              >
                {sec.icon && (
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                    {sec.icon}
                  </span>
                )}
                <span>{sec.label}</span>
              </Md3Button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default ClinicalStationIdleDeck;
