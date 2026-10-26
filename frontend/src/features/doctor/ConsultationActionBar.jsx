import React, { useState } from 'react';
import { Icon } from '../../components/md3/Md3Widgets';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import Md3ConfirmDialog from '../../components/md3/Md3ConfirmDialog';

const ConsultationActionBar = ({
  onSaveDraft,
  onSendToLab,
  onFinalize,
  onAdmitToIpd,
  onRequestSurgery,
  isAdmittedToIpd = false,
  canFinalize,
  labOrdersCount = 0,
  savingDraft = false,
  routingToLab = false,
  finalizing = false,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLabConfirm, setShowLabConfirm] = useState(false);

  const handleFinalizeClick = () => setShowConfirm(true);
  const handleConfirmFinalize = () => {
    setShowConfirm(false);
    onFinalize();
  };

  const handleSendToLabClick = () => setShowLabConfirm(true);
  const handleConfirmSendToLab = () => {
    setShowLabConfirm(false);
    if (onSendToLab) onSendToLab();
  };

  return (
    <>
      <div className="consultation-fab-dock" role="region" aria-label="Consultation Actions">
        <div className="consultation-fab-dock__actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* 1. Save Draft Action (Tonal / Secondary) */}
          <Md3Button
            type="button"
            variant="tonal"
            onClick={onSaveDraft}
            loading={savingDraft}
            loadingText="Saving Draft..."
            disabled={savingDraft || routingToLab || finalizing}
            className="action-btn-draft"
          >
            <Icon.FileText size={18} />
            <span>Save Draft</span>
          </Md3Button>

          {/* 2. Recommend Inpatient (IPD) Admission */}
          {onAdmitToIpd && !isAdmittedToIpd && (
            <Md3Button
              type="button"
              variant="tonal"
              onClick={onAdmitToIpd}
              disabled={savingDraft || routingToLab || finalizing}
              style={{
                background: 'var(--md-sys-color-surface-container-high, #e8f0fe)',
                color: 'var(--md-sys-color-primary, #0b57d0)',
                border: '1px solid var(--md-sys-color-outline-variant, #c2e7ff)',
                fontWeight: 600,
              }}
              title="Advise IPD admission and route to Ward Management for physical bed allocation"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>hotel</span>
              <span>Recommend IPD</span>
            </Md3Button>
          )}

          {/* 3. Request Surgery / OT Booking */}
          {onRequestSurgery && (
            <Md3Button
              type="button"
              variant="tonal"
              onClick={onRequestSurgery}
              disabled={savingDraft || routingToLab || finalizing}
              style={{
                background: 'var(--md-sys-color-secondary-container, #e2eafc)',
                color: 'var(--md-sys-color-on-secondary-container, #041e49)',
                border: '1px solid var(--md-sys-color-outline-variant, #b6c4e2)',
                fontWeight: 600,
              }}
              title="Dispatch surgical procedure request to Operating Theatre & Surgeon"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>surgical</span>
              <span>Request Surgery</span>
            </Md3Button>
          )}

          {/* 2. Send to Laboratory Action (Visible / Highlighted when lab orders are added) */}
          {labOrdersCount > 0 && (
            <Md3Button
              type="button"
              variant="secondary"
              onClick={handleSendToLabClick}
              loading={routingToLab}
              loadingText="Routing to Lab..."
              disabled={routingToLab || finalizing || savingDraft}
              style={{
                background: 'var(--md-sys-color-tertiary-container)',
                color: 'var(--md-sys-color-on-tertiary-container)',
                border: '1px solid var(--md-sys-color-tertiary)',
                fontWeight: 700,
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>science</span>
              <span>Send to Laboratory ({labOrdersCount})</span>
            </Md3Button>
          )}

          {/* 3. Finalize & Route Action (Filled / Primary) */}
          <Md3Button
            type="button"
            variant="primary"
            onClick={handleFinalizeClick}
            disabled={!canFinalize || finalizing || routingToLab || savingDraft}
            loading={finalizing}
            loadingText="Finalizing..."
            className="action-btn-finalize"
          >
            <Icon.Send size={18} />
            <span>Finalize &amp; Route</span>
          </Md3Button>
        </div>
      </div>

      {/* Confirmation Dialog for Finalizing */}
      <Md3ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmFinalize}
        title="Finalize Consultation?"
        message="Finalizing will close this consultation session and route the clinical record, orders, and prescriptions to pharmacy and laboratory departments. Subsequent edits will require an administrative amendment."
        confirmLabel="Confirm Finalize"
        cancelLabel="Keep Editing"
        variant="info"
        loading={finalizing}
      />

      {/* Confirmation Dialog for Sending to Lab */}
      <Md3ConfirmDialog
        isOpen={showLabConfirm}
        onClose={() => setShowLabConfirm(false)}
        onConfirm={handleConfirmSendToLab}
        title="Send Patient to Laboratory?"
        message={`This will route the patient to the Laboratory Processing Queue for ${labOrdersCount} diagnostic investigation(s). Once tests are completed by the technician, the patient will automatically return to your Review Queue.`}
        confirmLabel="Route to Lab"
        cancelLabel="Keep in Desk"
        variant="info"
        loading={routingToLab}
      />
    </>
  );
};

export default ConsultationActionBar;
