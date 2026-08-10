import React, { useState, useRef } from 'react';
import { staffAPI } from '../../services/staffAPI';
import { Icon } from './Md3Widgets';
import './Md3FileUpload.css';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const Md3FileUploader = ({ value, onChange, disabled }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (incomingFile) => {
    setError('');
    if (!incomingFile) return;

    if (incomingFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size exceeds maximum limit of ${MAX_FILE_SIZE_MB} MB`);
      return;
    }

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpg', 'image/jpeg'];
    if (!allowedTypes.includes(incomingFile.type)) {
      setError('File type rejected. Only PDF, PNG, JPG, and JPEG allowed.');
      return;
    }

    const formData = new FormData();
    formData.append('document', incomingFile);
    setUploading(true);
    setProgress(0);

    try {
      const response = await staffAPI.uploadCertificate(formData);
      // Backend returns the metadata object in response.data (or response if direct response)
      // Check structure of response
      const metadata = response.data;
      if (onChange) {
        onChange(metadata);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to upload certificate');
    } finally {
      setUploading(false);
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

  const handleRemoveFile = () => {
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onChange) {
      onChange(null);
    }
  };

  return (
    <div className="md3-file-uploader-wrapper">
      <div
        className={`md3-file-upload-dropzone ${dragActive ? 'is-drag-active' : ''} ${value ? 'has-file' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !value && !disabled && !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="md3-file-upload-input"
          accept="image/png,image/jpeg,image/jpg,application/pdf"
          onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
          disabled={disabled || uploading}
        />

        {uploading ? (
          <div className="md3-file-upload-dropzone__placeholder">
            <div style={{ width: 32, height: 32, border: '3px solid #eaddff', borderTopColor: '#6750a4', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 8px' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p className="md3-file-upload-dropzone__text">Uploading certificate...</p>
          </div>
        ) : !value ? (
          <div className="md3-file-upload-dropzone__placeholder">
            <div className="md3-file-upload-dropzone__icon">
              <span className="material-symbols-rounded">cloud_upload</span>
            </div>
            <p className="md3-file-upload-dropzone__text">
              <strong>Click to browse</strong> or drag & drop certificate here
            </p>
            <span className="md3-file-upload-dropzone__hint">
              Supports PDF, PNG, JPG, JPEG (Max {MAX_FILE_SIZE_MB}MB)
            </span>
          </div>
        ) : (
          <div className="md3-file-upload-preview">
            <div className="md3-file-upload-preview__icon">
              <span className="material-symbols-rounded">verified_user</span>
            </div>
            <div className="md3-file-upload-preview__info">
              <span className="md3-file-upload-preview__filename">{value.fileName}</span>
              <span className="md3-file-upload-preview__filesize">
                {(value.sizeBytes / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
            <button
              type="button"
              className="md3-file-upload-preview__remove"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile();
              }}
              disabled={disabled}
              aria-label="Remove file"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {error && <div className="md3-file-upload-error mt-2">{error}</div>}
    </div>
  );
};

export default Md3FileUploader;
