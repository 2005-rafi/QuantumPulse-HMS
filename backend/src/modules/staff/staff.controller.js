const service = require('./staff.service');
const { success } = require('../../core/responses');
const AppError = require('../../core/errors/AppError');
const CloudinaryStorageService = require('../../core/storage/CloudinaryStorageService');

const create = async (req, res, next) => {
  try {
    const staff = await service.create(req.body, req.user?.staffId);
    return success(res, staff, 'Staff record created successfully', 201);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const staff = await service.getById(req.params.id);
    return success(res, staff, 'Staff record retrieved successfully');
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const staff = await service.update(req.params.id, req.body, req.user?.staffId);
    return success(res, staff, 'Staff record updated successfully');
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const { page, limit, status, departmentId, roleId, role } = req.query;
    const result = await service.list({ 
      page: +page || 1, 
      limit: +limit || 1000, 
      status, 
      departmentId, 
      roleId, 
      role 
    });
    return success(res, result, 'Staff list retrieved successfully');
  } catch (err) { next(err); }
};

const disableStaff = async (req, res, next) => {
  try {
    const result = await service.disableStaff(req.params.id);
    return success(res, result, 'Staff account disabled successfully');
  } catch (err) { next(err); }
};

const enableStaff = async (req, res, next) => {
  try {
    const result = await service.enableStaff(req.params.id);
    return success(res, result, 'Staff account re-enabled successfully');
  } catch (err) { next(err); }
};

const deleteStaff = async (req, res, next) => {
  try {
    const result = await service.deleteStaff(req.params.id);
    return success(res, result, 'Staff account deleted successfully');
  } catch (err) { next(err); }
};

const changePosition = async (req, res, next) => {
  try {
    const staff = await service.changePosition(
      req.params.id,
      req.body.position,
      req.body.reason,
      req.user?.staffId
    );
    return success(res, staff, 'Staff position updated successfully');
  } catch (err) { next(err); }
};

const getPositionHistory = async (req, res, next) => {
  try {
    const history = await service.getPositionHistory(req.params.id);
    return success(res, history, 'Staff position history retrieved successfully');
  } catch (err) { next(err); }
};

const generateUsername = async (req, res, next) => {
  try {
    const username = await service.generateUsername();
    return success(res, { username }, 'Suggested username generated');
  } catch (err) { next(err); }
};

const uploadCertificate = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return next(new AppError('VALIDATION_001', 'No file buffer uploaded'));
    }

    const filename = `cert_${Date.now()}`;
    const uploadResult = await CloudinaryStorageService.uploadBuffer(req.file.buffer, {
      folder: 'certificates',
      filename,
      mimeType: req.file.mimetype,
      tags: ['staff_certificate', req.user?.role || 'Staff'],
      context: {
        uploadedBy: req.user?.staffId || req.user?.userId || '',
      },
      isPrivate: true,
    });

    const presignedUrl = CloudinaryStorageService.generatePresignedUrl(uploadResult.publicId, {
      expiresInSeconds: 3600,
      resourceType: uploadResult.resourceType,
      format: req.file.mimetype === 'application/pdf' ? 'pdf' : undefined,
    });

    const metadata = {
      url: presignedUrl,
      secureUrl: uploadResult.secureUrl,
      cloudinaryPublicId: uploadResult.publicId,
      resourceType: uploadResult.resourceType,
      fileName: req.file.originalname,
      sizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date(),
    };

    return success(res, metadata, 'Certificate document uploaded successfully to Cloudinary', 201);
  } catch (err) { next(err); }
};

const downloadCertificate = async (req, res, next) => {
  try {
    const Staff = require('./staff.model');
    const { filename, id } = req.params;
    const targetId = id || filename;

    // Check if targetId matches a staff _id or publicId
    const staff = await Staff.findById(targetId);
    const cert = staff?.verificationDocument;

    if (cert && cert.cloudinaryPublicId) {
      const presignedUrl = CloudinaryStorageService.generatePresignedUrl(cert.cloudinaryPublicId, {
        expiresInSeconds: 300,
        resourceType: cert.resourceType || (cert.mimeType === 'application/pdf' ? 'raw' : 'image'),
        format: cert.mimeType === 'application/pdf' ? 'pdf' : undefined,
      });

      if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
        return success(res, { downloadUrl: presignedUrl, metadata: cert }, 'Certificate URL generated');
      }
      return res.redirect(presignedUrl);
    }

    // Direct publicId lookup
    if (filename) {
      const presignedUrl = CloudinaryStorageService.generatePresignedUrl(`hms_production/certificates/${filename}`, {
        expiresInSeconds: 300,
        resourceType: 'image',
      });
      return res.redirect(presignedUrl);
    }

    return next(new AppError('NOT_FOUND', 'Certificate file not found'));
  } catch (err) { next(err); }
};

module.exports = { 
  create, 
  getById, 
  update, 
  list, 
  disableStaff, 
  enableStaff, 
  deleteStaff, 
  changePosition, 
  getPositionHistory,
  generateUsername,
  uploadCertificate,
  downloadCertificate,
};
