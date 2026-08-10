import React, { useState, useRef } from 'react';
import { Md3Button } from './Md3FormComponents';
import { Icon } from './Md3Widgets';
import './Md3FileUpload.css';

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const Md3FileUpload = ({ visit, onUpload, disabled }) => {
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const labOrders = visit?.labOrders || [];
  // Filter for non-completed or all lab orders
  const availableOrders = labOrders.filter(
    (o) => (o.status || '').toUpperCase() !== 'COMPLETED'
  );
  const targetOrders = availableOrders.length > 0 ? availableOrders : labOrders;

  const handleFileChange = (incomingFile) => {
    setError('');
    if (!incomingFile) return;

    if (incomingFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size exceeds maximum limit of ${MAX_FILE_SIZE_MB} MB`);
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    setFile(incomingFile);
    if (incomingFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(incomingFile);
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

    try {
      setUploading(true);
      setError('');
      await onUpload(visit._id, orderIdToUse, file);
      // Reset state on success
      setFile(null);
      setPreviewUrl(null);
      setSelectedOrderId('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setError('');
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

        <div
          className={`md3-file-upload-dropzone ${dragActive ? 'is-drag-active' : ''} ${file ? 'has-file' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="md3-file-upload-input"
            accept="image/*,application/pdf,.dcm"
            onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
            disabled={disabled || uploading}
          />

          {!file ? (
            <div className="md3-file-upload-dropzone__placeholder">
              <div className="md3-file-upload-dropzone__icon">
                <Icon.Upload />
              </div>
              <p className="md3-file-upload-dropzone__text">
                <strong>Click to browse</strong> or drag & drop scan file here
              </p>
              <span className="md3-file-upload-dropzone__hint">
                Supports DICOM, PDF reports, radiological images
              </span>
            </div>
          ) : (
            <div className="md3-file-upload-preview">
              {previewUrl ? (
                <img src={previewUrl} alt="Scan preview" className="md3-file-upload-preview__img" />
              ) : (
                <div className="md3-file-upload-preview__icon">
                  <Icon.FileSearch />
                </div>
              )}
              <div className="md3-file-upload-preview__info">
                <span className="md3-file-upload-preview__filename">{file.name}</span>
                <span className="md3-file-upload-preview__filesize">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
              <button
                type="button"
                className="md3-file-upload-preview__remove"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
                disabled={disabled || uploading}
                aria-label="Remove file"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {error && <div className="md3-file-upload-error">{error}</div>}

        <div className="md3-file-upload-card__actions">
          <Md3Button
            type="submit"
            variant="primary"
            disabled={!file || disabled || uploading}
            loading={uploading}
            loadingText="Uploading Scan..."
          >
            Upload Scan
          </Md3Button>
        </div>
      </form>
    </div>
  );
};

export default Md3FileUpload;
