import React, { useState } from 'react';
import {
  Icon, Md3Chip,
} from '../../components/md3/Md3Widgets';
import { Md3Button } from '../../components/md3/Md3FormComponents';
import Md3ScanViewerDialog from '../../components/md3/Md3ScanViewerDialog';
import PrintableLabReportDialog from '../laboratory/PrintableLabReportDialog';

const LabResultsPanel = ({ labOrders = [], patient = {}, visit = null, laboratories = [] }) => {
  const [activeScanViewer, setActiveScanViewer] = useState(null);
  const [activePrintOrder, setActivePrintOrder] = useState(null);

  const completedOrders = labOrders.filter((l) => l.status === 'COMPLETED' || l.status === 'VERIFIED');
  const pendingOrders = labOrders.filter((l) => l.status !== 'COMPLETED' && l.status !== 'VERIFIED');

  const resolvedVisit = visit || {
    patientId: patient,
    labOrders,
    tokenString: patient?.token || 'OPD-LAB',
  };

  const handleOpenScan = (order, scanId) => {
    setActiveScanViewer({
      scanReportId: scanId,
      testName: order.testName || 'Laboratory Report',
      patientName: patient.firstName ? `${patient.firstName} ${patient.lastName || ''}`.trim() : (patient.name || patient.fullName || 'Patient'),
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
            <h3 className="lab-results-heading">Laboratory Results &amp; Investigation Status</h3>
            <p className="lab-results-subheading">
              Real-time diagnostic reports, hospital templates, and verified laboratory measurements.
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
            <span>Active Specimen &amp; Workflow Tracker ({pendingOrders.length})</span>
          </h4>
          <div className="lab-pending-grid">
            {pendingOrders.map((order, idx) => {
              const statusLabel =
                order.status === 'PENDING_SAMPLE' ? 'Sample Collection Pending' :
                order.status === 'PENDING_TEST'   ? 'Sample Collected / Awaiting Analysis' :
                order.status === 'IN_ANALYSIS'    ? 'Diagnostic Testing in Progress' :
                order.status === 'AWAITING_VERIFICATION' ? 'Awaiting Pathologist Authorization' :
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
                    {order.isDocumentUploadOnly && (
                      <>
                        <span>•</span>
                        <span style={{ color: '#d97706', fontWeight: 600 }}>Scan / Document Upload</span>
                      </>
                    )}
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
            <span>Verified Laboratory &amp; Diagnostic Reports ({completedOrders.length})</span>
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

              const isDocOnly = Boolean(order.isDocumentUploadOnly || order.reportType === 'DOCUMENT_UPLOAD');

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
                        <span className="material-symbols-rounded">
                          {isDocOnly ? 'image' : 'biotech'}
                        </span>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 className="lab-results__title">
                            {order.testName || 'Diagnostic Report'}
                          </h4>
                          {isDocOnly ? (
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                              Scan / Imaging
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>
                              Structured Data
                            </span>
                          )}
                        </div>
                        <div className="lab-results__item-sub">
                          <span className="clinical-meta-pill">
                            <span className="material-symbols-rounded">domain</span>
                            {order.labName || 'Hospital Laboratory'}
                          </span>
                          <span className="clinical-meta-pill">
                            <span className="material-symbols-rounded">verified_user</span>
                            Verified by Pathologist
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* View Official Branded Hospital Report Action Button */}
                      <Md3Button
                        variant="tonal"
                        size="small"
                        onClick={() => setActivePrintOrder(order)}
                        title="View and print official branded hospital diagnostic report"
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>picture_as_pdf</span>
                        <span>Hospital Report Template</span>
                      </Md3Button>

                      <span className="clinical-status-pill clinical-status-pill--ready">
                        <span className="material-symbols-rounded">verified</span>
                        Authorized
                      </span>
                    </div>
                  </div>

                  {/* ── Structured Parameters Table ── */}
                  {!isDocOnly && parameterEntries.length > 0 && (
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
                            High-resolution imaging / document attached by diagnostic pathologist
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
                          <span>Preview High-Res Scan</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {isDocOnly && !scanReportId && (
                    <div className="lab-results__info-callout" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
                      <span className="material-symbols-rounded lab-results__info-icon" style={{ color: '#15803d' }}>task_alt</span>
                      <span className="lab-results__info-text">
                        Diagnostic scan procedure verified and authorized by consultant radiologist/pathologist. Click "Hospital Report Template" above to view complete report.
                      </span>
                    </div>
                  )}

                  {order.notes && (
                    <div className="lab-results__notes-box">
                      <div className="lab-results__notes-header">
                        <span className="material-symbols-rounded">edit_note</span>
                        <span>Pathologist Remarks &amp; Clinical Impression</span>
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

      {/* ── Official Branded Hospital Report Dialog ── */}
      {activePrintOrder && (
        <PrintableLabReportDialog
          isOpen={Boolean(activePrintOrder)}
          onClose={() => setActivePrintOrder(null)}
          visit={resolvedVisit}
          order={activePrintOrder}
          laboratories={laboratories}
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

