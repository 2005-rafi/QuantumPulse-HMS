import React, { useState } from 'react';
import { staffAPI } from '../../services/staffAPI';
import Md3FileUpload from './Md3FileUpload';

const Md3FileUploader = ({ value, onChange, disabled }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleFileSelect = async (file) => {
    setError(null);
    if (!file) {
      onChange?.(null);
      return;
    }

    // If it's already a metadata object
    if (!file.name && file.url) {
      onChange?.(file);
      return;
    }

    const formData = new FormData();
    formData.append('document', file);
    setUploading(true);
    setUploadProgress(20);

    try {
      setUploadProgress(60);
      const response = await staffAPI.uploadCertificate(formData);
      setUploadProgress(100);
      
      const metadata = response.data || response;
      onChange?.(metadata);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to upload certificate to secure cloud storage');
      onChange?.(null);
    } finally {
      setUploading(false);
    }
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
      error={error}
    />
  );
};

export default Md3FileUploader;
