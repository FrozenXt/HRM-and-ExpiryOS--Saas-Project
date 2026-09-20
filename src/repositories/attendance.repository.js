// repositories/attendance.repository.js
const Attendance = require("../models/attendance.model");

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

    return { data, total };
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
}

module.exports = new AttendanceRepository();
