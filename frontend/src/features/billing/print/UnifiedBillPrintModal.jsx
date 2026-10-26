import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBillingTemplateSettings } from '../../../hooks/useBillingTemplateSettings';
import { normalizeBillData, printElement } from './UnifiedPrintEngine';
import { A4HospitalInvoiceTemplate } from './A4HospitalInvoiceTemplate';
import { ThermalPosTokenSlip } from './ThermalPosTokenSlip';
import { Md3Button, Md3Select } from '../../../components/md3/Md3FormComponents';
import './UnifiedBillPrintModal.css';

/**
 * UnifiedBillPrintModal
 * Centralized, production-grade Material Design 3 Flat Overlay Print Studio.
 *
 * Replaces disconnected floating pills with a cohesive, flat, elevated
 * document inspection deck and pinned docked command header.
 *
 * Features:
 *  - Segregated Form-Factors: A4HospitalInvoiceTemplate & ThermalPosTokenSlip (80mm)
 *  - Advanced State Management: Mode & Paper Size auto-sync, Zoom level scaling
 *  - Keyboard Accessibility: Esc (close), Ctrl+P / Cmd+P (print trigger)
 *  - Tactile Motion: MD3 OnTap/Press depression, Hover elevation, Ripple effects
 */
export const UnifiedBillPrintModal = ({
  isOpen = false,
  onClose,
  bill = null,
  patient = null,
  visit = null,
  admission = null,
  config = null,
  defaultMode = 'INVOICE',
  autoPrint = false,
  title = 'Official Tax Invoice & Settlement Receipt',
}) => {
  const { templateConfig: hookConfig } = useBillingTemplateSettings();
  const effectiveConfig = config || hookConfig;

  const [documentMode, setDocumentMode] = useState(defaultMode || 'INVOICE');
  const [paperSize, setPaperSize] = useState(defaultMode === 'TOKEN_SLIP' ? '80mm' : 'A4 portrait');
  const [zoom, setZoom] = useState(0.9); // Default 90% gives optimal view on 1080p and laptop screens
  const [isPrinting, setIsPrinting] = useState(false);

  const sheetRef = useRef(null);

  // Normalize data using the UnifiedPrintEngine canonical normalizer
  const normalizedBill = normalizeBillData(bill, patient, visit, admission);

  // Smart mode change handler
  const handleModeChange = (mode) => {
    setDocumentMode(mode);
    if (mode === 'TOKEN_SLIP') {
      setPaperSize('80mm');
      setZoom(1.0); // 80mm slip is compact, render at 100%
    } else if (paperSize === '80mm') {
      setPaperSize('A4 portrait');
      setZoom(0.9);
    }
  };

  // Smart paper size handler
  const handlePaperSizeChange = (size) => {
    setPaperSize(size);
    if (size === '80mm') {
      setDocumentMode('TOKEN_SLIP');
      setZoom(1.0);
    } else if (documentMode === 'TOKEN_SLIP') {
      setDocumentMode('INVOICE');
      setZoom(0.9);
    }
  };

  // Zoom control handlers
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(1.4, Math.round((prev + 0.1) * 10) / 10));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.6, Math.round((prev - 0.1) * 10) / 10));
  };

  const handleZoomReset = () => {
    setZoom(1.0);
  };

  const handleZoomFit = () => {
    setZoom(0.85);
  };

  const handlePrint = useCallback(async (overrideTitle = null) => {
    if (!normalizedBill) return;
    setIsPrinting(true);
    const prefix = documentMode === 'TOKEN_SLIP' ? 'TOKEN' : 'INV';
    const docTitle = overrideTitle || `${normalizedBill.billNumber}_${normalizedBill.patient?.fullName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Patient'}_${prefix}`;
    try {
      if (sheetRef.current) {
        await printElement(sheetRef.current, {
          title: docTitle,
          paperSize: paperSize === '80mm' ? '80mm auto' : paperSize,
        });
      } else {
        const prevTitle = document.title;
        document.title = docTitle;
        window.print();
        setTimeout(() => { document.title = prevTitle; }, 3000);
      }
    } catch (err) {
      console.warn('[UnifiedBillPrintModal] Iframe print error, falling back to window.print()', err);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  }, [normalizedBill, documentMode, paperSize]);

  const handleExportPdf = useCallback(() => {
    if (!normalizedBill) return;
    const prefix = documentMode === 'TOKEN_SLIP' ? 'Queue_Token' : 'Official_Invoice';
    const exportName = `${normalizedBill.billNumber}_${normalizedBill.patient?.fullName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Patient'}_${prefix}`;
    const prevTitle = document.title;
    document.title = exportName;
    handlePrint(exportName).finally(() => {
      setTimeout(() => { document.title = prevTitle; }, 4000);
    });
  }, [normalizedBill, documentMode, handlePrint]);

  // Handle auto-print if requested
  useEffect(() => {
    if (isOpen && autoPrint && sheetRef.current) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint, handlePrint]);

  // Keyboard shortcut navigation (Esc to close, Ctrl+P to print)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrint, onClose]);

  if (!isOpen || !normalizedBill) {
    return null;
  }

  const getSheetClass = () => {
    if (paperSize === '80mm' || documentMode === 'TOKEN_SLIP') return 'unified-print-paper-sheet--pos';
    if (paperSize === 'A5 portrait') return 'unified-print-paper-sheet--a5';
    return 'unified-print-paper-sheet--a4';
  };

  const statusClass = (normalizedBill.status || '').toLowerCase();
  const isThermalToken = documentMode === 'TOKEN_SLIP' || paperSize === '80mm';

  return createPortal(
    <div className="unified-print-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="unified-print-window" onClick={(e) => e.stopPropagation()}>
        {/* Pinned Docked Header Bar (2-Tier Clean Hierarchy) */}
        <header className="unified-print-docked-header no-print">
          {/* Primary Bar: Document Identity & Main Action Buttons */}
          <div className="unified-print-primary-bar">
            {/* Left: Metadata & Clinical Context */}
            <div className="unified-print-header__meta">
              <div className="unified-print-header__badge">
                <span className="material-symbols-rounded">
                  {isThermalToken ? 'confirmation_number' : 'receipt_long'}
                </span>
              </div>
              <div className="unified-print-header__titles">
                <div className="unified-print-header__title-row">
                  <h2 className="unified-print-header__main-title">
                    {isThermalToken ? 'OPD Queue Token & Triage Ticket' : title}
                  </h2>
                  {normalizedBill.status && (
                    <span className={`status-pill status-pill--${statusClass}`}>
                      {normalizedBill.status}
                    </span>
                  )}
                </div>
                <div className="unified-print-header__sub-row">
                  <span className="unified-print-meta-pill">Bill #{normalizedBill.billNumber}</span>
                  <span className="unified-print-meta-dot">•</span>
                  <span className="unified-print-meta-patient">{normalizedBill.patient?.fullName || 'Patient'}</span>
                  {normalizedBill.patient?.mrn && normalizedBill.patient.mrn !== 'N/A' && (
                    <>
                      <span className="unified-print-meta-dot">•</span>
                      <span className="unified-print-meta-mrn">MRN: {normalizedBill.patient.mrn}</span>
                    </>
                  )}
                  {normalizedBill.patient?.ageGender && normalizedBill.patient.ageGender !== '— Y / —' && (
                    <>
                      <span className="unified-print-meta-dot">•</span>
                      <span className="unified-print-meta-age">{normalizedBill.patient.ageGender}</span>
                    </>
                  )}
                  <span className="unified-print-meta-dot">•</span>
                  <span className="unified-print-meta-type">{normalizedBill.workflowType || 'OPD'}</span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="unified-print-header__actions">
              <Md3Button
                type="button"
                variant="primary"
                onClick={() => handlePrint()}
                disabled={isPrinting}
                className="unified-print-action-btn unified-print-action-btn--primary"
                title="Print directly (Ctrl+P)"
              >
                <span className="material-symbols-rounded">print</span>
                <span>{isPrinting ? 'Preparing...' : 'Print Document'}</span>
              </Md3Button>

              <Md3Button
                type="button"
                variant="tonal"
                onClick={handleExportPdf}
                disabled={isPrinting}
                className="unified-print-action-btn"
                title="Export high-resolution PDF"
              >
                <span className="material-symbols-rounded">picture_as_pdf</span>
                <span>Export PDF</span>
              </Md3Button>

              <button
                type="button"
                className="unified-print-close-btn"
                onClick={onClose}
                title="Close Preview (Esc)"
                aria-label="Close"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
          </div>

          {/* Secondary Ribbon: Document Layout, Paper Size, & Zoom Inspection */}
          <div className="unified-print-control-ribbon">
            <div className="unified-print-ribbon__left">
              {/* Mode Segmented Toggle */}
              <div className="unified-print-ribbon__group">
                <span className="unified-print-ribbon__label">Format:</span>
                <div className="unified-print-mode-toggle" role="group" aria-label="Document Layout Mode">
                  <button
                    type="button"
                    className={`unified-print-mode-btn ${documentMode === 'INVOICE' ? 'unified-print-mode-btn--active' : ''}`}
                    onClick={() => handleModeChange('INVOICE')}
                  >
                    <span className="material-symbols-rounded">description</span>
                    <span>A4 Invoice</span>
                  </button>
                  <button
                    type="button"
                    className={`unified-print-mode-btn ${documentMode === 'TOKEN_SLIP' ? 'unified-print-mode-btn--active' : ''}`}
                    onClick={() => handleModeChange('TOKEN_SLIP')}
                  >
                    <span className="material-symbols-rounded">confirmation_number</span>
                    <span>POS Token</span>
                  </button>
                  <button
                    type="button"
                    className={`unified-print-mode-btn ${documentMode === 'COMBINED' ? 'unified-print-mode-btn--active' : ''}`}
                    onClick={() => handleModeChange('COMBINED')}
                  >
                    <span className="material-symbols-rounded">layers</span>
                    <span>Combined</span>
                  </button>
                </div>
              </div>

              <div className="unified-print-ribbon__divider" />

              {/* Paper Dimensions */}
              <div className="unified-print-ribbon__group">
                <span className="unified-print-ribbon__label">Paper:</span>
                <div className="unified-print-paper-select" title="Physical Paper Dimensions">
                  <select
                    className="unified-print-paper-dropdown"
                    value={paperSize}
                    onChange={(e) => handlePaperSizeChange(e.target.value)}
                    aria-label="Paper Dimensions"
                  >
                    <option value="A4 portrait">A4 Standard (210 × 297 mm)</option>
                    <option value="A5 portrait">A5 Compact (148 × 210 mm)</option>
                    <option value="80mm">80mm POS Roll (Continuous)</option>
                  </select>
                  <span className="material-symbols-rounded unified-print-dropdown-arrow">expand_more</span>
                </div>
              </div>

              <div className="unified-print-ribbon__divider" />

              {/* Zoom Controls */}
              <div className="unified-print-ribbon__group">
                <span className="unified-print-ribbon__label">Scale:</span>
                <div className="unified-print-zoom-controls" title="Viewport Inspection Scale">
                  <button
                    type="button"
                    className="unified-print-zoom-btn"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.6}
                    title="Zoom Out (-10%)"
                    aria-label="Zoom Out"
                  >
                    <span className="material-symbols-rounded">zoom_out</span>
                  </button>
                  <button
                    type="button"
                    className="unified-print-zoom-indicator"
                    onClick={handleZoomReset}
                    title="Reset to 100%"
                    aria-label="Reset Zoom"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    className="unified-print-zoom-btn"
                    onClick={handleZoomIn}
                    disabled={zoom >= 1.4}
                    title="Zoom In (+10%)"
                    aria-label="Zoom In"
                  >
                    <span className="material-symbols-rounded">zoom_in</span>
                  </button>
                  <button
                    type="button"
                    className={`unified-print-zoom-btn ${zoom === 0.85 ? 'unified-print-zoom-btn--active' : ''}`}
                    onClick={handleZoomFit}
                    title="Fit to Height (85%)"
                    aria-label="Fit View"
                  >
                    <span className="material-symbols-rounded">fit_screen</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Shortcut Hints */}
            <div className="unified-print-ribbon__hints">
              <span className="unified-print-hint-key">Ctrl+P</span>
              <span>Print</span>
              <span className="unified-print-meta-dot">•</span>
              <span className="unified-print-hint-key">Esc</span>
              <span>Close</span>
            </div>
          </div>
        </header>

        {/* Scrollable Document Canvas Viewport */}
        <div className="unified-print-viewport">
          <div
            className="unified-print-canvas-scaler"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
          >
            <div
              ref={sheetRef}
              className={`unified-print-paper-sheet ${getSheetClass()} unified-bill-sheet unified-print-portal`}
            >
              {isThermalToken ? (
                <ThermalPosTokenSlip
                  bill={normalizedBill}
                  patient={normalizedBill.patient}
                  visit={normalizedBill.visit}
                  admission={normalizedBill.admission}
                  config={effectiveConfig}
                />
              ) : (
                <A4HospitalInvoiceTemplate
                  bill={normalizedBill}
                  patient={normalizedBill.patient}
                  visit={normalizedBill.visit}
                  admission={normalizedBill.admission}
                  lineItems={normalizedBill.lineItems}
                  config={effectiveConfig}
                  workflowType={normalizedBill.workflowType}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default UnifiedBillPrintModal;

