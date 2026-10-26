import React, { useState } from 'react';
import Md3FileUpload from './Md3FileUpload';

const Md3FileUploader = ({ value, onChange, disabled, uploading = false, uploadProgress = 0, error = null }) => {
  const [internalError, setInternalError] = useState(null);

  const handleFileSelect = (file) => {
    setInternalError(null);
    if (!file) {
      onChange?.(null);
      return;
    }

    // If it's already a Cloudinary metadata object from existing profile
    if (!file.name && file.url) {
      onChange?.(file);
      return;
    }

    // Stage the file locally without immediate network upload
    const stagedMetadata = {
      file,
      fileName: file.name,
      sizeBytes: file.size,
      mimeType: file.type,
      isStaged: true,
    };
    onChange?.(stagedMetadata);
  };

  return (
    <Md3FileUpload
      label=""
      hint="PDF, PNG, JPG, WEBP • Max 10 MB (Cloudinary Encrypted)"
      value={value}
      onChange={handleFileSelect}
      disabled={disabled || uploading}
      uploading={uploading}
      uploadProgress={uploadProgress}
      error={error || internalError}
    />
  );
};

export default Md3FileUploader;
