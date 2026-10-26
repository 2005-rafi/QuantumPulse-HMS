const Staff = require('./staff.model');

const create = (data, options = {}) => Staff.create(Array.isArray(data) ? data : [data], options);

const findById = (id, options = {}) =>
  Staff.findById(id, null, options)
    .populate({
      path: 'departmentId',
      select: 'name code type status headOfDepartment description floor',
      populate: {
        path: 'headOfDepartment',
        select: 'fullName employeeId position',
      },
    })
    .populate('roleId', 'name description')
    .populate('reportingTo', 'fullName employeeId position')
    .lean();

const findByEmployeeId = (employeeId, options = {}) =>
  Staff.findOne({ employeeId }, null, options).populate('departmentId', 'name').populate('roleId', 'name').lean();

const update = (id, data, options = {}) =>
  Staff.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true, ...options })
    .populate('departmentId', 'name')
    .populate('roleId', 'name')
    .lean();

const list = (filter = {}, page = 1, limit = 20, options = {}) => {
  const finalFilter = { ...filter, isDeleted: { $ne: true } };
  return Staff.find(finalFilter, null, options)
    .populate('departmentId', 'name')
    .populate('roleId', 'name')
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

const countDocuments = (filter = {}, options = {}) => {
  const finalFilter = { ...filter, isDeleted: { $ne: true } };
  return Staff.countDocuments(finalFilter, options);
};

const deleteById = (id, options = {}) => Staff.findByIdAndDelete(id, options);

module.exports = { create, findById, findByEmployeeId, update, list, countDocuments, deleteById };
