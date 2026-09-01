import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { Icon, Md3Chip, Md3IconButton } from './Md3Widgets';
import './Md3ScanViewerDialog.css';

/**
 * Md3ScanViewerDialog — Pure Material Design 3 In-App Document & Scan Viewer
 * 
 * Supports viewing PDF reports and Scanned Images (X-Rays, Lab Reports, Prescriptions)
 * with authenticated streaming, zoom controls, full-screen mode, and print actions.
 */
const Md3ScanViewerDialog = ({
  isOpen,
  onClose,
  scanReportId,
  testName = 'Diagnostic Investigation Report',
  patientName = '',
  mrn = '',
  labName = 'Hospital Diagnostic Laboratory',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [docUrl, setDocUrl] = useState(null);
  const [docTitle, setDocTitle] = useState(testName);
  const [mimeType, setMimeType] = useState('application/pdf');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch document securely via authenticated API
  useEffect(() => {
    let isCancelled = false;
    let createdBlobUrl = null;

    const fetchScanDocument = async () => {
      if (!isOpen || !scanReportId) return;

      try {
        setLoading(true);
        setError(null);
        setZoomLevel(100);
        setRotation(0);

        // 1. Fetch metadata
        const metaRes = await api.get(`/laboratory/scans/${scanReportId}?json=true`);
        const downloadUrl = metaRes.data?.data?.downloadUrl || metaRes.data?.downloadUrl;
        const scanMeta = metaRes.data?.data?.scan || metaRes.data?.scan;

        if (isCancelled) return;

        if (scanMeta?.originalFilename) {
          setDocTitle(scanMeta.originalFilename);
        }
        const detectedType = scanMeta?.mimeType || 'application/pdf';
        setMimeType(detectedType);

        const isPdfDoc = detectedType.toLowerCase().includes('pdf');

        if (isPdfDoc) {
          // For PDFs, fetch binary blob to create a safe same-origin blob: URL for the iframe
          try {
            const blobRes = await api.get(`/laboratory/scans/${scanReportId}`, {
              responseType: 'blob',
            });
            if (isCancelled) return;
            const blob = new Blob([blobRes.data], { type: 'application/pdf' });
            createdBlobUrl = URL.createObjectURL(blob);
            setDocUrl(createdBlobUrl);
          } catch (blobErr) {
            console.warn('[Md3ScanViewerDialog] Blob fetch fallback to direct URL:', blobErr);
            if (downloadUrl) {
              setDocUrl(downloadUrl);
            } else {
              throw blobErr;
            }
          }
        } else {
          // For images, direct Cloudinary CDN URL provides instant high-speed rendering
          setDocUrl(downloadUrl || `/api/v1/laboratory/scans/${scanReportId}`);
        }
      } catch (err) {
        if (isCancelled) return;
        console.error('[Md3ScanViewerDialog] Failed to fetch scan document:', err);
        setError(
          err.response?.data?.message ||
          'Failed to retrieve scanned report from laboratory storage. Please verify permissions or network connection.'
        );
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchScanDocument();

    return () => {
      isCancelled = true;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
      setDocUrl(null);
    };
  }, [isOpen, scanReportId]);

  // Clean up URL on close
  const handleClose = () => {
    if (docUrl && docUrl.startsWith('blob:')) {
      URL.revokeObjectURL(docUrl);
    }
    setDocUrl(null);
    onClose();
  };

  // Keyboard navigation & Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isPdf = mimeType.toLowerCase().includes('pdf');
  const isImage = mimeType.toLowerCase().includes('image');

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleResetZoom = () => {
    setZoomLevel(100);
    setRotation(0);
  };

  const handlePrint = () => {
    if (!docUrl) return;
    const printWindow = window.open(docUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const handleOpenExternal = () => {
    if (docUrl) {
      window.open(docUrl, '_blank');
    }
  };

  const handleDownload = () => {
    if (!docUrl) return;
    const a = document.createElement('a');
    a.href = docUrl;
    a.target = '_blank';
    a.download = `${(docTitle || testName).replace(/[^a-zA-Z0-9_-]/g, '_')}.${isPdf ? 'pdf' : 'png'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return createPortal(
    <div
      className={`md3-scan-viewer__overlay ${isFullscreen ? 'fullscreen' : ''}`}
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="md3-scan-viewer__surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Dialog Header ── */}
        <header className="md3-scan-viewer__header">
          <div className="md3-scan-viewer__title-box">
            <span className="md3-scan-viewer__icon">
              {isPdf ? <Icon.FileText size={20} /> : <Icon.Eye size={20} />}
            </span>
            <div className="md3-scan-viewer__meta">
              <div className="md3-scan-viewer__name-row">
                <h3 className="md3-scan-viewer__title">{testName}</h3>
                <Md3Chip variant="secondary" size="small">
                  {isPdf ? 'PDF Report' : isImage ? 'Scanned Image' : 'Diagnostic Document'}
                </Md3Chip>
              </div>
              <p className="md3-scan-viewer__sub">
                {patientName && <span>Patient: <strong>{patientName}</strong></span>}
                {mrn && <span> • MRN: <code>{mrn}</code></span>}
                {labName && <span> • Lab: {labName}</span>}
              </p>
            </div>
          </div>

          {/* ── Toolbar Actions ── */}
          <div className="md3-scan-viewer__toolbar">
            {isImage && (
              <>
                <button
                  type="button"
                  className="md3-viewer-btn"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  disabled={zoomLevel <= 50}
                >
                  <Icon.Remove />
                </button>
                <span className="md3-viewer-zoom-text">{zoomLevel}%</span>
                <button
                  type="button"
                  className="md3-viewer-btn"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  disabled={zoomLevel >= 250}
                >
                  <Icon.Plus />
                </button>
                <button
                  type="button"
                  className="md3-viewer-btn"
                  onClick={handleRotate}
                  title="Rotate 90°"
                >
                  <Icon.Refresh />
                </button>
                {(zoomLevel !== 100 || rotation !== 0) && (
                  <button
                    type="button"
                    className="md3-viewer-btn text-btn"
                    onClick={handleResetZoom}
                  >
                    Reset
                  </button>
                )}
                <div className="md3-viewer-divider" />
              </>
            )}

            <button
              type="button"
              className="md3-viewer-btn"
              onClick={handlePrint}
              title="Print Document"
              disabled={!docUrl || loading}
            >
              <Icon.Print />
              <span className="md3-viewer-btn-label">Print</span>
            </button>

            <button
              type="button"
              className="md3-viewer-btn"
              onClick={handleDownload}
              title="Download File"
              disabled={!docUrl || loading}
            >
              <Icon.Download />
              <span className="md3-viewer-btn-label">Save</span>
            </button>

            <button
              type="button"
              className="md3-viewer-btn"
              onClick={handleOpenExternal}
              title="Open in New Window"
              disabled={!docUrl || loading}
            >
              <Icon.ExternalLink />
            </button>

            <div className="md3-viewer-divider" />

            <button
              type="button"
              className="md3-viewer-btn close-btn"
              onClick={handleClose}
              title="Close Preview (Esc)"
              aria-label="Close dialog"
            >
              <Icon.Clear />
            </button>
          </div>
        </header>

        {/* ── Dialog Document Body ── */}
        <main className="md3-scan-viewer__body">
          {loading && (
            <div className="md3-scan-viewer__loading">
              <span className="md3-viewer-spinner" />
              <p>Decrypting and streaming laboratory document from Cloudinary...</p>
            </div>
          )}

          {error && (
            <div className="md3-scan-viewer__error">
              <Icon.Alert size={36} />
              <h4>Unable to Display Document</h4>
              <p>{error}</p>
              <button
                type="button"
                className="md3-btn-tonal"
                onClick={handleClose}
              >
                Dismiss
              </button>
            </div>
          )}

          {!loading && !error && docUrl && (
            <div className="md3-scan-viewer__content">
              {isPdf ? (
                <iframe
                  src={docUrl}
                  title={`${testName} Scanned PDF`}
                  className="md3-scan-viewer__iframe"
                />
              ) : isImage ? (
                <div className="md3-scan-viewer__image-wrapper">
                  <img
                    src={docUrl}
                    alt={`${testName} Scanned Result`}
                    className="md3-scan-viewer__image"
                    style={{
                      transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                    }}
                  />
                </div>
              ) : (
                <iframe
                  src={docUrl}
                  title={`${testName} Document`}
                  className="md3-scan-viewer__iframe"
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>,
    document.body
  );
};

export default Md3ScanViewerDialog;
