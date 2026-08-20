const Staff = require('./staff.model');

const create = (data) => Staff.create(data);

const findById = (id) =>
  Staff.findById(id)
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

const findByEmployeeId = (employeeId) =>
  Staff.findOne({ employeeId }).populate('departmentId', 'name').populate('roleId', 'name').lean();

const update = (id, data) =>
  Staff.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true })
    .populate('departmentId', 'name')
    .populate('roleId', 'name')
    .lean();

const list = (filter = {}, page = 1, limit = 20) => {
  const finalFilter = { ...filter, isDeleted: { $ne: true } };
  return Staff.find(finalFilter)
    .populate('departmentId', 'name')
    .populate('roleId', 'name')
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

const countDocuments = (filter = {}) => {
  const finalFilter = { ...filter, isDeleted: { $ne: true } };
  return Staff.countDocuments(finalFilter);
};

const deleteById = (id) => Staff.findByIdAndDelete(id);

module.exports = { create, findById, findByEmployeeId, update, list, countDocuments, deleteById };
