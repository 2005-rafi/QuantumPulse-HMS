const repo = require('./staff.repository');
const Staff = require('./staff.model');
const AppError = require('../../core/errors/AppError');
const identityService = require('../identity/identity.service');
const PositionHistory = require('./positionHistory.model');
const Role = require('../administration/role.model');
const mongoose = require('mongoose');
const { POSITIONS } = require('../../core/constants');
const { withTransaction } = require('../../core/database/transaction');


const validateSpecialtyDetails = async (roleName, data, staffId = null) => {

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

  // Doctor Intern (Rank 1) validation
  const isDoctorIntern = roleName === 'Doctor' && data.positionRank === 1;
  if (isDoctorIntern) {
    const reportingToId = data.reportingTo !== undefined ? data.reportingTo : (staffId ? (await Staff.findById(staffId))?.reportingTo : null);
    if (!reportingToId) {
      throw new AppError('BAD_REQUEST', 'Reporting supervisor is required for Doctor Interns.');
    }
    const supervisor = await Staff.findOne({ _id: reportingToId, isDeleted: { $ne: true } });
    if (!supervisor) {
      throw new AppError('BAD_REQUEST', 'Reporting supervisor not found.');
    }
    if (supervisor.positionRank === 1) {
      throw new AppError('BAD_REQUEST', 'An Intern cannot report to another Intern.');
    }
    data.consultingFee = 0;
    data.followUpFee = 0;
  }

  if (roleName === 'Doctor') {
    if (!isDoctorIntern && (!data.medicalLicenseNumber || !data.medicalLicenseNumber.trim())) {
      throw new AppError('BAD_REQUEST', 'Medical License Number is required for Doctor accounts.');
    }
    if (data.medicalLicenseNumber) {
      await checkDuplicate('medicalLicenseNumber', data.medicalLicenseNumber, 'Medical License Number');
    }
    delete data.nursingLicenseNumber;
    delete data.labCertificationCode;
    delete data.pharmacyLicenseNumber;
  } else if (roleName === 'Nurse') {
    if (!data.nursingLicenseNumber || !data.nursingLicenseNumber.trim()) {
      throw new AppError('BAD_REQUEST', 'Nursing License Number is required for Nurse accounts.');
    }
    await checkDuplicate('nursingLicenseNumber', data.nursingLicenseNumber, 'Nursing License Number');
    delete data.medicalLicenseNumber;
    delete data.labCertificationCode;
    delete data.pharmacyLicenseNumber;
    delete data.consultingFee;
  } else if (roleName === 'Laboratory') {
    if (!data.labCertificationCode || !data.labCertificationCode.trim()) {
      throw new AppError('BAD_REQUEST', 'Laboratory Certification Code is required for Laboratory accounts.');
    }
    await checkDuplicate('labCertificationCode', data.labCertificationCode, 'Laboratory Certification Code');
    delete data.medicalLicenseNumber;
    delete data.nursingLicenseNumber;
    delete data.pharmacyLicenseNumber;
    delete data.consultingFee;
  } else if (roleName === 'Pharmacy') {
    if (!data.pharmacyLicenseNumber || !data.pharmacyLicenseNumber.trim()) {
      throw new AppError('BAD_REQUEST', 'Pharmacy License Number is required for Pharmacy accounts.');
    }
    await checkDuplicate('pharmacyLicenseNumber', data.pharmacyLicenseNumber, 'Pharmacy License Number');
    delete data.medicalLicenseNumber;
    delete data.nursingLicenseNumber;
    delete data.labCertificationCode;
    delete data.consultingFee;
  } else {
    // Reception & Administrator have no clinical keys
    delete data.medicalLicenseNumber;
    delete data.nursingLicenseNumber;
    delete data.labCertificationCode;
    delete data.pharmacyLicenseNumber;
    delete data.consultingFee;
  }

  // Clear verification certificate for non-clinical/non-support staff
  const isClinicalOrSupport = ['Doctor', 'Nurse', 'Laboratory', 'Pharmacy'].includes(roleName);
  if (!isClinicalOrSupport) {
    data.verificationDocument = null;
  }
};

// Exported interface — other modules call this, never direct DB
const getById = async (id) => {
  const staff = await repo.findById(id);
  if (!staff) throw new AppError('NOT_FOUND');
  const identity = await identityService.getByStaffId(id);

  let permissions = [];
  if (staff.roleId?._id) {
    const adminRepo = require('../administration/administration.repository');
    permissions = await adminRepo.getPermissionsForRole(staff.roleId._id);
  }

  const directReportsCount = await Staff.countDocuments({ reportingTo: id, isDeleted: { $ne: true } });

  return {
    ...staff,
    username: identity?.username || '',
    accountStatus: identity?.accountStatus || staff.status || 'Active',
    accountCreatedAt: identity?.createdAt || staff.createdAt || null,
    lastLoginAt: identity?.lastLoginAt || null,
    passwordChangedAt: identity?.passwordChangedAt || null,
    failedLoginAttempts: identity?.failedLoginAttempts || 0,
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

const create = async (data, adminStaffId) => {
  const employeeId = await generateEmployeeId();
  
  const role = await Role.findById(data.roleId);
  if (!role) throw new AppError('NOT_FOUND', 'Role not found');
  
  const allowedPositions = POSITIONS[role.name];
  if (!allowedPositions || !allowedPositions.some(p => p.title === data.position)) {
    throw new AppError('BAD_REQUEST', `Invalid position "${data.position}" for role "${role.name}"`);
  }
  const posObj = allowedPositions.find(p => p.title === data.position);
  data.positionRank = posObj ? posObj.rank : 1;

  // Validate dynamic role metadata
  await validateSpecialtyDetails(role.name, data);

  const savedStaff = await withTransaction(async (session) => {
    const Staff = require('./staff.model');
    const newStaffDoc = new Staff({ ...data, employeeId });
    await newStaffDoc.save(session ? { session } : {});
    
    await PositionHistory.create(
      [
        {
          staffId: newStaffDoc._id,
          previousPosition: null,
          newPosition: data.position,
          changeType: 'ASSIGNMENT',
          reason: 'Initial staff registration assignment',
          changedBy: adminStaffId || newStaffDoc._id
        }
      ],
      session ? { session } : {}
    );

    // If registered directly as Head of Department, sync department headOfDepartment
    if (data.position === 'Head of Department' && data.departmentId) {
      const Department = require('../administration/department.model');
      await Department.findByIdAndUpdate(
        data.departmentId,
        { headOfDepartment: newStaffDoc._id },
        session ? { session } : {}
      );
    }

    return newStaffDoc;
  });

  return repo.findById(savedStaff._id);
};

const update = async (id, data, adminStaffId) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('NOT_FOUND');
  
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
  staffData.positionRank = posObj ? posObj.rank : 1;

  // Validate dynamic role metadata
  await validateSpecialtyDetails(role.name, staffData, id);
  
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

    await PositionHistory.create({
      staffId: id,
      previousPosition: existing.position,
      newPosition: staffData.position,
      changeType,
      reason: 'Modified via profile editor',
      changedBy: adminStaffId || id
    });
  }

  const updatedStaff = await repo.update(id, staffData);
  
  // Sync department headOfDepartment if position is Head of Department
  if (staffData.position === 'Head of Department' && (staffData.departmentId || existing.departmentId)) {
    const deptId = staffData.departmentId || existing.departmentId?._id || existing.departmentId;
    if (deptId) {
      const Department = require('../administration/department.model');
      await Department.findByIdAndUpdate(deptId, { headOfDepartment: id });
    }
  }

  if (username || password) {
    await identityService.updateCredentials(id, { username, password });
  }
  
  const identity = await identityService.getByStaffId(id);
  return { ...updatedStaff, username: identity?.username || '' };
};

const list = async (queryParams = {}, securityScope = {}) => {
  const { QueryContext, QueryBuilder, StaffQueryConfig } = require('../../core/query');

  const filters = { ...queryParams };
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
    identityMap[idDoc.staffId.toString()] = idDoc.username;
  });

  const itemsWithUsername = items.map((item) => ({
    ...item,
    username: identityMap[item._id.toString()] || '',
  }));

  return { items: itemsWithUsername, total, page: compiled.page, limit: compiled.limit, pages: Math.ceil(total / compiled.limit) };
};

const disableStaff = async (id) => {
  const staff = await repo.findById(id);
  if (!staff) throw new AppError('NOT_FOUND');
  
  // Update staff status to Inactive
  await repo.update(id, { status: 'Inactive' });

  // Find identity and disable it
  const identity = await identityService.getByStaffId(id);
  if (identity) {
    await identityService.changeStatus(identity._id, 'Disabled');
  }

  return { message: 'Staff account disabled successfully' };
};

const enableStaff = async (id) => {
  const staff = await repo.findById(id);
  if (!staff) throw new AppError('NOT_FOUND');

  // Update staff status to Active
  await repo.update(id, { status: 'Active' });

  // Find identity and re-enable it
  const identity = await identityService.getByStaffId(id);
  if (identity) {
    await identityService.changeStatus(identity._id, 'Active');
  }

  return { message: 'Staff account re-enabled successfully' };
};

const deleteStaff = async (id) => {
  const staff = await repo.findById(id);
  if (!staff) throw new AppError('NOT_FOUND');
  
  const identity = await identityService.getByStaffId(id);
  if (identity) {
    await identityService.changeStatus(identity._id, 'Disabled'); // Assuming identity isn't hard-deleted for audit reasons
  }

  await repo.update(id, { isDeleted: true, status: 'Inactive' });
  return { message: 'Staff account deleted successfully' };
};

const changePosition = async (staffId, newPosition, reason, adminStaffId) => {
    await withTransaction(async (session) => {
      const staff = await repo.findById(staffId);
      if (!staff) throw new AppError('NOT_FOUND', 'Staff member not found');

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

      let changeType = 'LATERAL';
      if (oldRank < newRank) {
        changeType = 'PROMOTION';
      } else if (oldRank > newRank) {
        changeType = 'DEMOTION';
      }

      const previousPosition = staff.position;

      // Update staff position directly in DB under session
      const Staff = require('./staff.model');
      await Staff.findByIdAndUpdate(staffId, { position: newPosition }, session ? { session, runValidators: true } : { runValidators: true });

      // Create history record
      await PositionHistory.create(
        [
          {
            staffId,
            previousPosition,
            newPosition,
            changeType,
            reason,
            changedBy: adminStaffId
          }
        ],
        session ? { session } : {}
      );

      // If position changed to Head of Department, sync department headOfDepartment
      if (newPosition === 'Head of Department' && staff.departmentId) {
        const deptId = staff.departmentId?._id || staff.departmentId;
        if (deptId) {
          const Department = require('../administration/department.model');
          await Department.findByIdAndUpdate(deptId, { headOfDepartment: staffId }, session ? { session } : {});
        }
      } else if (previousPosition === 'Head of Department' && newPosition !== 'Head of Department' && staff.departmentId) {
        // If position demoted/changed from Head of Department, clear department HOD if it was this staff
        const deptId = staff.departmentId?._id || staff.departmentId;
        if (deptId) {
          const Department = require('../administration/department.model');
          await Department.findOneAndUpdate({ _id: deptId, headOfDepartment: staffId }, { headOfDepartment: null }, session ? { session } : {});
        }
      }
    });

    return getById(staffId);
};

const getPositionHistory = async (staffId) => {
  const staff = await repo.findById(staffId);
  if (!staff) throw new AppError('NOT_FOUND', 'Staff member not found');
  
  return PositionHistory.find({ staffId })
    .populate('changedBy', 'fullName')
    .sort({ createdAt: -1 })
    .lean();
};

module.exports = { getById, create, update, list, disableStaff, enableStaff, deleteStaff, changePosition, getPositionHistory, generateUsername };
