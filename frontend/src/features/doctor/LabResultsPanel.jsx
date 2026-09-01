import React, { useState } from 'react';
import {
  Icon, Md3Chip,
} from '../../components/md3/Md3Widgets';
import Md3ScanViewerDialog from '../../components/md3/Md3ScanViewerDialog';

const LabResultsPanel = ({ labOrders = [], patient = {} }) => {
  const [activeScanViewer, setActiveScanViewer] = useState(null);

  const completedOrders = labOrders.filter((l) => l.status === 'COMPLETED');
  const pendingOrders = labOrders.filter((l) => l.status !== 'COMPLETED');

  const handleOpenScan = (order, scanId) => {
    setActiveScanViewer({
      scanReportId: scanId,
      testName: order.testName || 'Laboratory Report',
      patientName: patient.firstName ? `${patient.firstName} ${patient.lastName || ''}`.trim() : '',
      mrn: patient.mrn || '',
      labName: order.labName || 'Hospital Laboratory',
    });
  };

  return (
    <div className="lab-results-workspace">
      <div className="lab-results-header">
        <div className="lab-results-title-wrap">
          <span className="lab-results-header-icon">
            <Icon.Microscope size={20} />
          </span>
          <div>
            <h3 className="lab-results-heading">Laboratory Results & Investigation Status</h3>
            <p className="lab-results-subheading">
              Real-time diagnostic reports, specimen tracking, and verified laboratory measurements.
            </p>
          </div>
        </div>
        <div className="lab-results-badges">
          <Md3Chip variant="secondary" size="small">
            {completedOrders.length} Completed
          </Md3Chip>
          {pendingOrders.length > 0 && (
            <Md3Chip variant="tertiary" size="small">
              {pendingOrders.length} In Progress
            </Md3Chip>
          )}
        </div>
      </div>

      {/* ── Pending / In-Progress Specimen Tracking ── */}
      {pendingOrders.length > 0 && (
        <div className="lab-pending-section">
          <h4 className="lab-pending-title">
            <Icon.Clock size={16} />
            <span>Active Specimen & Workflow Tracker ({pendingOrders.length})</span>
          </h4>
          <div className="lab-pending-grid">
            {pendingOrders.map((order, idx) => {
              const statusLabel =
                order.status === 'PENDING_SAMPLE' ? 'Sample Collection Pending' :
                order.status === 'PENDING_TEST'   ? 'Sample Collected / Awaiting Analysis' :
                order.status === 'IN_ANALYSIS'    ? 'Diagnostic Testing in Progress' :
                order.status === 'PENDING_VERIFY' ? 'Awaiting Pathologist Verification' :
                order.status?.replace(/_/g, ' ') || 'Order Placed';

              const statusVariant =
                order.status === 'PENDING_SAMPLE' ? 'default' :
                order.status === 'IN_ANALYSIS' ? 'tertiary' : 'secondary';

              return (
                <div key={idx} className="lab-pending-card">
                  <div className="lab-pending-card__top">
                    <span className="lab-pending-card__name">{order.testName}</span>
                    <Md3Chip variant={statusVariant} size="small">
                      {statusLabel}
                    </Md3Chip>
                  </div>
                  <div className="lab-pending-card__meta">
                    <span>{order.labName || 'Laboratory'}</span>
                    <span>•</span>
                    <span>Specimen: {order.sampleType || 'Standard'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Completed Verified Results ── */}
      {completedOrders.length > 0 ? (
        <div className="lab-completed-section">
          <h4 className="lab-completed-title">
            <Icon.CheckCircle size={16} />
            <span>Verified Laboratory Reports ({completedOrders.length})</span>
          </h4>
          <div className="lab-results__list">
            {completedOrders.map((order, idx) => {
              const rawResults = order.results || {};
              const scanReportId =
                rawResults.scanReportId ||
                order.scanReportId ||
                rawResults.scanId ||
                rawResults.attachmentId ||
                null;

              // Filter out metadata keys from the parameters table
              const parameterEntries = Object.entries(rawResults).filter(([k]) => {
                const lower = k.toLowerCase();
                return (
                  k !== 'scanReportId' &&
                  k !== 'scanId' &&
                  k !== 'attachmentId' &&
                  k !== '_notes' &&
                  !lower.includes('scanreport') &&
                  !lower.includes('attachment')
                );
              });

              return (
                <div key={`${order.testName || idx}-${idx}`} className="lab-results__item">
                  <div className="lab-results__item-header">
                    <div className="lab-results__title-box">
                      <div className="lab-results__icon">
                        <span className="material-symbols-rounded">biotech</span>
                      </div>
                      <div>
                        <h4 className="lab-results__title">
                          {order.testName || 'Unknown Test'}
                        </h4>
                        <div className="lab-results__item-sub">
                          <span className="clinical-meta-pill">
                            <span className="material-symbols-rounded">domain</span>
                            {order.labName || 'Hospital Laboratory'}
                          </span>
                          <span className="clinical-meta-pill">
                            <span className="material-symbols-rounded">verified_user</span>
                            Verified Result
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="clinical-status-pill clinical-status-pill--ready">
                      <span className="material-symbols-rounded">verified</span>
                      Verified &amp; Ready
                    </span>
                  </div>

                  {/* ── Structured Parameters Table ── */}
                  {parameterEntries.length > 0 && (
                    <div className="lab-results-table-wrap">
                      <table className="lab-results-table">
                        <thead>
                          <tr>
                            <th>Parameter</th>
                            <th>Measured Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parameterEntries.map(([key, val]) => (
                            <tr key={key}>
                              <td className="param-name">{camelToLabel(key)}</td>
                              <td className="param-value">
                                <strong>{val !== null && val !== undefined && val !== '' ? String(val) : '—'}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* ── Scanned Report / Document Attachment Banner ── */}
                  {scanReportId && (
                    <div className="lab-scan-attachment-card">
                      <div className="lab-scan-attachment-info">
                        <span className="lab-scan-icon">
                          <span className="material-symbols-rounded">description</span>
                        </span>
                        <div className="lab-scan-text">
                          <span className="lab-scan-title">Attached Diagnostic Scan / Report Document</span>
                          <span className="lab-scan-sub">
                            Scanned laboratory analysis document uploaded by pathology technician
                          </span>
                        </div>
                      </div>

                      <div className="lab-scan-actions">
                        <button
                          type="button"
                          className="lab-scan-btn lab-scan-btn--primary"
                          onClick={() => handleOpenScan(order, scanReportId)}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>visibility</span>
                          <span>Preview Document</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {parameterEntries.length === 0 && !scanReportId && (
                    <div className="lab-results__info-callout">
                      <span className="material-symbols-rounded lab-results__info-icon">info</span>
                      <span className="lab-results__info-text">
                        Qualitative diagnostic evaluation completed. No structured numeric telemetry values registered for this test.
                      </span>
                    </div>
                  )}

                  {order.notes && (
                    <div className="lab-results__notes-box">
                      <div className="lab-results__notes-header">
                        <span className="material-symbols-rounded">edit_note</span>
                        <span>Technician / Pathologist Notes</span>
                      </div>
                      <p className="lab-results__notes-body">{order.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : labOrders.length === 0 ? (
        <div className="lab-results-empty-state">
          <Icon.Microscope size={36} />
          <p className="lab-results-empty-heading">No investigation results to display</p>
          <p className="lab-results-empty-sub">
            When tests are ordered and completed by the laboratory, quantitative reports and scan files will stream here.
          </p>
        </div>
      ) : null}

      {/* ── In-App Material Design 3 Document & Scan Viewer Dialog ── */}
      {activeScanViewer && (
        <Md3ScanViewerDialog
          isOpen={Boolean(activeScanViewer)}
          onClose={() => setActiveScanViewer(null)}
          scanReportId={activeScanViewer.scanReportId}
          testName={activeScanViewer.testName}
          patientName={activeScanViewer.patientName}
          mrn={activeScanViewer.mrn}
          labName={activeScanViewer.labName}
        />
      )}
    </div>
  );
};

const camelToLabel = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
};

export default LabResultsPanel;
