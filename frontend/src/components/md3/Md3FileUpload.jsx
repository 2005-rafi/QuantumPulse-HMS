/**
 * Md3FileUpload — Reusable Material Design 3 File Upload Component.
 * 
 * Features:
 * - Drag-and-drop file zone with spring hover affordance
 * - Client-side MIME validation (PDF, PNG, JPG, WEBP) & Size Limits (5 KB - 10 MB)
 * - In-browser canvas pre-compression for images to optimize Cloudinary Free Tier
 * - Live upload progress state and failure retry feedback
 * - Clean file preview card with remove action
 */

import React, { useState, useRef, useCallback } from 'react';
import './Md3FileUpload.css';

const DEFAULT_ALLOWED_MIMES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const DEFAULT_ALLOWED_EXTS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
const MIN_SIZE_BYTES = 5 * 1024;         // 5 KB
const MAX_SIZE_BYTES = 10 * 1024 * 1024;  // 10 MB

/**
 * Helper to compress image in-browser before uploading
 */
const compressImageFile = async (file, maxWidth = 1920, quality = 0.85) => {
  if (file.type === 'application/pdf' || file.size < 800 * 1024) {
    return file; // Return as is for PDF or small images
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file); // Fallback to original if compression didn't help
            } else {
              const compressedFile = new File([blob], file.name, {
                type: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            }
          },
          file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export const Md3FileUpload = ({
  id = 'md3-file-upload',
  name = 'file',
  label = 'Upload Medical Report or Certificate',
  hint = 'Allowed: PDF, PNG, JPG, JPEG, WEBP • 5 KB to 10 MB',
  accept = '.pdf,.png,.jpg,.jpeg,.webp',
  allowedMimeTypes = DEFAULT_ALLOWED_MIMES,
  maxSizeBytes = MAX_SIZE_BYTES,
  minSizeBytes = MIN_SIZE_BYTES,
  value = null, // Can be File object or metadata object { fileName, sizeBytes, url }
  onChange,
  onUploadProgress,
  disabled = false,
  error = null,
  required = false,
  uploading = false,
  uploadProgress = 0,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [internalError, setInternalError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(value);
  const fileInputRef = useRef(null);

  // Sync internal state when external value changes
  React.useEffect(() => {
    setSelectedFile(value);
  }, [value]);

  const validateAndProcessFile = useCallback(async (rawFile) => {
    setInternalError(null);
    if (!rawFile) return;

    // 1. MIME Validation
    const isValidMime = allowedMimeTypes.some(
      (type) => rawFile.type === type || rawFile.name.toLowerCase().endsWith(type.replace('image/', '.'))
    );
    if (!isValidMime) {
      setInternalError('Invalid file type. Only PDF and Image (PNG, JPG, WEBP) documents are permitted.');
      return;
    }

    // 2. Minimum Size Check
    if (rawFile.size < minSizeBytes) {
      setInternalError('File is too small. Minimum allowed size is 5 KB.');
      return;
    }

    // 3. Maximum Size Check
    if (rawFile.size > maxSizeBytes) {
      setInternalError(`File size (${(rawFile.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 10 MB limit.`);
      return;
    }

    // 4. Pre-compress image if applicable
    const processedFile = await compressImageFile(rawFile);

    setSelectedFile(processedFile);
    onChange?.(processedFile);
  }, [allowedMimeTypes, minSizeBytes, maxSizeBytes, onChange]);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndProcessFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndProcessFile(files[0]);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setInternalError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onChange?.(null);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const fileName = selectedFile?.name || selectedFile?.fileName || 'Attached Document';
  const fileSize = selectedFile?.size || selectedFile?.sizeBytes || 0;
  const isPdf = (selectedFile?.type === 'application/pdf') || (fileName.toLowerCase().endsWith('.pdf'));

  const activeError = error || internalError;

  return (
    <div className={`md3-file-upload-wrapper ${disabled ? 'is-disabled' : ''}`}>
      {label && (
        <label className="md3-file-upload-label" htmlFor={id}>
          {label} {required && <span className="md3-required-star">*</span>}
        </label>
      )}

      {selectedFile ? (
        // ── Attached File Card ──
        <div className="md3-file-attached-card">
          <div className="md3-file-attached-left">
            <span className="material-symbols-rounded md3-file-icon">
              {isPdf ? 'picture_as_pdf' : 'image'}
            </span>
            <div className="md3-file-attached-info">
              <span className="md3-file-attached-name" title={fileName}>
                {fileName}
              </span>
              <span className="md3-file-attached-meta">
                {formatFileSize(fileSize)} • Cloud Storage Managed
              </span>
            </div>
          </div>

          {!disabled && !uploading && (
            <button
              type="button"
              className="md3-file-remove-btn"
              onClick={handleRemove}
              title="Remove file"
              aria-label="Remove uploaded file"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          )}
        </div>
      ) : (
        // ── Drag & Drop Zone ──
        <div
          className={`md3-file-dropzone ${isDragOver ? 'is-drag-over' : ''} ${activeError ? 'has-error' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
        >
          <input
            id={id}
            name={name}
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={accept}
            disabled={disabled}
            style={{ display: 'none' }}
          />

          <span className="material-symbols-rounded md3-file-cloud-icon">
            cloud_upload
          </span>

          <div className="md3-file-dropzone-text">
            <span className="md3-file-dropzone-title">
              <strong>Click to upload</strong> or drag and drop
            </span>
            <span className="md3-file-dropzone-hint">{hint}</span>
          </div>
        </div>
      )}

      {/* Uploading Progress Indicator */}
      {uploading && (
        <div className="md3-file-upload-progress">
          <div className="md3-file-progress-header">
            <span>Uploading to secure storage...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="md3-file-progress-track">
            <div
              className="md3-file-progress-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {activeError && (
        <div className="md3-file-upload-error-text" role="alert">
          <span className="material-symbols-rounded">error</span>
          <span>{activeError}</span>
        </div>
      )}
    </div>
  );
};

export default Md3FileUpload;
