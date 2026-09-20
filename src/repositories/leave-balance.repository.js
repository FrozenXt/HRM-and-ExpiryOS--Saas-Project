// repositories/leave-balance.repository.js
const LeaveBalance = require("../models/leave-balance.model");

class LeaveBalanceRepository {
  async findAll(searchHelper, employeeIds) {
    const filters = { ...searchHelper.getFilters() };
    if (employeeIds) filters.employeeId = { $in: employeeIds };

    const [data, total] = await Promise.all([
      LeaveBalance.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      LeaveBalance.countDocuments(filters),
    ]);

    return { data, total };
  }

  async findById(id, employeeIds) {
    const filter = { _id: id };
    if (employeeIds) filter.employeeId = { $in: employeeIds };
    return await LeaveBalance.findOne(filter);
  }

  async create(data) {
    return await LeaveBalance.create(data);
  }

  async update(id, employeeIds, data) {
    const filter = { _id: id };
    if (employeeIds) filter.employeeId = { $in: employeeIds };
    return await LeaveBalance.findOneAndUpdate(filter, data, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id, employeeIds) {
    const filter = { _id: id };
    if (employeeIds) filter.employeeId = { $in: employeeIds };
    return await LeaveBalance.findOneAndDelete(filter);
  }

  async incrementUsed(employeeId, leaveTypeId, days) {
    const year = new Date().getFullYear();
    return await LeaveBalance.findOneAndUpdate(
      { employeeId, leaveTypeId, year },
      { $inc: { used: days, remaining: -days } },
      { new: true },
    );
  }
}

module.exports = new LeaveBalanceRepository();
