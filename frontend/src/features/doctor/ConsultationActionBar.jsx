import React, { useState } from 'react';
import { Icon } from '../../components/md3/Md3Widgets';
import { Md3Button } from '../../components/md3/Md3FormComponents';

const ConsultationActionBar = ({
  onSaveDraft,
  onFinalize,
  canFinalize,
  savingDraft = false,
  finalizing = false,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleFinalizeClick = () => setShowConfirm(true);
  const handleConfirmFinalize = () => { setShowConfirm(false); onFinalize(); };
  const handleCancel = () => setShowConfirm(false);

  return (
    <>
      <div className="consultation-fab-dock" role="region" aria-label="Consultation Actions">
        <div className="consultation-fab-dock__actions">
          <Md3Button
            variant="tonal"
            onClick={onSaveDraft}
            loading={savingDraft}
            loadingText="Saving..."
            icon={<Icon.FileText />}
            disabled={savingDraft}
          >
            Save Draft
          </Md3Button>

          <Md3Button
            variant="filled"
            onClick={handleFinalizeClick}
            disabled={!canFinalize || finalizing}
            loading={finalizing}
            loadingText="Finalizing..."
            icon={<Icon.Send />}
          >
            Finalize & Route
          </Md3Button>
        </div>
      </div>

      {showConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.48)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            backgroundColor: 'var(--md-sys-color-surface)',
            padding: '28px', borderRadius: '28px', maxWidth: '420px', width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}>
            <h3 style={{ margin: '0 0 12px', font: 'var(--md-sys-typescale-headline-small-font)', color: 'var(--md-sys-color-on-surface)' }}>
              Finalize Consultation?
            </h3>
            <p style={{ font: 'var(--md-sys-typescale-body-medium-font)', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '24px', lineHeight: '1.5' }}>
              Finalizing makes the clinical record read-only. Later changes will require the approved amendment process.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Md3Button variant="text" onClick={handleCancel}>Cancel</Md3Button>
              <Md3Button variant="filled" onClick={handleConfirmFinalize}>Confirm Finalize</Md3Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConsultationActionBar;
