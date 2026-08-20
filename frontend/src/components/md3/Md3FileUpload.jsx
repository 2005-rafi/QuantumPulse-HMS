import React, { useState, useRef, useEffect } from 'react';
import { Md3Button } from './Md3FormComponents';
import { Icon } from './Md3Widgets';
import './Md3FileUpload.css';

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MIN_FILE_SIZE_BYTES = 5 * 1024; // 5 KB

const Md3FileUpload = ({ visit, onUpload, disabled }) => {
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const fileInputRef = useRef(null);

  const labOrders = visit?.labOrders || [];
  // Filter for non-completed or all lab orders
  const availableOrders = labOrders.filter(
    (o) => (o.status || '').toUpperCase() !== 'COMPLETED'
  );
  const targetOrders = availableOrders.length > 0 ? availableOrders : labOrders;

  // Clean up preview object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (incomingFile) => {
    setError('');
    setIsVerified(false);
    if (!incomingFile) return;

    if (incomingFile.size < MIN_FILE_SIZE_BYTES) {
      setError(`File size is too small (${(incomingFile.size / 1024).toFixed(1)} KB). Minimum required size is 5 KB.`);
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (incomingFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size exceeds maximum limit of ${MAX_FILE_SIZE_MB} MB`);
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    // Revoke previous URL if selecting another file
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(incomingFile);
    if (incomingFile.type.startsWith('image/') || incomingFile.type === 'application/pdf') {
      const objectUrl = URL.createObjectURL(incomingFile);
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const orderIdToUse = selectedOrderId || (targetOrders[0] ? (targetOrders[0]._id || targetOrders[0].id) : null);
    if (!orderIdToUse) {
      setError('Please select a target lab order for this scan');
      return;
    }
    if (!file) {
      setError('Please select or drop a file to upload');
      return;
    }
    if (!isVerified) {
      setError('Please verify the document preview before uploading');
      return;
    }

    try {
      setUploading(true);
      setError('');
      await onUpload(visit._id, orderIdToUse, file);
      // Reset state on success
      handleRemoveFile();
    } catch (err) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setIsVerified(false);
    setError('');
    setSelectedOrderId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!visit) return null;

  return (
    <div className="md3-file-upload-card" role="region" aria-label="Laboratory Scan Upload">
      <div className="md3-file-upload-card__header">
        <div className="md3-file-upload-card__title">
          <Icon.FileSearch />
          <span>Upload Specimen Scan / Report</span>
        </div>
        <span className="md3-file-upload-card__subtitle">
          Max {MAX_FILE_SIZE_MB} MB • PDF, PNG, JPG, DICOM
        </span>
      </div>

      <form onSubmit={handleSubmit} className="md3-file-upload-card__body">
        {targetOrders.length > 1 && (
          <div className="md3-file-upload-card__select-group">
            <label htmlFor="lab-order-select" className="md3-file-upload-card__label">
              Target Test / Lab Order
            </label>
            <select
              id="lab-order-select"
              className="md3-file-upload-card__select"
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              disabled={disabled || uploading}
            >
              <option value="">-- Select Lab Order --</option>
              {targetOrders.map((ord) => (
                <option key={ord._id || ord.id} value={ord._id || ord.id}>
                  {ord.testName || ord.name || 'Lab Test'} ({ord.status || 'PENDING'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* File Dropzone */}
        {!file && (
          <div
            className={`md3-file-upload-dropzone ${dragActive ? 'is-drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="md3-file-upload-input"
              accept="image/*,application/pdf,.dcm"
              onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
              disabled={disabled || uploading}
            />

            <div className="md3-file-upload-dropzone__placeholder">
              <div className="md3-file-upload-dropzone__icon">
                <Icon.Upload />
              </div>
              <p className="md3-file-upload-dropzone__text">
                <strong>Click to browse</strong> or drag & drop scan file here
              </p>
              <span className="md3-file-upload-dropzone__hint">
                Supports DICOM, PDF reports, radiological images (Min 5 KB, Max {MAX_FILE_SIZE_MB} MB)
              </span>
            </div>
          </div>
        )}

        {/* Live Staging Preview Panel */}
        {file && (
          <div className="md3-file-upload-preview-pane">
            <div className="md3-file-upload-preview-pane__header">
              <span className="md3-file-upload-preview-pane__title">Document Preview (Staged)</span>
              <button
                type="button"
                className="md3-file-upload-preview-pane__remove"
                onClick={handleRemoveFile}
                disabled={uploading}
                aria-label="Remove staged file"
              >
                <Icon.Clear aria-hidden="true" />
                <span>Remove</span>
              </button>
            </div>

            <div className="md3-file-upload-preview-pane__viewport">
              {file.type.startsWith('image/') && previewUrl ? (
                <img src={previewUrl} alt="Staged scan preview" className="md3-file-upload-preview-pane__img" />
              ) : file.type === 'application/pdf' && previewUrl ? (
                <iframe
                  src={previewUrl}
                  title="Staged PDF report preview"
                  className="md3-file-upload-preview-pane__iframe"
                />
              ) : (
                <div className="md3-file-upload-preview-pane__generic">
                  <Icon.FileSearch className="md3-file-upload-preview-pane__generic-icon" />
                  <span className="md3-file-upload-preview-pane__generic-name">{file.name}</span>
                  <span className="md3-file-upload-preview-pane__generic-hint">
                    No visual preview available for this format (DICOM / raw data).
                  </span>
                </div>
              )}
            </div>

            <div className="md3-file-upload-preview-pane__meta">
              <span className="md3-file-upload-preview-pane__filename">{file.name}</span>
              <span className="md3-file-upload-preview-pane__filesize">
                {(file.size / (1024 * 1024)).toFixed(3)} MB
              </span>
            </div>

            <div className="md3-file-upload-preview-pane__verify">
              <label className="md3-file-upload-preview-pane__verify-label">
                <input
                  type="checkbox"
                  className="md3-file-upload-preview-pane__checkbox"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  disabled={uploading}
                />
                <span className="md3-file-upload-preview-pane__verify-text">
                  I have previewed this document and verify that it matches the correct patient record.
                </span>
              </label>
            </div>
          </div>
        )}

        {error && <div className="md3-file-upload-error">{error}</div>}

        <div className="md3-file-upload-card__actions">
          <Md3Button
            type="submit"
            variant="primary"
            disabled={!file || !isVerified || disabled || uploading}
            loading={uploading}
            loadingText="Finalizing Upload..."
          >
            Finalize Upload
          </Md3Button>
        </div>
      </form>
    </div>
  );
};

export default Md3FileUpload;
