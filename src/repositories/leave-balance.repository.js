// repositories/leave-balance.repository.js
const LeaveBalance = require("../models/leave-balance.model");
const LeaveType = require("../models/leave-type.model");
const { attachEmployeeInfo } = require("../helpers/employee-info.helper");
const { pendingDaysMap } = require("../helpers/leave-balance.helper");

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

    return { data: await this.enrich(data), total };
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

  async incrementUsed(employeeId, leaveTypeId, days, year) {
    const y = year || new Date().getFullYear();
    return await LeaveBalance.findOneAndUpdate(
      { employeeId, leaveTypeId, year: y },
      { $inc: { used: days, remaining: -days } },
      { new: true },
    );
  }
  async enrich(records) {
    const list = await attachEmployeeInfo(records);

    const typeIds = [
      ...new Set(list.map((r) => r.leaveTypeId?.toString()).filter(Boolean)),
    ];
    const employeeIds = [
      ...new Set(list.map((r) => r.employeeId?.toString()).filter(Boolean)),
    ];

    const [types, pending] = await Promise.all([
      typeIds.length
        ? LeaveType.find({ _id: { $in: typeIds } })
            .select("name annualQuota")
            .lean()
        : [],
      employeeIds.length ? pendingDaysMap(employeeIds) : new Map(),
    ]);
    const typeMap = new Map(types.map((t) => [t._id.toString(), t]));

    return list.map((r) => {
      const type = typeMap.get(r.leaveTypeId?.toString());
      const pendingDays =
        pending.get(`${r.employeeId}:${r.leaveTypeId}:${r.year}`) || 0;
      return {
        ...r,
        leaveTypeName: type?.name ?? null,
        annualQuota: type?.annualQuota ?? null,
        pendingDays,
        availableDays: (r.remaining ?? 0) - pendingDays,
      };
    });
  }
}

module.exports = new LeaveBalanceRepository();
