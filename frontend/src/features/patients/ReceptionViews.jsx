import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import PatientList from './PatientList';
import PatientRegistrationForm from './PatientRegistrationForm';
import PatientProfile from './PatientProfile';
import AppointmentDashboard from '../appointments/AppointmentDashboard';
import BillingTemplate from '../billing/BillingTemplate';
import { useBillingTemplateSettings } from '../../hooks/useBillingTemplateSettings';
import { billingAPI } from '../../services/billingAPI';
import { Md3BottomSheet, Md3Fab, Md3Button } from '../../components/md3/Md3FormComponents';
import { Icon } from '../../components/md3/Md3Widgets';
import BillHistoryViewer from '../billing/bills/BillHistoryViewer';

/**
 * ReceptionPatientsView — Handles Walk-in & Patient directory, profile view,
 * centralized billing slip printing, and patient registration sheet.
 * Supports Amazon-style persistent patient endpoints (/patients/:patientId).
 */
export const ReceptionPatientsView = () => {
  const {
    selectedPatient,
    isRegSheetOpen,
    setIsRegSheetOpen,
    printData,
    handlePatientSelect,
    handleVisitCreated,
    handlePrintDone,
    viewKey,
  } = useOutletContext();

  const { patientId: routePatientId } = useParams();
  const navigate = useNavigate();
  const activePatientId = routePatientId || selectedPatient?._id || selectedPatient?.id;
  const isPrintActive = viewKey === 'print' && printData;

  const { config: billingConfig } = useBillingTemplateSettings();
  const [documentMode, setDocumentMode] = useState('COMBINED'); // 'COMBINED' | 'INVOICE' | 'TOKEN_SLIP'
  const [activeBill, setActiveBill] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchBill = async () => {
      const vId = printData?.visit?._id || printData?.visit?.id;
      if (!isPrintActive || !vId) {
        setActiveBill(null);
        return;
      }
      try {
        const res = await billingAPI.getBillByVisit(vId);
        if (isMounted && res?.data) {
          const billDoc = res.data?.data || res.data;
          setActiveBill(billDoc);
        }
      } catch (err) {
        // Fallback to visit receptionPayment is already supported by BillingTemplate
        console.info('[ReceptionViews] Direct bill lookup deferred, relying on visit reception payment:', err?.message);
      }
    };

    fetchBill();
    return () => {
      isMounted = false;
    };
  }, [isPrintActive, printData?.visit?._id, printData?.visit?.id]);

  const handlePrintDoneAndReturn = () => {
    handlePrintDone?.();
    navigate('/dashboard/reception/patients');
  };

  return (
    <>
      {isPrintActive && (
        <div key="print" className="reception-view reception-print-container">
          <div className="reception-print-header">
            <div className="reception-print-success-label">
              <div className="reception-print-success-icon" aria-hidden="true">
                <Icon.Activity />
              </div>
              <div>
                <h2 className="reception-print-title">Visit Slip &amp; Bill Generated</h2>
                <p className="reception-print-subtitle">
                  Patient registered &amp; OPD ticket created using centralized billing template
                </p>
              </div>
            </div>

            {/* Document Mode Segmented Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  background: 'var(--md-sys-color-surface-container, #f1f5f9)',
                  padding: '3px',
                  borderRadius: '8px',
                  border: '1px solid var(--md-sys-color-outline-variant, #cbd5e1)',
                  gap: '2px',
                }}
              >
                {[
                  { key: 'COMBINED', label: 'Slip & Receipt' },
                  { key: 'INVOICE', label: 'Payment Receipt' },
                  { key: 'TOKEN_SLIP', label: 'Queue Token Slip' },
                ].map((mode) => (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => setDocumentMode(mode.key)}
                    style={{
                      background: documentMode === mode.key ? 'var(--md-sys-color-primary, #2563eb)' : 'transparent',
                      color: documentMode === mode.key ? 'var(--md-sys-color-on-primary, #ffffff)' : 'var(--md-sys-color-on-surface-variant, #475569)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: documentMode === mode.key ? '700' : '500',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <Md3Button
                variant="primary"
                onClick={() => window.print()}
                style={{ width: 'auto', minWidth: '130px' }}
              >
                Print Document
              </Md3Button>

              <Md3Button
                variant="secondary"
                onClick={handlePrintDoneAndReturn}
                style={{ width: 'auto', minWidth: '140px' }}
              >
                Done &amp; Return
              </Md3Button>
            </div>
          </div>

          {/* Screen Card Presentation */}
          <div
            className="billing-template-screen-card"
            style={{
              margin: '0 auto',
              maxWidth: '820px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid var(--md-sys-color-outline-variant, #e2e8f0)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
              overflow: 'hidden',
            }}
          >
            <BillingTemplate
              patient={printData.patient}
              visit={printData.visit}
              bill={activeBill}
              config={billingConfig}
              documentMode={documentMode}
              workflowType={printData.visit?.visitType || 'OPD'}
            />
          </div>

          {/* Dedicated Clean Print Portal for window.print() */}
          {createPortal(
            <div className="billing-print-portal print-only-document">
              <BillingTemplate
                patient={printData.patient}
                visit={printData.visit}
                bill={activeBill}
                config={billingConfig}
                documentMode={documentMode}
                workflowType={printData.visit?.visitType || 'OPD'}
              />
            </div>,
            document.body
          )}
        </div>
      )}

      {!isPrintActive && activePatientId && (
        <div key={`profile-${activePatientId}`} className="reception-view">
          <PatientProfile
            patientId={activePatientId}
            onBack={() => {
              handlePatientSelect?.(null);
              navigate('/dashboard/reception/patients');
            }}
            onVisitCreated={handleVisitCreated}
          />
        </div>
      )}

      {!isPrintActive && !activePatientId && (
        <div key="patients-list" className="reception-view">
          <PatientList
            onSelectPatient={(patient) => {
              handlePatientSelect?.(patient);
              navigate(`/dashboard/reception/patients/${patient.mrn || patient._id || patient.id}`);
            }}
            onRegisterPatient={() => setIsRegSheetOpen(true)}
          />
        </div>
      )}

      {/* ─── BOTTOM SHEET: Registration Form ─── */}
      <Md3BottomSheet
        isOpen={isRegSheetOpen}
        onClose={() => setIsRegSheetOpen(false)}
        title="Register New Patient"
        subtitle="Complete the form to register patient & create OPD visit ticket"
      >
        <PatientRegistrationForm
          onSuccess={handleVisitCreated}
          onCancel={() => setIsRegSheetOpen(false)}
        />
      </Md3BottomSheet>
    </>
  );
};

/**
 * ReceptionAppointmentsView — Handles Reception appointment scheduling & token operations.
 */
export const ReceptionAppointmentsView = () => {
  const { user, handleVisitCreated } = useOutletContext();

  return (
    <div key="appointments-dashboard" className="reception-view">
      <AppointmentDashboard
        user={user}
        onVisitCreated={handleVisitCreated}
      />
    </div>
  );
};

/**
 * ReceptionReceiptsView — Reusable BillHistoryViewer for Reception staff.
 * Allows viewing and reprinting registration fee receipts indefinitely.
 */
export const ReceptionReceiptsView = () => {
  return (
    <div key="receipts-history" className="reception-view" style={{ padding: '4px 0' }}>
      <BillHistoryViewer
        areaFilter="reception"
        title="Patient Registration Fee Receipts"
        subtitle="Search, audit, and reprint registration fee receipts for all visits, including completed and discharged patients"
      />
    </div>
  );
};
