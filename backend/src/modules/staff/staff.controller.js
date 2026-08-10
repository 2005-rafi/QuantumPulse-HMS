const service = require('./staff.service');
const { success } = require('../../core/responses');

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
    const AppError = require('../../core/errors/AppError');
    if (!req.file) {
      return next(new AppError('VALIDATION_001', 'No file uploaded'));
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/api/v1/staff/certificates/${req.storedFilename}`;
    const metadata = {
      url: fileUrl,
      fileName: req.file.originalname,
      sizeBytes: req.file.size,
      uploadedAt: new Date()
    };
    return success(res, metadata, 'Certificate document uploaded successfully', 201);
  } catch (err) { next(err); }
};

const downloadCertificate = async (req, res, next) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const AppError = require('../../core/errors/AppError');
    const { StorageService } = require('./staff.upload');
    const { filename } = req.params;
    
    const relativePath = `certificates/${filename}`;
    const absolutePath = StorageService.absolutePath(relativePath);
    
    if (!fs.existsSync(absolutePath)) {
      return next(new AppError('NOT_FOUND', 'Certificate file not found'));
    }
    
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.sendFile(absolutePath);
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
