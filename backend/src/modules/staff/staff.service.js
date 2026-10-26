const repo = require('./staff.repository');
const Staff = require('./staff.model');
const AppError = require('../../core/errors/app-error');
const identityService = require('../identity/identity.service');
const PositionHistory = require('./position-history.model');
const Role = require('../administration/role.model');
const mongoose = require('mongoose');
const { POSITIONS, TARIFF_GRADES, getTariffGrade } = require('../../core/constants');
const { withTransaction } = require('../../core/database/transaction');
const cacheService = require('../../core/cache/cache.service');


const logger = require('../../core/logger');
const auditService = require('../audit/audit.service');
const { AUDIT_CATEGORIES, AUDIT_SEVERITIES } = require('../audit/audit-constants');

const validateSpecialtyDetails = async (roleName, data, staffId = null, existing = null) => {

  // Pre-emptive duplicate checks to return clean errors
  const checkDuplicate = async (field, value, label) => {
    if (!value) return;
    const query = { [field]: value, isDeleted: { $ne: true } };
    if (staffId) query._id = { $ne: staffId };
    const duplicate = await Staff.findOne(query);
    if (duplicate) {
      throw new AppError('BAD_REQUEST', `${label} "${value}" is already registered to another staff member.`);
    }
  };

  // Clean empty/null values to prevent sparse unique index duplicate conflicts in Mongo
  const cleanField = (field) => {
    if (data[field] === '' || data[field] === null) {
      delete data[field];
    }
  };

  cleanField('medicalLicenseNumber');
  cleanField('nursingLicenseNumber');
  cleanField('labCertificationCode');
  cleanField('pharmacyLicenseNumber');

  // Reporting supervisor validation (mandatory for Interns, validated for any role if specified)
  const reportingToId = data.reportingTo !== undefined ? data.reportingTo : (staffId ? (await Staff.findById(staffId))?.reportingTo : null);
  const isDoctorIntern = roleName === 'Doctor' && (data.positionRank !== undefined ? data.positionRank === 1 : existing?.positionRank === 1);
  if (isDoctorIntern && !reportingToId) {
    throw new AppError('BAD_REQUEST', 'Reporting supervisor is required for Doctor Interns.');
  }
  if (reportingToId) {
    const supervisor = await Staff.findOne({ _id: reportingToId, isDeleted: { $ne: true } });
    if (!supervisor) {
      throw new AppError('BAD_REQUEST', 'Reporting supervisor not found.');
    }
    if (supervisor.positionRank === 1) {
      throw new AppError('BAD_REQUEST', 'Staff cannot report to an Intern (Rank 1).');
    }
  }
  if (isDoctorIntern) {
    data.consultingFee = 0;
    data.followUpFee = 0;
  }

  if (roleName === 'Doctor' || roleName === 'Surgeon') {
    const effectiveMedicalLicense = data.medicalLicenseNumber !== undefined
      ? data.medicalLicenseNumber
      : existing?.medicalLicenseNumber;

    if (!isDoctorIntern && (!effectiveMedicalLicense || !effectiveMedicalLicense.trim())) {
      throw new AppError('BAD_REQUEST', `Medical License Number is required for ${roleName} accounts.`);
    }
    if (data.medicalLicenseNumber) {
      await checkDuplicate('medicalLicenseNumber', data.medicalLicenseNumber, 'Medical License Number');
    }
    delete data.nursingLicenseNumber;
    delete data.labCertificationCode;
    delete data.pharmacyLicenseNumber;
  } else if (['Nurse', 'OPD Nurse', 'IPD Nurse', 'Lab Nurse'].includes(roleName)) {
    const effectiveNursingLicense = data.nursingLicenseNumber !== undefined
      ? data.nursingLicenseNumber
      : existing?.nursingLicenseNumber;

    if (!effectiveNursingLicense || !effectiveNursingLicense.trim()) {
      throw new AppError('BAD_REQUEST', `Nursing License Number is required for ${roleName} accounts.`);
    }
    if (data.nursingLicenseNumber) {
      await checkDuplicate('nursingLicenseNumber', data.nursingLicenseNumber, 'Nursing License Number');
    }
    delete data.medicalLicenseNumber;
    delete data.labCertificationCode;
    delete data.pharmacyLicenseNumber;
    delete data.consultingFee;
  } else if (roleName === 'Laboratory') {
    const effectiveLabCert = data.labCertificationCode !== undefined
      ? data.labCertificationCode
      : existing?.labCertificationCode;

    if (!effectiveLabCert || !effectiveLabCert.trim()) {
      throw new AppError('BAD_REQUEST', 'Laboratory Certification Code is required for Laboratory accounts.');
    }
    if (data.labCertificationCode) {
      await checkDuplicate('labCertificationCode', data.labCertificationCode, 'Laboratory Certification Code');
    }
    delete data.medicalLicenseNumber;
    delete data.nursingLicenseNumber;
    delete data.pharmacyLicenseNumber;
    delete data.consultingFee;
  } else if (roleName === 'Pharmacy') {
    const effectivePharmacyLicense = data.pharmacyLicenseNumber !== undefined
      ? data.pharmacyLicenseNumber
      : existing?.pharmacyLicenseNumber;

    if (!effectivePharmacyLicense || !effectivePharmacyLicense.trim()) {
      throw new AppError('BAD_REQUEST', 'Pharmacy License Number is required for Pharmacy accounts.');
    }
    if (data.pharmacyLicenseNumber) {
      await checkDuplicate('pharmacyLicenseNumber', data.pharmacyLicenseNumber, 'Pharmacy License Number');
    }
    delete data.medicalLicenseNumber;
    delete data.nursingLicenseNumber;
    delete data.labCertificationCode;
    delete data.consultingFee;
  } else {
    // Reception, Billing, Ward Operations & Administrator have no clinical license keys
    delete data.medicalLicenseNumber;
    delete data.nursingLicenseNumber;
    delete data.labCertificationCode;
    delete data.pharmacyLicenseNumber;
    delete data.consultingFee;
  }
};

const resolveCaller = (caller) => {
  const staffId = caller?._id || caller?.staffId || (typeof caller === 'string' ? caller : null);
  const isAdmin = caller?.role === 'Administrator' || (caller?.permissions && caller.permissions.includes('MANAGE_USERS'));
  const isHod = Boolean(caller?.isHod) && !isAdmin;
  const hodDeptId = isHod ? String(caller?.hodDepartmentId || caller?.departmentId || '') : null;
  const callerRank = caller?.positionRank || 7;
  return { staffId, isAdmin, isHod, hodDeptId, callerRank };
};

// Exported interface — other modules call this, never direct DB
const getById = async (id, caller = null) => {
  const staff = await repo.findById(id);
  if (!staff) throw new AppError('NOT_FOUND');

  if (caller) {
    const { isHod, hodDeptId, staffId } = resolveCaller(caller);
    if (isHod) {
      const targetDeptId = staff.departmentId?._id ? String(staff.departmentId._id) : String(staff.departmentId || '');
      const isSelf = staffId && String(staffId) === String(staff._id);
      if (!isSelf && targetDeptId !== hodDeptId) {
        throw new AppError('FORBIDDEN', 'Access denied: Staff member belongs to a different department.');
      }
    }
  }

  const identity = await identityService.getByStaffId(id);

  let permissions = [];
  if (staff.roleId?._id) {
    const adminRepo = require('../administration/administration.repository');
    permissions = await adminRepo.getPermissionsForRole(staff.roleId._id);
  }

  const directReportsCount = await Staff.countDocuments({ reportingTo: id, isDeleted: { $ne: true } });

  const isLocked = identity?.accountStatus === 'Locked' && (!identity?.lockUntil || new Date(identity.lockUntil) > new Date());

  return {
    ...staff,
    username: identity?.username || '',
    accountStatus: identity?.accountStatus || staff.status || 'Active',
    accountCreatedAt: identity?.createdAt || staff.createdAt || null,
    lastLoginAt: identity?.lastLoginAt || null,
    passwordChangedAt: identity?.passwordChangedAt || null,
    failedLoginAttempts: identity?.failedLoginAttempts || 0,
    lockUntil: identity?.lockUntil || null,
    isLocked: Boolean(isLocked),
    permissions: permissions || [],
    directReportsCount: directReportsCount || 0,
  };
};

const generateEmployeeId = async () => {
  const count = await repo.countDocuments();
  const randomStr = require('crypto').randomBytes(2).toString('hex').toUpperCase();
  return `EMP-${String(count + 1).padStart(4, '0')}-${randomStr}`;
};

/**
 * Generate a suggested login username in EMP000XXX format.
 * Pattern: EMP + zero-padded total staff count (docs/file2.md §Username Strategy).
 * Admin may override it; uniqueness is enforced by identity.service on creation.
 */
const generateUsername = async () => {
  const count = await repo.countDocuments();
  return `EMP${String(count + 1).padStart(6, '0')}`;
};

const create = async (data, caller = null) => {
  const { staffId: callerStaffId, isHod, hodDeptId, callerRank } = resolveCaller(caller);

  const role = await Role.findById(data.roleId);
  if (!role) throw new AppError('NOT_FOUND', 'Role not found');

  if (isHod) {
    if (role.name === 'Administrator') {
      throw new AppError('FORBIDDEN', 'HOD cannot create Administrator staff.');
    }
    if (data.departmentId && String(data.departmentId) !== hodDeptId) {
      throw new AppError('FORBIDDEN', 'HOD can only add staff to their own department.');
    }
    data.departmentId = hodDeptId;
  }

  const allowedPositions = POSITIONS[role.name];
  if (!allowedPositions || !allowedPositions.some(p => p.title === data.position)) {
    throw new AppError('BAD_REQUEST', `Invalid position "${data.position}" for role "${role.name}"`);
  }
  const posObj = allowedPositions.find(p => p.title === data.position);
  data.positionRank = (data.positionRank !== undefined && data.positionRank !== null && Number(data.positionRank) > 0)
    ? Number(data.positionRank)
    : (posObj ? posObj.rank : 1);
  data.tariffGrade = data.tariffGrade || getTariffGrade(data.positionRank);
  data.salaryGrade = data.salaryGrade || data.tariffGrade;

  if (isHod) {
    const isHodTitle = data.position.includes('Head of') || data.position.includes('Director') || data.position.includes('Superintendent') || data.position.includes('Chief');
    if (data.positionRank >= callerRank || isHodTitle) {
      throw new AppError('FORBIDDEN', 'Only Hospital Administrators can appoint or promote staff to Head of Department level.');
    }
  }

  const { username, password, ...staffFields } = data;

  // Pre-validate username availability if provided
  if (username && username.trim()) {
    const existingIdentity = await identityService.findByUsername(username.trim().toLowerCase());
    if (existingIdentity) {
      throw new AppError('CONFLICT', 'Username is already taken. Please choose another username.');
    }
  }

  const employeeId = await generateEmployeeId();

  // Validate dynamic role metadata
  await validateSpecialtyDetails(role.name, staffFields);

  const savedStaff = await withTransaction(async (session) => {
    const Staff = require('./staff.model');
    const newStaffDoc = new Staff({ ...staffFields, employeeId });
    await newStaffDoc.save(session ? { session } : {});
    
    await PositionHistory.create(
      [
        {
          staffId: newStaffDoc._id,
          previousPosition: null,
          newPosition: staffFields.position,
          changeType: 'ASSIGNMENT',
          reason: 'Initial staff registration assignment',
          changedBy: callerStaffId || newStaffDoc._id
        }
      ],
      session ? { session } : {}
    );

    // If registered directly as Head of Department / Director, sync department headOfDepartment
    const isHodPosition = ['Head of Department', 'Head of Surgery Department', 'Laboratory Director'].includes(staffFields.position);
    if (isHodPosition && staffFields.departmentId) {
      const Department = require('../administration/department.model');
      await Department.findByIdAndUpdate(
        staffFields.departmentId,
        { headOfDepartment: newStaffDoc._id },
        session ? { session } : {}
      );
    }

    // Atomically create login identity if username and password were provided
    if (username && password) {
      await identityService.createIdentity({
        staffId: newStaffDoc._id,
        username: username.trim().toLowerCase(),
        password,
      }, session);
    }

    return newStaffDoc;
  });

  cacheService.delByPattern('ref:staff:');
  const record = await repo.findById(savedStaff._id);
  return {
    ...record,
    username: username ? username.trim().toLowerCase() : '',
  };
};

const update = async (id, data, caller = null) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('NOT_FOUND');

  const { staffId: callerStaffId, isHod, hodDeptId, callerRank } = resolveCaller(caller);

  if (isHod) {
    const targetDeptId = existing.departmentId?._id ? String(existing.departmentId._id) : String(existing.departmentId || '');
    if (targetDeptId !== hodDeptId) {
      throw new AppError('FORBIDDEN', 'HOD can only modify staff within their own department.');
    }
    const existingRole = existing.roleId?.name || existing.role;
    if (existingRole === 'Administrator') {
      throw new AppError('FORBIDDEN', 'HOD cannot modify Administrator staff.');
    }
    if (String(existing._id) !== String(callerStaffId)) {
      const Department = require('../administration/department.model');
      const deptWithTargetAsHod = await Department.findOne({ headOfDepartment: existing._id });
      if (deptWithTargetAsHod) {
        throw new AppError('FORBIDDEN', 'HOD cannot modify another Head of Department.');
      }
    }
    if (data.departmentId && String(data.departmentId) !== hodDeptId) {
      throw new AppError('FORBIDDEN', 'HOD cannot transfer staff to another department.');
    }
  }
  
  const { username, password, ...staffData } = data;

  const roleId = staffData.roleId || (existing.roleId?._id || existing.roleId);
  const role = await Role.findById(roleId);
  if (!role) throw new AppError('NOT_FOUND', 'Role not found');

  const position = staffData.position || existing.position;
  const allowedPositions = POSITIONS[role.name];
  if (!allowedPositions || !allowedPositions.some(p => p.title === position)) {
    throw new AppError('BAD_REQUEST', `Invalid position "${position}" for role "${role.name}"`);
  }
  const posObj = allowedPositions.find(p => p.title === position);
  staffData.positionRank = (staffData.positionRank !== undefined && staffData.positionRank !== null && Number(staffData.positionRank) > 0)
    ? Number(staffData.positionRank)
    : (posObj ? posObj.rank : existing.positionRank || 1);
  if (!staffData.tariffGrade && (staffData.position || staffData.positionRank)) {
    staffData.tariffGrade = getTariffGrade(staffData.positionRank);
  }
  if (!staffData.salaryGrade && staffData.tariffGrade) {
    staffData.salaryGrade = staffData.tariffGrade;
  }

  if (isHod && staffData.position && staffData.position !== existing.position) {
    const isHodTitle = staffData.position.includes('Head of') || staffData.position.includes('Director') || staffData.position.includes('Superintendent') || staffData.position.includes('Chief');
    if (staffData.positionRank >= callerRank || isHodTitle) {
      throw new AppError('FORBIDDEN', 'Only Hospital Administrators can appoint or promote staff to Head of Department level.');
    }
  }

  // Validate dynamic role metadata
  await validateSpecialtyDetails(role.name, staffData, id, existing);
  
  const unsetFields = {};
  if (role.name !== 'Doctor' && role.name !== 'Surgeon' && existing.medicalLicenseNumber) {
    unsetFields.medicalLicenseNumber = 1;
  }
  if (!['Nurse', 'OPD Nurse', 'IPD Nurse', 'Lab Nurse'].includes(role.name) && existing.nursingLicenseNumber) {
    unsetFields.nursingLicenseNumber = 1;
  }
  if (role.name !== 'Laboratory' && existing.labCertificationCode) {
    unsetFields.labCertificationCode = 1;
  }
  if (role.name !== 'Pharmacy' && existing.pharmacyLicenseNumber) {
    unsetFields.pharmacyLicenseNumber = 1;
  }

  // Prune superseded Cloudinary certificate if replaced or cleared
  if (staffData.verificationDocument !== undefined && existing.verificationDocument?.cloudinaryPublicId) {
    const oldPublicId = existing.verificationDocument.cloudinaryPublicId;
    const newPublicId = staffData.verificationDocument?.cloudinaryPublicId;
    if (!newPublicId || oldPublicId !== newPublicId) {
      try {
        const CloudinaryStorageService = require('../../core/storage/cloudinary-storage.service');
        const resType = existing.verificationDocument.resourceType || (existing.verificationDocument.mimeType === 'application/pdf' ? 'raw' : 'image');
        CloudinaryStorageService.deleteAsset(oldPublicId, { resourceType: resType })
          .catch(err => logger.warn(`[CloudinaryPrune] Notice: could not prune superseded asset ${oldPublicId}: ${err.message}`));
      } catch (pruneErr) {
        logger.warn(`[CloudinaryPrune] Error initiating prune: ${pruneErr.message}`);
      }
    }
  }

  await withTransaction(async (session) => {
    if (staffData.position && staffData.position !== existing.position) {
      const newPosObj = allowedPositions.find(p => p.title === staffData.position);
      const currentPosObj = allowedPositions.find(p => p.title === existing.position);
      const oldRank = currentPosObj ? currentPosObj.rank : 0;
      const newRank = newPosObj.rank;

      let changeType = 'LATERAL';
      if (oldRank < newRank) {
        changeType = 'PROMOTION';
      } else if (oldRank > newRank) {
        changeType = 'DEMOTION';
      }

      await PositionHistory.create(
        [
          {
            staffId: id,
            previousPosition: existing.position,
            newPosition: staffData.position,
            changeType,
            reason: 'Modified via profile editor',
            changedBy: callerStaffId || id
          }
        ],
        session ? { session } : {}
      );
    }

    const updateDoc = Object.keys(unsetFields).length > 0
      ? { $set: staffData, $unset: unsetFields }
      : staffData;

    await repo.update(id, updateDoc, session ? { session } : {});
    
    // Sync department headOfDepartment if position is Head of Department
    const isHodPosition = ['Head of Department', 'Head of Surgery Department', 'Laboratory Director'].includes(staffData.position);
    if (isHodPosition && (staffData.departmentId || existing.departmentId)) {
      const deptId = staffData.departmentId || existing.departmentId?._id || existing.departmentId;
      if (deptId) {
        const Department = require('../administration/department.model');
        await Department.findByIdAndUpdate(deptId, { headOfDepartment: id }, session ? { session } : {});
      }
    }

    if (username || password) {
      await identityService.updateCredentials(id, { username, password }, session);
    }
  });

  cacheService.delByPattern('ref:staff:');
  const [updatedRecord, identity] = await Promise.all([
    repo.findById(id),
    identityService.getByStaffId(id),
  ]);
  return { ...updatedRecord, username: identity?.username || '' };
};

const list = async (queryParams = {}, securityScope = {}, caller = null) => {
  const { QueryContext, QueryBuilder, StaffQueryConfig } = require('../../core/query');

  const { isHod, hodDeptId } = resolveCaller(caller);

  const filters = { ...queryParams };
  if (isHod && hodDeptId) {
    filters.departmentId = hodDeptId;
  }
  if (filters.role) {
    const roleDoc = await Role.findOne({ name: filters.role });
    if (roleDoc) {
      filters.roleId = roleDoc._id.toString();
    } else {
      filters.roleId = new mongoose.Types.ObjectId().toString();
    }
    delete filters.role;
  }

  const queryContext = new QueryContext({
    ...filters,
    securityScope: { ...securityScope, isDeleted: { $ne: true } },
  });

  const compiled = QueryBuilder.compile(queryContext, StaffQueryConfig);

  const [items, total] = await Promise.all([
    Staff.find(compiled.filter)
      .select(compiled.projection)
      .populate('departmentId', 'name')
      .populate('roleId', 'name')
      .sort(compiled.sort)
      .skip(compiled.pagination.skip)
      .limit(compiled.pagination.limit)
      .lean(),
    Staff.countDocuments(compiled.filter),
  ]);

  const staffIds = items.map((item) => item._id);
  const identities = await identityService.getByStaffIds(staffIds);

  const identityMap = {};
  identities.forEach((idDoc) => {
    identityMap[idDoc.staffId.toString()] = {
      username: idDoc.username,
      accountStatus: idDoc.accountStatus,
      failedLoginAttempts: idDoc.failedLoginAttempts || 0,
      lockUntil: idDoc.lockUntil || null,
    };
  });

  const itemsWithAccountInfo = items.map((item) => {
    const idInfo = identityMap[item._id.toString()];
    const isLocked = idInfo?.accountStatus === 'Locked' && (!idInfo?.lockUntil || new Date(idInfo.lockUntil) > new Date());

    return {
      ...item,
      username: idInfo?.username || '',
      accountStatus: idInfo?.accountStatus || item.status || 'Active',
      failedLoginAttempts: idInfo?.failedLoginAttempts || 0,
      lockUntil: idInfo?.lockUntil || null,
      isLocked: Boolean(isLocked),
    };
  });

  return { items: itemsWithAccountInfo, total, page: compiled.page, limit: compiled.limit, pages: Math.ceil(total / compiled.limit) };
};

const disableStaff = async (id, caller = null) => {
  const staff = await repo.findById(id);
  if (!staff) throw new AppError('NOT_FOUND');

  if (caller) {
    const { isHod, hodDeptId, staffId: callerStaffId } = resolveCaller(caller);
    if (isHod) {
      const targetDeptId = staff.departmentId?._id ? String(staff.departmentId._id) : String(staff.departmentId || '');
      if (targetDeptId !== hodDeptId) {
        throw new AppError('FORBIDDEN', 'HOD can only manage accounts within their own department.');
      }
      if (callerStaffId && String(callerStaffId) === String(id)) {
        throw new AppError('FORBIDDEN', 'HOD cannot disable their own account.');
      }
      const roleName = staff.roleId?.name || staff.role;
      if (roleName === 'Administrator') {
        throw new AppError('FORBIDDEN', 'Cannot disable Administrator account.');
      }
      const Department = require('../administration/department.model');
      const deptWithTargetAsHod = await Department.findOne({ headOfDepartment: id });
      if (deptWithTargetAsHod) {
        throw new AppError('FORBIDDEN', 'Cannot disable another Head of Department account.');
      }
    }
  }
  
  await withTransaction(async (session) => {
    // Update staff status to Inactive
    await repo.update(id, { status: 'Inactive' }, session ? { session } : {});

    // Find identity and disable it
    const identity = await identityService.getByStaffId(id, session ? { session } : {});
    if (identity) {
      await identityService.changeStatus(identity._id, 'Disabled');
    }
  });

  cacheService.delByPattern('ref:staff:');

  auditService.logStatusChange({
    actorId: caller?.staffId || caller?._id || caller?.id || null,
    actorRole: caller?.role || 'Staff',
    targetType: 'Staff',
    targetId: id,
    statusFrom: staff.status || 'Active',
    statusTo: 'Inactive',
    reason: 'Staff account disabled',
    category: AUDIT_CATEGORIES.SECURITY,
    severity: AUDIT_SEVERITIES.WARNING,
    details: { employeeId: staff.employeeId, fullName: staff.fullName },
  });

  return { message: 'Staff account disabled successfully' };
};

const enableStaff = async (id, caller = null) => {
  const staff = await repo.findById(id);
  if (!staff) throw new AppError('NOT_FOUND');

  if (caller) {
    const { isHod, hodDeptId } = resolveCaller(caller);
    if (isHod) {
      const targetDeptId = staff.departmentId?._id ? String(staff.departmentId._id) : String(staff.departmentId || '');
      if (targetDeptId !== hodDeptId) {
        throw new AppError('FORBIDDEN', 'HOD can only manage accounts within their own department.');
      }
    }
  }

  await withTransaction(async (session) => {
    // Update staff status to Active
    await repo.update(id, { status: 'Active' }, session ? { session } : {});

    // Find identity and re-enable it
    const identity = await identityService.getByStaffId(id, session ? { session } : {});
    if (identity) {
      await identityService.changeStatus(identity._id, 'Active');
    }
  });

  cacheService.delByPattern('ref:staff:');

  auditService.logStatusChange({
    actorId: caller?.staffId || caller?._id || caller?.id || null,
    actorRole: caller?.role || 'Staff',
    targetType: 'Staff',
    targetId: id,
    statusFrom: staff.status || 'Inactive',
    statusTo: 'Active',
    reason: 'Staff account re-enabled',
    category: AUDIT_CATEGORIES.SECURITY,
    severity: AUDIT_SEVERITIES.INFO,
    details: { employeeId: staff.employeeId, fullName: staff.fullName },
  });

  return { message: 'Staff account re-enabled successfully' };
};

const deleteStaff = async (id, caller = null) => {
  if (caller) {
    const { isHod } = resolveCaller(caller);
    if (isHod) {
      throw new AppError('FORBIDDEN', 'Only Hospital Administrators can permanently delete staff records.');
    }
  }

  const staff = await repo.findById(id);
  if (!staff) throw new AppError('NOT_FOUND');
  
  await withTransaction(async (session) => {
    const identity = await identityService.getByStaffId(id, session ? { session } : {});
    if (identity) {
      await identityService.changeStatus(identity._id, 'Disabled');
    }

    await repo.update(id, { isDeleted: true, status: 'Inactive' }, session ? { session } : {});
  });

  cacheService.delByPattern('ref:staff:');

  auditService.logStatusChange({
    actorId: caller?.staffId || caller?._id || caller?.id || null,
    actorRole: caller?.role || 'Staff',
    targetType: 'Staff',
    targetId: id,
    statusFrom: staff.status || 'Active',
    statusTo: 'Deleted',
    reason: 'Staff record deleted',
    category: AUDIT_CATEGORIES.SECURITY,
    severity: AUDIT_SEVERITIES.CRITICAL,
    details: { employeeId: staff.employeeId, fullName: staff.fullName },
  });

  return { message: 'Staff account deleted successfully' };
};

const changePosition = async (staffId, newPosition, reason, caller = null) => {
  const { staffId: callerStaffId, isHod, hodDeptId, callerRank } = resolveCaller(caller);

  const staff = await repo.findById(staffId);
  if (!staff) throw new AppError('NOT_FOUND', 'Staff member not found');

  if (isHod) {
    const targetDeptId = staff.departmentId?._id ? String(staff.departmentId._id) : String(staff.departmentId || '');
    if (targetDeptId !== hodDeptId) {
      throw new AppError('FORBIDDEN', 'HOD can only manage positions within their own department.');
    }
    if (callerStaffId && String(callerStaffId) === String(staffId)) {
      throw new AppError('FORBIDDEN', 'Staff cannot change their own position.');
    }
    const roleName = staff.roleId?.name || staff.role;
    if (roleName === 'Administrator') {
      throw new AppError('FORBIDDEN', 'Cannot change position of Administrator staff.');
    }
  }

  const role = await Role.findById(staff.roleId?._id || staff.roleId);
  if (!role) throw new AppError('NOT_FOUND', 'Role not found');

  const allowedPositions = POSITIONS[role.name];
  if (!allowedPositions) {
    throw new AppError('BAD_REQUEST', `No positions configured for role ${role.name}`);
  }

  const newPosObj = allowedPositions.find(p => p.title === newPosition);
  if (!newPosObj) {
    throw new AppError('BAD_REQUEST', `Invalid position "${newPosition}" for role "${role.name}"`);
  }

  const currentPosObj = allowedPositions.find(p => p.title === staff.position);
  const oldRank = currentPosObj ? currentPosObj.rank : 0;
  const newRank = newPosObj.rank;

  if (isHod) {
    const isHodTitle = newPosition.includes('Head of') || newPosition.includes('Director') || newPosition.includes('Superintendent') || newPosition.includes('Chief');
    if (newRank >= callerRank || isHodTitle) {
      throw new AppError('FORBIDDEN', 'Only Hospital Administrators can appoint or promote staff to Head of Department level.');
    }
  }

  await withTransaction(async (session) => {
    let changeType = 'LATERAL';
    if (oldRank < newRank) {
      changeType = 'PROMOTION';
    } else if (oldRank > newRank) {
      changeType = 'DEMOTION';
    }

    const previousPosition = staff.position;
    const newTariffGrade = getTariffGrade(newRank);

    // Update staff position directly in DB under session
    const Staff = require('./staff.model');
    await Staff.findByIdAndUpdate(
      staffId, 
      { position: newPosition, positionRank: newRank, tariffGrade: newTariffGrade, salaryGrade: newTariffGrade }, 
      session ? { session, runValidators: true } : { runValidators: true }
    );

    // Create history record
    await PositionHistory.create(
      [
        {
          staffId,
          previousPosition,
          newPosition,
          changeType,
          reason,
          changedBy: callerStaffId || staffId
        }
      ],
      session ? { session } : {}
    );

    // If position changed to Head of Department, sync department headOfDepartment
    const isHodPosition = ['Head of Department', 'Head of Surgery Department', 'Laboratory Director'].includes(newPosition);
    const wasHodPosition = ['Head of Department', 'Head of Surgery Department', 'Laboratory Director'].includes(previousPosition);

    if (isHodPosition && staff.departmentId) {
      const deptId = staff.departmentId?._id || staff.departmentId;
      if (deptId) {
        const Department = require('../administration/department.model');
        await Department.findByIdAndUpdate(deptId, { headOfDepartment: staffId }, session ? { session } : {});
      }
    } else if (wasHodPosition && !isHodPosition && staff.departmentId) {
      const deptId = staff.departmentId?._id || staff.departmentId;
      if (deptId) {
        const Department = require('../administration/department.model');
        await Department.findOneAndUpdate({ _id: deptId, headOfDepartment: staffId }, { headOfDepartment: null }, session ? { session } : {});
      }
    }
  });

  auditService.logStatusChange({
    actorId: callerStaffId || caller?._id || caller?.id || null,
    actorRole: caller?.role || 'Staff',
    targetType: 'Staff',
    targetId: staffId,
    statusFrom: staff.position,
    statusTo: newPosition,
    reason: reason || 'Position modification',
    category: AUDIT_CATEGORIES.ADMINISTRATIVE,
    severity: AUDIT_SEVERITIES.INFO,
    details: { employeeId: staff.employeeId, fullName: staff.fullName, previousPosition: staff.position, newPosition },
  });

  return getById(staffId);
};

const getPositionHistory = async (staffId, caller = null) => {
  const staff = await repo.findById(staffId);
  if (!staff) throw new AppError('NOT_FOUND', 'Staff member not found');

  if (caller) {
    const { isHod, hodDeptId, staffId: callerStaffId } = resolveCaller(caller);
    if (isHod) {
      const targetDeptId = staff.departmentId?._id ? String(staff.departmentId._id) : String(staff.departmentId || '');
      const isSelf = callerStaffId && String(callerStaffId) === String(staff._id);
      if (!isSelf && targetDeptId !== hodDeptId) {
        throw new AppError('FORBIDDEN', 'Access denied: Staff member belongs to a different department.');
      }
    }
  }
  
  return PositionHistory.find({ staffId })
    .populate('changedBy', 'fullName')
    .sort({ createdAt: -1 })
    .lean();
};

const unlockStaff = async (id, caller = null) => {
  const staff = await repo.findById(id);
  if (!staff) throw new AppError('NOT_FOUND', 'Staff member not found');

  if (caller) {
    const { isHod, hodDeptId } = resolveCaller(caller);
    if (isHod) {
      const targetDeptId = staff.departmentId?._id ? String(staff.departmentId._id) : String(staff.departmentId || '');
      if (targetDeptId !== hodDeptId) {
        throw new AppError('FORBIDDEN', 'HOD can only manage accounts within their own department.');
      }
    }
  }

  await withTransaction(async (session) => {
    // If staff status is inactive/disabled, re-activate it
    if (staff.status !== 'Active') {
      await repo.update(id, { status: 'Active' }, session ? { session } : {});
    }

    const identity = await identityService.getByStaffId(id, session ? { session } : {});
    if (identity) {
      await identityService.unlockAccount(identity._id);
    }
  });

  cacheService.delByPattern('ref:staff:');

  auditService.logEvent(
    caller?.staffId || caller?._id || caller?.id || null,
    caller?.role || 'Staff',
    'UNLOCK_STAFF_ACCOUNT',
    id,
    { employeeId: staff.employeeId, fullName: staff.fullName },
    null,
    AUDIT_CATEGORIES.SECURITY,
    AUDIT_SEVERITIES.WARNING
  );

  return getById(id);
};

module.exports = {
  getById,
  create,
  update,
  list,
  disableStaff,
  enableStaff,
  unlockStaff,
  deleteStaff,
  changePosition,
  getPositionHistory,
  generateUsername,
};

