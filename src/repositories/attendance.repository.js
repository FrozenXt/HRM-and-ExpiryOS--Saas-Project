const Attendance = require("../models/attendance.model");
const { attachEmployeeInfo } = require("../helpers/employee-info.helper");

class AttendanceRepository {
  async findAll(searchHelper, scopeFilter) {
    const filters = { ...searchHelper.getFilters(), ...scopeFilter };

    const [data, total] = await Promise.all([
      Attendance.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      Attendance.countDocuments(filters),
    ]);

    return { data: await attachEmployeeInfo(data), total };
  }

  async findById(id, scopeFilter) {
    return await Attendance.findOne({ _id: id, ...scopeFilter });
  }

  async findByEmployeeAndDate(employeeId, date) {
    return await Attendance.findOne({ employeeId, date });
  }

  async create(data) {
    return await Attendance.create(data);
  }

  async update(id, scopeFilter, data) {
    return await Attendance.findOneAndUpdate(
      { _id: id, ...scopeFilter },
      data,
      {
        new: true,
        runValidators: true,
      },
    );
  }

  async delete(id, scopeFilter) {
    return await Attendance.findOneAndDelete({ _id: id, ...scopeFilter });
  }

  async findOpenCheckIns(companyId, date) {
    return await Attendance.find({
      companyId,
      date,
      checkIn: { $ne: null },
      checkOut: null,
    });
  }

  async autoCloseMany(ids, checkOutTime) {
    if (!ids.length) return { modifiedCount: 0 };
    return await Attendance.updateMany(
      { _id: { $in: ids } },
      { checkOut: checkOutTime, autoCheckedOut: true },
    );
  }
  async findOpenForEmployee(employeeId) {
    return await Attendance.findOne({
      employeeId,
      checkIn: { $ne: null, $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      checkOut: null,
    }).sort({ checkIn: -1 });
  }
}

module.exports = new AttendanceRepository();
