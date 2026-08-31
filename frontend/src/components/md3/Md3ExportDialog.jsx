/**
 * Md3ExportDialog — Reusable Material Design 3 Clinical Export Component.
 * Strictly adheres to SOLID principles and HIPAA Safe Harbor privacy guidelines.
 */

import React, { useState, useRef } from 'react';
import { Md3BottomSheet, Md3Button, Md3TextField } from './Md3FormComponents';
import { patientAPI } from '../../services/patientAPI';
import './Md3ExportDialog.css';

const SCOPES = [
  { id: 'today', label: "Today's Records", icon: 'today', desc: "Export records registered or visited today" },
  { id: 'dateRange', label: 'Date Range', icon: 'date_range', desc: 'Pick custom start and end date range' },
  { id: 'all', label: 'All Hospital Records', icon: 'groups', desc: 'Export full historical records with totals' },
];

const TEMPLATES = [
  {
    id: 'walkin',
    name: 'Reception Walk-in Summary',
    icon: 'badge',
    desc: "OPD walk-ins, daily tokens, doctors, departments & fees paid",
    columnsCount: 18,
  },
  {
    id: 'financial',
    name: 'Billing & Revenue Summary',
    icon: 'payments',
    desc: "Revenue collected, consultation fees breakdown & payment methods",
    columnsCount: 15,
  },
  {
    id: 'demographics',
    name: 'Master Demographics Only',
    icon: 'contacts',
    desc: "Complete patient directory, age, gender, contact info & lifetime totals",
    columnsCount: 12,
  },
];

export const Md3ExportDialog = ({
  isOpen,
  onClose,
  title = 'Export Hospital Records',
  subtitle = 'Export sanitized demographic & financial summaries (HIPAA Safe Harbor Compliant)',
  onExportSuccess,
}) => {
  const [scope, setScope] = useState('today');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [format, setFormat] = useState('csv');
  const [selectedTemplate, setSelectedTemplate] = useState('walkin');
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  const abortControllerRef = useRef(null);

  const handleStartExport = async () => {
    setError(null);
    setSuccessInfo(null);
    setLoading(true);
    setProgressText('Initializing secure keyset stream...');

    abortControllerRef.current = new AbortController();

    try {
      const result = await patientAPI.exportData(
        {
          reportType: selectedTemplate,
          scope,
          startDate: scope === 'dateRange' ? startDate : undefined,
          endDate: scope === 'dateRange' ? endDate : undefined,
          format,
        },
        (progress) => {
          const kb = (progress.receivedBytes / 1024).toFixed(1);
          setProgressText(`Streaming data: ${kb} KB transferred...`);
        },
        abortControllerRef.current.signal
      );

      setSuccessInfo(`Successfully exported ${result.filename} (${(result.totalBytes / 1024).toFixed(1)} KB)`);
      onExportSuccess?.(result);
    } catch (err) {
      if (err.name === 'AbortError') {
        setProgressText('Export cancelled by user.');
      } else {
        setError(err.message || 'Export streaming failed. Please check date range.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelExport = () => {
    if (loading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onClose();
  };

  return (
    <Md3BottomSheet
      isOpen={isOpen}
      onClose={handleCancelExport}
      title={title}
      subtitle={subtitle}
      initialHeightVh={85}
      className="md3-export-bottom-sheet"
    >
      <div className="md3-export-container">
        
        {/* HIPAA Compliance Assurance Banner */}
        <div className="md3-export-hipaa-badge">
          <span className="material-symbols-rounded">verified_user</span>
          <div className="md3-export-hipaa-text">
            <strong>HIPAA Safe Harbor Protected</strong>
            <span>Clinical diagnosis codes, doctor clinical SOAP notes, prescriptions, and psychiatric records are strictly excluded.</span>
          </div>
        </div>

        {error && (
          <div className="md3-export-alert md3-export-alert--error" role="alert">
            <span className="material-symbols-rounded">error</span>
            <span>{error}</span>
          </div>
        )}

        {successInfo && (
          <div className="md3-export-alert md3-export-alert--success" role="status">
            <span className="material-symbols-rounded">check_circle</span>
            <span>{successInfo}</span>
          </div>
        )}

        {/* 1. Time Horizon / Scope Selection */}
        <div className="md3-export-section">
          <span className="md3-export-section-title">1. Select Time Horizon</span>
          <div className="md3-export-scope-grid">
            {SCOPES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`md3-export-scope-card ${scope === s.id ? 'is-active' : ''}`}
                onClick={() => setScope(s.id)}
                disabled={loading}
              >
                <div className="md3-export-scope-header">
                  <span className="material-symbols-rounded">{s.icon}</span>
                  <span className="md3-export-scope-label">{s.label}</span>
                </div>
                <span className="md3-export-scope-desc">{s.desc}</span>
              </button>
            ))}
          </div>

          {scope === 'dateRange' && (
            <div className="md3-export-dates-card">
              <div className="md3-export-dates-header">
                <span className="material-symbols-rounded">calendar_month</span>
                <span>Select Custom Date Horizon</span>
              </div>
              <div className="md3-export-dates-row">
                <Md3TextField
                  id="exportStartDate"
                  name="startDate"
                  type="date"
                  label="Start Date *"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={loading}
                />
                <Md3TextField
                  id="exportEndDate"
                  name="endDate"
                  type="date"
                  label="End Date *"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Export Templates */}
        <div className="md3-export-section">
          <span className="md3-export-section-title">2. Choose Report Template</span>
          <div className="md3-export-templates-list">
            {TEMPLATES.map((tmpl) => (
              <label
                key={tmpl.id}
                className={`md3-export-template-item ${selectedTemplate === tmpl.id ? 'is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="exportTemplate"
                  checked={selectedTemplate === tmpl.id}
                  onChange={() => setSelectedTemplate(tmpl.id)}
                  disabled={loading}
                />
                <div className="md3-export-template-info">
                  <span className="md3-export-template-name">{tmpl.name}</span>
                  <span className="md3-export-template-meta">
                    {tmpl.columnsCount} whitelisted columns • {tmpl.desc}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 3. Export Format */}
        <div className="md3-export-section">
          <span className="md3-export-section-title">3. Export File Format</span>
          <div className="md3-export-format-group">
            <button
              type="button"
              className={`md3-export-format-btn ${format === 'csv' ? 'is-active' : ''}`}
              onClick={() => setFormat('csv')}
              disabled={loading}
            >
              <span className="material-symbols-rounded">table_view</span>
              <span>CSV Spreadsheet (.csv)</span>
            </button>
            <button
              type="button"
              className={`md3-export-format-btn ${format === 'json' ? 'is-active' : ''}`}
              onClick={() => setFormat('json')}
              disabled={loading}
            >
              <span className="material-symbols-rounded">data_object</span>
              <span>JSON Structured (.json)</span>
            </button>
          </div>
        </div>

        {/* Live Progress Bar during active stream */}
        {loading && (
          <div className="md3-export-progress-box">
            <div className="md3-export-progress-header">
              <span className="md3-export-progress-label">{progressText}</span>
              <span className="md3-export-progress-spinner" />
            </div>
            <div className="md3-export-linear-progress">
              <div className="md3-export-linear-progress-bar" />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="md3-export-actions-row">
          <Md3Button
            type="button"
            variant="secondary"
            onClick={handleCancelExport}
            disabled={false}
            style={{ width: 'auto', minWidth: '110px' }}
          >
            {loading ? 'Abort / Close' : 'Cancel'}
          </Md3Button>
          <Md3Button
            type="button"
            variant="primary"
            onClick={handleStartExport}
            disabled={loading}
            loading={loading}
            loadingText="Streaming Export..."
            style={{ width: 'auto', minWidth: '220px' }}
          >
            <span className="material-symbols-rounded" style={{ marginRight: 6 }}>download</span>
            Start Keyset Export
          </Md3Button>
        </div>
      </div>
    </Md3BottomSheet>
  );
};

export default Md3ExportDialog;
